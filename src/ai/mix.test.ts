import { describe, expect, it } from "vitest";
import { normalizeMixedPromptDraft } from "./mix";

describe("normalizeMixedPromptDraft", () => {
  it("accepts a complete mixed Prompt draft", () => {
    expect(normalizeMixedPromptDraft({ draft: { title: "Mixed", description: "Combined", purpose: "Unify", content: "Full mixed prompt" } })).toEqual({ title: "Mixed", description: "Combined", purpose: "Unify", content: "Full mixed prompt" });
  });
  it("rejects incomplete output", () => {
    expect(() => normalizeMixedPromptDraft({ draft: { title: "Mixed" } })).toThrow();
  });
});
