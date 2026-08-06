import { useMemo, useState, type ReactNode } from "react";
import { Brain, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords, matchesSearch, scopeLabel } from "../lib/utils";
import type { CollectionName, Mindset, Preference, Selection } from "../types/domain";
import { EntityCard } from "../components/entities/EntityCard";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";

export function ScopedRecordsPage({ kind }: { kind: "mindsets" | "preferences" }) {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("");
  const records = useMemo<Array<Mindset | Preference>>(() => {
    const source: Array<Mindset | Preference> = kind === "mindsets"
      ? activeRecords(data.mindsets)
      : activeRecords(data.preferences);
    return source.filter((record) => (!scope || record.scopeType === scope) && matchesSearch(record, query));
  }, [data.mindsets, data.preferences, kind, query, scope]);
  const isMindset = kind === "mindsets";
  const Icon = isMindset ? Brain : SlidersHorizontal;

  return <>
    <PageHeader
      eyebrow={isMindset ? "Methodology artifacts" : "Working instructions"}
      title={isMindset ? "Mindsets" : "Preferences"}
      description={isMindset ? "Capture the principles and intellectual approach used at global, endeavor, task, or prompt scope." : "Define how work should be performed at global, endeavor, or task scope. Applicable preferences are shown together without inventing precedence."}
      actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate(kind)}>New {isMindset ? "mindset" : "preference"}</Button>}
    />
    {!isMindset ? <div className="inline-callout warning page-callout"><strong>Preference conflict behavior — Status: Open</strong><span>The product specification does not yet define merge, override, or priority rules. This interface therefore exposes scope without applying silent precedence.</span></div> : null}
    <Card className="filter-bar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind}…`} /></label><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="">All scopes</option><option value="global">Global</option><option value="endeavor">Endeavor</option><option value="task">Task</option>{isMindset ? <option value="prompt">Prompt</option> : null}</select></Card>
    {records.length ? <div className="entity-grid">{records.map((record) => {
      const content = isMindset ? (record as Mindset).content : (record as Preference).instruction;
      return <EntityCard key={record.id} title={record.title} meta={scopeLabel(data, record.scopeType, record.scopeId)} excerpt={content} icon={<Icon />} badges={<><Badge tone={record.scopeType === "global" ? "purple" : "info"}>{record.scopeType}</Badge>{isMindset && (record as Mindset).manualAiGeneratedMindset ? <Badge tone="warning">Manual AI placeholder filled</Badge> : null}</>} onOpen={() => setSelection({ collection: kind as CollectionName, id: record.id })} onEdit={() => openEdit(kind, record.id)} onArchive={() => requestArchive(kind, record.id)} />;
    })}</div> : <Card><EmptyState icon={<Icon />} title={`No ${kind} found`} description={query || scope ? "Adjust the current filters." : `Create the first ${isMindset ? "methodology artifact" : "working preference"} in this workspace.`} action={!query && !scope ? <Button variant="primary" onClick={() => openCreate(kind)}>Create {isMindset ? "mindset" : "preference"}</Button> : undefined} /></Card>}
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
