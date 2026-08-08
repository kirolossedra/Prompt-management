import { Archive, Brain, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useVault } from "../context/VaultContext";
import { activeRecords, scopeLabel } from "../lib/utils";
import type { Mindset, Preference } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";

export function ScopedRecordsPage({ kind }: { kind: "mindsets" | "preferences" }) {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isMindset = kind === "mindsets";
  const records: Array<Mindset | Preference> = isMindset
    ? activeRecords(data.mindsets)
    : activeRecords(data.preferences);

  return <div className="records-page">
    <header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">{isMindset ? "Methodology" : "Behavior rules"}</span><h1>{isMindset ? "Mindsets" : "Preferences"}</h1><p>{isMindset ? "Preserve the principles and intellectual approaches used across your work." : "Define how work should be performed at global, endeavor, or task scope."}</p></div><Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate(kind)}>New {isMindset ? "mindset" : "preference"}</Button></header>
    <div className="records-table">{records.map((record) => {
      const typed = record as Mindset | Preference;
      const body = isMindset ? (typed as Mindset).content : (typed as Preference).instruction;
      return <div className="record-row" key={record.id}><button className="record-row__main" onClick={() => setSelectedId(record.id)}><span className="artifact-icon">{isMindset ? <Brain size={17} /> : <SlidersHorizontal size={17} />}</span><span><strong>{typed.title}</strong><p>{body}</p></span></button><Badge tone="info">{scopeLabel(data, typed.scopeType, typed.scopeId)}</Badge><ActionMenu items={[{ label: "Edit", icon: <Pencil size={15} />, onSelect: () => openEdit(kind, record.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive(kind, record.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete(kind, record.id), danger: true }]} /></div>;
    })}</div>
    {!records.length ? <div className="empty-surface">{isMindset ? <Brain size={28} /> : <SlidersHorizontal size={28} />}<h2>No {isMindset ? "mindsets" : "preferences"} yet</h2><p>Create one to preserve this layer of your working system.</p></div> : null}
    <RecordDetailDrawer selection={selectedId ? { collection: kind, id: selectedId } : null} onClose={() => setSelectedId(null)} />
  </div>;
}
