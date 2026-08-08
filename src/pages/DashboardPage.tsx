import { useMemo } from "react";
import { ArrowRight, Brain, Camera, FileCode2, Network, Plus, Sparkles, Target, Trophy } from "lucide-react";
import { useNavigate } from "react-router";
import { useVault } from "../context/VaultContext";
import { evaluateAchievements } from "../lib/achievements";
import { activeRecords, formatRelativeTime, taskPath } from "../lib/utils";
import { useEntityUi } from "../components/entities/EntityUiProvider";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function DashboardPage() {
  const { data, profile, engagement } = useVault();
  const { openCreate } = useEntityUi();
  const navigate = useNavigate();
  const prompts = activeRecords(data.prompts);
  const promptVersions = activeRecords(data.promptVersions);
  const globalVersions = activeRecords(data.globalCommits);

  const recentPrompts = prompts.slice(0, 6);
  const recentVersions = useMemo(() => promptVersions.slice(0, 7), [promptVersions]);
  const latestGlobal = globalVersions[0];
  const achievementStatuses = useMemo(() => evaluateAchievements(data, engagement), [data, engagement]);
  const unlockedAchievements = achievementStatuses.filter((item) => item.unlock);
  const nearestAchievement = achievementStatuses
    .filter((item) => !item.unlock)
    .sort((a, b) => b.ratio - a.ratio)[0];

  return (
    <div className="dashboard-page">
      <header className="workspace-heading">
        <div><span className="eyebrow">Personal knowledge system</span><h1>{profile?.workspaceName || "IntellectVault"}</h1><p>Preserve the prompts, methods, and versions that define how you work.</p></div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => openCreate("prompts")}>New prompt</Button>
      </header>

      <section className="summary-strip" aria-label="Vault summary">
        <button onClick={() => navigate("/hierarchy")}><Network size={17} /><span><strong>{activeRecords(data.endeavors).length}</strong><small>Endeavors</small></span></button>
        <button onClick={() => navigate("/hierarchy")}><Target size={17} /><span><strong>{activeRecords(data.tasks).length}</strong><small>Tasks</small></span></button>
        <button onClick={() => navigate("/prompts")}><FileCode2 size={17} /><span><strong>{prompts.length}</strong><small>Prompts</small></span></button>
        <button onClick={() => navigate("/mindsets")}><Brain size={17} /><span><strong>{activeRecords(data.mindsets).length}</strong><small>Mindsets</small></span></button>
      </section>

      <div className="dashboard-workspace-grid">
        <section className="workspace-section workspace-section--wide">
          <div className="section-heading"><div><span className="eyebrow">Continue working</span><h2>Recently edited prompts</h2></div><button className="text-action" onClick={() => navigate("/prompts")}>View library <ArrowRight size={15} /></button></div>
          {recentPrompts.length ? <div className="recent-prompt-list">{recentPrompts.map((prompt) => <button key={prompt.id} onClick={() => navigate(`/prompts/${prompt.id}`)}><span className="artifact-icon"><FileCode2 size={17} /></span><span className="recent-prompt-list__copy"><strong>{prompt.title}</strong><small>{taskPath(data, prompt.taskId)}</small></span><time>{formatRelativeTime(prompt.updatedAt)}</time><ArrowRight size={15} /></button>)}</div> : <EmptyState icon={<Sparkles />} title="Start your vault" description="Create your first prompt and its history begins automatically." action={<Button variant="primary" onClick={() => openCreate("prompts")}>Create prompt</Button>} />}
        </section>

        <section className="workspace-section version-activity-panel">
          <div className="section-heading"><div><span className="eyebrow">Local history</span><h2>Prompt versions</h2></div></div>
          {recentVersions.length ? <div className="version-feed">{recentVersions.map((version) => { const prompt = data.prompts[version.promptId]; return <button key={version.id} onClick={() => prompt && navigate(`/prompts/${prompt.id}?tab=history`)}><span className="version-badge">v{version.versionNumber || "—"}</span><span><strong>{prompt?.title || "Deleted prompt"}</strong><small>{version.changedFields?.join(", ") || version.changeDescription}</small></span><time>{formatRelativeTime(version.createdAt)}</time></button>; })}</div> : <p className="muted-copy">Prompt edits will appear here as automatic versions.</p>}
        </section>

        <section className="workspace-section global-version-panel">
          <div className="section-heading"><div><span className="eyebrow">Vault baseline</span><h2>Latest Global Version</h2></div><Camera size={18} /></div>
          {latestGlobal ? <button className="global-version-preview" onClick={() => navigate("/versions")}><span className="global-version-id">{latestGlobal.displayId}</span><strong>{latestGlobal.title}</strong><p>{latestGlobal.summary || "Snapshot of the complete vault."}</p><div><span>{latestGlobal.recordCounts?.prompts || 0} prompts</span><span>{formatRelativeTime(latestGlobal.commitTimestamp)}</span></div></button> : <div className="empty-inline"><p>No Global Version has been released yet.</p><Button size="sm" onClick={() => navigate("/versions")}>Release baseline</Button></div>}
        </section>


        <section className="workspace-section achievement-dashboard-panel">
          <div className="section-heading"><div><span className="eyebrow">Milestones</span><h2>Achievements</h2></div><button className="text-action" onClick={() => navigate("/achievements")}>View all <ArrowRight size={15} /></button></div>
          <button className="achievement-dashboard-summary" onClick={() => navigate("/achievements")}>
            <span className="achievement-dashboard-summary__icon"><Trophy size={21} /></span>
            <span><strong>{unlockedAchievements.length} of {achievementStatuses.length} unlocked</strong><small>{Object.keys(engagement.activityDays).length} active days tracked</small></span>
          </button>
          {nearestAchievement ? <button className="achievement-dashboard-next" onClick={() => navigate("/achievements")}><span><small>Closest milestone</small><strong>{nearestAchievement.title}</strong></span><span className="achievement-dashboard-progress"><i style={{ width: `${Math.max(4, nearestAchievement.ratio * 100)}%` }} /></span><small>{nearestAchievement.progressLabel(nearestAchievement.current, nearestAchievement.target)}</small></button> : <div className="achievement-dashboard-complete"><Sparkles size={18} /><span><strong>All current achievements unlocked</strong><small>Your vault has completed this milestone set.</small></span></div>}
        </section>

        <section className="workspace-section quick-actions-panel">
          <div className="section-heading"><div><span className="eyebrow">Create</span><h2>Quick actions</h2></div></div>
          <div className="quick-action-list"><button onClick={() => openCreate("endeavors")}><Network size={17} /><span><strong>New endeavor</strong><small>Start a major area of work</small></span></button><button onClick={() => openCreate("tasks")}><Target size={17} /><span><strong>New task</strong><small>Add focused work beneath an endeavor</small></span></button><button onClick={() => openCreate("prompts")}><FileCode2 size={17} /><span><strong>New prompt</strong><small>Create a version-tracked instruction</small></span></button><button onClick={() => navigate("/mindset-construction")}><Brain size={17} /><span><strong>Construct mindset</strong><small>Build a persona from selected prompts</small></span></button></div>
        </section>
      </div>
    </div>
  );
}
