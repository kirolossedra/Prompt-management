import { useMemo, useState } from "react";
import { ArchiveRestore, RotateCcw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "../context/VaultContext";
import { archivedRecords, formatDate, matchesSearch, recordTitle } from "../lib/utils";
import type { CollectionName, VaultRecord } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function ArchivePage() {
  const { data, restoreRecord } = useVault();
  const { requestDelete } = useEntityUi();
  const [query, setQuery] = useState("");
  const [restoring, setRestoring] = useState("");
  const records = useMemo(() => {
    const kinds: CollectionName[] = ["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "localCommits", "globalCommits", "decisions"];
    return kinds
      .flatMap((kind) => archivedRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord })))
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

  return (
    <>
      <PageHeader
        eyebrow="Recoverable history"
        title="Archive"
        description="Restore archived records or permanently delete them when they no longer have dependent records."
      />
      <div className="inline-callout warning page-callout">
        <strong>Permanent deletion is available.</strong>
        <span>Deletion is irreversible and blocked while another record still references the selected item.</span>
      </div>
      <Card className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search archived records…" />
        </label>
      </Card>
      {records.length ? (
        <div className="archive-list">
          {records.map(({ kind, record }) => (
            <Card key={`${kind}:${record.id}`} className="archive-row">
              <div>
                <Badge>{kind}</Badge>
                <h3>{recordTitle(kind, record)}</h3>
                <p>Archived {formatDate(record.archivedAt)} by {record.archivedBy?.displayName || record.archivedBy?.email || "Unknown"}</p>
              </div>
              <div className="button-row">
                <Button loading={restoring === `${kind}:${record.id}`} icon={<RotateCcw size={16} />} onClick={() => restore(kind, record.id)}>Restore</Button>
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => requestDelete(kind, record.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ArchiveRestore />}
            title="Archive is empty"
            description={query ? "No archived records match this search." : "Records you archive will appear here for restoration or permanent deletion."}
          />
        </Card>
      )}
    </>
  );
}
