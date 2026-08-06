import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesSearch, recordTitle } from "../lib/utils";
import type { CollectionName, Selection, VaultRecord } from "../types/domain";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function SearchPage() {
  const { data } = useVault();
  const [params, setParams] = useSearchParams();
  const [selection, setSelection] = useState<Selection | null>(null);
  const query = params.get("q") || "";
  const results = useMemo(() => {
    if (!query) return [];
    const kinds: CollectionName[] = ["endeavors", "folders", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "localCommits", "globalCommits", "decisions"];
    return kinds.flatMap((kind) => activeRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord }))).filter(({ record }) => matchesSearch(record, query));
  }, [data, query]);

  return <>
    <PageHeader eyebrow="Global retrieval" title="Search" description="Search across active hierarchy, prompt, methodology, commit, and decision records." />
    <Card className="search-page-input"><Search size={20} /><input autoFocus value={query} onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {})} placeholder="Search the entire vault…" /></Card>
    {query ? (results.length ? <div className="search-results">{results.map(({ kind, record }) => <button key={`${kind}:${record.id}`} onClick={() => setSelection({ collection: kind, id: record.id })}><Badge>{kind}</Badge><div><strong>{recordTitle(kind, record)}</strong><p>{JSON.stringify(record).replace(/[{}\[\]"]/g, " ").slice(0, 220)}</p></div></button>)}</div> : <Card><EmptyState icon={<Search />} title="No matching records" description={`No active records contain “${query}”.`} /></Card>) : <Card><EmptyState icon={<Search />} title="Search your vault" description="Enter a title, purpose, prompt phrase, preference, commit identifier, or decision question." /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
