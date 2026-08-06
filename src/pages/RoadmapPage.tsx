import { BotOff, Braces, CircleHelp, LockKeyhole, UsersRound } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords } from "../lib/utils";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function RoadmapPage() {
  const { data } = useVault();
  const open = activeRecords(data.decisions).filter((decision) => decision.status === "Open");
  const collaboration = open.filter((decision) => decision.category === "Collaboration");
  const markup = open.filter((decision) => decision.category.includes("Markup") || decision.title.toLowerCase().includes("markup"));

  return <>
    <PageHeader eyebrow="Approved boundary" title="Roadmap gates" description="Required future capabilities are visible here without implementing storage or behavior that the Release 1 specification still marks as Open." />
    <div className="roadmap-grid">
      <Card className="roadmap-card"><div className="roadmap-card__icon"><Braces /></div><div><div className="card-header"><h2>Markup-defined hierarchy</h2><Badge tone="warning">Status: Open</Badge></div><p>The product must eventually create endeavors, tasks, and prompt placeholders from approved markup.</p><div className="roadmap-block"><strong>Blocked by</strong>{markup.length ? markup.map((decision) => <span key={decision.id}><CircleHelp size={14} /> {decision.title}</span>) : <span><CircleHelp size={14} /> Exact markup format approval</span>}</div><div className="inline-callout"><strong>Current behavior</strong><span>Manual CRUD is fully available. No custom language or parser has been invented.</span></div></div></Card>
      <Card className="roadmap-card"><div className="roadmap-card__icon"><UsersRound /></div><div><div className="card-header"><h2>Collaboration</h2><Badge tone="warning">Status: Open</Badge></div><p>Collaboration is required at a high level, but its ownership, permission, replica, synchronization, invitation, and conflict model remain unresolved.</p><div className="roadmap-block"><strong>Blocked by</strong>{collaboration.map((decision) => <span key={decision.id}><CircleHelp size={14} /> {decision.title}</span>)}</div><div className="inline-callout"><strong>Current behavior</strong><span>Each Firebase UID has an owner-private workspace. No shared storage model is implied.</span></div></div></Card>
      <Card className="roadmap-card"><div className="roadmap-card__icon"><BotOff /></div><div><div className="card-header"><h2>AI-enabled features</h2><Badge tone="success">Excluded from R1</Badge></div><p>Agentic summaries, generated context, suggested improvements, generated mindsets, and evaluations remain manually editable placeholders only.</p><div className="roadmap-block"><strong>Release 1 guarantees</strong><span><LockKeyhole size={14} /> No AI provider integration</span><span><LockKeyhole size={14} /> No prompt execution</span><span><LockKeyhole size={14} /> No automatic generation or evaluation</span></div></div></Card>
    </div>
  </>;
}
