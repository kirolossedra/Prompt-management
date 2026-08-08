import { describe, expect, it } from "vitest";
import { buildActivePromptIndex, MAX_PROMPT_INDEX_CONTENT_CHARS } from "./promptIndex";
import type { VaultCollections } from "../types/domain";

const stamp = { uid: "u", email: "u@example.com", displayName: "User" };
const base = { createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp, archivedAt: null, archivedBy: null };

function data(): VaultCollections {
  return {
    endeavors: { e1: { ...base, id: "e1", name: "Engineering", description: "", manualAgenticSummary: "" } },
    tasks: { t1: { ...base, id: "t1", name: "App changes", description: "", purpose: "", endeavorId: "e1", manualSuggestedImprovement: "" } },
    prompts: {
      p1: { ...base, id: "p1", title: "Preserve features", description: "Additive changes", purpose: "Avoid regressions", content: "Keep old functionality.", taskId: "t1", manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "" },
      p2: { ...base, id: "p2", archivedAt: 2, title: "Archived", description: "", purpose: "", content: "", taskId: "t1", manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "" },
    },
    promptVersions: {}, promptAttachments: {}, promptRelations: {}, mindsets: {}, preferences: {}, localCommits: {}, globalCommits: {}, decisions: {},
  };
}

describe("buildActivePromptIndex", () => {
  it("indexes current active prompt state with task and endeavor context only", () => {
    const index = buildActivePromptIndex(data());
    expect(index).toHaveLength(1);
    expect(index[0]).toMatchObject({ id: "p1", task: "App changes", endeavor: "Engineering", content: "Keep old functionality." });
  });

  it("bounds unusually large prompt content in the outbound retrieval payload", () => {
    const vault = data();
    vault.prompts.p1.content = "x".repeat(MAX_PROMPT_INDEX_CONTENT_CHARS + 5_000);
    expect(buildActivePromptIndex(vault)[0].content.length).toBeLessThan(MAX_PROMPT_INDEX_CONTENT_CHARS + 100);
  });
});
