import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS } from "../../prompt-blocks/defaultTransformPrompts";
import type { PromptBlockAiOperation, PromptBlockTransformPrompt } from "../../types/domain";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function TransformPromptsModal({
  open,
  prompts,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  prompts: Record<string, PromptBlockTransformPrompt>;
  saving: boolean;
  onClose: () => void;
  onSave: (operation: PromptBlockAiOperation, content: string) => Promise<void>;
}) {
  const operations = useMemo(() => Object.keys(DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS) as PromptBlockAiOperation[], []);
  const [operation, setOperation] = useState<PromptBlockAiOperation>("context-free");
  const [content, setContent] = useState("");
  const selected = prompts[operation];
  useEffect(() => { if (open) setContent(selected?.content || DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS[operation].content); }, [open, operation, selected?.content]);
  return <Modal open={open} onClose={onClose} title="Prompt Blocks transformation prompts" description="These instructions are seeded once, stored in Firebase, visible to you, and editable. Pipeline execution uses the database version rather than silently falling back to code." size="xl" footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" loading={saving} icon={<Save size={15} />} onClick={() => void onSave(operation, content)}>Save database prompt</Button></>}>
    <div className="pb-prompt-editor">
      <aside>{operations.map((item) => <button type="button" key={item} className={item === operation ? "active" : ""} onClick={() => setOperation(item)}><span>{DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS[item].title}</span><small>{prompts[item] ? "Database" : "Awaiting seed"}</small></button>)}</aside>
      <section><div className="pb-prompt-editor__status"><ShieldCheck size={16} /><span><strong>{selected?.title || DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS[operation].title}</strong><small>{selected ? `Stored in Firebase · seed v${selected.seedVersion}` : "The default will be seeded when Firebase is available."}</small></span></div><textarea rows={28} value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /><p>Editing this changes future executions only. Existing saved Prompts and previous runtime outputs are not rewritten.</p></section>
    </div>
  </Modal>;
}
