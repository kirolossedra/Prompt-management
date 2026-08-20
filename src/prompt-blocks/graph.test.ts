import { EMPTY_COLLECTIONS } from "../lib/constants";
import type { VaultCollections } from "../types/domain";
import { describe, expect, it } from "vitest";
import { createPromptBlock } from "./catalog";
import { nextConstraintPriority, topologicalOrder, validateConnection, validatePipelineGraph, validatePipelineReferences, wouldCreateCycle } from "./graph";
import type { PromptBlockConnection, PromptBlockNodeDefinition } from "../types/domain";

function makeBlocks(...kinds: Parameters<typeof createPromptBlock>[0][]): Record<string, PromptBlockNodeDefinition> {
  return Object.fromEntries(kinds.map((kind, index) => {
    const block = createPromptBlock(kind, index);
    block.id = `b${index + 1}`;
    if (kind === "direct-input") block.config.directText = "source";
    if (kind === "system-prompt") block.config.promptId = "p1";
    if (kind === "mindset-constraint") block.config.mindsetId = "m1";
    return [block.id, block];
  }));
}

function edge(id: string, source: string, sourcePort: string, target: string, targetPort: string, flowType: "content" | "constraint", priority?: number): PromptBlockConnection {
  return { id, sourceBlockId: source, sourcePortId: sourcePort, targetBlockId: target, targetPortId: targetPort, flowType, priority };
}

describe("Prompt Blocks graph", () => {
  it("orders dependencies deterministically", () => {
    const blocks = makeBlocks("direct-input", "more-detailed", "as-is");
    const connections = {
      e1: edge("e1", "b1", "output", "b2", "input", "content"),
      e2: edge("e2", "b2", "output", "b3", "input", "content"),
    };
    expect(topologicalOrder(blocks, connections)).toEqual(["b1", "b2", "b3"]);
    expect(validatePipelineGraph(blocks, connections).valid).toBe(true);
  });

  it("rejects Prompt flow into constraint ports", () => {
    const blocks = makeBlocks("direct-input", "more-detailed");
    expect(validateConnection(blocks, {}, "b1", "output", "b2", "constraint")).toMatch(/cannot connect/i);
  });

  it("rejects cycles", () => {
    const blocks = makeBlocks("direct-input", "more-detailed", "less-detailed");
    const connections = {
      e1: edge("e1", "b1", "output", "b2", "input", "content"),
      e2: edge("e2", "b2", "output", "b3", "input", "content"),
    };
    expect(wouldCreateCycle(blocks, connections, "b3", "b2")).toBe(true);
    expect(validateConnection(blocks, connections, "b3", "output", "b2", "input")).toMatch(/cycle/i);
  });

  it("requires both Fill Context content inputs", () => {
    const blocks = makeBlocks("direct-input", "fill-context");
    const connections = { e1: edge("e1", "b1", "output", "b2", "prompt", "content") };
    expect(validatePipelineGraph(blocks, connections).errors.join(" ")).toMatch(/Replacement context/i);
  });

  it("requires deterministic unique constraint priorities", () => {
    const blocks = makeBlocks("direct-input", "mindset-constraint", "mindset-constraint", "more-detailed");
    const connections = {
      e1: edge("e1", "b1", "output", "b4", "input", "content"),
      e2: edge("e2", "b2", "constraint-output", "b4", "constraint", "constraint", 1),
      e3: edge("e3", "b3", "constraint-output", "b4", "constraint", "constraint", 1),
    };
    expect(validatePipelineGraph(blocks, connections).errors.join(" ")).toMatch(/share priority 1/i);
    expect(nextConstraintPriority(connections, "b4")).toBe(2);
  });

  it("rejects missing current/pinned Prompt and Mindset references before execution", () => {
    const data = {
      ...EMPTY_COLLECTIONS,
      prompts: {},
      promptVersions: {},
      mindsets: {},
    } as VaultCollections;
    const source = createPromptBlock("system-prompt", 0);
    source.config = { promptId: "missing", promptReferenceMode: "pinned", promptVersionId: "missing-version" };
    const mindset = createPromptBlock("mindset-constraint", 1);
    mindset.config = { mindsetId: "missing-mindset" };
    const errors = validatePipelineReferences({ [source.id]: source, [mindset.id]: mindset }, data);
    expect(errors.join(" ")).toMatch(/no longer exists/i);
    expect(errors.join(" ")).toMatch(/Mindset/i);
  });


  it("rejects an empty pipeline", () => {
    expect(validatePipelineGraph({}, {}).errors.join(" ")).toMatch(/at least one block/i);
  });

});
