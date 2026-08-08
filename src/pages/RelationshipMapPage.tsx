import { useMemo, useState } from "react";
import { Download, FileImage, GitFork, Maximize2, Network, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import {
  buildRelationshipGraphLayout,
  downloadRelationshipMapPng,
  downloadRelationshipMapSvg,
} from "../lib/relationships";
import { activeRecords, taskPath } from "../lib/utils";
import { Button } from "../components/ui/Button";

export function RelationshipMapPage() {
  const { data, recordRelationshipMapDownload } = useVault();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const layout = useMemo(() => buildRelationshipGraphLayout(data), [data]);
  const relations = useMemo(
    () => activeRecords(data.promptRelations).filter((relation) => data.prompts[relation.parentPromptId] && data.prompts[relation.childPromptId]),
    [data.promptRelations, data.prompts],
  );
  const relatedPromptIds = useMemo(() => new Set(relations.flatMap((relation) => [relation.parentPromptId, relation.childPromptId])), [relations]);
  const relatedPrompts = [...relatedPromptIds].flatMap((id) => data.prompts[id] ? [data.prompts[id]] : []);
  const relatedEndeavors = new Set(relatedPrompts.map((prompt) => data.tasks[prompt.taskId]?.endeavorId).filter(Boolean));
  const filteredRelations = relations.filter((relation) => {
    if (!query.trim()) return true;
    const parent = data.prompts[relation.parentPromptId];
    const child = data.prompts[relation.childPromptId];
    const haystack = `${parent?.title || ""} ${child?.title || ""} ${parent ? taskPath(data, parent.taskId) : ""} ${child ? taskPath(data, child.taskId) : ""}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
  });

  async function downloadSvg() {
    try {
      downloadRelationshipMapSvg(data);
      await recordRelationshipMapDownload("svg");
      toast.success("Relationship map downloaded as SVG.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The SVG map could not be downloaded.");
    }
  }

  async function downloadPng() {
    try {
      await downloadRelationshipMapPng(data);
      await recordRelationshipMapDownload("png");
      toast.success("Relationship map downloaded as PNG.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The PNG map could not be downloaded.");
    }
  }

  return (
    <div className="relationship-map-page">
      <header className="relationship-map-heading">
        <div>
          <span className="eyebrow">Prompt lineage</span>
          <h1>Relationship map</h1>
          <p>Every arrow points from the inspiring parent prompt to the child prompt it inspired. Prompts remain grouped by Endeavor so cross-project influence stays easy to read.</p>
        </div>
        <div className="relationship-map-actions">
          <Button variant="secondary" icon={<Download size={16} />} disabled={!relations.length} onClick={() => void downloadSvg()}>Download SVG</Button>
          <Button variant="primary" icon={<FileImage size={16} />} disabled={!relations.length} onClick={() => void downloadPng()}>Download PNG</Button>
        </div>
      </header>

      <section className="relationship-map-stats" aria-label="Relationship map summary">
        <div><strong>{relations.length}</strong><span>Inspiration links</span></div>
        <div><strong>{relatedPrompts.length}</strong><span>Related prompts</span></div>
        <div><strong>{relatedEndeavors.size}</strong><span>Endeavors involved</span></div>
      </section>

      {relations.length ? (
        <>
          <section className="relationship-map-panel">
            <div className="relationship-map-panel__topline">
              <div><Network size={17} /><strong>All prompt relationships</strong><span>Scroll horizontally when the map spans several Endeavors.</span></div>
              <span className="relationship-map-legend"><i /> <b>inspires</b> <Maximize2 size={13} /></span>
            </div>
            <div className="relationship-map-scroll">
              <svg className="relationship-map-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="img" aria-label="Prompt inspiration map">
                <defs>
                  <marker id="relationship-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker>
                </defs>
                {layout.groups.map((group) => <g key={group.id} className="relationship-map-group"><rect x={group.x} y={group.y} width={group.width} height={group.height} rx="16" /><text className="relationship-map-group__title" x={group.x + 20} y={group.y + 34}>{group.name}</text><text className="relationship-map-group__meta" x={group.x + 20} y={group.y + 52}>Endeavor · {group.promptIds.length} related prompt{group.promptIds.length === 1 ? "" : "s"}</text></g>)}
                {layout.edges.map((edge) => <g key={edge.id} className="relationship-map-edge"><path d={edge.path} markerEnd="url(#relationship-arrow)" /><rect x={edge.labelX - 29} y={edge.labelY - 11} width="58" height="19" rx="9" /><text x={edge.labelX} y={edge.labelY + 3} textAnchor="middle">inspires</text></g>)}
                {layout.nodes.map((node) => <g key={node.id} className="relationship-map-node" role="link" tabIndex={0} onClick={() => navigate(`/prompts/${node.id}?tab=relationships`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") navigate(`/prompts/${node.id}?tab=relationships`); }}><rect x={node.x} y={node.y} width={node.width} height={node.height} rx="11" /><circle cx={node.x + 18} cy={node.y + 20} r="5" /><text className="relationship-map-node__title" x={node.x + 32} y={node.y + 24}>{node.title.length > 39 ? `${node.title.slice(0, 38)}…` : node.title}</text><text className="relationship-map-node__task" x={node.x + 18} y={node.y + 44}>{node.taskName.length > 44 ? `${node.taskName.slice(0, 43)}…` : node.taskName}</text></g>)}
              </svg>
            </div>
          </section>

          <section className="relationship-ledger">
            <div className="relationship-ledger__header">
              <div><span className="eyebrow">Readable ledger</span><h2>Every inspiration link</h2></div>
              <label className="relationship-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter prompt names or Endeavors…" /></label>
            </div>
            <div className="relationship-ledger__rows">
              {filteredRelations.map((relation) => {
                const parent = data.prompts[relation.parentPromptId];
                const child = data.prompts[relation.childPromptId];
                if (!parent || !child) return null;
                return <article className="relationship-ledger-row" key={relation.id}>
                  <button onClick={() => navigate(`/prompts/${parent.id}?tab=relationships`)}><strong>{parent.title}</strong><span>{taskPath(data, parent.taskId)}</span></button>
                  <div className="relationship-ledger-arrow"><span /><GitFork size={15} /><b>inspires</b><span /></div>
                  <button onClick={() => navigate(`/prompts/${child.id}?tab=relationships`)}><strong>{child.title}</strong><span>{taskPath(data, child.taskId)}</span></button>
                </article>;
              })}
              {!filteredRelations.length ? <div className="relationship-ledger-empty">No relationships match that filter.</div> : null}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-surface relationship-map-empty"><GitFork size={30} /><h2>No prompt relationships yet</h2><p>Open any Prompt, choose <strong>Relationships</strong>, then add the Prompt that inspired it. Cross-Endeavor links are fully supported.</p><Button onClick={() => navigate("/prompts")}>Open Prompt Library</Button></div>
      )}
    </div>
  );
}
