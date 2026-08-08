import type { MixedPromptDraft, PromptMixRequest, PromptMixResponse } from "./types";

function clean(value: unknown) { return String(value ?? "").trim(); }

export function normalizeMixedPromptDraft(payload: unknown): MixedPromptDraft {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const raw = root.draft && typeof root.draft === "object" && !Array.isArray(root.draft) ? root.draft as Record<string, unknown> : {};
  const draft = { title: clean(raw.title), description: clean(raw.description), purpose: clean(raw.purpose), content: clean(raw.content) };
  if (!draft.title || !draft.description || !draft.purpose || !draft.content) throw new Error("Prompt Mixer returned an incomplete Prompt.");
  return draft;
}

export async function mixPrompts(request: PromptMixRequest & { idToken: string }): Promise<PromptMixResponse> {
  const response = await fetch("/.netlify/functions/prompt-mix", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${request.idToken}` },
    body: JSON.stringify({ uid: request.uid, prompts: request.prompts, direction: request.direction || "" }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Prompt Mixer could not combine the selected Prompts.");
  return { draft: normalizeMixedPromptDraft(payload), provider: "gemini", model: clean(payload?.model) || "Gemini", sourcePromptIds: Array.isArray(payload?.sourcePromptIds) ? payload.sourcePromptIds.map(clean).filter(Boolean) : request.prompts.map((prompt) => prompt.id) };
}
