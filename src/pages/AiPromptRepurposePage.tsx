import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Copy, FileCode2, RefreshCw, Save, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { buildRepurposePromptSource } from "../ai/promptIndex";
import { repurposePrompt } from "../ai/repurpose";
import type { RepurposedPromptDraft } from "../ai/types";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";
import { copyTextToClipboard } from "../lib/clipboard";
import { activeRecords, promptPath, taskPath } from "../lib/utils";
import type { Prompt } from "../types/domain";

const EMPTY_DRAFT: RepurposedPromptDraft = {
  title: "",
  description: "",
  purpose: "",
  content: "",
};

export function AiPromptRepurposePage() {
  const { user } = useAuth();
  const { data, createRecord, recordPromptRepurpose } = useVault();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activePrompts = useMemo(() => activeRecords(data.prompts).sort((a, b) => a.title.localeCompare(b.title)), [data.prompts]);
  const activeEndeavors = useMemo(() => activeRecords(data.endeavors).sort((a, b) => a.name.localeCompare(b.name)), [data.endeavors]);
  const initialSourceId = searchParams.get("source") || "";
  const initialSourcePrompt = data.prompts[initialSourceId];
  const initialSourceTask = initialSourcePrompt ? data.tasks[initialSourcePrompt.taskId] : undefined;
  const [sourcePromptId, setSourcePromptId] = useState(initialSourceId);
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<RepurposedPromptDraft>(EMPTY_DRAFT);
  const [model, setModel] = useState("");
  const [destinationEndeavorId, setDestinationEndeavorId] = useState(initialSourceTask?.endeavorId || "");
  const [destinationTaskId, setDestinationTaskId] = useState(initialSourcePrompt?.taskId || "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const sourcePrompt = data.prompts[sourcePromptId];
  const destinationTasks = useMemo(
    () => activeRecords(data.tasks)
      .filter((task) => task.endeavorId === destinationEndeavorId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data.tasks, destinationEndeavorId],
  );

  useEffect(() => {
    if (destinationTaskId && !destinationTasks.some((task) => task.id === destinationTaskId)) {
      setDestinationTaskId("");
    }
  }, [destinationTaskId, destinationTasks]);

  function selectSource(nextId: string) {
    setSourcePromptId(nextId);
    setSearchParams(nextId ? { source: nextId } : {});
    setDraft(EMPTY_DRAFT);
    setModel("");
    setError("");
    const nextPrompt = data.prompts[nextId];
    const nextTask = nextPrompt ? data.tasks[nextPrompt.taskId] : undefined;
    setDestinationEndeavorId(nextTask?.endeavorId || "");
    setDestinationTaskId(nextPrompt?.taskId || "");
  }

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    const objective = goal.trim();
    if (!user) {
      setError("Sign in before using Prompt Repurposer.");
      return;
    }
    if (!sourcePromptId) {
      setError("Choose the original Prompt (Y) first.");
      return;
    }
    if (!objective) {
      setError("Describe what you want the Prompt to do instead (X).");
      return;
    }
    const source = buildRepurposePromptSource(data, sourcePromptId);
    if (!source) {
      setError("The selected original Prompt is unavailable or archived.");
      return;
    }

    setGenerating(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await repurposePrompt({ goal: objective, prompt: source, uid: user.uid, idToken });
      setDraft(response.draft);
      setModel(response.model);
      await recordPromptRepurpose(sourcePromptId);
    } catch (generationError) {
      setDraft(EMPTY_DRAFT);
      setModel("");
      setError(generationError instanceof Error ? generationError.message : "Prompt Repurposer could not complete the transformation.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveRepurposedPrompt() {
    if (!destinationEndeavorId) {
      setError("Choose the Endeavor for the new Prompt.");
      return;
    }
    const task = data.tasks[destinationTaskId];
    if (!task || task.archivedAt || task.endeavorId !== destinationEndeavorId) {
      setError("Choose a Task inside the selected Endeavor.");
      return;
    }
    if (!draft.title.trim() || !draft.description.trim() || !draft.purpose.trim() || !draft.content.trim()) {
      setError("Title, description, purpose, and Prompt content are required before saving.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const promptId = await createRecord<Prompt>("prompts", {
        title: draft.title.trim(),
        description: draft.description.trim(),
        purpose: draft.purpose.trim(),
        content: draft.content.trim(),
        taskId: destinationTaskId,
        manualAgenticSummary: "",
        manualSuggestedImprovement: "",
        manualAiEvaluation: "",
        manualGeneratedContext: "",
      });
      toast.success("Repurposed Prompt saved as a new Prompt with Version 1.");
      navigate(`/prompts/${promptId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The repurposed Prompt could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function copyDraft() {
    try {
      await copyTextToClipboard(draft.content);
      toast.success("Repurposed Prompt copied to clipboard.");
    } catch (copyError) {
      toast.error(copyError instanceof Error ? copyError.message : "Prompt could not be copied.");
    }
  }

  const hasDraft = Boolean(draft.content.trim());

  return (
    <div className="ai-repurpose-page">
      <header className="workspace-heading workspace-heading--compact ai-finder-heading">
        <div>
          <span className="eyebrow">AI · Controlled transformation</span>
          <h1>Repurpose Prompt</h1>
          <p>Choose an original Prompt Y, describe objective X, and generate a new Prompt that preserves Y's structure and level of detail while changing what it is designed to accomplish.</p>
        </div>
        <div className="ai-finder-provider"><WandSparkles size={15} /><span>Gemini</span><small>Generate → review → save</small></div>
      </header>

      <section className="ai-repurpose-source-grid">
        <form className="ai-repurpose-config" onSubmit={(event) => void generate(event)}>
          <div className="ai-repurpose-step">
            <span className="ai-step-number">Y</span>
            <div>
              <label htmlFor="repurpose-source">Original Prompt</label>
              <select id="repurpose-source" value={sourcePromptId} onChange={(event) => selectSource(event.target.value)}>
                <option value="">Select original Prompt…</option>
                {activePrompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{promptPath(data, prompt.id)}</option>)}
              </select>
              {sourcePrompt ? <div className="ai-repurpose-source-summary"><strong>{sourcePrompt.title}</strong><span>{taskPath(data, sourcePrompt.taskId)}</span><p>{sourcePrompt.purpose}</p><Button type="button" variant="ghost" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate(`/prompts/${sourcePrompt.id}`)}>Open original</Button></div> : null}
            </div>
          </div>

          <div className="ai-repurpose-step">
            <span className="ai-step-number">X</span>
            <div>
              <label htmlFor="repurpose-goal">What should this Prompt do instead?</label>
              <textarea id="repurpose-goal" value={goal} onChange={(event) => setGoal(event.target.value)} rows={7} maxLength={5000} placeholder="Describe the new purpose, subject, workflow, or outcome. Gemini will preserve the original Prompt as much as possible while adapting it to this objective." />
            </div>
          </div>

          <div className="ai-repurpose-rule"><ShieldCheck size={17} /><div><strong>Transformation rule</strong><p>Maintain the original Prompt's structure, constraints, formatting, specificity, and level of detail as much as possible. Change only what is necessary to accomplish X.</p></div></div>

          <Button type="submit" variant="primary" loading={generating} icon={hasDraft ? <RefreshCw size={16} /> : <Sparkles size={16} />}>
            {hasDraft ? "Regenerate repurposed Prompt" : "Generate repurposed Prompt"}
          </Button>
        </form>

        <aside className="ai-repurpose-pipeline" aria-label="Prompt Repurposer pipeline">
          <span className="eyebrow">Current AI payload</span>
          <div><strong>Y</strong><span>Original Prompt title, description, purpose, content, Task, Endeavor</span></div>
          <ArrowRight size={15} />
          <div><strong>X</strong><span>Your repurpose objective</span></div>
          <ArrowRight size={15} />
          <div><strong>Gemini</strong><span>Returns title, description, purpose, and complete repurposed content</span></div>
          <p>The original Prompt is never modified by this operation.</p>
        </aside>
      </section>

      {error ? <div className="ai-finder-error"><strong>Prompt Repurposer</strong><p>{error}</p><span>Your original Prompt remains unchanged.</span></div> : null}

      {hasDraft ? (
        <section className="ai-repurpose-result" aria-live="polite">
          <div className="ai-finder-results__heading"><div><span className="eyebrow">Generated candidate</span><h2>Review before saving</h2></div><small>{model || "Gemini"} · editable draft</small></div>

          <div className="ai-repurpose-editor-grid">
            <div className="ai-repurpose-editor">
              <label>Title<input value={draft.title} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
              <label>Description<textarea rows={4} value={draft.description} maxLength={5000} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
              <label>Purpose<textarea rows={4} value={draft.purpose} maxLength={3000} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} /></label>
              <label>Prompt content<textarea className="code-input ai-repurpose-content" rows={22} value={draft.content} maxLength={50000} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} /></label>
            </div>

            <aside className="ai-repurpose-save-panel">
              <div><span className="eyebrow">Save as new Prompt</span><p>Saving uses normal IntellectVault Prompt creation, so the new record receives its own independent Version 1 history.</p></div>
              <label>Endeavor<select value={destinationEndeavorId} onChange={(event) => { setDestinationEndeavorId(event.target.value); setDestinationTaskId(""); }}><option value="">Select Endeavor…</option>{activeEndeavors.map((endeavor) => <option key={endeavor.id} value={endeavor.id}>{endeavor.name}</option>)}</select></label>
              <label>Task<select value={destinationTaskId} disabled={!destinationEndeavorId} onChange={(event) => setDestinationTaskId(event.target.value)}><option value="">Select Task…</option>{destinationTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></label>
              <div className="ai-repurpose-save-actions">
                <Button variant="ghost" icon={<Copy size={15} />} onClick={() => void copyDraft()}>Copy content</Button>
                <Button variant="primary" loading={saving} icon={<Save size={15} />} onClick={() => void saveRepurposedPrompt()}>Save new Prompt</Button>
              </div>
              <div className="ai-repurpose-save-note"><FileCode2 size={16} /><span>No relationship is automatically created between Y and the new Prompt. You can explicitly add one afterward if it is semantically appropriate.</span></div>
            </aside>
          </div>
        </section>
      ) : null}
    </div>
  );
}
