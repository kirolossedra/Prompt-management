import { useMemo, useState } from "react";
import { CircleCheckBig, CircleHelp, Plus, Search } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesSearch } from "../lib/utils";
import type { Selection } from "../types/domain";
import { EntityCard } from "../components/entities/EntityCard";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function DecisionsPage() {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const decisions = useMemo(() => activeRecords(data.decisions).filter((record) => (!status || record.status === status) && matchesSearch(record, query)), [data.decisions, query, status]);

  return <>
    <PageHeader eyebrow="Explicit research status" title="Decision log" description="Every unresolved research question remains visibly Open until an approved decision moves it to Finalized." actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("decisions")}>New decision</Button>} />
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, categories, resolutions, or notes…" /></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="Open">Open</option><option value="Finalized">Finalized</option></select></Card>
    {decisions.length ? <div className="entity-grid">{decisions.map((decision) => <EntityCard key={decision.id} title={decision.title} meta={decision.category} excerpt={decision.question} icon={decision.status === "Open" ? <CircleHelp /> : <CircleCheckBig />} badges={<Badge tone={decision.status === "Open" ? "warning" : "success"}>{decision.status}</Badge>} onOpen={() => setSelection({ collection: "decisions", id: decision.id })} onEdit={() => openEdit("decisions", decision.id)} onArchive={() => requestArchive("decisions", decision.id)} onDelete={() => requestDelete("decisions", decision.id)} />)}</div> : <Card><EmptyState icon={<CircleHelp />} title="No decisions match" description="Adjust the current filters or add a research decision with an explicit status." /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
