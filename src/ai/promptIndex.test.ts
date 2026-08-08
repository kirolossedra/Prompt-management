import { describe, expect, it } from "vitest";
import { buildActivePromptIndex, buildRepurposePromptSource, MAX_PROMPT_INDEX_CONTENT_CHARS } from "./promptIndex";
import type { VaultCollections } from "../types/domain";

const stamp = { uid: "u1", email: "u@example.com", displayName: "User" };
const base = { createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp, archivedAt: null, archivedBy: null };

function data(): VaultCollections {
  return {
    endeavors: {
      e1: { id: "e1", name: "Engineering", description: "", manualAgenticSummary: "", ...base },
      e2: { id: "e2", name: "Research", description: "", manualAgenticSummary: "", ...base },
    },
    tasks: {
      t1: { id: "t1", name: "App", description: "", purpose: "", endeavorId: "e1", manualSuggestedImprovement: "", ...base },
      t2: { id: "t2", name: "Methods", description: "", purpose: "", endeavorId: "e2", manualSuggestedImprovement: "", ...base },
    },
    prompts: {
      p1: { id: "p1", title: "Modify safely", description: "desc", purpose: "purpose", content: "Keep old features", taskId: "t1", manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "", ...base },
      p2: { id: "p2", title: "Independent critique", description: "desc2", purpose: "purpose2", content: "Critique independently", taskId: "t2", manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "", ...base },
    },
    promptVersions: {},
    promptAttachments: {},
    promptRelations: {
      r1: { id: "r1", parentPromptId: "p1", childPromptId: "p2", relationshipType: "inspired-by", ...base },
    },
    mindsets: {}, preferences: {}, localCommits: {}, globalCommits: {}, decisions: {},
  };
}

describe("buildActivePromptIndex", () => {
  it("includes current prompt fields, location, and direct relationship context", () => {
    const index = buildActivePromptIndex(data());
    expect(index).toHaveLength(2);
    expect(index[0]).toMatchObject({ id: "p1", task: "App", endeavor: "Engineering" });
    expect(index[0].relationships.inspires[0]).toMatchObject({ promptId: "p2", title: "Independent critique" });
    expect(index[1].relationships.inspiredBy[0]).toMatchObject({ promptId: "p1", title: "Modify safely" });
  });

  it("bounds very large prompt content while preserving both ends", () => {
    const vault = data();
    vault.prompts.p1.content = `START-${"x".repeat(MAX_PROMPT_INDEX_CONTENT_CHARS + 1000)}-END`;
    const content = buildActivePromptIndex(vault)[0].content;
    expect(content.length).toBeLessThanOrEqual(MAX_PROMPT_INDEX_CONTENT_CHARS + 80);
    expect(content.startsWith("START-")).toBe(true);
    expect(content.endsWith("-END")).toBe(true);
  });
});

describe("buildRepurposePromptSource", () => {
  it("builds the full current source prompt and its location", () => {
    expect(buildRepurposePromptSource(data(), "p1")).toEqual({
      id: "p1",
      title: "Modify safely",
      description: "desc",
      purpose: "purpose",
      content: "Keep old features",
      task: "App",
      endeavor: "Engineering",
    });
  });
});
