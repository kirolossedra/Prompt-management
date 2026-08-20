import { Bot, Braces, CircleHelp, LockKeyhole, UsersRound } from "lucide-react";
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
    <PageHeader eyebrow="Product boundaries" title="Roadmap gates" description="Unresolved product decisions remain visible here, while implemented AI capabilities are described according to the current repository rather than the superseded manual-only Release 1 boundary." />
    <div className="roadmap-grid">
      <Card className="roadmap-card"><div className="roadmap-card__icon"><Braces /></div><div><div className="card-header"><h2>Markup-defined hierarchy</h2><Badge tone="warning">Status: Open</Badge></div><p>The product must eventually create endeavors, tasks, and prompt placeholders from approved markup.</p><div className="roadmap-block"><strong>Blocked by</strong>{markup.length ? markup.map((decision) => <span key={decision.id}><CircleHelp size={14} /> {decision.title}</span>) : <span><CircleHelp size={14} /> Exact markup format approval</span>}</div><div className="inline-callout"><strong>Current behavior</strong><span>Manual CRUD is fully available. No custom language or parser has been invented.</span></div></div></Card>
      <Card className="roadmap-card"><div className="roadmap-card__icon"><UsersRound /></div><div><div className="card-header"><h2>Collaboration</h2><Badge tone="warning">Status: Open</Badge></div><p>Collaboration is required at a high level, but its ownership, permission, replica, synchronization, invitation, and conflict model remain unresolved.</p><div className="roadmap-block"><strong>Blocked by</strong>{collaboration.map((decision) => <span key={decision.id}><CircleHelp size={14} /> {decision.title}</span>)}</div><div className="inline-callout"><strong>Current behavior</strong><span>Each Firebase UID has an owner-private workspace. No shared storage model is implied.</span></div></div></Card>
      <Card className="roadmap-card"><div className="roadmap-card__icon"><Bot /></div><div><div className="card-header"><h2>AI execution boundary</h2><Badge tone="success">Implemented</Badge></div><p>Semantic Finder, Repurposer, Prompt Mixer, and Prompt Blocks use authenticated Netlify Functions as the current server-side Gemini boundary. Prompt Blocks executes only the inputs and ordered constraints needed for the current transformation.</p><div className="roadmap-block"><strong>Current safeguards</strong><span><LockKeyhole size={14} /> Gemini API key remains server-side</span><span><LockKeyhole size={14} /> Source Prompts are not overwritten by generation</span><span><LockKeyhole size={14} /> Prompt Blocks runtime values persist only on explicit save</span></div><div className="inline-callout"><strong>Still manual</strong><span>Legacy agentic-summary, generated-context, suggested-improvement, generated-mindset, and evaluation fields remain manually editable unless a dedicated implemented workflow says otherwise.</span></div></div></Card>
    </div>
  </>;
}
