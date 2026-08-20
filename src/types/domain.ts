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
  | "ai.prompt-finder.searched"
  | "ai.prompt-finder.feedback"
  | "ai.prompt-repurpose.generated"
  | "ai.prompt-mixer.generated"
  | "ai.prompt-block.pipeline-created"
  | "ai.prompt-block.pipeline-updated"
  | "ai.prompt-block.pipeline-run"
  | "ai.prompt-block.output-saved"
  | "ai.prompt-block.transform-prompt-updated";

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


export interface PromptFinderFeedbackMatch {
  promptId: string;
  score: number;
}

export interface PromptFinderFeedback extends BaseRecord {
  query: string;
  selectedPromptId: string;
  selectedPromptTitleSnapshot: string;
  matches: PromptFinderFeedbackMatch[];
  model: string;
  corpusSize: number;
  learningExampleCount: number;
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



export type PromptBlockFamily = "input" | "transform" | "constraint" | "output";
export type PromptBlockFlowType = "content" | "constraint";
export type PromptBlockReferenceMode = "current" | "pinned";
export type PromptBlockRunStatus = "idle" | "waiting" | "running" | "completed" | "failed" | "blocked";

export type PromptBlockAiOperation =
  | "context-free"
  | "extract-context"
  | "fill-context"
  | "less-detailed"
  | "more-detailed"
  | "without-markdown"
  | "with-markdown"
  | "addition"
  | "subtraction"
  | "extract-style"
  | "summarized"
  | "conclusion-only";

export type PromptBlockKind =
  | "system-prompt"
  | "direct-input"
  | "context-free"
  | "extract-context"
  | "fill-context"
  | "less-detailed"
  | "more-detailed"
  | "without-markdown"
  | "with-markdown"
  | "addition"
  | "subtraction"
  | "extract-style"
  | "mindset-constraint"
  | "extracted-style-constraint"
  | "as-is"
  | "summarized"
  | "conclusion-only";

export interface PromptBlockPosition {
  x: number;
  y: number;
}

export interface PromptBlockNodeConfig {
  directText?: string;
  promptId?: string;
  promptReferenceMode?: PromptBlockReferenceMode;
  promptVersionId?: string;
  mindsetId?: string;
}

export interface PromptBlockNodeDefinition {
  id: string;
  family: PromptBlockFamily;
  kind: PromptBlockKind;
  label: string;
  variableLabel: string;
  position: PromptBlockPosition;
  config: PromptBlockNodeConfig;
}

export interface PromptBlockConnection {
  id: string;
  sourceBlockId: string;
  sourcePortId: string;
  targetBlockId: string;
  targetPortId: string;
  flowType: PromptBlockFlowType;
  priority?: number;
}

export interface PromptBlockPipeline extends BaseRecord {
  title: string;
  description: string;
  schemaVersion: 1;
  blocks: Record<string, PromptBlockNodeDefinition>;
  connections: Record<string, PromptBlockConnection>;
}

export interface PromptBlockTransformPrompt extends BaseRecord {
  operation: PromptBlockAiOperation;
  title: string;
  content: string;
  seedVersion: number;
}

export interface PromptBlockConstraintValue {
  label: string;
  content: string;
  sourceType: "mindset" | "extracted-style";
  sourceId?: string;
}

export interface PromptBlockRuntimeValue {
  flowType: PromptBlockFlowType;
  text?: string;
  constraint?: PromptBlockConstraintValue;
}

export interface PromptBlockRunNodeState {
  status: PromptBlockRunStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  output?: PromptBlockRuntimeValue;
  model?: string;
}

export interface PromptBlockRunState {
  startedAt: number;
  completedAt?: number;
  pipelineId?: string;
  nodeStates: Record<string, PromptBlockRunNodeState>;
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
  promptFinderFeedback?: Record<string, PromptFinderFeedback>;
  promptBlockPipelines?: Record<string, PromptBlockPipeline>;
  promptBlockTransformPrompts?: Record<string, PromptBlockTransformPrompt>;
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
  promptFinderFeedback: Record<string, PromptFinderFeedback>;
  promptBlockPipelines: Record<string, PromptBlockPipeline>;
  promptBlockTransformPrompts: Record<string, PromptBlockTransformPrompt>;
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
