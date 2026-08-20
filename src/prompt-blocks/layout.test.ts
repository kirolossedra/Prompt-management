import { describe, expect, it } from "vitest";
import { beautifyPromptBlockLayout } from "./layout";
import type { PromptBlockConnection, PromptBlockNodeDefinition } from "../types/domain";

function block(id: string, family: PromptBlockNodeDefinition["family"], variableLabel: string): PromptBlockNodeDefinition {
  return {
    id,
    family,
    kind: family === "input" ? "direct-input" : family === "constraint" ? "mindset-constraint" : family === "output" ? "as-is" : "more-detailed",
    label: id,
    variableLabel,
    position: { x: 999, y: 999 },
    config: {},
  };
}

function wire(id: string, sourceBlockId: string, targetBlockId: string, flowType: PromptBlockConnection["flowType"] = "content"): PromptBlockConnection {
  return {
    id,
    sourceBlockId,
    sourcePortId: flowType === "constraint" ? "constraint-output" : "output",
    targetBlockId,
    targetPortId: flowType === "constraint" ? "constraint" : "input",
    flowType,
    ...(flowType === "constraint" ? { priority: 1 } : {}),
  };
}

describe("Prompt Blocks layout", () => {
  it("lays a dependency chain out from left to right without mutating input", () => {
    const blocks = {
      source: block("source", "input", "X"),
      transform: block("transform", "transform", "Y"),
      output: block("output", "output", "Z"),
    };
    const originalSourcePosition = blocks.source.position;
    const connections = {
      a: wire("a", "source", "transform"),
      b: wire("b", "transform", "output"),
    };

    const result = beautifyPromptBlockLayout(blocks, connections);

    expect(result.source.position.x).toBeLessThan(result.transform.position.x);
    expect(result.transform.position.x).toBeLessThan(result.output.position.x);
    expect(blocks.source.position).toBe(originalSourcePosition);
    expect(blocks.source.position).toEqual({ x: 999, y: 999 });
  });

  it("separates parallel upstream blocks vertically", () => {
    const blocks = {
      a: block("a", "input", "A"),
      b: block("b", "input", "B"),
      target: block("target", "transform", "C"),
    };
    const connections = {
      a: wire("a", "a", "target"),
      b: { ...wire("b", "b", "target"), targetPortId: "context" },
    };

    const result = beautifyPromptBlockLayout(blocks, connections);

    expect(result.a.position.x).toBe(result.b.position.x);
    expect(Math.abs(result.a.position.y - result.b.position.y)).toBeGreaterThanOrEqual(142);
    expect(result.target.position.x).toBeGreaterThan(result.a.position.x);
  });

  it("places constraint dependencies before the governed transform", () => {
    const blocks = {
      prompt: block("prompt", "input", "X"),
      mindset: block("mindset", "constraint", "P1"),
      transform: block("transform", "transform", "Y"),
    };
    const connections = {
      prompt: wire("prompt", "prompt", "transform"),
      constraint: wire("constraint", "mindset", "transform", "constraint"),
    };

    const result = beautifyPromptBlockLayout(blocks, connections);

    expect(result.prompt.position.x).toBe(result.mindset.position.x);
    expect(result.transform.position.x).toBeGreaterThan(result.prompt.position.x);
  });
});
