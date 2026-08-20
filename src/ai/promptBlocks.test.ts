import { describe, expect, it } from "vitest";
import { normalizePromptBlockResponse } from "./promptBlocks";

describe("Prompt Blocks AI response", () => {
  it("normalizes a valid response", () => {
    expect(normalizePromptBlockResponse({ output: "  Result  ", model: "gemini-test" }, "context-free")).toEqual({
      output: "Result",
      provider: "gemini",
      model: "gemini-test",
      operation: "context-free",
    });
  });

  it("rejects empty output", () => {
    expect(() => normalizePromptBlockResponse({ output: " " }, "more-detailed")).toThrow(/empty/i);
  });
});
