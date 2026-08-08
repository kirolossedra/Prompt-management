import type {
  PromptRepurposeResponse,
  RepurposePromptSource,
  RepurposedPromptDraft,
} from "./types";

const REPURPOSE_ENDPOINT = "/.netlify/functions/prompt-repurpose";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function cleanRequired(value: unknown, field: string, max: number): string {
  const text = String(value ?? "").trim().slice(0, max);
  if (!text) throw new Error(`Gemini did not return a usable ${field}. Please retry.`);
  return text;
}

export function normalizeRepurposedPromptDraft(value: unknown): RepurposedPromptDraft {
  const source = asObject(value);
  const rawDraft = asObject(source?.draft) || source;
  if (!rawDraft) throw new Error("Gemini did not return a usable repurposed Prompt. Please retry.");
  return {
    title: cleanRequired(rawDraft.title, "title", 160),
    description: cleanRequired(rawDraft.description, "description", 5_000),
    purpose: cleanRequired(rawDraft.purpose, "purpose", 3_000),
    content: cleanRequired(rawDraft.content, "content", 50_000),
  };
}

export async function repurposePrompt(input: {
  goal: string;
  prompt: RepurposePromptSource;
  uid: string;
  idToken: string;
}): Promise<PromptRepurposeResponse> {
  const response = await fetch(REPURPOSE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.idToken}`,
    },
    body: JSON.stringify({
      goal: input.goal.trim(),
      prompt: input.prompt,
      uid: input.uid,
    }),
  });

  const payload = await response.json().catch(() => null) as unknown;
  const payloadObject = asObject(payload);

  if (!response.ok) {
    const message = String(payloadObject?.error || "Prompt Repurposer is temporarily unavailable.");
    throw new Error(message);
  }

  return {
    draft: normalizeRepurposedPromptDraft(payloadObject),
    provider: "gemini",
    model: String(payloadObject?.model || "Gemini"),
    sourcePromptId: String(payloadObject?.sourcePromptId || input.prompt.id),
  };
}
