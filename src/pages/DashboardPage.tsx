import { useMemo, useState } from "react";
import { Brain, BriefcaseBusiness, FileCode2, GitCommitHorizontal, Plus, SlidersHorizontal, Sparkles } from "lucide-react";
import { useVault } from "../context/VaultContext";
import { activeRecords, formatRelativeTime, recordTitle } from "../lib/utils";
import type { CollectionName, Selection, VaultRecord } from "../types/domain";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { RecordDetailDrawer } from "../components/entities/RecordDetailDrawer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";

export function DashboardPage() {
  const { data, profile } = useVault();
  const { openCreate } = useEntityUi();
  const [selection, setSelection] = useState<Selection | null>(null);

  const recent = useMemo(() => {
    const kinds: CollectionName[] = ["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences", "localCommits", "globalCommits", "decisions"];
    return kinds.flatMap((kind) => activeRecords(data[kind] as Record<string, VaultRecord>).map((record) => ({ kind, record: record as VaultRecord })))
      .sort((a, b) => b.record.updatedAt - a.record.updatedAt)
      .slice(0, 8);
  }, [data]);

  const openDecisions = activeRecords(data.decisions).filter((item) => item.status === "Open");
  const localCount = activeRecords(data.localCommits).length;
  const globalCount = activeRecords(data.globalCommits).length;

  return <>
    <PageHeader
      eyebrow="Workspace overview"
      title={`Welcome to ${profile?.workspaceName || "IntellectVault"}`}
      description="Your manual-first system for preserving prompts, methodologies, preferences, and the meaning behind their evolution."
      actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("prompts")}>New prompt</Button>}
    />

    <div className="stats-grid">
      <StatCard label="Endeavors" value={activeRecords(data.endeavors).length} helper="Major areas of work" icon={<BriefcaseBusiness />} />
      <StatCard label="Prompts" value={activeRecords(data.prompts).length} helper={`${activeRecords(data.promptVersions).length} preserved versions`} icon={<FileCode2 />} delay={.04} />
      <StatCard label="Methodology" value={activeRecords(data.mindsets).length + activeRecords(data.preferences).length} helper="Mindsets and preferences" icon={<Brain />} delay={.08} />
      <StatCard label="Commits" value={localCount + globalCount} helper={`${localCount} local · ${globalCount} global`} icon={<GitCommitHorizontal />} delay={.12} />
    </div>

    <div className="dashboard-grid">
      <Card className="dashboard-card">
        <div className="card-header"><div><span className="eyebrow">Continue working</span><h2>Recent activity</h2></div></div>
        {recent.length ? <div className="activity-list">{recent.map(({ kind, record }) => <button key={`${kind}:${record.id}`} onClick={() => setSelection({ collection: kind, id: record.id })}><span className="activity-dot" /><div><strong>{recordTitle(kind, record)}</strong><small>{kind} · updated {formatRelativeTime(record.updatedAt)}</small></div></button>)}</div> : <EmptyState icon={<Sparkles />} title="Your vault is ready" description="Create an endeavor or prompt to start preserving your working methodology." action={<Button onClick={() => openCreate("endeavors")}>Create first endeavor</Button>} />}
      </Card>

      <div className="dashboard-side">
        <Card className="dashboard-card">
          <div className="card-header"><div><span className="eyebrow">Release discipline</span><h2>Open decisions</h2></div><Badge tone="warning">{openDecisions.length} Open</Badge></div>
          <p className="muted-copy">These decisions remain explicit so implementation does not silently invent product behavior.</p>
          <div className="compact-list">{openDecisions.slice(0, 5).map((decision) => <button key={decision.id} onClick={() => setSelection({ collection: "decisions", id: decision.id })}><span>{decision.category}</span><strong>{decision.title}</strong></button>)}</div>
        </Card>
        <Card className="dashboard-card">
          <div className="card-header"><div><span className="eyebrow">Quick create</span><h2>Add to the vault</h2></div></div>
          <div className="quick-create-grid">
            <button onClick={() => openCreate("endeavors")}><BriefcaseBusiness /><span>Endeavor</span></button>
            <button onClick={() => openCreate("tasks")}><BriefcaseBusiness /><span>Task</span></button>
            <button onClick={() => openCreate("prompts")}><FileCode2 /><span>Prompt</span></button>
            <button onClick={() => openCreate("mindsets")}><Brain /><span>Mindset</span></button>
            <button onClick={() => openCreate("preferences")}><SlidersHorizontal /><span>Preference</span></button>
            <button onClick={() => openCreate("localCommits")}><GitCommitHorizontal /><span>Local commit</span></button>
            <button onClick={() => openCreate("globalCommits")}><GitCommitHorizontal /><span>Global commit</span></button>
          </div>
        </Card>
      </div>
    </div>
    <RecordDetailDrawer selection={selection} onClose={() => setSelection(null)} />
  </>;
}
