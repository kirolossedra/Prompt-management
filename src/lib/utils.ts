import type {
  BaseRecord,
  CollectionName,
  Folder,
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
  const folder = task.folderId ? data.folders[task.folderId] : undefined;
  return [endeavor?.name, folder?.name, task.name].filter(Boolean).join(" / ");
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

export function isFolderDescendant(
  folders: Record<string, Folder>,
  candidateParentId: string,
  folderId: string,
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === folderId) return true;
  const visited = new Set<string>();
  let cursor: Folder | undefined = folders[candidateParentId];
  while (cursor && !visited.has(cursor.id)) {
    if (cursor.parentFolderId === folderId) return true;
    visited.add(cursor.id);
    cursor = cursor.parentFolderId ? folders[cursor.parentFolderId] : undefined;
  }
  return false;
}

export function archiveBlockers(
  collection: CollectionName,
  id: string,
  data: VaultCollections,
): string[] {
  const blockers: string[] = [];
  if (collection === "endeavors") {
    const folders = activeRecords(data.folders).filter((folder) => folder.endeavorId === id).length;
    const tasks = activeRecords(data.tasks).filter((task) => task.endeavorId === id).length;
    if (folders) blockers.push(`${folders} active folder${folders === 1 ? "" : "s"}`);
    if (tasks) blockers.push(`${tasks} active task${tasks === 1 ? "" : "s"}`);
  }
  if (collection === "folders") {
    const folders = activeRecords(data.folders).filter((folder) => folder.parentFolderId === id).length;
    const tasks = activeRecords(data.tasks).filter((task) => task.folderId === id).length;
    if (folders) blockers.push(`${folders} active child folder${folders === 1 ? "" : "s"}`);
    if (tasks) blockers.push(`${tasks} active task${tasks === 1 ? "" : "s"}`);
  }
  if (collection === "tasks") {
    const prompts = activeRecords(data.prompts).filter((prompt) => prompt.taskId === id).length;
    if (prompts) blockers.push(`${prompts} active prompt${prompts === 1 ? "" : "s"}`);
  }
  if (collection === "prompts") {
    const versions = activeRecords(data.promptVersions).filter((version) => version.promptId === id).length;
    if (versions) blockers.push(`${versions} active version${versions === 1 ? "" : "s"}`);
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
