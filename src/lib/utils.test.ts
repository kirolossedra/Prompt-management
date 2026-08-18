import { describe, expect, it } from "vitest";
import {
  deleteBlockers,
  matchesPromptWords,
  promptChangedFields,
  promptSnapshot,
  taskPath,
} from "./utils";
import type { Prompt, PromptVersion, VaultCollections } from "../types/domain";

const stamp = { uid: "user-1", email: "owner@example.com", displayName: "Owner" };
const base = {
  createdAt: 1,
  updatedAt: 1,
  createdBy: stamp,
  updatedBy: stamp,
  archivedAt: null,
  archivedBy: null,
};

function emptyData(): VaultCollections {
  return {
    endeavors: {},
    tasks: {},
    prompts: {},
    promptVersions: {},
    promptAttachments: {},
    promptRelations: {},
    promptFinderFeedback: {},
    mindsets: {},
    preferences: {},
    localCommits: {},
    globalCommits: {},
    decisions: {},
  };
}

function prompt(): Prompt {
  return {
    ...base,
    id: "p1",
    title: "Backend CV Reviewer",
    description: "Reviews backend resumes for unsupported claims.",
    purpose: "Evidence-based resume review",
    content: "Check every claim against concrete evidence.",
    taskId: "t1",
    manualAgenticSummary: "",
    manualSuggestedImprovement: "",
    manualAiEvaluation: "",
    manualGeneratedContext: "",
  };
}

describe("direct hierarchy paths", () => {
  it("builds an Endeavor / Task path without folders", () => {
    const data = emptyData();
    data.endeavors.e1 = {
      ...base,
      id: "e1",
      name: "Career",
      description: "",
      manualAgenticSummary: "",
    };
    data.tasks.t1 = {
      ...base,
      id: "t1",
      name: "Review Resume",
      description: "",
      purpose: "Review the resume",
      endeavorId: "e1",
      manualSuggestedImprovement: "",
    };

    expect(taskPath(data, "t1")).toBe("Career / Review Resume");
  });
});

describe("dependency-safe deletion", () => {
  it("blocks deleting an endeavor that still has a task", () => {
    const data = emptyData();
    data.endeavors.e1 = {
      ...base,
      id: "e1",
      name: "Career",
      description: "",
      manualAgenticSummary: "",
    };
    data.tasks.t1 = {
      ...base,
      id: "t1",
      name: "Review Resume",
      description: "",
      purpose: "Review the resume",
      endeavorId: "e1",
      manualSuggestedImprovement: "",
    };

    expect(deleteBlockers("endeavors", "e1", data)).toContain("1 task");
  });

  it("allows deleting an unreferenced endeavor", () => {
    const data = emptyData();
    data.endeavors.e1 = {
      ...base,
      id: "e1",
      name: "Career",
      description: "",
      manualAgenticSummary: "",
    };

    expect(deleteBlockers("endeavors", "e1", data)).toEqual([]);
  });

  it("does not block deleting a prompt only because it has local versions", () => {
    const data = emptyData();
    data.prompts.p1 = prompt();
    data.promptVersions.v1 = {
      ...base,
      id: "v1",
      promptId: "p1",
      versionLabel: "Version 1",
      content: "Initial content",
      changeDescription: "Initial snapshot",
      localCommitId: "",
    };

    expect(deleteBlockers("prompts", "p1", data)).toEqual([]);
  });
});

describe("automatic prompt history", () => {
  it("detects every changed prompt field", () => {
    const previous = promptSnapshot(prompt());
    const next = { ...previous, title: "Updated reviewer", content: "Updated content" };
    expect(promptChangedFields(previous, next)).toEqual(["title", "content"]);
  });
});

describe("vault-wide prompt search", () => {
  it("matches all words across current prompt fields", () => {
    expect(matchesPromptWords(prompt(), [], "backend evidence")).toBe(true);
    expect(matchesPromptWords(prompt(), [], "backend wireless")).toBe(false);
  });

  it("matches words contained only in preserved versions", () => {
    const version: PromptVersion = {
      ...base,
      id: "v1",
      promptId: "p1",
      versionLabel: "Version 1",
      content: "Previously required keyword maximization.",
      changeDescription: "Initial state",
      localCommitId: "",
    };
    expect(matchesPromptWords(prompt(), [version], "keyword maximization")).toBe(true);
  });
});
