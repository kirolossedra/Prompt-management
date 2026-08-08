import { activeRecords } from "../lib/utils";
import type { Prompt, VaultCollections } from "../types/domain";
import type {
  PromptRelationshipPeer,
  RepurposePromptSource,
  SearchablePrompt,
} from "./types";

export const MAX_PROMPT_INDEX_ITEMS = 200;
export const MAX_PROMPT_INDEX_CONTENT_CHARS = 24_000;

function compactContent(value: string): string {
  const content = String(value || "").trim();
  if (content.length <= MAX_PROMPT_INDEX_CONTENT_CHARS) return content;

  const tailLength = 8_000;
  const headLength = MAX_PROMPT_INDEX_CONTENT_CHARS - tailLength;
  return `${content.slice(0, headLength)}\n\n[...middle omitted for retrieval payload...]\n\n${content.slice(-tailLength)}`;
}

function promptLocation(data: VaultCollections, prompt: Prompt) {
  const task = data.tasks[prompt.taskId];
  const endeavor = task ? data.endeavors[task.endeavorId] : undefined;
  return {
    task: String(task?.name || "Unassigned task").trim(),
    endeavor: String(endeavor?.name || "Unassigned endeavor").trim(),
  };
}

function relationshipPeer(data: VaultCollections, promptId: string): PromptRelationshipPeer | null {
  const prompt = data.prompts[promptId];
  if (!prompt || prompt.archivedAt) return null;
  const location = promptLocation(data, prompt);
  return {
    promptId: prompt.id,
    title: String(prompt.title || "Untitled Prompt").trim(),
    task: location.task,
    endeavor: location.endeavor,
  };
}

function relationshipContext(data: VaultCollections, promptId: string) {
  const relations = activeRecords(data.promptRelations);
  const inspiredBy = relations.flatMap((relation) => {
    if (relation.childPromptId !== promptId) return [];
    const peer = relationshipPeer(data, relation.parentPromptId);
    return peer ? [peer] : [];
  });
  const inspires = relations.flatMap((relation) => {
    if (relation.parentPromptId !== promptId) return [];
    const peer = relationshipPeer(data, relation.childPromptId);
    return peer ? [peer] : [];
  });
  return { inspiredBy, inspires };
}

export function buildActivePromptIndex(data: VaultCollections): SearchablePrompt[] {
  return activeRecords(data.prompts)
    .slice(0, MAX_PROMPT_INDEX_ITEMS)
    .map((prompt) => {
      const location = promptLocation(data, prompt);
      return {
        id: prompt.id,
        title: String(prompt.title || "").trim(),
        description: String(prompt.description || "").trim(),
        purpose: String(prompt.purpose || "").trim(),
        content: compactContent(prompt.content),
        task: location.task,
        endeavor: location.endeavor,
        relationships: relationshipContext(data, prompt.id),
      };
    });
}

export function buildRepurposePromptSource(data: VaultCollections, promptId: string): RepurposePromptSource | null {
  const prompt = data.prompts[promptId];
  if (!prompt || prompt.archivedAt) return null;
  const location = promptLocation(data, prompt);
  return {
    id: prompt.id,
    title: String(prompt.title || "").trim(),
    description: String(prompt.description || "").trim(),
    purpose: String(prompt.purpose || "").trim(),
    content: String(prompt.content || "").trim(),
    task: location.task,
    endeavor: location.endeavor,
  };
}
