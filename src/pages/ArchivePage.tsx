import { useMemo, useState } from "react";
import { ArchiveRestore, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { archivedRecords, formatDate, matchesSearch, recordTitle } from "../lib/utils";
import type { CollectionName, VaultRecord } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export function ArchivePage() {
  const { data, restoreRecord } = useVault();
  const { requestDelete } = useEntityUi();
  const [query, setQuery] = useState("");
  const [restoring, setRestoring] = useState("");
  const records = useMemo(() => {
    const kinds: CollectionName[] = ["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "globalCommits", "decisions"];
    return kinds.flatMap((kind) => archivedRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord }))).filter(({ record }) => matchesSearch(record, query)).sort((a, b) => Number(b.record.archivedAt || 0) - Number(a.record.archivedAt || 0));
  }, [data, query]);

  async function restore(kind: CollectionName, id: string) {
    setRestoring(`${kind}:${id}`);
    try { await restoreRecord(kind, id); toast.success("Record restored."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Record could not be restored."); }
    finally { setRestoring(""); }
  }

  return <div className="archive-page"><header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Recoverable lifecycle</span><h1>Archive</h1><p>Restore records you still need or permanently delete them once dependencies are clear.</p></div></header><label className="archive-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archived records…" /></label><div className="records-table archive-table">{records.map(({ kind, record }) => <div className="record-row" key={`${kind}:${record.id}`}><div className="record-row__main"><span className="artifact-icon"><ArchiveRestore size={17} /></span><span><strong>{recordTitle(kind, record)}</strong><p>Archived {formatDate(record.archivedAt)} by {record.archivedBy?.displayName || record.archivedBy?.email || "Unknown"}</p></span></div><Badge>{kind === "globalCommits" ? "Global Version" : kind}</Badge><div className="row-actions"><Button size="sm" loading={restoring === `${kind}:${record.id}`} icon={<RotateCcw size={15} />} onClick={() => void restore(kind, record.id)}>Restore</Button><Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={() => requestDelete(kind, record.id)}>Delete</Button></div></div>)}</div>{!records.length ? <div className="empty-surface"><ArchiveRestore size={28} /><h2>Archive is empty</h2><p>{query ? "No archived records match this search." : "Archived records will appear here."}</p></div> : null}</div>;
}
