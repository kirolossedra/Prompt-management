import { describe, expect, it, vi } from "vitest";
import { createPromptBlock } from "./catalog";
import { runPromptBlockPipeline } from "./runtime";
import type { PromptBlockConnection, PromptBlockNodeDefinition, VaultCollections } from "../types/domain";
import { EMPTY_COLLECTIONS } from "../lib/constants";
import { DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS } from "./defaultTransformPrompts";

function vault(): VaultCollections {
  const data = structuredClone(EMPTY_COLLECTIONS) as VaultCollections;
  data.promptBlockTransformPrompts = Object.fromEntries(Object.values(DEFAULT_PROMPT_BLOCK_TRANSFORM_PROMPTS).map((item) => [item.operation, {
    id: item.operation, operation: item.operation, title: item.title, content: item.content, seedVersion: item.seedVersion,
    createdAt: 1, updatedAt: 1, createdBy: { uid: "u", email: "", displayName: "U" }, updatedBy: { uid: "u", email: "", displayName: "U" }, archivedAt: null, archivedBy: null,
  }]));
  return data;
}

function block(kind: Parameters<typeof createPromptBlock>[0], id: string, index: number): PromptBlockNodeDefinition {
  const value = createPromptBlock(kind, index); value.id = id; return value;
}
function edge(id: string, source: string, target: string, targetPort = "input"): PromptBlockConnection {
  return { id, sourceBlockId: source, sourcePortId: "output", targetBlockId: target, targetPortId: targetPort, flowType: "content" };
}

describe("Prompt Blocks runtime", () => {
  it("passes intermediate outputs downstream and exposes As Is", async () => {
    const input = block("direct-input", "a", 0); input.config.directText = "Base";
    const transform = block("more-detailed", "b", 1);
    const output = block("as-is", "c", 2);
    const executor = vi.fn(async () => ({ output: "Expanded", provider: "gemini" as const, model: "test", operation: "more-detailed" as const }));
    const result = await runPromptBlockPipeline({
      blocks: { a: input, b: transform, c: output },
      connections: { e1: edge("e1", "a", "b"), e2: edge("e2", "b", "c") },
      vault: vault(), uid: "u", idToken: "t", executor,
    });
    expect(result.nodeStates.b.output?.text).toBe("Expanded");
    expect(result.nodeStates.c.output?.text).toBe("Expanded");
    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("blocks downstream execution after an upstream failure", async () => {
    const input = block("direct-input", "a", 0); input.config.directText = "Base";
    const transform = block("more-detailed", "b", 1);
    const output = block("as-is", "c", 2);
    const result = await runPromptBlockPipeline({
      blocks: { a: input, b: transform, c: output },
      connections: { e1: edge("e1", "a", "b"), e2: edge("e2", "b", "c") },
      vault: vault(), uid: "u", idToken: "t", executor: async () => { throw new Error("AI unavailable"); },
    });
    expect(result.nodeStates.b.status).toBe("failed");
    expect(result.nodeStates.c.status).toBe("blocked");
  });

  it("keeps Extract Style as constraint flow", async () => {
    const input = block("direct-input", "a", 0); input.config.directText = "Base";
    const transform = block("extract-style", "b", 1);
    const connections: Record<string, PromptBlockConnection> = { e1: edge("e1", "a", "b") };
    const result = await runPromptBlockPipeline({
      blocks: { a: input, b: transform }, connections, vault: vault(), uid: "u", idToken: "t",
      executor: async () => ({ output: "Use concise headings.", provider: "gemini", model: "test", operation: "extract-style" }),
    });
    expect(result.nodeStates.b.output?.flowType).toBe("constraint");
    expect(result.nodeStates.b.output?.constraint?.sourceType).toBe("extracted-style");
  });
});
