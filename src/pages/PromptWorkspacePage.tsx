import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  Files,
  Focus,
  History,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { copyTextToClipboard } from "../lib/clipboard";
import { attachmentKind, formatBytes, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_PROMPT, MAX_PROMPT_ATTACHMENT_BYTES } from "../lib/attachments";
import { compactDiff, diffStats, lineDiff, sideBySideDiff } from "../lib/diff";
import { activeRecords, cx, formatDate, promptVersionSnapshot, taskPath } from "../lib/utils";
import type { PromptAttachment, PromptSnapshot } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";

function attachmentIcon(attachment: PromptAttachment) {
  const kind = attachmentKind(attachment);
  if (kind === "image") return <FileImage size={20} />;
  if (kind === "pdf" || kind === "text") return <FileText size={20} />;
  if (kind === "archive") return <FileArchive size={20} />;
  return <File size={20} />;
}

function snapshotFromDraft(draft: Record<string, string>): PromptSnapshot {
  return {
    title: draft.title || "",
    description: draft.description || "",
    purpose: draft.purpose || "",
    content: draft.content || "",
    taskId: draft.taskId || "",
    manualAgenticSummary: draft.manualAgenticSummary || "",
    manualSuggestedImprovement: draft.manualSuggestedImprovement || "",
    manualAiEvaluation: draft.manualAiEvaluation || "",
    manualGeneratedContext: draft.manualGeneratedContext || "",
  };
}

