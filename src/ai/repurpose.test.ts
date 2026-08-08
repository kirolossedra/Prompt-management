import { describe, expect, it } from "vitest";
import { normalizeRepurposedPromptDraft } from "./repurpose";

describe("normalizeRepurposedPromptDraft", () => {
  it("accepts the structured draft returned by the server", () => {
    expect(normalizeRepurposedPromptDraft({
      draft: {
        title: "Repurposed title",
        description: "Repurposed description",
        purpose: "Repurposed purpose",
        content: "Repurposed content",
      },
    })).toEqual({
      title: "Repurposed title",
      description: "Repurposed description",
      purpose: "Repurposed purpose",
      content: "Repurposed content",
    });
  });

  it("rejects an incomplete generated Prompt instead of saving malformed data", () => {
    expect(() => normalizeRepurposedPromptDraft({ draft: { title: "Only a title" } })).toThrow();
  });
});
