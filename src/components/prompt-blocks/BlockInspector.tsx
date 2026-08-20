import { Link2, Trash2, Unlink } from "lucide-react";
import { activeRecords, promptPath } from "../../lib/utils";
import { PROMPT_BLOCK_CATALOG } from "../../prompt-blocks/catalog";
import type { PromptBlockConnection, PromptBlockNodeDefinition, VaultCollections } from "../../types/domain";
import { Button } from "../ui/Button";

export function BlockInspector({
  block,
  data,
  blocks,
  connections,
  onChange,
  onDelete,
  onRemoveConnection,
  onPriority,
}: {
  block: PromptBlockNodeDefinition | null;
  data: VaultCollections;
  blocks: Record<string, PromptBlockNodeDefinition>;
  connections: Record<string, PromptBlockConnection>;
  onChange: (patch: Partial<PromptBlockNodeDefinition>) => void;
  onDelete: () => void;
  onRemoveConnection: (connectionId: string) => void;
  onPriority: (connectionId: string, priority: number) => void;
}) {
  if (!block) return <aside className="pb-inspector pb-inspector--empty"><span className="eyebrow">Inspector</span><h2>No block selected</h2><p>Select a block to configure its source, variable name, constraints, and references.</p></aside>;
  const entry = PROMPT_BLOCK_CATALOG[block.kind];
  const activePrompts = activeRecords(data.prompts);
  const activeMindsets = activeRecords(data.mindsets);
  const versions = Object.values(data.promptVersions).filter((version) => version.promptId === block.config.promptId && !version.archivedAt).sort((a, b) => Number(b.versionNumber || 0) - Number(a.versionNumber || 0));
  const related = Object.values(connections).filter((connection) => connection.sourceBlockId === block.id || connection.targetBlockId === block.id);
  const incomingConstraints = related.filter((connection) => connection.targetBlockId === block.id && connection.flowType === "constraint").sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0));

  const config = (patch: Partial<PromptBlockNodeDefinition["config"]>) => onChange({ config: { ...block.config, ...patch } });

  return <aside className="pb-inspector">
    <header><div><span className="eyebrow">Inspector · {entry.family}</span><h2>{entry.label}</h2></div><Button size="icon" variant="ghost" aria-label="Delete selected block" icon={<Trash2 size={16} />} onClick={onDelete} /></header>
    <p className="pb-inspector__description">{entry.description}</p>
    <div className="pb-inspector__fields">
      <label>Variable label<input value={block.variableLabel} maxLength={24} onChange={(event) => onChange({ variableLabel: event.target.value })} placeholder="X" /></label>
      <label>Block label<input value={block.label} maxLength={120} onChange={(event) => onChange({ label: event.target.value })} /></label>

      {block.kind === "system-prompt" ? <>
        <label>Vault Prompt<select value={block.config.promptId || ""} onChange={(event) => config({ promptId: event.target.value, promptVersionId: "" })}><option value="">Select Prompt…</option>{activePrompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{promptPath(data, prompt.id)}</option>)}</select></label>
        <label>Reference behavior<select value={block.config.promptReferenceMode || "current"} onChange={(event) => config({ promptReferenceMode: event.target.value as "current" | "pinned", promptVersionId: "" })}><option value="current">Follow current Prompt</option><option value="pinned">Pin specific Prompt Version</option></select></label>
        {block.config.promptReferenceMode === "pinned" ? <label>Pinned Version<select value={block.config.promptVersionId || ""} onChange={(event) => config({ promptVersionId: event.target.value })}><option value="">Select version…</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.versionLabel || `Version ${version.versionNumber || ""}`}</option>)}</select></label> : null}
      </> : null}

      {block.kind === "direct-input" ? <label>Direct input<textarea rows={10} value={block.config.directText || ""} onChange={(event) => config({ directText: event.target.value })} placeholder="Prompt, replacement context, topic, requirements, or other transformation material…" /></label> : null}
      {block.kind === "mindset-constraint" ? <label>Mindset<select value={block.config.mindsetId || ""} onChange={(event) => config({ mindsetId: event.target.value })}><option value="">Select Mindset…</option>{activeMindsets.map((mindset) => <option key={mindset.id} value={mindset.id}>{mindset.title}</option>)}</select></label> : null}
    </div>

    {incomingConstraints.length ? <section className="pb-inspector__constraints"><h3>Constraint priority</h3><p>Priority 1 is highest. Priorities are execution semantics, not visual ordering.</p>{incomingConstraints.map((connection) => {
      const source = blocks[connection.sourceBlockId];
      return <div key={connection.id}><span><Link2 size={13} />{source ? `${source.variableLabel} · ${source.label}` : connection.sourceBlockId}</span><label>Priority<input type="number" min={1} step={1} value={connection.priority || 1} onChange={(event) => onPriority(connection.id, Math.max(1, Number(event.target.value) || 1))} /></label></div>;
    })}</section> : null}

    <section className="pb-inspector__connections"><h3>Connections</h3>{related.length ? related.map((connection) => <div key={connection.id} data-flow={connection.flowType}><span><Link2 size={13} />{connection.sourceBlockId === block.id ? `→ ${blocks[connection.targetBlockId]?.variableLabel || connection.targetBlockId}` : `← ${blocks[connection.sourceBlockId]?.variableLabel || connection.sourceBlockId}`}<small>{connection.flowType}{connection.flowType === "constraint" ? ` · P${connection.priority}` : ""}</small></span><button type="button" aria-label="Remove connection" onClick={() => onRemoveConnection(connection.id)}><Unlink size={14} /></button></div>) : <p>No wires attached yet. Click an output port, then a compatible input port.</p>}</section>
  </aside>;
}
