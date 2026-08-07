import type {
  BaseRecord,
  CollectionName,
  Prompt,
  PromptSnapshot,
  PromptVersion,
  VaultCollections,
  VaultRecord,
} from "../types/domain";

export function cleanText(value: unknown, maxLength = 10_000): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function asArray<T>(value: Record<string, T> | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : Object.values(value);
}

export function activeRecords<T extends BaseRecord>(records: Record<string, T>): T[] {
  return Object.values(records)
    .filter((record) => !record.archivedAt)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

export function archivedRecords<T extends BaseRecord>(records: Record<string, T>): T[] {
  return Object.values(records)
    .filter((record) => Boolean(record.archivedAt))
    .sort((a, b) => Number(b.archivedAt || 0) - Number(a.archivedAt || 0));
}

export function formatDate(timestamp?: number | null): string {
  if (!timestamp) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatRelativeTime(timestamp?: number | null): string {
  if (!timestamp) return "Never";
  const delta = timestamp - Date.now();
  const abs = Math.abs(delta);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60_000) return formatter.format(Math.round(delta / 1_000), "second");
  if (abs < 3_600_000) return formatter.format(Math.round(delta / 60_000), "minute");
  if (abs < 86_400_000) return formatter.format(Math.round(delta / 3_600_000), "hour");
  return formatter.format(Math.round(delta / 86_400_000), "day");
}

export function recordTitle(collection: CollectionName, record?: VaultRecord | null): string {
  if (!record) return "Unavailable record";
  const candidate = record as unknown as Record<string, unknown>;
  return String(
    candidate.title ??
      candidate.name ??
      candidate.message ??
      candidate.displayId ??
      "Untitled record",
  );
}

export function taskPath(data: VaultCollections, taskId: string): string {
  const task = data.tasks[taskId];
  if (!task) return "Unassigned task";
  const endeavor = data.endeavors[task.endeavorId];
  return [endeavor?.name, task.name].filter(Boolean).join(" / ");
}

export function promptPath(data: VaultCollections, promptId: string): string {
  const prompt = data.prompts[promptId];
  if (!prompt) return "Unavailable prompt";
  return `${taskPath(data, prompt.taskId)} / ${prompt.title}`;
}

export function scopeLabel(
  data: VaultCollections,
  scopeType: string,
  scopeId: string,
): string {
  if (scopeType === "global") return "Global";
  if (scopeType === "endeavor") return data.endeavors[scopeId]?.name || "Unavailable endeavor";
  if (scopeType === "task") return taskPath(data, scopeId);
  if (scopeType === "prompt") return promptPath(data, scopeId);
  return "Unknown scope";
}

export function promptSnapshot(prompt: Pick<Prompt,
  | "title"
  | "description"
  | "purpose"
  | "content"
  | "taskId"
  | "manualAgenticSummary"
  | "manualSuggestedImprovement"
  | "manualAiEvaluation"
  | "manualGeneratedContext"
>): PromptSnapshot {
  return {
    title: prompt.title || "",
    description: prompt.description || "",
    purpose: prompt.purpose || "",
    content: prompt.content || "",
    taskId: prompt.taskId || "",
    manualAgenticSummary: prompt.manualAgenticSummary || "",
    manualSuggestedImprovement: prompt.manualSuggestedImprovement || "",
    manualAiEvaluation: prompt.manualAiEvaluation || "",
    manualGeneratedContext: prompt.manualGeneratedContext || "",
  };
}

export function promptVersionSnapshot(version: PromptVersion): PromptSnapshot {
  return version.snapshot || {
    title: "",
    description: "",
    purpose: "",
    content: version.content || "",
    taskId: "",
    manualAgenticSummary: "",
    manualSuggestedImprovement: "",
    manualAiEvaluation: "",
    manualGeneratedContext: "",
  };
}

export function promptChangedFields(previous: PromptSnapshot, next: PromptSnapshot): string[] {
  return (Object.keys(previous) as Array<keyof PromptSnapshot>)
    .filter((key) => previous[key] !== next[key]);
}

export function matchesPromptWords(
  prompt: Prompt,
  versions: PromptVersion[],
  query: string,
): boolean {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (!words.length) return true;
  const versionText = versions
    .map((version) => JSON.stringify(version.snapshot || version.content || ""))
    .join(" ");
  const searchable = `${JSON.stringify(prompt)} ${versionText}`.toLowerCase();
  return words.every((word) => searchable.includes(word));
}

export function archiveBlockers(
  collection: CollectionName,
  id: string,
  data: VaultCollections,
): string[] {
  const blockers: string[] = [];
  if (collection === "endeavors") {
    const tasks = activeRecords(data.tasks).filter((task) => task.endeavorId === id).length;
    if (tasks) blockers.push(`${tasks} active task${tasks === 1 ? "" : "s"}`);
  }
  if (collection === "tasks") {
    const prompts = activeRecords(data.prompts).filter((prompt) => prompt.taskId === id).length;
    if (prompts) blockers.push(`${prompts} active prompt${prompts === 1 ? "" : "s"}`);
  }
  return blockers;
}

function artifactReferenceCount(collection: CollectionName, id: string, data: VaultCollections): number {
  const reference = `${collection}:${id}`;
  return Object.values(data.localCommits).filter((commit) => commit.changedArtifacts?.includes(reference)).length;
}

export function deleteBlockers(
  collection: CollectionName,
  id: string,
  data: VaultCollections,
): string[] {
  const blockers: string[] = [];

  if (collection === "endeavors") {
    const tasks = Object.values(data.tasks).filter((task) => task.endeavorId === id).length;
    const mindsets = Object.values(data.mindsets).filter((item) => item.scopeType === "endeavor" && item.scopeId === id).length;
    const preferences = Object.values(data.preferences).filter((item) => item.scopeType === "endeavor" && item.scopeId === id).length;
    if (tasks) blockers.push(`${tasks} task${tasks === 1 ? "" : "s"}`);
    if (mindsets) blockers.push(`${mindsets} endeavor mindset${mindsets === 1 ? "" : "s"}`);
    if (preferences) blockers.push(`${preferences} endeavor preference${preferences === 1 ? "" : "s"}`);
  }

  if (collection === "tasks") {
    const prompts = Object.values(data.prompts).filter((prompt) => prompt.taskId === id).length;
    const mindsets = Object.values(data.mindsets).filter((item) => item.scopeType === "task" && item.scopeId === id).length;
    const preferences = Object.values(data.preferences).filter((item) => item.scopeType === "task" && item.scopeId === id).length;
    const localCommits = Object.values(data.localCommits).filter((commit) => commit.taskId === id).length;
    if (prompts) blockers.push(`${prompts} prompt${prompts === 1 ? "" : "s"}`);
    if (mindsets) blockers.push(`${mindsets} task mindset${mindsets === 1 ? "" : "s"}`);
    if (preferences) blockers.push(`${preferences} task preference${preferences === 1 ? "" : "s"}`);
    if (localCommits) blockers.push(`${localCommits} legacy local commit${localCommits === 1 ? "" : "s"}`);
  }

  if (collection === "prompts") {
    const mindsets = Object.values(data.mindsets).filter((item) => item.scopeType === "prompt" && item.scopeId === id).length;
    const constructions = Object.values(data.mindsets).filter((item) => item.sourcePromptIds?.includes(id)).length;
    if (mindsets) blockers.push(`${mindsets} prompt mindset${mindsets === 1 ? "" : "s"}`);
    if (constructions) blockers.push(`${constructions} constructed mindset source reference${constructions === 1 ? "" : "s"}`);
  }

  if (collection === "localCommits") {
    const versions = Object.values(data.promptVersions).filter((version) => version.localCommitId === id).length;
    if (versions) blockers.push(`${versions} prompt version${versions === 1 ? "" : "s"}`);
  }

  if (["endeavors", "tasks", "prompts", "promptVersions", "mindsets", "preferences"].includes(collection)) {
    const references = artifactReferenceCount(collection, id, data);
    if (references) blockers.push(`${references} legacy local commit artifact reference${references === 1 ? "" : "s"}`);
  }

  return blockers;
}

export function matchesSearch(record: unknown, query: string): boolean {
  if (!query) return true;
  return JSON.stringify(record).toLowerCase().includes(query.toLowerCase());
}

export function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
