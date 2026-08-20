import { useMemo, useState } from "react";
import { Copy, Save } from "lucide-react";
import { activeRecords, promptPath } from "../../lib/utils";
import type { Prompt, VaultCollections } from "../../types/domain";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function OutputModal({
  open,
  title,
  content,
  data,
  saving,
  onClose,
  onCopy,
  onSaveNew,
  onSaveVersion,
}: {
  open: boolean;
  title: string;
  content: string;
  data: VaultCollections;
  saving: boolean;
  onClose: () => void;
  onCopy: () => void;
  onSaveNew: (input: Pick<Prompt, "title" | "description" | "purpose" | "content" | "taskId">) => Promise<void>;
  onSaveVersion: (promptId: string, content: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"inspect" | "new" | "version">("inspect");
  const [promptTitle, setPromptTitle] = useState(title);
  const [taskId, setTaskId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("Generated from a Prompt Blocks pipeline output.");
  const [purpose, setPurpose] = useState("Reuse a selected Prompt Blocks result as a first-class EurekaVault Prompt.");
  const prompts = useMemo(() => activeRecords(data.prompts), [data.prompts]);
  const tasks = useMemo(() => activeRecords(data.tasks), [data.tasks]);
  return <Modal open={open} onClose={onClose} title={title} description="Runtime outputs are inspectable and disposable. Nothing becomes a vault Prompt until you explicitly save it." size="xl" footer={<><Button variant="ghost" icon={<Copy size={14} />} onClick={onCopy}>Copy</Button><Button variant="ghost" onClick={onClose}>Close</Button></>}>
    <div className="pb-output-modal">
      <textarea readOnly value={content} rows={22} />
      <div className="pb-output-modal__modes"><button type="button" className={mode === "inspect" ? "active" : ""} onClick={() => setMode("inspect")}>Inspect only</button><button type="button" className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>Save new Prompt</button><button type="button" className={mode === "version" ? "active" : ""} onClick={() => setMode("version")}>Save as new version</button></div>
      {mode === "new" ? <div className="pb-output-save-form"><label>Prompt title<input value={promptTitle} onChange={(event) => setPromptTitle(event.target.value)} /></label><label>Destination task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">Select Task…</option>{tasks.map((task) => <option key={task.id} value={task.id}>{data.endeavors[task.endeavorId]?.name || "Unassigned"} / {task.name}</option>)}</select></label><label>Description<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label><label>Purpose<textarea rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label><Button variant="primary" loading={saving} icon={<Save size={14} />} onClick={() => void onSaveNew({ title: promptTitle, description, purpose, content, taskId })}>Create Prompt</Button></div> : null}
      {mode === "version" ? <div className="pb-output-save-form"><label>Target Prompt<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Select Prompt…</option>{prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{promptPath(data, prompt.id)}</option>)}</select></label><p>The target Prompt keeps its existing title, description, purpose, Task, and complete older history. Only its current content is replaced by this runtime output, which creates the normal next automatic Prompt Version.</p><Button variant="primary" loading={saving} icon={<Save size={14} />} onClick={() => void onSaveVersion(targetId, content)}>Save new version</Button></div> : null}
    </div>
  </Modal>;
}
