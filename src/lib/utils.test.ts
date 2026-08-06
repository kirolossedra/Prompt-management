import { describe, expect, it } from "vitest";
import { deleteBlockers, taskPath } from "./utils";
import type { VaultCollections } from "../types/domain";

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
    mindsets: {},
    preferences: {},
    localCommits: {},
    globalCommits: {},
    decisions: {},
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
});
