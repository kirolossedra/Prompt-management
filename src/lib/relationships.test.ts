import { describe, expect, it } from "vitest";
import { EMPTY_COLLECTIONS } from "./constants";
import {
  buildRelationshipGraphLayout,
  edgeCrossesUnrelatedGroup,
  validatePromptRelation,
} from "./relationships";
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

function addEndeavor(value: VaultCollections, endeavorId: string, taskId: string, promptId: string, name: string) {
  value.endeavors[endeavorId] = { id: endeavorId, ...base, name, description: "", manualAgenticSummary: "" } as Endeavor;
  value.tasks[taskId] = { id: taskId, ...base, name: `${name} task`, description: "", purpose: "", endeavorId, manualSuggestedImprovement: "" } as Task;
  value.prompts[promptId] = {
    id: promptId,
    ...base,
    title: `${name} prompt`,
    taskId,
    description: "",
    purpose: "",
    content: "",
    manualAgenticSummary: "",
    manualSuggestedImprovement: "",
    manualAiEvaluation: "",
    manualGeneratedContext: "",
  } as Prompt;
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

  it("places a simple inspiration chain in relationship order", () => {
    const value = data();
    addEndeavor(value, "e3", "t3", "p4", "Other");
    value.promptRelations.r1 = relation("r1", "p1", "p4");
    value.promptRelations.r2 = relation("r2", "p4", "p2");
    const layout = buildRelationshipGraphLayout(value);
    const career = layout.groups.find((group) => group.id === "e1")!;
    const other = layout.groups.find((group) => group.id === "e3")!;
    const research = layout.groups.find((group) => group.id === "e2")!;
    expect(career.x).toBeLessThan(other.x);
    expect(other.x).toBeLessThan(research.x);
  });

  it("routes every edge around unrelated Endeavor boxes", () => {
    const value = data();
    addEndeavor(value, "e3", "t3", "p4", "Other");
    addEndeavor(value, "e4", "t4", "p5", "Writing");
    value.promptRelations.r1 = relation("r1", "p1", "p4");
    value.promptRelations.r2 = relation("r2", "p4", "p2");
    value.promptRelations.r3 = relation("r3", "p1", "p2");
    value.promptRelations.r4 = relation("r4", "p1", "p5");
    const layout = buildRelationshipGraphLayout(value);
    const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
    layout.edges.forEach((edge) => {
      expect(edgeCrossesUnrelatedGroup(edge, layout.groups, nodeById)).toBe(false);
    });
  });

  it("builds explicit orthogonal route points for map edges", () => {
    const value = data();
    value.promptRelations.r1 = relation("r1", "p1", "p2");
    const layout = buildRelationshipGraphLayout(value);
    expect(layout.nodes).toHaveLength(2);
    expect(layout.groups).toHaveLength(2);
    expect(layout.edges).toHaveLength(1);
    expect(layout.edges[0].routePoints.length).toBeGreaterThanOrEqual(4);
    expect(layout.edges[0].path).toContain("H");
  });
});
