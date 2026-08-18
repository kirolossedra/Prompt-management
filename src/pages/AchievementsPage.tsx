import {
  Brain,
  CalendarDays,
  Check,
  CircleDotDashed,
  Compass,
  GitCommitHorizontal,
  Globe2,
  Hammer,
  LockKeyhole,
  Scale,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { useVault } from "../context/VaultContext";
import { ACHIEVEMENTS, evaluateAchievements, type AchievementIconKey } from "../lib/achievements";
import { formatDate } from "../lib/utils";

const iconMap: Record<AchievementIconKey, typeof Trophy> = {
  commit: GitCommitHorizontal,
  globe: Globe2,
  brain: Brain,
  compass: Compass,
  calendar: CalendarDays,
  hammer: Hammer,
  sparkles: Sparkles,
  scale: Scale,
};

const categoryOrder = ["Foundation", "Consistency", "Craft", "Judgment"] as const;

export function AchievementsPage() {
  const { data, engagement } = useVault();
  const statuses = useMemo(() => evaluateAchievements(data, engagement), [data, engagement]);
  const unlocked = statuses.filter((item) => item.unlock);
  const latest = [...unlocked].sort((a, b) => Number(b.unlock?.unlockedAt || 0) - Number(a.unlock?.unlockedAt || 0))[0];
  const activeDays = Object.keys(engagement.activityDays).length;
  const completion = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);

  return (
    <div className="achievements-page">
      <header className="workspace-heading workspace-heading--compact achievement-heading">
        <div>
          <span className="eyebrow">Vault milestones</span>
          <h1>Achievements</h1>
          <p>Milestones unlock automatically from your real vault history, prompt craft, decisions, and activity.</p>
        </div>
        <div className="achievement-completion" aria-label={`${unlocked.length} of ${ACHIEVEMENTS.length} achievements unlocked`}>
          <span className="achievement-completion__ring" style={{ "--achievement-progress": `${completion}%` } as CSSProperties}>
            <strong>{completion}%</strong>
          </span>
          <span><strong>{unlocked.length} / {ACHIEVEMENTS.length}</strong><small>Unlocked</small></span>
        </div>
      </header>

      <section className="achievement-overview" aria-label="Achievement overview">
        <div><Trophy size={18} /><span><strong>{unlocked.length}</strong><small>Milestones earned</small></span></div>
        <div><CalendarDays size={18} /><span><strong>{activeDays}</strong><small>Distinct active days</small></span></div>
        <div>{latest ? <Check size={18} /> : <CircleDotDashed size={18} />}<span><strong>{latest?.title || "No unlock yet"}</strong><small>{latest?.unlock ? `Latest · ${formatDate(latest.unlock.unlockedAt)}` : "Your first milestone is waiting"}</small></span></div>
      </section>

      <div className="achievement-categories">
        {categoryOrder.map((category) => {
          const items = statuses.filter((item) => item.category === category);
          return (
            <section className="achievement-category" key={category}>
              <div className="section-heading achievement-category__heading">
                <div><span className="eyebrow">{category}</span><h2>{category === "Foundation" ? "Build the vault" : category === "Consistency" ? "Keep showing up" : category === "Craft" ? "Develop your prompts" : "Challenge your own decisions"}</h2></div>
                <span>{items.filter((item) => item.unlock).length}/{items.length}</span>
              </div>
              <div className="achievement-grid">
                {items.map((achievement) => {
                  const Icon = iconMap[achievement.icon];
                  const unlockedAt = achievement.unlock?.unlockedAt;
                  return (
                    <article className={`achievement-card ${unlockedAt ? "achievement-card--unlocked" : "achievement-card--locked"}`} key={achievement.id}>
                      <div className="achievement-card__topline">
                        <span className="achievement-medallion" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
                        <span className="achievement-state">{unlockedAt ? <><Check size={13} /> Unlocked</> : <><LockKeyhole size={13} /> Locked</>}</span>
                      </div>
                      <div className="achievement-card__copy">
                        <span className="eyebrow">{achievement.shortLabel}</span>
                        <h3>{achievement.title}</h3>
                        <p>{achievement.description}</p>
                      </div>
                      <div className="achievement-progress">
                        <div className="achievement-progress__track"><span style={{ width: `${Math.max(4, achievement.ratio * 100)}%` }} /></div>
                        <div className="achievement-progress__meta"><span>{achievement.progressLabel(achievement.current, achievement.target)}</span>{unlockedAt ? <time>{formatDate(unlockedAt)}</time> : <span>{Math.round(achievement.ratio * 100)}%</span>}</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="activity-method-note">
        <CalendarDays size={18} />
        <div><strong>How activity is counted</strong><p>An active day is a distinct local calendar day on which you open EurekaVault. Meaningful create, edit, version, archive, restore, delete, decision, and Global Version actions are also recorded for future activity insights. Activity achievements are cumulative, not streak-based.</p></div>
      </section>
    </div>
  );
}
