import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BrainCircuit, Copy, FileSearch2, Search, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { buildActivePromptIndex, buildPromptFinderLearningExamples } from "../ai/promptIndex";
import { findPromptMatches } from "../ai/retrieval";
import type { PromptFinderResponse } from "../ai/types";
import { Button } from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { useVault } from "../context/VaultContext";
import { copyTextToClipboard } from "../lib/clipboard";
import { taskPath } from "../lib/utils";

const EXAMPLES = [
  "Find the Prompt I use when modifying an existing application without removing old functionality.",
  "I need a Prompt for independently critiquing a project before comparing it with a revised version.",
  "Which Prompt helps me structure a technical investigation and preserve the reasoning trail?",
] as const;

export function AiPromptFinderPage() {
  const { user } = useAuth();
  const { data, recordPromptFinderSearch, savePromptFinderFeedback } = useVault();
  const navigate = useNavigate();
  const promptIndex = useMemo(() => buildActivePromptIndex(data), [data]);
  const learningExamples = useMemo(() => buildPromptFinderLearningExamples(data), [data]);
  const activePromptOptions = useMemo(
    () => Object.values(data.prompts)
      .filter((prompt) => !prompt.archivedAt)
      .sort((a, b) => a.title.localeCompare(b.title)),
    [data.prompts],
  );
  const activePromptCount = activePromptOptions.length;
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PromptFinderResponse | null>(null);
  const [resultQuery, setResultQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [feedbackPromptId, setFeedbackPromptId] = useState("");
  const [confirmedPromptId, setConfirmedPromptId] = useState("");
  const [feedbackRecordId, setFeedbackRecordId] = useState("");
  const [savingFeedbackFor, setSavingFeedbackFor] = useState("");

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setError("Describe what kind of Prompt you need first.");
      return;
    }
    if (!user) {
      setError("Sign in before using Semantic Prompt Finder.");
      return;
    }
    if (!promptIndex.length) {
      setError("Create at least one active Prompt before using Semantic Prompt Finder.");
      return;
    }

    setSearching(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await findPromptMatches({
        query: normalized,
        prompts: promptIndex,
        learningExamples,
        uid: user.uid,
        idToken,
      });
      setResult(response);
      setResultQuery(normalized);
      setFeedbackPromptId("");
      setConfirmedPromptId("");
      setFeedbackRecordId("");
      await recordPromptFinderSearch(response.matches.length);
    } catch (searchError) {
      setResult(null);
      setResultQuery("");
      setError(searchError instanceof Error ? searchError.message : "Semantic Prompt Finder could not complete the search.");
    } finally {
      setSearching(false);
    }
  }

  async function copyPrompt(promptId: string) {
    const prompt = data.prompts[promptId];
    if (!prompt) return;
    try {
      await copyTextToClipboard(prompt.content);
      toast.success("Prompt copied to clipboard.");
    } catch (copyError) {
      toast.error(copyError instanceof Error ? copyError.message : "Prompt could not be copied.");
    }
  }

  async function saveFeedback(selectedPromptId: string) {
    if (!result || !resultQuery || !selectedPromptId) return;
    const prompt = data.prompts[selectedPromptId];
    if (!prompt || prompt.archivedAt) {
      toast.error("Select an active Prompt first.");
      return;
    }

    setSavingFeedbackFor(selectedPromptId);
    try {
      const id = await savePromptFinderFeedback({
        feedbackId: feedbackRecordId || undefined,
        query: resultQuery,
        selectedPromptId,
        matches: result.matches.map((match) => ({ promptId: match.promptId, score: match.score })),
        model: result.model,
        corpusSize: result.corpusSize,
        learningExampleCount: result.learningExampleCount,
      });
      const changed = Boolean(feedbackRecordId);
      setFeedbackRecordId(id);
      setFeedbackPromptId(selectedPromptId);
      setConfirmedPromptId(selectedPromptId);
      toast.success(changed ? "Prompt Finder feedback updated." : "Prompt Finder learned from this search.", {
        description: `${prompt.title} is now the confirmed result for this search description.`,
      });
    } catch (feedbackError) {
      toast.error(feedbackError instanceof Error ? feedbackError.message : "Prompt Finder feedback could not be saved.");
    } finally {
      setSavingFeedbackFor("");
    }
  }

  const resolvedMatches = (result?.matches || []).flatMap((match) => {
    const prompt = data.prompts[match.promptId];
    return prompt && !prompt.archivedAt ? [{ match, prompt }] : [];
  });
  const confirmedPrompt = confirmedPromptId ? data.prompts[confirmedPromptId] : null;

  return (
    <div className="ai-prompt-finder-page">
      <header className="workspace-heading workspace-heading--compact ai-finder-heading">
        <div>
          <span className="eyebrow">AI · Semantic retrieval</span>
          <h1>Find Prompt</h1>
          <p>Describe what you are trying to accomplish. Gemini ranks the closest existing active Prompts and learns from the results you explicitly confirm.</p>
        </div>
        <div className="ai-finder-provider"><Sparkles size={15} /><span>Gemini</span><small>{learningExamples.length} learned example{learningExamples.length === 1 ? "" : "s"} ready</small></div>
      </header>

      <section className="ai-finder-console" aria-label="Semantic Prompt Finder">
        <form onSubmit={(event) => void search(event)}>
          <div className="ai-finder-input-row">
            <FileSearch2 size={21} />
            <textarea
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Describe the Prompt you need…"
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="ai-finder-console__footer">
            <span>{promptIndex.length === activePromptCount ? `${promptIndex.length} active Prompt${promptIndex.length === 1 ? "" : "s"} available to compare` : `${promptIndex.length} of ${activePromptCount} active Prompts included in this bounded retrieval index`}</span>
            <Button type="submit" variant="primary" loading={searching} icon={<Search size={16} />}>Find closest Prompt</Button>
          </div>
        </form>
      </section>

      {!result && !error ? (
        <section className="ai-finder-start-state">
          <div className="ai-finder-privacy-note"><ShieldCheck size={17} /><div><strong>Focused retrieval + learned examples</strong><p>Current active Prompt fields and direct relationships are sent for matching. Confirmed Finder feedback is stored under your user-scoped vault and later sent to Gemini only as a bounded query → chosen Prompt example set. Attachments, version history, profile data, Mindsets, Preferences, and Decisions are excluded.</p></div></div>
          <div className="ai-finder-examples"><span className="eyebrow">Try a description</span>{EXAMPLES.map((example) => <button key={example} onClick={() => setQuery(example)}><BrainCircuit size={15} /><span>{example}</span><ArrowRight size={14} /></button>)}</div>
        </section>
      ) : null}

      {error ? <div className="ai-finder-error"><strong>Prompt Finder unavailable</strong><p>{error}</p><span>Your normal IntellectVault features are unaffected.</span></div> : null}

      {result ? (
        <section className="ai-finder-results" aria-live="polite">
          <div className="ai-finder-results__heading"><div><span className="eyebrow">Semantic ranking</span><h2>{resolvedMatches.length ? `${resolvedMatches.length} match${resolvedMatches.length === 1 ? "" : "es"}` : "No strong match returned"}</h2></div><small>{result.model} · {result.corpusSize} Prompt{result.corpusSize === 1 ? "" : "s"} compared · {result.learningExampleCount} learned example{result.learningExampleCount === 1 ? "" : "s"} applied</small></div>

          {resolvedMatches.length ? <div className="ai-match-list">{resolvedMatches.map(({ match, prompt }, index) => (
            <article className={`${index === 0 ? "ai-match ai-match--best" : "ai-match"}${confirmedPromptId === prompt.id ? " ai-match--confirmed" : ""}`} key={prompt.id}>
              <div className="ai-match__rank"><span>{confirmedPromptId === prompt.id ? "CONFIRMED" : index === 0 ? "BEST MATCH" : `MATCH ${index + 1}`}</span><strong>{match.score}%</strong><small>AI relevance</small></div>
              <div className="ai-match__body">
                <div><h3>{prompt.title}</h3><span>{taskPath(data, prompt.taskId)}</span></div>
                <p>{match.reason}</p>
                <small>Approximate model ranking — not a vector similarity measurement.</small>
              </div>
              <div className="ai-match__actions">
                <Button variant={confirmedPromptId === prompt.id ? "success" : "secondary"} size="sm" loading={savingFeedbackFor === prompt.id} icon={<BrainCircuit size={14} />} onClick={() => void saveFeedback(prompt.id)}>{confirmedPromptId === prompt.id ? "Learned" : "This is it"}</Button>
                <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />} onClick={() => navigate(`/prompts/${prompt.id}`)}>Open Prompt</Button>
                <Button variant="ghost" size="sm" icon={<WandSparkles size={14} />} onClick={() => navigate(`/ai/repurpose-prompt?source=${encodeURIComponent(prompt.id)}`)}>Repurpose</Button>
                <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={() => void copyPrompt(prompt.id)}>Copy</Button>
              </div>
            </article>
          ))}</div> : <div className="empty-surface empty-surface--compact"><FileSearch2 size={26} /><h2>No existing Prompt was selected</h2><p>Choose the Prompt you actually meant below so this failed search can still teach the Finder.</p></div>}

          <div className={confirmedPrompt ? "ai-finder-feedback ai-finder-feedback--confirmed" : "ai-finder-feedback"}>
            <div className="ai-finder-feedback__copy">
              <BrainCircuit size={18} />
              <div><strong>{confirmedPrompt ? "Finder learned from this search" : "Teach Prompt Finder"}</strong><p>{confirmedPrompt ? `“${resultQuery}” → ${confirmedPrompt.title}. You can change the confirmed Prompt below if needed.` : "Select the Prompt you were actually looking for. This search instance and your chosen answer will become a future retrieval example."}</p></div>
            </div>
            <div className="ai-finder-feedback__controls">
              <select aria-label="Prompt actually wanted" value={feedbackPromptId} onChange={(event) => setFeedbackPromptId(event.target.value)}>
                <option value="">Choose any active Prompt…</option>
                {activePromptOptions.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.title} — {taskPath(data, prompt.taskId)}</option>)}
              </select>
              <Button variant={confirmedPrompt ? "success" : "primary"} disabled={!feedbackPromptId} loading={Boolean(savingFeedbackFor && savingFeedbackFor === feedbackPromptId)} icon={<ShieldCheck size={15} />} onClick={() => void saveFeedback(feedbackPromptId)}>{confirmedPrompt ? "Update example" : "Save as correct result"}</Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
