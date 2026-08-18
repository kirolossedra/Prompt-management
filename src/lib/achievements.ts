import type {
  AchievementId,
  AchievementUnlock,
  VaultCollections,
  VaultEngagement,
} from "../types/domain";

export type AchievementCategory = "Foundation" | "Consistency" | "Craft" | "Judgment";
export type AchievementIconKey = "commit" | "globe" | "brain" | "compass" | "calendar" | "hammer" | "sparkles" | "scale";

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  shortLabel: string;
  description: string;
  category: AchievementCategory;
  icon: AchievementIconKey;
  target: number;
  progressLabel: (current: number, target: number) => string;
}

export interface AchievementStatus extends AchievementDefinition {
  current: number;
  ratio: number;
  met: boolean;
  earnedAt: number | null;
  unlock: AchievementUnlock | null;
}

const countLabel = (noun: string) => (current: number, target: number) => `${Math.min(current, target)} / ${target} ${noun}`;

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: "first-prompt-commit",
    title: "1st Prompt Commit (L.C.)",
    shortLabel: "Local Commit",
    description: "Change a prompt and preserve its first automatic local version commit.",
    category: "Foundation",
    icon: "commit",
    target: 1,
    progressLabel: countLabel("commit"),
  },
  {
    id: "first-global-commit",
    title: "1st Global Commit",
    shortLabel: "Global Commit",
    description: "Release the first Global Version snapshot of the vault.",
    category: "Foundation",
    icon: "globe",
    target: 1,
    progressLabel: countLabel("release"),
  },
  {
    id: "first-mindset",
    title: "1st Mindset",
    shortLabel: "Mindset",
    description: "Create the first mindset in the vault.",
    category: "Foundation",
    icon: "brain",
    target: 1,
    progressLabel: countLabel("mindset"),
  },
  {
    id: "first-endeavor",
    title: "1st Endeavour",
    shortLabel: "Endeavour",
    description: "Create the first Endeavour and establish a major area of work.",
    category: "Foundation",
    icon: "compass",
    target: 1,
    progressLabel: countLabel("Endeavour"),
  },
  {
    id: "active-7-days",
    title: "1 Week of Activity",
    shortLabel: "7 Active Days",
    description: "Use EurekaVault on 7 distinct calendar days. The days do not need to be consecutive.",
    category: "Consistency",
    icon: "calendar",
    target: 7,
    progressLabel: countLabel("active days"),
  },
  {
    id: "active-30-days",
    title: "30 Days of Activity",
    shortLabel: "30 Active Days",
    description: "Use EurekaVault on 30 distinct calendar days. The days do not need to be consecutive.",
    category: "Consistency",
    icon: "calendar",
    target: 30,
    progressLabel: countLabel("active days"),
  },
  {
    id: "builder",
    title: "Builder",
    shortLabel: "Builder",
    description: "Build at least one prompt whose content is more than 500 characters.",
    category: "Craft",
    icon: "hammer",
    target: 501,
    progressLabel: (current, target) => `${Math.min(current, target)} / ${target} characters`,
  },
  {
    id: "fussy-builder",
    title: "Fussy Builder",
    shortLabel: "75% Long-form",
    description: "Have at least 75% of your active prompts contain more than 500 characters.",
    category: "Craft",
    icon: "sparkles",
    target: 75,
    progressLabel: (current, target) => `${Math.min(current, target).toFixed(0)}% / ${target}% long-form prompts`,
  },
  {
    id: "skeptical",
    title: "Skeptical",
    shortLabel: "Decision Revised",
    description: "Change a decision for the first time by revising its status or resolution.",
    category: "Judgment",
    icon: "scale",
    target: 1,
    progressLabel: countLabel("decision change"),
  },
] as const;

function promptCommitCount(data: VaultCollections) {
  return Object.values(data.promptVersions).filter((version) =>
    (version.versionNumber || 0) > 1 || version.changeType === "updated" || version.changeType === "manual",
  ).length;
}

function activePromptValues(data: VaultCollections) {
  return Object.values(data.prompts).filter((prompt) => !prompt.archivedAt);
}

export function achievementProgress(data: VaultCollections, engagement: VaultEngagement): Record<AchievementId, number> {
  const prompts = activePromptValues(data);
  const longPrompts = prompts.filter((prompt) => (prompt.content || "").length > 500);
  const longestPrompt = prompts.reduce((max, prompt) => Math.max(max, (prompt.content || "").length), 0);
  const longPromptPercentage = prompts.length ? (longPrompts.length / prompts.length) * 100 : 0;
  const decisionChanged = Number(engagement.activityStats.actionCounts?.decision_changed || 0) > 0;

  return {
    "first-prompt-commit": promptCommitCount(data),
    "first-global-commit": Object.keys(data.globalCommits).length,
    "first-mindset": Object.keys(data.mindsets).length,
    "first-endeavor": Object.keys(data.endeavors).length,
    "active-7-days": Object.keys(engagement.activityDays).length,
    "active-30-days": Object.keys(engagement.activityDays).length,
    builder: longestPrompt,
    "fussy-builder": longPromptPercentage,
    skeptical: decisionChanged ? 1 : 0,
  };
}


function earliest(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.min(...valid) : null;
}

function earnedAtFor(id: AchievementId, data: VaultCollections, engagement: VaultEngagement): number | null {
  if (id === "first-prompt-commit") {
    return earliest(Object.values(data.promptVersions).filter((version) => (version.versionNumber || 0) > 1 || version.changeType === "updated" || version.changeType === "manual").map((version) => version.createdAt));
  }
  if (id === "first-global-commit") return earliest(Object.values(data.globalCommits).map((version) => version.commitTimestamp || version.createdAt));
  if (id === "first-mindset") return earliest(Object.values(data.mindsets).map((item) => item.createdAt));
  if (id === "first-endeavor") return earliest(Object.values(data.endeavors).map((item) => item.createdAt));
  if (id === "active-7-days" || id === "active-30-days") {
    const target = id === "active-7-days" ? 7 : 30;
    const days = Object.values(engagement.activityDays).sort((a, b) => a.date.localeCompare(b.date));
    return days.length >= target ? days[target - 1]?.lastAt || null : null;
  }
  if (id === "builder") {
    return earliest(Object.values(data.promptVersions).filter((version) => (version.snapshot?.content || version.content || "").length > 500).map((version) => version.createdAt));
  }
  if (id === "skeptical") {
    return engagement.activityStats.actionFirstAt?.decision_changed || null;
  }
  return null;
}

export function evaluateAchievements(data: VaultCollections, engagement: VaultEngagement): AchievementStatus[] {
  const progress = achievementProgress(data, engagement);
  return ACHIEVEMENTS.map((achievement) => {
    const liveCurrent = progress[achievement.id];
    const unlock = engagement.achievements[achievement.id] || null;
    const current = unlock ? Math.max(liveCurrent, unlock.progressAtUnlock, achievement.target) : liveCurrent;
    return {
      ...achievement,
      current,
      ratio: Math.max(0, Math.min(1, current / achievement.target)),
      met: Boolean(unlock) || liveCurrent >= achievement.target,
      earnedAt: unlock?.unlockedAt || earnedAtFor(achievement.id, data, engagement),
      unlock,
    };
  });
}

export function achievementById(id: AchievementId) {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id);
}
