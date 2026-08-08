import { activeRecords } from "../lib/utils";
import type { VaultCollections } from "../types/domain";
import type { SearchablePrompt } from "./types";

export const MAX_PROMPT_INDEX_ITEMS = 200;
export const MAX_PROMPT_INDEX_CONTENT_CHARS = 24_000;

function compactContent(value: string): string {
  const content = String(value || "").trim();
  if (content.length <= MAX_PROMPT_INDEX_CONTENT_CHARS) return content;

  const tailLength = 8_000;
  const headLength = MAX_PROMPT_INDEX_CONTENT_CHARS - tailLength;
  return `${content.slice(0, headLength)}\n\n[...middle omitted for retrieval payload...]\n\n${content.slice(-tailLength)}`;
}

export function buildActivePromptIndex(data: VaultCollections): SearchablePrompt[] {
  return activeRecords(data.prompts)
    .slice(0, MAX_PROMPT_INDEX_ITEMS)
    .map((prompt) => {
      const task = data.tasks[prompt.taskId];
      const endeavor = task ? data.endeavors[task.endeavorId] : undefined;
      return {
        id: prompt.id,
        title: String(prompt.title || "").trim(),
        description: String(prompt.description || "").trim(),
        purpose: String(prompt.purpose || "").trim(),
        content: compactContent(prompt.content),
        task: String(task?.name || "Unassigned task").trim(),
        endeavor: String(endeavor?.name || "Unassigned endeavor").trim(),
      };
    });
}
