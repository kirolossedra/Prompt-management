import type { CollectionName, Decision } from "../types/domain";

export const COLLECTION_LABELS: Record<CollectionName, string> = {
  endeavors: "Endeavor",
  tasks: "Task",
  prompts: "Prompt",
  promptVersions: "Prompt version",
  mindsets: "Mindset",
  preferences: "Preference",
  localCommits: "Legacy local commit",
  globalCommits: "Global version",
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
  ["Mindset inheritance", "Mindsets", "How should scoped mindsets combine, inherit, and resolve conflicts?"],
  ["Preference precedence", "Preferences", "Should scoped preferences merge, override, or surface conflicts without resolution?"],
  ["Collaboration storage model", "Collaboration", "Should collaborators edit live shared records, replicas, or synchronized copies?"],
  ["Collaboration roles and permissions", "Collaboration", "Which ownership, role, invitation, and departure rules should apply?"],
  ["Exact future-AI placeholders", "Future AI", "Which additional manually editable placeholder fields should exist before AI integration?"],
] as const;

export const FINALIZED_DECISIONS = [
  ["Manual-first Release 1", "Release scope", "Release 1 performs no AI calls or automatic AI generation."],
  ["Direct hierarchy", "Hierarchy", "The hierarchy is Endeavor → Task → Prompt → Prompt version."],
  ["Automatic prompt history", "Prompt versions", "Creating or saving a prompt automatically records a complete prompt snapshot in that prompt's local history."],
  ["Global versions", "Version control", "The owner can explicitly release a named global version containing a snapshot of the current vault."],
  ["Prompt copying", "Prompts", "A prompt can be copied into a new prompt with its own independent history."],
  ["Vault-wide prompt search", "Prompts", "Prompt word search runs across prompt fields and version content without requiring an endeavor or task filter."],
  ["Mindset construction", "Mindsets", "A persona-style mindset can be manually assembled from a user-selected set of prompts without AI generation."],
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
    notes: "Imported from approved product decisions.",
  }));
  return [...open, ...finalized];
}
