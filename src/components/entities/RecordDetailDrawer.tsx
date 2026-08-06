import { Archive, Clock3, Copy, Pencil, Plus, Route, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../../context/VaultContext";
import { COLLECTION_LABELS } from "../../lib/constants";
import {
  activeRecords,
  formatDate,
  promptPath,
  recordTitle,
  scopeLabel,
  taskPath,
} from "../../lib/utils";
import type { CollectionName, Selection, VaultRecord } from "../../types/domain";
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
      Copy
    </Button>
  );
}

export function RecordDetailDrawer({
  selection,
  onClose,
}: {
  selection: Selection | null;
  onClose: () => void;
}) {
  const { data } = useVault();
  const { openEdit, openCreate, requestArchive, requestDelete } = useEntityUi();
  const record = selection ? (data[selection.collection][selection.id] as VaultRecord | undefined) : undefined;

  if (!selection || !record) {
    return <Drawer open={false} onClose={onClose} title="Details"><span /></Drawer>;
  }

  const genericActions = <>
    <Button variant="secondary" size="sm" icon={<Pencil size={15} />} onClick={() => openEdit(selection.collection, selection.id)}>Edit</Button>
    <Button variant="ghost" size="sm" icon={<Archive size={15} />} onClick={() => requestArchive(selection.collection, selection.id)}>Archive</Button>
    <Button variant="danger" size="sm" icon={<Trash2 size={15} />} onClick={() => requestDelete(selection.collection, selection.id)}>Delete</Button>
  </>;

  let body = <>
    <Field label="Record" value={JSON.stringify(record, null, 2)} code />
  </>;

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
    const versions = activeRecords(data.promptVersions).filter((item) => item.promptId === prompt.id);
    body = <>
      <div className="detail-meta"><Badge icon={<Route size={13} />}>{promptPath(data, prompt.id)}</Badge><Badge tone="purple" icon={<Sparkles size={13} />}>Manual-only R1</Badge></div>
      <Field label="High-level description" value={prompt.description} />
      <Field label="Purpose / function" value={prompt.purpose} />
      <section className="detail-section"><div className="detail-section__head"><span>Prompt content</span><CopyButton value={prompt.content} /></div><div className="code-block code-block--large">{prompt.content}</div></section>
      <Field label="Manual agentic summary" value={prompt.manualAgenticSummary} />
      <Field label="Manual suggested improvement" value={prompt.manualSuggestedImprovement} />
      <Field label="Manual AI evaluation placeholder" value={prompt.manualAiEvaluation} />
      <Field label="Manual generated context placeholder" value={prompt.manualGeneratedContext} />
      <section className="detail-section">
        <div className="detail-section__head">
          <span>Versions ({versions.length})</span>
          <Button size="sm" icon={<Plus size={15} />} onClick={() => openCreate("promptVersions", { promptId: prompt.id })}>Create version</Button>
        </div>
        {versions.length ? (
          <div className="timeline">
            {versions.map((version) => (
              <div className="timeline-row" key={version.id}>
                <button className="timeline-row__main" onClick={() => openEdit("promptVersions", version.id)}>
                  <Clock3 size={15} />
                  <div>
                    <strong>{version.versionLabel}</strong>
                    <span>{version.changeDescription}</span>
                    <small>{formatDate(version.createdAt)}</small>
                  </div>
                </button>
                <div className="timeline-row__actions">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${version.versionLabel}`} icon={<Pencil size={14} />} onClick={() => openEdit("promptVersions", version.id)} />
                  <Button variant="ghost" size="icon" aria-label={`Archive ${version.versionLabel}`} icon={<Archive size={14} />} onClick={() => requestArchive("promptVersions", version.id)} />
                  <Button variant="danger" size="icon" aria-label={`Delete ${version.versionLabel}`} icon={<Trash2 size={14} />} onClick={() => requestDelete("promptVersions", version.id)} />
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted-copy">No preserved versions yet.</p>}
      </section>
    </>;
  }

  if (selection.collection === "promptVersions") {
    const version = data.promptVersions[selection.id];
    body = <>
      <div className="detail-meta"><Badge>{promptPath(data, version.promptId)}</Badge><Badge tone="info">{version.versionLabel}</Badge></div>
      <Field label="Change description" value={version.changeDescription} />
      <Field label="Preserved content" value={version.content} code />
      <Field label="Related local commit" value={version.localCommitId ? recordTitle("localCommits", data.localCommits[version.localCommitId]) : ""} />
    </>;
  }

  if (selection.collection === "mindsets") {
    const mindset = data.mindsets[selection.id];
    body = <>
      <div className="detail-meta"><Badge tone="purple">{scopeLabel(data, mindset.scopeType, mindset.scopeId)}</Badge></div>
      <Field label="Mindset" value={mindset.content} />
      <Field label="Manual AI-generated mindset placeholder" value={mindset.manualAiGeneratedMindset} />
    </>;
  }

  if (selection.collection === "preferences") {
    const preference = data.preferences[selection.id];
    body = <>
      <div className="detail-meta"><Badge tone="info">{scopeLabel(data, preference.scopeType, preference.scopeId)}</Badge></div>
      <Field label="Instruction" value={preference.instruction} />
      <div className="inline-callout warning"><strong>Conflict behavior is Open.</strong><span>This preference is displayed with other applicable preferences; the app does not invent precedence.</span></div>
    </>;
  }

  if (selection.collection === "localCommits") {
    const commit = data.localCommits[selection.id];
    body = <>
      <div className="detail-meta"><Badge tone="info">{commit.displayId}</Badge><Badge>{taskPath(data, commit.taskId)}</Badge></div>
      <Field label="Description" value={commit.description} />
      <div className="detail-two-column"><Field label="Previous state" value={commit.previousState} code /><Field label="Resulting state" value={commit.resultingState} code /></div>
      <Field label="Changed artifacts" value={commit.changedArtifacts} />
      <Field label="Commit-to-commit summary" value={commit.commitToCommitSummary} />
      <Field label="Author / timestamp" value={`${commit.authorName} · ${formatDate(commit.commitTimestamp)}`} />
    </>;
  }

  if (selection.collection === "globalCommits") {
    const commit = data.globalCommits[selection.id];
    body = <>
      <div className="detail-meta"><Badge tone="purple">{commit.displayId}</Badge><Badge>{commit.localCommitIds.length} local commits</Badge></div>
      <Field label="Summary" value={commit.summary} />
      <Field label="Related tasks" value={commit.taskIds.map((id) => taskPath(data, id))} />
      <Field label="Included local commits" value={commit.localCommitIds.map((id) => `${data.localCommits[id]?.displayId || id} — ${data.localCommits[id]?.message || "Unavailable"}`)} />
      <Field label="Commit-to-commit summary" value={commit.commitToCommitSummary} />
      <Field label="Author / timestamp" value={`${commit.authorName} · ${formatDate(commit.commitTimestamp)}`} />
    </>;
  }

  if (selection.collection === "decisions") {
    const decision = data.decisions[selection.id];
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
