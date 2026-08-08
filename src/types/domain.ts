export type CollectionName =
  | "endeavors"
  | "tasks"
  | "prompts"
  | "promptVersions"
  | "mindsets"
  | "preferences"
  | "localCommits"
  | "globalCommits"
  | "decisions";

export type ScopeType = "global" | "endeavor" | "task" | "prompt";
export type PreferenceScopeType = Exclude<ScopeType, "prompt">;
export type DecisionStatus = "Open" | "Finalized";


export type AchievementId =
  | "first-prompt-commit"
  | "first-global-commit"
  | "first-mindset"
  | "first-endeavor"
  | "active-7-days"
  | "active-30-days"
  | "builder"
  | "fussy-builder"
  | "skeptical";

export type ActivityAction =
  | "session.opened"
  | "record.created"
  | "record.updated"
  | "record.archived"
  | "record.restored"
  | "record.deleted"
  | "prompt.committed"
  | "global-version.released"
  | "decision.changed"
  | "attachment.added"
  | "attachment.removed"
  | "attachment.downloaded"
  | "relationship.added"
  | "relationship.updated"
  | "relationship.removed"
  | "relationship.map-downloaded"
  | "ai.prompt-finder.searched";

export interface ActivityDay {
  date: string;
  lastAt: number;
  eventCount: number;
  actionTypes?: Record<string, boolean>;
}

export interface ActivityStats {
  trackingStartedAt?: number;
  lastActivityAt?: number;
  lastAction?: ActivityAction;
  lastEntityType?: string;
  lastEntityId?: string;
  lastLabel?: string;
  totalEvents: number;
  actionCounts?: Record<string, number>;
  actionFirstAt?: Record<string, number>;
  actionLastAt?: Record<string, number>;
}

export interface AchievementUnlock {
  id: AchievementId;
  unlockedAt: number;
  progressAtUnlock: number;
}

export interface VaultEngagement {
  activityDays: Record<string, ActivityDay>;
  activityStats: ActivityStats;
  achievements: Partial<Record<AchievementId, AchievementUnlock>>;
}

export interface UserStamp {
  uid: string;
  email: string;
  displayName: string;
}

export interface BaseRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  createdBy: UserStamp;
  updatedBy: UserStamp;
  archivedAt?: number | null;
  archivedBy?: UserStamp | null;
}

export interface WorkspaceProfile {
  workspaceName: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: number;
  updatedAt: number;
}

export interface Endeavor extends BaseRecord {
  name: string;
  description: string;
  manualAgenticSummary: string;
}

export interface Task extends BaseRecord {
  name: string;
  description: string;
  purpose: string;
  endeavorId: string;
  manualSuggestedImprovement: string;
}

export interface Prompt extends BaseRecord {
  title: string;
  description: string;
  purpose: string;
  content: string;
  taskId: string;
  manualAgenticSummary: string;
  manualSuggestedImprovement: string;
  manualAiEvaluation: string;
  manualGeneratedContext: string;
}

export interface PromptSnapshot {
  title: string;
  description: string;
  purpose: string;
  content: string;
  taskId: string;
  manualAgenticSummary: string;
  manualSuggestedImprovement: string;
  manualAiEvaluation: string;
  manualGeneratedContext: string;
}


export interface PromptAttachment extends BaseRecord {
  promptId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64: string;
}

export interface PromptRelation extends BaseRecord {
  parentPromptId: string;
  childPromptId: string;
  relationshipType: "inspired-by";
}

export interface PromptVersion extends BaseRecord {
  promptId: string;
  versionLabel: string;
  versionNumber?: number;
  content: string;
  snapshot?: PromptSnapshot;
  changeDescription: string;
  changedFields?: string[];
  source?: "automatic" | "manual" | "copied";
  changeType?: "created" | "updated" | "copied" | "manual";
  localCommitId: string;
}

export interface Mindset extends BaseRecord {
  title: string;
  content: string;
  scopeType: ScopeType;
  scopeId: string;
  manualAiGeneratedMindset: string;
  sourcePromptIds?: string[];
  constructionMethod?: "manual" | "prompt-selection";
}

export interface Preference extends BaseRecord {
  title: string;
  instruction: string;
  scopeType: PreferenceScopeType;
  scopeId: string;
}

export interface LocalCommit extends BaseRecord {
  displayId: string;
  message: string;
  authorName: string;
  taskId: string;
  changedArtifacts: string[];
  description: string;
  commitToCommitSummary: string;
  previousState: string;
  resultingState: string;
  commitTimestamp: number;
}

export interface GlobalVersionSnapshot {
  capturedAt: number;
  profile: WorkspaceProfile | null;
  activityDays?: Record<string, ActivityDay>;
  activityStats?: ActivityStats;
  achievements?: Partial<Record<AchievementId, AchievementUnlock>>;
  endeavors: Record<string, Endeavor>;
  tasks: Record<string, Task>;
  prompts: Record<string, Prompt>;
  promptVersions: Record<string, PromptVersion>;
  promptAttachments?: Record<string, PromptAttachment>;
  promptRelations?: Record<string, PromptRelation>;
  mindsets: Record<string, Mindset>;
  preferences: Record<string, Preference>;
  localCommits: Record<string, LocalCommit>;
  decisions: Record<string, Decision>;
}

export interface GlobalCommit extends BaseRecord {
  displayId: string;
  title: string;
  authorName: string;
  summary: string;
  commitToCommitSummary: string;
  commitTimestamp: number;
  versionNumber?: number;
  snapshot?: GlobalVersionSnapshot;
  recordCounts?: Record<string, number>;
  taskIds?: string[];
  localCommitIds?: string[];
}

export interface Decision extends BaseRecord {
  title: string;
  category: string;
  status: DecisionStatus;
  question: string;
  resolution: string;
  notes: string;
}

export interface VaultCollections {
  endeavors: Record<string, Endeavor>;
  tasks: Record<string, Task>;
  prompts: Record<string, Prompt>;
  promptVersions: Record<string, PromptVersion>;
  promptAttachments: Record<string, PromptAttachment>;
  promptRelations: Record<string, PromptRelation>;
  mindsets: Record<string, Mindset>;
  preferences: Record<string, Preference>;
  localCommits: Record<string, LocalCommit>;
  globalCommits: Record<string, GlobalCommit>;
  decisions: Record<string, Decision>;
}

export type VaultRecord = VaultCollections[CollectionName][string];
export type RecordInput<T extends VaultRecord> = Omit<T, keyof BaseRecord | "id">;

export interface Selection {
  collection: CollectionName;
  id: string;
}

export interface EntityDialogState {
  kind: CollectionName;
  id?: string;
  defaults?: Record<string, string>;
}
