import { describe, expect, it } from "vitest";
import { compactDiff, diffStats, lineDiff, sideBySideDiff } from "./diff";

describe("Git-style prompt line diff", () => {
  it("tracks exact old and new line numbers for additions and removals", () => {
    const diff = lineDiff(
      "Keep this\nRemove this\nStill here",
      "Keep this\nAdd this\nStill here\nNew ending",
    );

    expect(diff).toEqual([
      { kind: "same", text: "Keep this", oldLineNumber: 1, newLineNumber: 1 },
      { kind: "remove", text: "Remove this", oldLineNumber: 2, newLineNumber: null },
      { kind: "add", text: "Add this", oldLineNumber: null, newLineNumber: 2 },
      { kind: "same", text: "Still here", oldLineNumber: 3, newLineNumber: 3 },
      { kind: "add", text: "New ending", oldLineNumber: null, newLineNumber: 4 },
    ]);
  });

  it("reports commit-style addition and removal totals", () => {
    const diff = lineDiff("one\ntwo\nthree", "one\nTWO\nthree\nfour");
    expect(diffStats(diff)).toEqual({ additions: 2, removals: 1 });
  });

  it("pairs changed blocks for side-by-side review", () => {
    const rows = sideBySideDiff(lineDiff("one\nold\nthree", "one\nnew\nthree"));
    expect(rows[1]).toEqual({
      left: { kind: "remove", text: "old", lineNumber: 2 },
      right: { kind: "add", text: "new", lineNumber: 2 },
    });
  });

  it("collapses distant unchanged sections but keeps context around changes", () => {
    const before = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join("\n");
    const after = before.replace("line 7", "changed line 7");
    const compact = compactDiff(lineDiff(before, after), 1);

    expect(compact.some((row) => row.kind === "omitted")).toBe(true);
    expect(compact.some((row) => row.kind === "line" && row.line.kind === "remove" && row.line.oldLineNumber === 7)).toBe(true);
    expect(compact.some((row) => row.kind === "line" && row.line.kind === "add" && row.line.newLineNumber === 7)).toBe(true);
  });
});
