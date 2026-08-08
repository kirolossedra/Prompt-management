import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Copy, FilePlus2, History, Layers3, Plus, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { buildPromptMixSources } from "../ai/promptIndex";
import { mixPrompts } from "../ai/mix";
import type { MixedPromptDraft } from "../ai/types";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";
import { copyTextToClipboard } from "../lib/clipboard";
import { activeRecords, promptPath, taskPath } from "../lib/utils";
import type { Prompt } from "../types/domain";

const EMPTY_DRAFT: MixedPromptDraft = { title: "", description: "", purpose: "", content: "" };
const MIN_SOURCES = 2;
const MAX_SOURCES = 8;

type SaveMode = "new" | "version";

export function AiPromptMixerPage() {
  const { user } = useAuth();
  const { data, createRecord, updateRecord, recordPromptMix } = useVault();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSourceId = searchParams.get("source") || "";
  const initialSourcePrompt = data.prompts[initialSourceId];
  const initialSourceTask = initialSourcePrompt ? data.tasks[initialSourcePrompt.taskId] : undefined;

  const activePrompts = useMemo(() => activeRecords(data.prompts).sort((a, b) => a.title.localeCompare(b.title)), [data.prompts]);
  const activeEndeavors = useMemo(() => activeRecords(data.endeavors).sort((a, b) => a.name.localeCompare(b.name)), [data.endeavors]);
  const [sourceIds, setSourceIds] = useState<string[]>(initialSourceId ? [initialSourceId, ""] : ["", ""]);
  const [direction, setDirection] = useState("");
  const [draft, setDraft] = useState<MixedPromptDraft>(EMPTY_DRAFT);
  const [model, setModel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMode, setSaveMode] = useState<SaveMode>("new");
  const [destinationEndeavorId, setDestinationEndeavorId] = useState(initialSourceTask?.endeavorId || "");
  const [destinationTaskId, setDestinationTaskId] = useState(initialSourcePrompt?.taskId || "");
  const [versionTargetId, setVersionTargetId] = useState("");

  const selectedIds = useMemo(() => sourceIds.filter(Boolean), [sourceIds]);
  const selectedSources = useMemo(() => buildPromptMixSources(data, selectedIds), [data, selectedIds]);
  const destinationTasks = useMemo(
    () => activeRecords(data.tasks).filter((task) => task.endeavorId === destinationEndeavorId).sort((a, b) => a.name.localeCompare(b.name)),
    [data.tasks, destinationEndeavorId],
  );

  useEffect(() => {
    if (destinationTaskId && !destinationTasks.some((task) => task.id === destinationTaskId)) setDestinationTaskId("");
  }, [destinationTaskId, destinationTasks]);

  function selectSource(index: number, nextId: string) {
    if (nextId && sourceIds.some((id, sourceIndex) => sourceIndex !== index && id === nextId)) {
      setError("Each Prompt can appear only once in the mixer.");
      return;
    }
    const next = [...sourceIds];
    next[index] = nextId;
    setSourceIds(next);
    setDraft(EMPTY_DRAFT);
    setModel("");
    setError("");
    if (index === 0 && nextId) {
      const prompt = data.prompts[nextId];
      const task = prompt ? data.tasks[prompt.taskId] : undefined;
      setDestinationEndeavorId(task?.endeavorId || "");
      setDestinationTaskId(prompt?.taskId || "");
    }
  }

  function addSourceWindow() {
    if (sourceIds.length >= MAX_SOURCES) return;
    setSourceIds((current) => [...current, ""]);
  }

  function removeSourceWindow(index: number) {
    if (sourceIds.length <= MIN_SOURCES) return;
    setSourceIds((current) => current.filter((_, sourceIndex) => sourceIndex !== index));
    setDraft(EMPTY_DRAFT);
    setModel("");
    setError("");
  }

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    if (!user) { setError("Sign in before using Prompt Mixer."); return; }
    if (selectedSources.length < MIN_SOURCES) { setError("Choose at least two different active Prompts to mix."); return; }

    setGenerating(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await mixPrompts({ uid: user.uid, prompts: selectedSources, direction: direction.trim(), idToken });
      setDraft(response.draft);
      setModel(response.model);
      await recordPromptMix(selectedSources.map((source) => source.id));
    } catch (generationError) {
      setDraft(EMPTY_DRAFT);
      setModel("");
      setError(generationError instanceof Error ? generationError.message : "Prompt Mixer could not combine the selected Prompts.");
    } finally {
      setGenerating(false);
    }
  }

  function discardPreview() {
    setDraft(EMPTY_DRAFT);
    setModel("");
    setError("");
    toast.success("Mixed Prompt preview discarded. Source Prompts were not changed.");
  }

  async function copyDraft() {
    try { await copyTextToClipboard(draft.content); toast.success("Mixed Prompt copied to clipboard."); }
    catch (copyError) { toast.error(copyError instanceof Error ? copyError.message : "Prompt could not be copied."); }
  }

  function validateDraft() {
    if (!draft.title.trim() || !draft.description.trim() || !draft.purpose.trim() || !draft.content.trim()) {
      setError("Title, description, purpose, and Prompt content are required before saving.");
      return false;
    }
    return true;
  }

  async function saveAsNewPrompt() {
    if (!validateDraft()) return;
    const task = data.tasks[destinationTaskId];
    if (!destinationEndeavorId) { setError("Choose the Endeavor for the new Prompt."); return; }
    if (!task || task.archivedAt || task.endeavorId !== destinationEndeavorId) { setError("Choose a Task inside the selected Endeavor."); return; }

    setSaving(true); setError("");
    try {
      const promptId = await createRecord<Prompt>("prompts", {
        title: draft.title.trim(), description: draft.description.trim(), purpose: draft.purpose.trim(), content: draft.content.trim(), taskId: destinationTaskId,
        manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "",
      });
      toast.success("Mixed Prompt saved as a new Prompt with Version 1.");
      navigate(`/prompts/${promptId}`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The mixed Prompt could not be saved."); }
    finally { setSaving(false); }
  }

  async function saveAsVersion() {
    if (!validateDraft()) return;
    const target = data.prompts[versionTargetId];
    if (!target || target.archivedAt) { setError("Choose an active Prompt to receive the mixed result as its next version."); return; }
    const next = { title: draft.title.trim(), description: draft.description.trim(), purpose: draft.purpose.trim(), content: draft.content.trim() };
    if (target.title === next.title && target.description === next.description && target.purpose === next.purpose && target.content === next.content) {
      setError("The mixed result is identical to the selected target Prompt, so there is no meaningful new version to save.");
      return;
    }
    setSaving(true); setError("");
    try {
      await updateRecord("prompts", target.id, next);
      toast.success(`Mixed result saved as a new version of ${target.title}.`);
      navigate(`/prompts/${target.id}?tab=history`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The mixed result could not be saved as a Prompt version."); }
    finally { setSaving(false); }
  }

  const hasDraft = Boolean(draft.content.trim());

  return (
    <div className="ai-mixer-page">
      <header className="workspace-heading workspace-heading--compact ai-finder-heading">
        <div><span className="eyebrow">AI · Multi-Prompt synthesis</span><h1>Prompt Mixer</h1><p>Place different Prompts into separate source windows, mix them into one detailed candidate, then discard it, save it as a brand-new Prompt, or make it the next version of an existing Prompt.</p></div>
        <div className="ai-finder-provider"><Layers3 size={15} /><span>Gemini</span><small>{MIN_SOURCES}–{MAX_SOURCES} sources → one controlled draft</small></div>
      </header>

      <section className="ai-mixer-layout">
        <form className="ai-mixer-config" onSubmit={(event) => void generate(event)}>
          <div className="ai-mixer-section-heading"><div><span className="eyebrow">Source windows</span><h2>Prompts to mix</h2></div><Button type="button" variant="ghost" size="sm" icon={<Plus size={15} />} disabled={sourceIds.length >= MAX_SOURCES} onClick={addSourceWindow}>Add window</Button></div>
          <div className="ai-mixer-source-list">
            {sourceIds.map((sourceId, index) => {
              const source = data.prompts[sourceId];
              const unavailableIds = new Set(sourceIds.filter((id, sourceIndex) => sourceIndex !== index && id));
              return <article className="ai-mixer-source-window" key={`mix-source-${index}`}>
                <header><span>Prompt {index + 1}</span>{sourceIds.length > MIN_SOURCES ? <button type="button" aria-label={`Remove Prompt ${index + 1} window`} onClick={() => removeSourceWindow(index)}><X size={15} /></button> : null}</header>
                <select aria-label={`Prompt ${index + 1}`} value={sourceId} onChange={(event) => selectSource(index, event.target.value)}>
                  <option value="">Select Prompt…</option>
                  {activePrompts.map((prompt) => <option key={prompt.id} value={prompt.id} disabled={unavailableIds.has(prompt.id)}>{promptPath(data, prompt.id)}</option>)}
                </select>
                {source ? <div className="ai-mixer-source-summary"><strong>{source.title}</strong><span>{taskPath(data, source.taskId)}</span><p>{source.purpose}</p><button type="button" onClick={() => navigate(`/prompts/${source.id}`)}>Open <ArrowRight size={13} /></button></div> : <div className="ai-mixer-source-empty">Choose an active Prompt for this window.</div>}
              </article>;
            })}
          </div>

          <label className="ai-mixer-direction">Mix direction <span>optional</span><textarea rows={5} maxLength={5000} value={direction} onChange={(event) => setDirection(event.target.value)} placeholder="Optional: tell Gemini what the combined Prompt should emphasize, prioritize, or accomplish. Leave blank for a faithful general synthesis." /></label>
          <div className="ai-repurpose-rule"><ShieldCheck size={17} /><div><strong>Mixing rule</strong><p>Preserve distinct requirements and source detail, consolidate real duplication, and resolve conflicts into one coherent standalone Prompt. Your source Prompts are never modified by generation.</p></div></div>
          <Button type="submit" variant="primary" loading={generating} icon={hasDraft ? <RefreshCw size={16} /> : <Sparkles size={16} />}>{hasDraft ? "Remix selected Prompts" : "Mix selected Prompts"}</Button>
        </form>

        <aside className="ai-repurpose-pipeline" aria-label="Prompt Mixer pipeline">
          <span className="eyebrow">Current AI payload</span>
          <div><strong>Sources</strong><span>Selected Prompt titles, descriptions, purposes, full current content, Tasks, and Endeavors</span></div><ArrowRight size={15} />
          <div><strong>Direction</strong><span>Your optional synthesis objective or priority</span></div><ArrowRight size={15} />
          <div><strong>Gemini</strong><span>Returns one title, description, purpose, and complete mixed Prompt</span></div>
          <p>Relationships, versions, attachments, Mindsets, Preferences, activity, and achievements are not sent to this feature.</p>
        </aside>
      </section>

      {error ? <div className="ai-finder-error"><strong>Prompt Mixer</strong><p>{error}</p><span>Your source Prompts remain unchanged.</span></div> : null}

      {hasDraft ? <section className="ai-mixer-result" aria-live="polite">
        <div className="ai-finder-results__heading"><div><span className="eyebrow">Mixed candidate</span><h2>Preview and decide what happens next</h2></div><small>{model || "Gemini"} · editable preview</small></div>
        <div className="ai-mixer-editor-grid">
          <div className="ai-repurpose-editor">
            <label>Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label>Description<textarea rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>
            <label>Purpose<textarea rows={4} value={draft.purpose} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} /></label>
            <label>Prompt content<textarea className="ai-repurpose-content" value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} /></label>
          </div>

          <aside className="ai-mixer-save-panel">
            <div className="ai-mixer-preview-actions"><Button variant="ghost" icon={<Copy size={15} />} onClick={() => void copyDraft()}>Copy content</Button><Button variant="ghost" icon={<Trash2 size={15} />} onClick={discardPreview}>Discard preview</Button></div>
            <div className="ai-mixer-save-mode" role="tablist" aria-label="Mixed Prompt save destination"><button type="button" className={saveMode === "new" ? "active" : ""} onClick={() => setSaveMode("new")}><FilePlus2 size={15} />New Prompt</button><button type="button" className={saveMode === "version" ? "active" : ""} onClick={() => setSaveMode("version")}><History size={15} />New version</button></div>

            {saveMode === "new" ? <div className="ai-mixer-save-body"><div><span className="eyebrow">Save as full new Prompt</span><p>Creates an independent Prompt and automatic Version 1. No source Prompt is changed.</p></div><label>Endeavor<select value={destinationEndeavorId} onChange={(event) => { setDestinationEndeavorId(event.target.value); setDestinationTaskId(""); }}><option value="">Select Endeavor…</option>{activeEndeavors.map((endeavor) => <option key={endeavor.id} value={endeavor.id}>{endeavor.name}</option>)}</select></label><label>Task<select value={destinationTaskId} disabled={!destinationEndeavorId} onChange={(event) => setDestinationTaskId(event.target.value)}><option value="">Select Task…</option>{destinationTasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></label><Button variant="primary" loading={saving} icon={<Save size={15} />} onClick={() => void saveAsNewPrompt()}>Save new Prompt</Button></div>
            : <div className="ai-mixer-save-body"><div><span className="eyebrow">Save as next version</span><p>The selected target Prompt keeps its Task/Endeavor and complete older history. Its current title, description, purpose, and content become this mixed draft, producing the next automatic Prompt Version.</p></div><label>Target Prompt<select value={versionTargetId} onChange={(event) => setVersionTargetId(event.target.value)}><option value="">Select existing Prompt…</option>{activePrompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{promptPath(data, prompt.id)}</option>)}</select></label><div className="ai-mixer-version-warning"><History size={16} /><span>This intentionally changes the target Prompt's current state. Older versions are preserved and can still be restored later.</span></div><Button variant="primary" loading={saving} icon={<Save size={15} />} onClick={() => void saveAsVersion()}>Save as new version</Button></div>}
          </aside>
        </div>
      </section> : null}
    </div>
  );
}
