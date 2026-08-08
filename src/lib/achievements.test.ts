import { describe, expect, it } from "vitest";
import { evaluateAchievements } from "./achievements";
import { EMPTY_COLLECTIONS } from "./constants";
import type { VaultCollections, VaultEngagement } from "../types/domain";

const stamp = { uid: "u", email: "u@example.com", displayName: "User" };
const engagement: VaultEngagement = { activityDays: {}, activityStats: { totalEvents: 0, actionCounts: {}, actionFirstAt: {}, actionLastAt: {} }, achievements: {} };

describe("achievement evaluation", () => {
  it("unlocks Builder only above 500 prompt characters", () => {
    const data = structuredClone(EMPTY_COLLECTIONS) as VaultCollections;
    data.prompts.p1 = {
      id: "p1", title: "Long", description: "", purpose: "", content: "x".repeat(501), taskId: "t1",
      manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "",
      createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp,
    };
    const builder = evaluateAchievements(data, engagement).find((item) => item.id === "builder");
    expect(builder?.met).toBe(true);
  });

  it("calculates Fussy Builder from active prompts", () => {
    const data = structuredClone(EMPTY_COLLECTIONS) as VaultCollections;
    for (let index = 0; index < 4; index += 1) {
      data.prompts[`p${index}`] = {
        id: `p${index}`, title: `Prompt ${index}`, description: "", purpose: "", content: index < 3 ? "x".repeat(501) : "short", taskId: "t1",
        manualAgenticSummary: "", manualSuggestedImprovement: "", manualAiEvaluation: "", manualGeneratedContext: "",
        createdAt: 1, updatedAt: 1, createdBy: stamp, updatedBy: stamp,
      };
    }
    const result = evaluateAchievements(data, engagement).find((item) => item.id === "fussy-builder");
    expect(result?.current).toBe(75);
    expect(result?.met).toBe(true);
  });

  it("counts distinct activity days", () => {
    const data = structuredClone(EMPTY_COLLECTIONS) as VaultCollections;
    const sevenDays = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`2026-08-${String(index + 1).padStart(2, "0")}`, { date: `2026-08-${String(index + 1).padStart(2, "0")}`, lastAt: index, eventCount: 1 }]));
    const result = evaluateAchievements(data, { ...engagement, activityDays: sevenDays }).find((item) => item.id === "active-7-days");
    expect(result?.met).toBe(true);
  });
});
