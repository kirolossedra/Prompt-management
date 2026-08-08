import { describe, expect, it } from "vitest";
import { normalizePromptFinderMatches } from "./retrieval";
import type { SearchablePrompt } from "./types";

const prompts: SearchablePrompt[] = [
  { id: "p1", title: "One", description: "", purpose: "", content: "", task: "Task", endeavor: "Endeavor" },
  { id: "p2", title: "Two", description: "", purpose: "", content: "", task: "Task", endeavor: "Endeavor" },
];

describe("normalizePromptFinderMatches", () => {
  it("rejects unknown IDs, duplicates, and invalid score ranges", () => {
    const matches = normalizePromptFinderMatches({ matches: [
      { promptId: "p1", score: 140, reason: "Best" },
      { promptId: "missing", score: 99, reason: "Invented" },
      { promptId: "p1", score: 70, reason: "Duplicate" },
      { promptId: "p2", score: -5, reason: "Second" },
    ] }, prompts);

    expect(matches).toEqual([
      { promptId: "p1", score: 100, reason: "Best" },
      { promptId: "p2", score: 0, reason: "Second" },
    ]);
  });
});
