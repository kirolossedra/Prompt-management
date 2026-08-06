import type { CollectionName, Decision } from "../types/domain";

export const COLLECTION_LABELS: Record<CollectionName, string> = {
  endeavors: "Endeavor",
  tasks: "Task",
  prompts: "Prompt",
  promptVersions: "Prompt version",
  mindsets: "Mindset",
  preferences: "Preference",
  localCommits: "Local commit",
  globalCommits: "Global commit",
  decisions: "Decision",
};

export const EMPTY_COLLECTIONS = {
  endeavors: {},
  tasks: {},
  prompts: {},
  promptVersions: {},
  mindsets: {},
  preferences: {},
  localCommits: {},
  globalCommits: {},
  decisions: {},
};

export const OPEN_PRODUCT_DECISIONS = [
  ["Markup format", "Markup-defined hierarchy", "Which approved markup format should define endeavors, tasks, and prompt placeholders?"],
  ["Prompt-version creation behavior", "Prompt versions", "Should versions be created manually, on every edit, or only through local commits?"],
  ["Mindset internal structure", "Mindsets", "Should mindsets remain free text or use structured fields?"],
  ["Mindset inheritance", "Mindsets", "How should scoped mindsets combine, inherit, and resolve conflicts?"],
  ["Preference precedence", "Preferences", "Should scoped preferences merge, override, or surface conflicts without resolution?"],
  ["Collaboration storage model", "Collaboration", "Should collaborators edit live shared records, replicas, or synchronized copies?"],
  ["Collaboration roles and permissions", "Collaboration", "Which ownership, role, invitation, and departure rules should apply?"],
  ["Exact future-AI placeholders", "Future AI", "Which additional manually editable placeholder fields should exist before AI integration?"],
] as const;

export const FINALIZED_DECISIONS = [
  ["Manual-first Release 1", "Release scope", "Release 1 performs no AI calls or automatic AI generation."],
  ["Direct hierarchy", "Hierarchy", "The hierarchy is Endeavor → Task → Prompt → Prompt version. Folder entities are not used."],
  ["Manual prompt history", "Prompt versions", "Previous prompt content is preserved through explicit version records."],
  ["Two commit levels", "Change tracking", "The product supports user-controlled local and global commits."],
  ["Private by default", "Workspace", "Workspace content is owner-private unless future collaboration is explicitly configured."],
  ["Full content CRUD", "Data lifecycle", "Implemented content records support create, read, update, archive/restore, and dependency-safe permanent deletion."],
] as const;

export function initialDecisions(): Omit<Decision, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">[] {
  const open = OPEN_PRODUCT_DECISIONS.map(([title, category, question]) => ({
    title,
    category,
    status: "Open" as const,
    question,
    resolution: "",
    notes: "This decision must not be resolved silently.",
  }));
  const finalized = FINALIZED_DECISIONS.map(([title, category, resolution]) => ({
    title,
    category,
    status: "Finalized" as const,
    question: title,
    resolution,
    notes: "Imported from the approved Release 1 specification and subsequent product decisions.",
  }));
  return [...open, ...finalized];
}
