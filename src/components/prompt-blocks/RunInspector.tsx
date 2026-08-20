import { AlertTriangle, Check, Copy, Eye, Save } from "lucide-react";
import { PROMPT_BLOCK_CATALOG } from "../../prompt-blocks/catalog";
import type { PromptBlockNodeDefinition, PromptBlockRunState } from "../../types/domain";
import { Button } from "../ui/Button";

export function RunInspector({
  run,
  blocks,
  onView,
  onCopy,
  onSave,
}: {
  run: PromptBlockRunState | null;
  blocks: Record<string, PromptBlockNodeDefinition>;
  onView: (blockId: string) => void;
  onCopy: (blockId: string) => void;
  onSave: (blockId: string) => void;
}) {
  if (!run) return <section className="pb-run-panel pb-run-panel--empty"><span className="eyebrow">Run inspector</span><h2>No run yet</h2><p>Run the pipeline to inspect every intermediate Prompt, style constraint, output, and failure stage.</p></section>;
  const states = Object.entries(run.nodeStates);
  return <section className="pb-run-panel">
    <header><div><span className="eyebrow">Run inspector</span><h2>{run.completedAt ? "Run complete" : "Executing pipeline"}</h2></div><small>{states.filter(([, state]) => state.status === "completed").length}/{states.length} completed</small></header>
    <div className="pb-run-panel__list">
      {states.map(([blockId, state]) => {
        const block = blocks[blockId];
        if (!block) return null;
        const output = state.output?.text || state.output?.constraint?.content || "";
        return <article key={blockId} data-status={state.status}>
          <div><span className="pb-run-status">{state.status === "completed" ? <Check size={13} /> : state.status === "failed" || state.status === "blocked" ? <AlertTriangle size={13} /> : null}{state.status}</span><strong>{block.variableLabel} · {block.label}</strong><small>{PROMPT_BLOCK_CATALOG[block.kind].family}{state.model ? ` · ${state.model}` : ""}</small></div>
          {state.error ? <p className="pb-run-error">{state.error}</p> : null}
          {output ? <div className="pb-run-actions"><Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => onView(blockId)}>View</Button><Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => onCopy(blockId)}>Copy</Button>{state.output?.flowType === "content" ? <Button size="sm" variant="ghost" icon={<Save size={14} />} onClick={() => onSave(blockId)}>Save</Button> : null}</div> : null}
        </article>;
      })}
    </div>
  </section>;
}
