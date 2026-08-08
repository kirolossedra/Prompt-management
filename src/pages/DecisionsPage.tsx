import { Archive, CheckCircle2, CircleHelp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useVault } from "../context/VaultContext";
import { activeRecords } from "../lib/utils";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { ActionMenu } from "../components/ui/ActionMenu";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";

export function DecisionsPage() {
  const { data } = useVault();
  const { openCreate, openEdit, requestArchive, requestDelete } = useEntityUi();
  const [selected, setSelected] = useState<string | null>(null);
  const decisions = activeRecords(data.decisions);
  return <div className="records-page"><header className="workspace-heading workspace-heading--compact"><div><span className="eyebrow">Product discipline</span><h1>Decision log</h1><p>Every research question remains explicitly Open or Finalized so the product never silently invents behavior.</p></div><Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("decisions")}>New decision</Button></header><div className="records-table">{decisions.map((decision) => <div className="record-row" key={decision.id}><button className="record-row__main" onClick={() => setSelected(decision.id)}><span className="artifact-icon">{decision.status === "Open" ? <CircleHelp size={17} /> : <CheckCircle2 size={17} />}</span><span><strong>{decision.title}</strong><p>{decision.question}</p></span></button><Badge tone={decision.status === "Open" ? "warning" : "success"}>{decision.status}</Badge><ActionMenu items={[{ label: "Edit", icon: <Pencil size={15} />, onSelect: () => openEdit("decisions", decision.id) }, { label: "Archive", icon: <Archive size={15} />, onSelect: () => requestArchive("decisions", decision.id), separatorBefore: true }, { label: "Delete", icon: <Trash2 size={15} />, onSelect: () => requestDelete("decisions", decision.id), danger: true }]} /></div>)}</div><RecordDetailDrawer selection={selected ? { collection: "decisions", id: selected } : null} onClose={() => setSelected(null)} /></div>;
}
