import { useMemo, useState } from "react";
import { ArchiveRestore, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { archivedRecords, formatDate, matchesSearch, recordTitle } from "../lib/utils";
import type { CollectionName, PromptBlockPipeline, VaultRecord } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

type ArchivedItem =
  | { kind: CollectionName; record: VaultRecord }
  | { kind: "promptBlockPipelines"; record: PromptBlockPipeline };

export function ArchivePage() {
  const { data, restoreRecord, restorePromptBlockPipeline, deletePromptBlockPipeline } = useVault();
  const { requestDelete } = useEntityUi();
  const [query, setQuery] = useState("");
  const [restoring, setRestoring] = useState("");
  const records = useMemo<ArchivedItem[]>(() => {
    const kinds: CollectionName[] = ["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "globalCommits", "decisions"];
    const standard: ArchivedItem[] = kinds.flatMap((kind) => archivedRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord })));
    const pipelines: ArchivedItem[] = archivedRecords(data.promptBlockPipelines).map((record) => ({ kind: "promptBlockPipelines", record }));
    return [...standard, ...pipelines]
      .filter(({ record }) => matchesSearch(record, query))
      .sort((a, b) => Number(b.record.archivedAt || 0) - Number(a.record.archivedAt || 0));
  }, [data, query]);

  async function restore(item: ArchivedItem) {
    setRestoring(`${item.kind}:${item.record.id}`);
    try {
      if (item.kind === "promptBlockPipelines") await restorePromptBlockPipeline(item.record.id);
      else await restoreRecord(item.kind, item.record.id);
      toast.success("Record restored.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Record could not be restored."); }
    finally { setRestoring(""); }
  }

  async function remove(item: ArchivedItem) {
    if (item.kind !== "promptBlockPipelines") { requestDelete(item.kind, item.record.id); return; }
    if (!window.confirm(`Permanently delete Prompt Blocks pipeline “${item.record.title}”?`)) return;
    try { await deletePromptBlockPipeline(item.record.id); toast.success("Prompt Blocks pipeline permanently deleted."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Pipeline could not be deleted."); }
  }

  return <div className="archive-page"><header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Recoverable lifecycle</span><h1>Archive</h1><p>Restore records you still need or permanently delete them once dependencies are clear. Saved Prompt Blocks pipelines use the same archive-versus-delete distinction as other first-class vault artifacts.</p></div></header><label className="archive-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archived records…" /></label><div className="records-table archive-table">{records.map((item) => {
    const title = item.kind === "promptBlockPipelines" ? item.record.title : recordTitle(item.kind, item.record);
    const badge = item.kind === "globalCommits" ? "Global Version" : item.kind === "promptBlockPipelines" ? "Prompt Blocks Pipeline" : item.kind;
    return <div className="record-row" key={`${item.kind}:${item.record.id}`}><div className="record-row__main"><span className="artifact-icon"><ArchiveRestore size={17} /></span><span><strong>{title}</strong><p>Archived {formatDate(item.record.archivedAt)} by {item.record.archivedBy?.displayName || item.record.archivedBy?.email || "Unknown"}</p></span></div><Badge>{badge}</Badge><div className="row-actions"><Button size="sm" loading={restoring === `${item.kind}:${item.record.id}`} icon={<RotateCcw size={15} />} onClick={() => void restore(item)}>Restore</Button><Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={() => void remove(item)}>Delete</Button></div></div>;
  })}</div>{!records.length ? <div className="empty-surface"><ArchiveRestore size={28} /><h2>Archive is empty</h2><p>{query ? "No archived records match this search." : "Archived records will appear here."}</p></div> : null}</div>;
}
