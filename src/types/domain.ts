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

export interface PromptVersion extends BaseRecord {
  promptId: string;
  versionLabel: string;
  content: string;
  changeDescription: string;
  localCommitId: string;
}

export interface Mindset extends BaseRecord {
  title: string;
  content: string;
  scopeType: ScopeType;
  scopeId: string;
  manualAiGeneratedMindset: string;
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

export interface GlobalCommit extends BaseRecord {
  displayId: string;
  title: string;
  authorName: string;
  taskIds: string[];
  localCommitIds: string[];
  summary: string;
  commitToCommitSummary: string;
  commitTimestamp: number;
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
