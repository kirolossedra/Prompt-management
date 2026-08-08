import type {
  PromptFinderMatch,
  PromptFinderRequest,
  PromptFinderResponse,
  SearchablePrompt,
} from "./types";

const FIND_PROMPT_ENDPOINT = "/.netlify/functions/prompt-retrieval";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizePromptFinderMatches(
  value: unknown,
  prompts: SearchablePrompt[],
): PromptFinderMatch[] {
  const source = asObject(value);
  const rawMatches = Array.isArray(source?.matches) ? source.matches : [];
  const validIds = new Set(prompts.map((prompt) => prompt.id));
  const seen = new Set<string>();

  return rawMatches.flatMap((raw) => {
    const item = asObject(raw);
    const promptId = String(item?.promptId || "").trim();
    if (!promptId || !validIds.has(promptId) || seen.has(promptId)) return [];
    seen.add(promptId);

    const scoreValue = Number(item?.score);
    const score = Number.isFinite(scoreValue) ? Math.max(0, Math.min(100, Math.round(scoreValue))) : 0;
    const reason = String(item?.reason || "Relevant to the described need.").trim().slice(0, 500);
    return [{ promptId, score, reason }];
  }).slice(0, 5);
}

export async function findPromptMatches(input: {
  query: string;
  prompts: SearchablePrompt[];
  uid: string;
  idToken: string;
}): Promise<PromptFinderResponse> {
  const request: PromptFinderRequest = {
    query: input.query.trim(),
    prompts: input.prompts,
    uid: input.uid,
  };

  const response = await fetch(FIND_PROMPT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.idToken}`,
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => null) as unknown;
  const payloadObject = asObject(payload);

  if (!response.ok) {
    const message = String(payloadObject?.error || "Semantic Prompt Finder is temporarily unavailable.");
    throw new Error(message);
  }

  const matches = normalizePromptFinderMatches(payloadObject, input.prompts);
  return {
    matches,
    provider: "gemini",
    model: String(payloadObject?.model || "Gemini"),
    corpusSize: Number(payloadObject?.corpusSize || input.prompts.length),
  };
}
