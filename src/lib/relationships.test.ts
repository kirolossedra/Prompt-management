import { describe, expect, it } from "vitest";
import { EMPTY_COLLECTIONS } from "./constants";
import { buildRelationshipGraphLayout, validatePromptRelation } from "./relationships";
import type { Prompt, PromptRelation, Task, Endeavor, UserStamp, VaultCollections } from "../types/domain";

const stamp: UserStamp = { uid: "u", email: "u@example.com", displayName: "U" };
const base = { createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp, archivedAt: null, archivedBy: null };

function data(): VaultCollections {
  const value = structuredClone(EMPTY_COLLECTIONS) as VaultCollections;
  value.endeavors.e1 = { id: "e1", ...base, name: "Career", description: "", manualAgenticSummary: "" } as Endeavor;
  value.endeavors.e2 = { id: "e2", ...base, name: "Research", description: "", manualAgenticSummary: "" } as Endeavor;
  value.tasks.t1 = { id: "t1", ...base, name: "Resume", description: "", purpose: "", endeavorId: "e1", manualSuggestedImprovement: "" } as Task;
  value.tasks.t2 = { id: "t2", ...base, name: "Lab", description: "", purpose: "", endeavorId: "e2", manualSuggestedImprovement: "" } as Task;
  const prompt = (id: string, title: string, taskId: string): Prompt => ({ id, ...base, title, taskId, description: "", purpose: "", content: "", manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "" });
  value.prompts.p1 = prompt("p1", "Parent", "t1");
  value.prompts.p2 = prompt("p2", "Child", "t2");
  value.prompts.p3 = prompt("p3", "Third", "t2");
  return value;
}

function relation(id: string, parentPromptId: string, childPromptId: string): PromptRelation {
  return { id, ...base, parentPromptId, childPromptId, relationshipType: "inspired-by" };
}

describe("prompt relationships", () => {
  it("allows cross-endeavor inspired-by links", () => {
    expect(validatePromptRelation(data(), "p1", "p2")).toEqual({ ok: true });
  });

  it("blocks duplicate and circular links", () => {
    const value = data();
    value.promptRelations.r1 = relation("r1", "p1", "p2");
    expect(validatePromptRelation(value, "p1", "p2").ok).toBe(false);
    value.promptRelations.r2 = relation("r2", "p2", "p3");
    expect(validatePromptRelation(value, "p3", "p1").ok).toBe(false);
  });

  it("builds a map containing all related prompts and links", () => {
    const value = data();
    value.promptRelations.r1 = relation("r1", "p1", "p2");
    const layout = buildRelationshipGraphLayout(value);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.groups).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0].path).toContain("C");
  });
});
