import { useMemo, useState } from "react";
import { ArchiveRestore, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { archivedRecords, formatDate, matchesSearch, recordTitle } from "../lib/utils";
import type { CollectionName, VaultRecord } from "../types/domain";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function ArchivePage() {
  const { data, restoreRecord } = useVault();
  const [query, setQuery] = useState("");
  const [restoring, setRestoring] = useState("");
  const records = useMemo(() => {
    const kinds: CollectionName[] = ["endeavors", "folders", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "localCommits", "globalCommits", "decisions"];
    return kinds.flatMap((kind) => archivedRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord })))
      .filter(({ record }) => matchesSearch(record, query))
      .sort((a, b) => Number(b.record.archivedAt || 0) - Number(a.record.archivedAt || 0));
  }, [data, query]);

  async function restore(kind: CollectionName, id: string) {
    setRestoring(`${kind}:${id}`);
    try {
      await restoreRecord(kind, id);
      toast.success("Record restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The record could not be restored.");
    } finally {
      setRestoring("");
    }
  }

  return <>
    <PageHeader eyebrow="Reversible historical safety" title="Archive" description="Archived records remain recoverable. Permanent deletion is unavailable until historical-deletion and rollback behavior is explicitly finalized." />
    <div className="inline-callout warning page-callout"><strong>Historical deletion — Status: Open</strong><span>Archive/restore is the current conservative behavior; it does not claim to finalize permanent deletion semantics.</span></div>
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archived records…" /></label></Card>
    {records.length ? <div className="archive-list">{records.map(({ kind, record }) => <Card key={`${kind}:${record.id}`} className="archive-row"><div><Badge>{kind}</Badge><h3>{recordTitle(kind, record)}</h3><p>Archived {formatDate(record.archivedAt)} by {record.archivedBy?.displayName || record.archivedBy?.email || "Unknown"}</p></div><Button loading={restoring === `${kind}:${record.id}`} icon={<RotateCcw size={16} />} onClick={() => restore(kind, record.id)}>Restore</Button></Card>)}</div> : <Card><EmptyState icon={<ArchiveRestore />} title="Archive is empty" description={query ? "No archived records match this search." : "Records you archive will appear here for restoration."} /></Card>}
  </>;
}
