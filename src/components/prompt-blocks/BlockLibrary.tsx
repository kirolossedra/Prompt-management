import { Braces, FileInput, FileOutput, Gauge, Plus, ShieldCheck } from "lucide-react";
import { PROMPT_BLOCK_CATALOG, PROMPT_BLOCK_GROUPS } from "../../prompt-blocks/catalog";
import type { PromptBlockFamily, PromptBlockKind } from "../../types/domain";

const familyIcons: Record<PromptBlockFamily, typeof FileInput> = {
  input: FileInput,
  transform: Braces,
  constraint: ShieldCheck,
  output: FileOutput,
};

export function BlockLibrary({ onAdd }: { onAdd: (kind: PromptBlockKind) => void }) {
  return (
    <aside className="pb-library" aria-label="Prompt Blocks library">
      <header><div><span className="eyebrow">Block library</span><h2>Toolbox</h2></div><Gauge size={18} /></header>
      <p className="pb-library__hint">Add typed blocks, then connect output ports to compatible input ports.</p>
      <div className="pb-library__groups">
        {PROMPT_BLOCK_GROUPS.map((group) => {
          const Icon = familyIcons[group.family];
          return <section key={group.family} className="pb-library__group" data-family={group.family}>
            <h3><Icon size={14} />{group.label}</h3>
            {group.kinds.map((kind) => {
              const entry = PROMPT_BLOCK_CATALOG[kind];
              return <button key={kind} type="button" onClick={() => onAdd(kind)} title={entry.description}>
                <span>{entry.label}</span><Plus size={14} />
              </button>;
            })}
          </section>;
        })}
      </div>
    </aside>
  );
}
