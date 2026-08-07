import { Archive, Camera, Clock3, Copy, Download, Pencil, Plus, Route, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../../context/VaultContext";
import { COLLECTION_LABELS } from "../../lib/constants";
import {
  activeRecords,
  formatDate,
  promptPath,
  promptVersionSnapshot,
  recordTitle,
  scopeLabel,
  taskPath,
} from "../../lib/utils";
import type { Selection, VaultRecord } from "../../types/domain";
import { useEntityUi } from "./EntityUiProvider";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";

function Field({ label, value, code = false }: { label: string; value: unknown; code?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <section className="detail-section">
      <span>{label}</span>
      <div className={code ? "code-block" : "prose-block"}>{Array.isArray(value) ? value.join("\n") : String(value)}</div>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      icon={<Copy size={15} />}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        toast.success("Copied to clipboard.");
      }}
    >
      Copy text
    </Button>
  );
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function RecordDetailDrawer({
  selection,
  onClose,
}: {
  selection: Selection | null;
  onClose: () => void;
}) {
  const { data, copyPrompt } = useVault();
  const { openEdit, openCreate, requestArchive, requestDelete } = useEntityUi();
  const record = selection ? (data[selection.collection][selection.id] as VaultRecord | undefined) : undefined;

  if (!selection || !record) {
    return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
  }

  const genericActions = <>
    {selection.collection === "prompts" ? <Button
      variant="secondary"
      size="sm"
      icon={<Copy size={15} />}
      onClick={async () => {
        try {
          await copyPrompt(selection.id);
          toast.success("Prompt copied with a new independent history.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "The prompt could not be copied.");
        }
      }}
    >Copy prompt</Button> : null}
    <Button variant="secondary" size="sm" icon={<Pencil size={15} />} onClick={() => openEdit(selection.collection, selection.id)}>Edit</Button>
    <Button variant="ghost" size="sm" icon={<Archive size={15} />} onClick={() => requestArchive(selection.collection, selection.id)}>Archive</Button>
    <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => requestDelete(selection.collection, selection.id)}>Delete</Button>
  </>;

  let body = <Field label="Record" value={JSON.stringify(record, null, 2)} code />;

  if (selection.collection === "endeavors") {
    const endeavor = data.endeavors[selection.id];
    if (!endeavor) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const tasks = activeRecords(data.tasks).filter((item) => item.endeavorId === endeavor.id);
    body = <>
      <Field label="Description" value={endeavor.description} />
      <Field label="Manual agentic summary" value={endeavor.manualAgenticSummary} />
      <section className="detail-section"><span>Contents</span><div className="metric-row"><div><strong>{tasks.length}</strong><small>Tasks</small></div></div></section>
      <section className="detail-section"><span>Quick actions</span><div className="button-row"><Button size="sm" icon={<Plus size={15} />} onClick={() => openCreate("tasks", { endeavorId: endeavor.id })}>Task</Button></div></section>
    </>;
  }

  if (selection.collection === "tasks") {
    const task = data.tasks[selection.id];
    if (!task) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const prompts = activeRecords(data.prompts).filter((item) => item.taskId === task.id);
    const mindsets = activeRecords(data.mindsets).filter((item) => item.scopeType === "task" && item.scopeId === task.id);
    const preferences = activeRecords(data.preferences).filter((item) => item.scopeType === "task" && item.scopeId === task.id);
    body = <>
      <div className="detail-meta"><Badge icon={<Route size={13} />}>{taskPath(data, task.id)}</Badge></div>
      <Field label="Purpose" value={task.purpose} />
      <Field label="Description" value={task.description} />
      <Field label="Manual suggested improvement" value={task.manualSuggestedImprovement} />
      <section className="detail-section"><span>Scoped records</span><div className="metric-row"><div><strong>{prompts.length}</strong><small>Prompts</small></div><div><strong>{mindsets.length}</strong><small>Mindsets</small></div><div><strong>{preferences.length}</strong><small>Preferences</small></div></div></section>
      <section className="detail-section"><span>Quick actions</span><div className="button-row"><Button size="sm" icon={<Plus size={15} />} onClick={() => openCreate("prompts", { taskId: task.id })}>Prompt</Button><Button size="sm" onClick={() => openCreate("mindsets", { scopeType: "task", scopeId: task.id })}>Mindset</Button><Button size="sm" onClick={() => openCreate("preferences", { scopeType: "task", scopeId: task.id })}>Preference</Button></div></section>
    </>;
  }

  if (selection.collection === "prompts") {
    const prompt = data.prompts[selection.id];
    if (!prompt) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const versions = Object.values(data.promptVersions)
      .filter((item) => item.promptId === prompt.id && !item.archivedAt)
      .sort((a, b) => Number(b.versionNumber || b.createdAt) - Number(a.versionNumber || a.createdAt));
    body = <>
      <div className="detail-meta"><Badge icon={<Route size={13} />}>{promptPath(data, prompt.id)}</Badge><Badge tone="success" icon={<Clock3 size={13} />}>Auto versioned</Badge></div>
      <Field label="High-level description" value={prompt.description} />
      <Field label="Purpose / function" value={prompt.purpose} />
      <section className="detail-section"><div className="detail-section__head"><span>Prompt content</span><CopyButton value={prompt.content} /></div><div className="code-block code-block--large">{prompt.content}</div></section>
      <Field label="Manual agentic summary" value={prompt.manualAgenticSummary} />
      <Field label="Manual suggested improvement" value={prompt.manualSuggestedImprovement} />
      <Field label="Manual AI evaluation placeholder" value={prompt.manualAiEvaluation} />
      <Field label="Manual generated context placeholder" value={prompt.manualGeneratedContext} />
      <section className="detail-section">
        <div className="detail-section__head"><span>Automatic local history ({versions.length})</span><Badge tone="info">Every saved state</Badge></div>
        {versions.length ? <div className="timeline">{versions.map((version) => (
          <div className="timeline-row" key={version.id}>
            <button className="timeline-row__main" onClick={() => openEdit("promptVersions", version.id)}>
              <Clock3 size={15} />
              <div><strong>{version.versionLabel}</strong><span>{version.changeDescription}</span><small>{formatDate(version.createdAt)}</small></div>
            </button>
            <div className="timeline-row__actions">
              <Button variant="ghost" size="icon" aria-label={`Edit ${version.versionLabel}`} icon={<Pencil size={14} />} onClick={() => openEdit("promptVersions", version.id)} />
              <Button variant="ghost" size="icon" aria-label={`Archive ${version.versionLabel}`} icon={<Archive size={14} />} onClick={() => requestArchive("promptVersions", version.id)} />
              <Button variant="danger" size="icon" aria-label={`Delete ${version.versionLabel}`} icon={<Trash2 size={14} />} onClick={() => requestDelete("promptVersions", version.id)} />
            </div>
          </div>
        ))}</div> : <p className="muted-copy">No version history is available for this legacy prompt. Its next save will create a version automatically.</p>}
      </section>
    </>;
  }

  if (selection.collection === "promptVersions") {
    const version = data.promptVersions[selection.id];
    if (!version) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const snapshot = promptVersionSnapshot(version);
    body = <>
      <div className="detail-meta"><Badge>{promptPath(data, version.promptId)}</Badge><Badge tone="info">{version.versionLabel}</Badge><Badge tone="success">{version.source || "legacy"}</Badge></div>
      <Field label="Change description" value={version.changeDescription} />
      <Field label="Changed fields" value={version.changedFields} />
      <Field label="Title" value={snapshot.title} />
      <Field label="High-level description" value={snapshot.description} />
      <Field label="Purpose" value={snapshot.purpose} />
      <Field label="Preserved prompt content" value={snapshot.content} code />
      <Field label="Manual agentic summary" value={snapshot.manualAgenticSummary} />
      <Field label="Manual suggested improvement" value={snapshot.manualSuggestedImprovement} />
      <Field label="Manual AI evaluation" value={snapshot.manualAiEvaluation} />
      <Field label="Manual generated context" value={snapshot.manualGeneratedContext} />
    </>;
  }

  if (selection.collection === "mindsets") {
    const mindset = data.mindsets[selection.id];
    if (!mindset) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const sourcePrompts = (mindset.sourcePromptIds || []).map((id) => promptPath(data, id));
    body = <>
      <div className="detail-meta"><Badge tone="purple">{scopeLabel(data, mindset.scopeType, mindset.scopeId)}</Badge>{mindset.constructionMethod === "prompt-selection" ? <Badge tone="success" icon={<Sparkles size={13} />}>Constructed from prompts</Badge> : null}</div>
      <Field label="Mindset" value={mindset.content} />
      <Field label="Source prompts" value={sourcePrompts} />
      <Field label="Manual AI-generated mindset placeholder" value={mindset.manualAiGeneratedMindset} />
    </>;
  }

  if (selection.collection === "preferences") {
    const preference = data.preferences[selection.id];
    if (!preference) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    body = <>
      <div className="detail-meta"><Badge tone="info">{scopeLabel(data, preference.scopeType, preference.scopeId)}</Badge></div>
      <Field label="Instruction" value={preference.instruction} />
      <div className="inline-callout warning"><strong>Conflict behavior is Open.</strong><span>This preference is displayed with other applicable preferences; the app does not invent precedence.</span></div>
    </>;
  }

  if (selection.collection === "localCommits") {
    const commit = data.localCommits[selection.id];
    if (!commit) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    body = <>
      <div className="detail-meta"><Badge tone="warning">Legacy record</Badge><Badge>{commit.displayId}</Badge></div>
      <Field label="Description" value={commit.description} />
      <div className="detail-two-column"><Field label="Previous state" value={commit.previousState} code /><Field label="Resulting state" value={commit.resultingState} code /></div>
      <Field label="Changed artifacts" value={commit.changedArtifacts} />
      <Field label="Author / timestamp" value={`${commit.authorName} · ${formatDate(commit.commitTimestamp)}`} />
    </>;
  }

  if (selection.collection === "globalCommits") {
    const version = data.globalCommits[selection.id];
    if (!version) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    const counts = version.recordCounts || {};
    body = <>
      <div className="detail-meta"><Badge tone="purple" icon={<Camera size={13} />}>{version.displayId}</Badge><Badge>Global version {version.versionNumber || "legacy"}</Badge></div>
      <Field label="Summary" value={version.summary} />
      <section className="detail-section"><span>Captured vault</span><div className="metric-row"><div><strong>{counts.endeavors || 0}</strong><small>Endeavors</small></div><div><strong>{counts.tasks || 0}</strong><small>Tasks</small></div><div><strong>{counts.prompts || 0}</strong><small>Prompts</small></div><div><strong>{counts.promptVersions || 0}</strong><small>Prompt versions</small></div><div><strong>{counts.mindsets || 0}</strong><small>Mindsets</small></div><div><strong>{counts.preferences || 0}</strong><small>Preferences</small></div></div></section>
      <Field label="Version-to-version summary" value={version.commitToCommitSummary} />
      <Field label="Author / snapshot time" value={`${version.authorName} · ${formatDate(version.commitTimestamp)}`} />
      {version.snapshot ? <section className="detail-section"><span>Snapshot export</span><Button icon={<Download size={15} />} onClick={() => downloadJson(`${version.displayId}-${version.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`, version.snapshot)}>Download snapshot JSON</Button></section> : <div className="inline-callout warning"><strong>Legacy global commit</strong><span>This older record does not contain a vault snapshot.</span></div>}
    </>;
  }

  if (selection.collection === "decisions") {
    const decision = data.decisions[selection.id];
    if (!decision) return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
    body = <>
      <div className="detail-meta"><Badge tone={decision.status === "Open" ? "warning" : "success"}>{decision.status}</Badge><Badge>{decision.category}</Badge></div>
      <Field label="Research question" value={decision.question} />
      <Field label="Resolution" value={decision.resolution} />
      <Field label="Notes" value={decision.notes} />
    </>;
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={recordTitle(selection.collection, record)}
      eyebrow={COLLECTION_LABELS[selection.collection]}
      actions={genericActions}
    >
      <div className="record-audit"><span>Updated {formatDate(record.updatedAt)}</span><span>by {record.updatedBy?.displayName || record.updatedBy?.email || "Unknown"}</span></div>
      {body}
    </Drawer>
  );
}
