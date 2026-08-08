import { activeRecords } from "../lib/utils";
import type { Prompt, VaultCollections } from "../types/domain";
import type {
  PromptRelationshipPeer,
  RepurposePromptSource,
  PromptMixSource,
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


export function buildVaultPromptMixSource(data: VaultCollections, promptId: string, sourceKey = promptId): PromptMixSource | null {
  const source = buildRepurposePromptSource(data, promptId);
  if (!source) return null;
  return {
    sourceKey,
    sourceType: "vault",
    promptId: source.id,
    title: source.title,
    description: source.description,
    purpose: source.purpose,
    content: source.content,
    task: source.task,
    endeavor: source.endeavor,
  };
}

export function buildCustomPromptMixSource(sourceKey: string, title: string, content: string): PromptMixSource | null {
  const cleanContent = String(content || "").trim();
  if (!cleanContent) return null;
  return {
    sourceKey,
    sourceType: "custom",
    title: String(title || "").trim() || "Pasted Prompt",
    description: "",
    purpose: "",
    content: cleanContent,
    task: "",
    endeavor: "",
  };
}

export function buildPromptMixSources(data: VaultCollections, promptIds: string[]): PromptMixSource[] {
  const seen = new Set<string>();
  return promptIds.flatMap((promptId) => {
    if (!promptId || seen.has(promptId)) return [];
    seen.add(promptId);
    const source = buildVaultPromptMixSource(data, promptId, promptId);
    return source ? [source] : [];
  });
}
