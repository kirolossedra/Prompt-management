import { Bot, Braces, Bug, GitBranch, ServerCog } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

const openIssues = [
  "#1 Documentation / roadmap accuracy",
  "#2 AI version comparison",
  "#3 Configurable base prompts + revision history (epic)",
  "#4 Architecture helper AI (epic)",
  "#5 AI commit/change messages",
  "#6 Explorer hover + AI summary",
  "#7 Prompt Blocks (epic; MVP implemented)",
  "#8 New Prompt lingering UI bug",
  "#9 EurekaVault rebrand",
  "#10 Frontend overhaul",
  "#11 CI/CD (epic; core implemented)",
  "#12 2-tier → 3-tier (epic; in progress)",
  "#13 Favorite/bookmark Prompts",
  "#14 Mobile Decisions bottom-bar bug",
  "#15 Relationship-instance design proposal",
  "#16 Frontend changes triggering backend deploy",
  "#17 Pipeline beautify + print (addressed in code)",
  "#18 Final pipeline output scrolling (addressed in code)",
];

export function RoadmapPage() {
  return <>
    <PageHeader
      eyebrow="Evidence-backed planning"
      title="Roadmap"
      description="Commit history shows what shipped. GitHub Issues and real epic labels show what has actually been raised. This page does not invent dates, priorities, or future commitments."
    />
    <div className="roadmap-grid">
      <Card className="roadmap-card">
        <div className="roadmap-card__icon"><Braces /></div>
        <div>
          <div className="card-header"><h2>Prompt Blocks · #7</h2><Badge tone="success">MVP implemented</Badge></div>
          <p>The `epic` Issue remains open, but the typed Prompt-processing DAG is implemented. Commit <code>b556e64</code> delivered the MVP and <code>7e45248</code> added beautification, print, compact run controls, output-intent warning, and reachable final output inspection.</p>
          <div className="inline-callout"><strong>Scope rule</strong><span>The broader ideas written inside Issue #7 are not automatically treated as promised follow-up work.</span></div>
        </div>
      </Card>

      <Card className="roadmap-card">
        <div className="roadmap-card__icon"><GitBranch /></div>
        <div>
          <div className="card-header"><h2>CI/CD · #11</h2><Badge tone="success">Core implemented</Badge></div>
          <p>The `epic` has real implementation evidence: frontend/backend quality gates, Docker runtime smoke testing, and gated Netlify/Render deployment hooks.</p>
          <div className="roadmap-block"><strong>Still open</strong><span><Bug size={14} /> #16 asks why frontend-only changes trigger backend deployment; the current workflow is not path-split.</span></div>
        </div>
      </Card>

      <Card className="roadmap-card">
        <div className="roadmap-card__icon"><ServerCog /></div>
        <div>
          <div className="card-header"><h2>2-tier → 3-tier · #12</h2><Badge tone="warning">In progress</Badge></div>
          <p>The `architecture` + `epic` Issue explicitly chooses Spring Boot. Commit <code>4a3cc23</code> added the Java 21/Spring Boot/Render foundation.</p>
          <div className="inline-callout"><strong>Current boundary</strong><span>Vault CRUD still goes directly to Firebase and Gemini calls still use Netlify Functions, so the functional migration is not complete.</span></div>
        </div>
      </Card>

      <Card className="roadmap-card">
        <div className="roadmap-card__icon"><Bot /></div>
        <div>
          <div className="card-header"><h2>Other actual epics</h2><Badge tone="warning">Open</Badge></div>
          <div className="roadmap-block">
            <strong>GitHub-labelled epics</strong>
            <span>#3 — configurable base prompts + revision history: partial Prompt Blocks-specific support only</span>
            <span>#4 — architecture helper AI: no implementation evidence found</span>
          </div>
        </div>
      </Card>

      <Card className="roadmap-card">
        <div className="roadmap-card__icon"><Bug /></div>
        <div>
          <div className="card-header"><h2>Open Issue ledger</h2><Badge tone="neutral">Unscheduled</Badge></div>
          <p>All 18 Issues are open in GitHub at this snapshot. Open status is kept separate from implementation evidence.</p>
          <div className="roadmap-block">
            <strong>No inferred ordering</strong>
            {openIssues.map((issue) => <span key={issue}>{issue}</span>)}
          </div>
        </div>
      </Card>
    </div>
  </>;
}