export function PromptWorkspacePage() {
  const { promptId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, updateRecord, copyPrompt, addPromptAttachments, removePromptAttachment, downloadPromptAttachment } = useVault();
  const { requestArchive, requestDelete } = useEntityUi();
  const prompt = data.prompts[promptId];
  const versions = useMemo(() => activeRecords(data.promptVersions).filter((version) => version.promptId === promptId).sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0)), [data.promptVersions, promptId]);
  const attachments = useMemo(() => activeRecords(data.promptAttachments).filter((attachment) => attachment.promptId === promptId).sort((a, b) => b.createdAt - a.createdAt), [data.promptAttachments, promptId]);
  const tasks = activeRecords(data.tasks);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saving, setSaving] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [diffMode, setDiffMode] = useState<"unified" | "side">("unified");
  const [diffScope, setDiffScope] = useState<"changes" | "all">("changes");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [removeAttachmentId, setRemoveAttachmentId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestedTab = searchParams.get("tab");
  const tab = requestedTab === "history" ? "history" : requestedTab === "files" ? "files" : "editor";

  useEffect(() => {
    if (!prompt) return;
    const next = {
      title: prompt.title,
      description: prompt.description,
      purpose: prompt.purpose,
      content: prompt.content,
      taskId: prompt.taskId,
      manualAgenticSummary: prompt.manualAgenticSummary,
      manualSuggestedImprovement: prompt.manualSuggestedImprovement,
      manualAiEvaluation: prompt.manualAiEvaluation,
      manualGeneratedContext: prompt.manualGeneratedContext,
    };
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
  }, [prompt]);

  useEffect(() => {
    if (!versions.length) return;
    setCompareA((current) => current || versions[Math.min(1, versions.length - 1)]?.id || versions[0].id);
    setCompareB((current) => current || versions[0].id);
  }, [versions]);

  const dirty = JSON.stringify(draft) !== savedSnapshot;

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (dirty && !saving) void save();
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  });

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!prompt || !dirty) return;
    setSaving(true);
    try {
      await updateRecord("prompts", prompt.id, { ...snapshotFromDraft(draft) });
      setSavedSnapshot(JSON.stringify(draft));
      toast.success("Prompt saved as a new version.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prompt could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function copyCurrentPromptText() {
    try {
      await copyTextToClipboard(draft.content || "");
      toast.success("Prompt text copied to clipboard.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy prompt text.");
    }
  }

  async function duplicate() {
    if (!prompt) return;
    const id = await copyPrompt(prompt.id);
    toast.success("Prompt duplicated.");
    navigate(`/prompts/${id}`);
  }

  async function restoreVersion(versionId: string) {
    const version = data.promptVersions[versionId];
    if (!version || !prompt) return;
    const snapshot = promptVersionSnapshot(version);
    await updateRecord("prompts", prompt.id, { ...snapshot });
    toast.success(`${version.versionLabel} restored as a new current version.`);
    setSearchParams({ tab: "editor" });
  }

  async function uploadFiles(list: FileList | File[]) {
    if (!prompt) return;
    const files = Array.from(list);
    if (!files.length) return;
    setUploading(true);
    try {
      const count = await addPromptAttachments(prompt.id, files);
      toast.success(`${count} file${count === 1 ? "" : "s"} added to this prompt.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Files could not be added.");
    } finally {
      setUploading(false);
    }
  }

  async function downloadAttachment(attachmentId: string) {
    try {
      await downloadPromptAttachment(attachmentId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The file could not be downloaded.");
    }
  }

  async function removeAttachment() {
    if (!removeAttachmentId) return;
    try {
      await removePromptAttachment(removeAttachmentId);
      toast.success("File removed from the prompt.");
      setRemoveAttachmentId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The file could not be removed.");
    }
  }

  if (!prompt) {
    return <div className="empty-surface"><FileCode2 size={30} /><h1>Prompt not found</h1><p>It may have been archived or deleted.</p><Button onClick={() => navigate("/prompts")}>Back to prompts</Button></div>;
  }

  const selectedA = data.promptVersions[compareA];
  const selectedB = data.promptVersions[compareB];
  const snapshotA = selectedA ? promptVersionSnapshot(selectedA) : null;
  const snapshotB = selectedB ? promptVersionSnapshot(selectedB) : null;
  const diff = snapshotA && snapshotB ? lineDiff(snapshotA.content, snapshotB.content) : [];
  const stats = diffStats(diff);
  const unifiedRows = diffScope === "changes" ? compactDiff(diff, 2) : diff.map((line) => ({ kind: "line" as const, line }));
  const sideRows = sideBySideDiff(diff);
  const currentVersion = versions[0]?.versionNumber || versions.length;
  const attachmentBytes = attachments.reduce((sum, attachment) => sum + Number(attachment.sizeBytes || 0), 0);
  const attachmentToRemove = data.promptAttachments[removeAttachmentId];

  return (
    <div className={cx("prompt-workspace", focusMode && "prompt-workspace--focus", !inspectorOpen && "prompt-workspace--inspector-closed")}>
      <header className="prompt-workspace__header">
        <button className="icon-button" onClick={() => navigate("/prompts")} aria-label="Back to prompt library"><ArrowLeft size={18} /></button>
        <div className="prompt-workspace__identity"><span className="prompt-workspace__path">{taskPath(data, prompt.taskId)}</span><div><input className="prompt-title-input" value={draft.title || ""} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} aria-label="Prompt title" /><Badge tone="info">v{currentVersion}</Badge></div></div>
        <div className="prompt-workspace__status">{saving ? <span className="save-state saving">Saving…</span> : dirty ? <span className="save-state unsaved">Unsaved</span> : <span className="save-state saved"><Check size={14} /> Saved</span>}</div>
        <div className="prompt-workspace__toolbar">
          <Button size="sm" variant="ghost" icon={<Focus size={15} />} onClick={() => setFocusMode((value) => !value)}>{focusMode ? "Exit focus" : "Focus"}</Button>
          <Button size="sm" variant="ghost" icon={inspectorOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />} onClick={() => setInspectorOpen((value) => !value)}>Details</Button>
          <Button size="sm" variant="secondary" icon={<Copy size={15} />} onClick={() => void copyCurrentPromptText()}>Copy</Button>
          <ActionMenu items={[
            { label: "Copy prompt text", icon: <Copy size={15} />, onSelect: () => void copyCurrentPromptText() },
            { label: "Duplicate prompt", icon: <Files size={15} />, onSelect: () => void duplicate() },
            { label: "Archive prompt", icon: <Archive size={15} />, onSelect: () => requestArchive("prompts", prompt.id), separatorBefore: true },
            { label: "Delete prompt", icon: <Trash2 size={15} />, onSelect: () => requestDelete("prompts", prompt.id), danger: true },
          ]} />
          <Button variant="primary" size="sm" loading={saving} disabled={!dirty} icon={<Save size={15} />} onClick={() => void save()}>Save</Button>
        </div>
      </header>

      <div className="prompt-tabs"><button className={tab === "editor" ? "active" : ""} onClick={() => setSearchParams({})}><FileCode2 size={15} /> Editor</button><button className={tab === "history" ? "active" : ""} onClick={() => setSearchParams({ tab: "history" })}><History size={15} /> History <span>{versions.length}</span></button><button className={tab === "files" ? "active" : ""} onClick={() => setSearchParams({ tab: "files" })}><Paperclip size={15} /> Files <span>{attachments.length}</span></button></div>

      {tab === "editor" ? (
        <form className="prompt-editor-layout" onSubmit={save}>
          <main className="prompt-editor-main">
            <div className="prompt-editor-heading"><label htmlFor="prompt-content">Prompt content</label><span>Ctrl/Cmd + S to save a new version</span></div>
            <textarea id="prompt-content" className="prompt-content-editor" value={draft.content || ""} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Write the instruction that defines this prompt…" />
          </main>
          {inspectorOpen ? <aside className="prompt-inspector">
            <div className="inspector-section"><span className="inspector-label">Location</span><label>Task<select value={draft.taskId || ""} onChange={(event) => setDraft((current) => ({ ...current, taskId: event.target.value }))}>{tasks.map((task) => <option key={task.id} value={task.id}>{taskPath(data, task.id)}</option>)}</select></label></div>
            <div className="inspector-section"><span className="inspector-label">Definition</span><label>Description<textarea rows={4} value={draft.description || ""} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label><label>Purpose<textarea rows={4} value={draft.purpose || ""} onChange={(event) => setDraft((current) => ({ ...current, purpose: event.target.value }))} /></label></div>
            <details className="inspector-details"><summary>Manual future-AI placeholders <ChevronDown size={14} /></summary><label>Agentic summary<textarea rows={3} value={draft.manualAgenticSummary || ""} onChange={(event) => setDraft((current) => ({ ...current, manualAgenticSummary: event.target.value }))} /></label><label>Suggested improvement<textarea rows={3} value={draft.manualSuggestedImprovement || ""} onChange={(event) => setDraft((current) => ({ ...current, manualSuggestedImprovement: event.target.value }))} /></label><label>AI evaluation<textarea rows={3} value={draft.manualAiEvaluation || ""} onChange={(event) => setDraft((current) => ({ ...current, manualAiEvaluation: event.target.value }))} /></label><label>Generated context<textarea rows={5} value={draft.manualGeneratedContext || ""} onChange={(event) => setDraft((current) => ({ ...current, manualGeneratedContext: event.target.value }))} /></label></details>
          </aside> : null}
        </form>
      ) : tab === "files" ? (
        <div className="attachment-workspace">
          <section className="attachment-heading">
            <div><span className="eyebrow">Prompt resources</span><h2>Files</h2><p>Keep small reference files directly with this prompt. Files are stored in Firebase as Base64 and can be downloaded later.</p></div>
            <div className="attachment-usage"><strong>{attachments.length} / {MAX_ATTACHMENTS_PER_PROMPT}</strong><span>{formatBytes(attachmentBytes)} / {formatBytes(MAX_PROMPT_ATTACHMENT_BYTES)}</span></div>
          </section>

          <section
            className={cx("attachment-dropzone", dragActive && "attachment-dropzone--active")}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setDragActive(false); }}
            onDrop={(event) => { event.preventDefault(); setDragActive(false); void uploadFiles(event.dataTransfer.files); }}
          >
            <input ref={fileInputRef} className="visually-hidden" type="file" multiple onChange={(event) => { if (event.currentTarget.files) void uploadFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
            <span className="attachment-dropzone__icon"><UploadCloud size={26} /></span>
            <div><h3>Drop files here</h3><p>Or choose multiple files from your device.</p><small>Up to {formatBytes(MAX_ATTACHMENT_BYTES)} per file · {MAX_ATTACHMENTS_PER_PROMPT} files · {formatBytes(MAX_PROMPT_ATTACHMENT_BYTES)} total per prompt</small></div>
            <Button type="button" variant="secondary" loading={uploading} icon={<Paperclip size={16} />} onClick={() => fileInputRef.current?.click()}>Choose files</Button>
          </section>

          <section className="attachment-list-section">
            <div className="section-heading"><div><span className="eyebrow">Attached to this prompt</span><h2>{attachments.length ? `${attachments.length} file${attachments.length === 1 ? "" : "s"}` : "No files yet"}</h2></div></div>
            {attachments.length ? <div className="attachment-list">{attachments.map((attachment) => (
              <article className="attachment-row" key={attachment.id}>
                <span className="attachment-row__icon">{attachmentIcon(attachment)}</span>
                <div className="attachment-row__copy"><strong title={attachment.fileName}>{attachment.fileName}</strong><span>{formatBytes(attachment.sizeBytes)} · {attachment.mimeType || "Unknown file type"} · Added {formatDate(attachment.createdAt)}</span></div>
                <div className="attachment-row__actions"><Button size="sm" variant="ghost" icon={<Download size={15} />} onClick={() => void downloadAttachment(attachment.id)}>Download</Button><Button size="sm" variant="ghost" className="attachment-remove-button" icon={<Trash2 size={15} />} onClick={() => setRemoveAttachmentId(attachment.id)}>Remove</Button></div>
              </article>
            ))}</div> : <div className="empty-surface empty-surface--compact"><Paperclip size={28} /><h3>No files attached</h3><p>Add reference documents, images, exports, or other small files that belong with this prompt.</p><Button variant="secondary" icon={<UploadCloud size={16} />} onClick={() => fileInputRef.current?.click()}>Add files</Button></div>}
          </section>
        </div>
      ) : (
        <div className="history-workspace">
          <aside className="version-timeline">
            <div className="version-timeline__heading"><span className="eyebrow">Automatic local history</span><h2>{versions.length} versions</h2><p>Every meaningful saved change creates a complete snapshot.</p></div>
            <div className="version-timeline__list">{versions.map((version, index) => <button key={version.id} className={compareB === version.id ? "current" : ""} onClick={() => setCompareB(version.id)}><span className="timeline-node" /><span><strong>{version.versionLabel}</strong><small>{version.changeDescription}</small><time>{formatDate(version.createdAt)}</time></span>{index === 0 ? <Badge tone="success">Current</Badge> : null}</button>)}</div>
          </aside>
          <main className="version-inspector">
            <div className="compare-toolbar">
              <div>
                <label>From<select value={compareA} onChange={(event) => setCompareA(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.id}>{version.versionLabel}</option>)}</select></label>
                <span>→</span>
                <label>To<select value={compareB} onChange={(event) => setCompareB(event.target.value)}>{versions.map((version) => <option key={version.id} value={version.id}>{version.versionLabel}</option>)}</select></label>
              </div>
              <div className="diff-toolbar-options">
                <div className="segmented-control" aria-label="Diff scope">
                  <button className={diffScope === "changes" ? "active" : ""} onClick={() => setDiffScope("changes")}>Changes only</button>
                  <button className={diffScope === "all" ? "active" : ""} onClick={() => setDiffScope("all")}>All lines</button>
                </div>
                <div className="segmented-control" aria-label="Diff layout">
                  <button className={diffMode === "unified" ? "active" : ""} onClick={() => setDiffMode("unified")}>Unified</button>
                  <button className={diffMode === "side" ? "active" : ""} onClick={() => setDiffMode("side")}>Side by side</button>
                </div>
              </div>
            </div>
            {selectedB ? <div className="version-summary"><div><Badge tone="info">{selectedB.versionLabel}</Badge><strong>{selectedB.changeDescription}</strong><small>{formatDate(selectedB.createdAt)} · changed {selectedB.changedFields?.join(", ") || "content"}</small></div><div><Button size="sm" variant="ghost" icon={<Copy size={15} />} onClick={async () => { try { await copyTextToClipboard(snapshotB?.content || ""); toast.success("Historical content copied."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not copy historical content."); } }}>Copy content</Button>{versions[0]?.id !== selectedB.id ? <Button size="sm" icon={<RotateCcw size={15} />} onClick={() => void restoreVersion(selectedB.id)}>Restore as new version</Button> : null}</div></div> : null}
            {snapshotA && snapshotB ? (
              <>
                <div className="diff-stats" aria-label={`${stats.additions} lines added and ${stats.removals} lines removed`}>
                  <span className="diff-stat diff-stat--add">+{stats.additions} added</span>
                  <span className="diff-stat diff-stat--remove">−{stats.removals} removed</span>
                  {stats.additions === 0 && stats.removals === 0 ? <span className="diff-stat diff-stat--same">No line changes</span> : null}
                </div>
                {diffMode === "unified" ? (
                  <div className="diff-view diff-view--unified" role="table" aria-label={`Line diff from ${selectedA?.versionLabel || "older version"} to ${selectedB?.versionLabel || "newer version"}`}>
                    <div className="diff-header-row" role="row">
                      <span title="Old line">Old</span><span title="New line">New</span><span aria-hidden="true" /><code>Prompt content</code>
                    </div>
                    {unifiedRows.map((row, index) => row.kind === "omitted" ? (
                      <div key={`omitted-${index}`} className="diff-omitted"><span>•••</span><span>{row.count} unchanged {row.count === 1 ? "line" : "lines"}</span></div>
                    ) : (
                      <div key={`${row.line.kind}-${row.line.oldLineNumber ?? "x"}-${row.line.newLineNumber ?? "x"}-${index}`} className={`diff-line diff-line--${row.line.kind}`} role="row">
                        <span className="diff-line-number">{row.line.oldLineNumber ?? ""}</span>
                        <span className="diff-line-number">{row.line.newLineNumber ?? ""}</span>
                        <span className="diff-marker" aria-label={row.line.kind === "add" ? "Added line" : row.line.kind === "remove" ? "Removed line" : "Unchanged line"}>{row.line.kind === "add" ? "+" : row.line.kind === "remove" ? "−" : " "}</span>
                        <code>{row.line.text || " "}</code>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="diff-side diff-side--review" role="table" aria-label={`Side-by-side line diff from ${selectedA?.versionLabel || "older version"} to ${selectedB?.versionLabel || "newer version"}`}>
                    <div className="diff-side__header"><span>{selectedA?.versionLabel}</span><span>{selectedB?.versionLabel}</span></div>
                    {sideRows.map((row, index) => {
                      const changed = row.left.kind !== "same" || row.right.kind !== "same";
                      if (diffScope === "changes" && !changed) return null;
                      return (
                        <div key={`side-${index}`} className={cx("diff-side-row", changed && "diff-side-row--changed")}>
                          <div className={cx("diff-side-cell", `diff-side-cell--${row.left.kind}`)}><span className="diff-line-number">{row.left.lineNumber ?? ""}</span><span className="diff-marker">{row.left.kind === "remove" ? "−" : row.left.kind === "same" ? " " : ""}</span><code>{row.left.text || " "}</code></div>
                          <div className={cx("diff-side-cell", `diff-side-cell--${row.right.kind}`)}><span className="diff-line-number">{row.right.lineNumber ?? ""}</span><span className="diff-marker">{row.right.kind === "add" ? "+" : row.right.kind === "same" ? " " : ""}</span><code>{row.right.text || " "}</code></div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : <div className="empty-surface"><Eye size={26} /><h2>Select versions to compare</h2></div>}
          </main>
        </div>
      )}

      <div className="mobile-prompt-actions">
        {tab === "files" ? <><button onClick={() => setSearchParams({})}><FileCode2 size={18} /><span>Editor</span></button><button onClick={() => setSearchParams({ tab: "history" })}><History size={18} /><span>History</span></button><button onClick={() => fileInputRef.current?.click()}><UploadCloud size={18} /><span>Add file</span></button><button onClick={() => void copyCurrentPromptText()}><Copy size={18} /><span>Copy</span></button></> : <><button onClick={() => setSearchParams(tab === "history" ? {} : { tab: "history" })}>{tab === "history" ? <FileCode2 size={18} /> : <History size={18} />}<span>{tab === "history" ? "Editor" : "History"}</span></button><button onClick={() => setSearchParams({ tab: "files" })}><Paperclip size={18} /><span>Files</span></button><button onClick={() => void copyCurrentPromptText()}><Copy size={18} /><span>Copy</span></button>{tab === "editor" ? <Button variant="primary" loading={saving} disabled={!dirty} icon={<Save size={17} />} onClick={() => void save()}>Save</Button> : <button onClick={() => setInspectorOpen((value) => !value)}><PanelRightOpen size={18} /><span>Details</span></button>}</>}
      </div>

      <Modal open={Boolean(removeAttachmentId)} onClose={() => setRemoveAttachmentId("")} title="Remove file" description="This permanently removes the stored Base64 file from this prompt." size="sm" footer={<><Button variant="ghost" onClick={() => setRemoveAttachmentId("")}>Cancel</Button><Button variant="danger" icon={<Trash2 size={16} />} onClick={() => void removeAttachment()}>Remove file</Button></>}><div className="attachment-remove-confirm"><span className="attachment-row__icon">{attachmentToRemove ? attachmentIcon(attachmentToRemove) : <File size={20} />}</span><div><strong>{attachmentToRemove?.fileName || "File"}</strong><span>{attachmentToRemove ? formatBytes(attachmentToRemove.sizeBytes) : ""}</span></div></div></Modal>
    </div>
  );
}
