import type { PromptBlockAiOperation, PromptBlockConstraintValue } from "../types/domain";

export interface PromptBlockAiInput {
  role: string;
  value: string;
}

export interface PromptBlockAiConstraint extends PromptBlockConstraintValue {
  priority: number;
}

export interface PromptBlockExecuteRequest {
  uid: string;
  idToken: string;
  operation: PromptBlockAiOperation;
  transformationPrompt: string;
  inputs: PromptBlockAiInput[];
  constraints: PromptBlockAiConstraint[];
}

export interface PromptBlockExecuteResponse {
  output: string;
  provider: "gemini";
  model: string;
  operation: PromptBlockAiOperation;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizePromptBlockResponse(payload: unknown, operation: PromptBlockAiOperation): PromptBlockExecuteResponse {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  const output = clean(root.output);
  if (!output) throw new Error("Prompt Blocks returned an empty transformation result.");
  return {
    output,
    provider: "gemini",
    model: clean(root.model) || "Gemini",
    operation,
  };
}

export async function executePromptBlockOperation(request: PromptBlockExecuteRequest): Promise<PromptBlockExecuteResponse> {
  const response = await fetch("/.netlify/functions/prompt-block-transform", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.idToken}`,
    },
    body: JSON.stringify({
      uid: request.uid,
      operation: request.operation,
      transformationPrompt: request.transformationPrompt,
      inputs: request.inputs,
      constraints: request.constraints,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Prompt Blocks could not execute this transformation.");
  }
  return normalizePromptBlockResponse(payload, request.operation);
}
