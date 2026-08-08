export type DiffKind = "same" | "add" | "remove";

export type DiffLine = {
  kind: DiffKind;
  text: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
};

export type SideBySideDiffCell = {
  kind: DiffKind | "empty";
  text: string;
  lineNumber: number | null;
};

export type SideBySideDiffRow = {
  left: SideBySideDiffCell;
  right: SideBySideDiffCell;
};

export type DiffDisplayRow =
  | { kind: "line"; line: DiffLine }
  | { kind: "omitted"; count: number };

function splitLines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

/**
 * Produces a line-oriented diff with both old and new line numbers.
 * The line numbers match the snapshots exactly, so the UI can present a
 * Git-style review without mutating either historical version.
 */
export function lineDiff(previous: string, next: string): DiffLine[] {
  const a = splitLines(previous);
  const b = splitLines(next);

  // Avoid an unexpectedly large LCS matrix for very large prompts. The
  // fallback still preserves exact old/new line numbers and content.
  if (a.length * b.length > 250_000) {
    return [
      ...a.map((text, index) => ({
        kind: "remove" as const,
        text,
        oldLineNumber: index + 1,
        newLineNumber: null,
      })),
      ...b.map((text, index) => ({
        kind: "add" as const,
        text,
        oldLineNumber: null,
        newLineNumber: index + 1,
      })),
    ];
  }

  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({
        kind: "same",
        text: a[i],
        oldLineNumber: i + 1,
        newLineNumber: j + 1,
      });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({
        kind: "remove",
        text: a[i],
        oldLineNumber: i + 1,
        newLineNumber: null,
      });
      i += 1;
    } else {
      result.push({
        kind: "add",
        text: b[j],
        oldLineNumber: null,
        newLineNumber: j + 1,
      });
      j += 1;
    }
  }

  while (i < a.length) {
    result.push({
      kind: "remove",
      text: a[i],
      oldLineNumber: i + 1,
      newLineNumber: null,
    });
    i += 1;
  }
  while (j < b.length) {
    result.push({
      kind: "add",
      text: b[j],
      oldLineNumber: null,
      newLineNumber: j + 1,
    });
    j += 1;
  }

  return result;
}

/** Returns addition/removal counts for commit-style diff statistics. */
export function diffStats(diff: DiffLine[]) {
  return diff.reduce(
    (stats, line) => {
      if (line.kind === "add") stats.additions += 1;
      if (line.kind === "remove") stats.removals += 1;
      return stats;
    },
    { additions: 0, removals: 0 },
  );
}

/**
 * Collapses long unchanged runs while preserving context around every change.
 * This behaves like a code-review "changes only" mode without losing the
 * ability to switch back to the complete snapshot diff.
 */
export function compactDiff(diff: DiffLine[], contextLines = 2): DiffDisplayRow[] {
  if (!diff.some((line) => line.kind !== "same")) {
    return diff.map((line) => ({ kind: "line" as const, line }));
  }

  const keep = new Set<number>();
  diff.forEach((line, index) => {
    if (line.kind === "same") return;
    const start = Math.max(0, index - contextLines);
    const end = Math.min(diff.length - 1, index + contextLines);
    for (let cursor = start; cursor <= end; cursor += 1) keep.add(cursor);
  });

  const rows: DiffDisplayRow[] = [];
  let index = 0;
  while (index < diff.length) {
    if (keep.has(index)) {
      rows.push({ kind: "line", line: diff[index] });
      index += 1;
      continue;
    }

    const start = index;
    while (index < diff.length && !keep.has(index)) index += 1;
    rows.push({ kind: "omitted", count: index - start });
  }

  return rows;
}

/**
 * Aligns line changes into two review columns. Adjacent removed/added blocks
 * are paired by position so an edited line reads naturally across the page.
 */
export function sideBySideDiff(diff: DiffLine[]): SideBySideDiffRow[] {
  const rows: SideBySideDiffRow[] = [];
  let index = 0;

  while (index < diff.length) {
    const line = diff[index];
    if (line.kind === "same") {
      rows.push({
        left: { kind: "same", text: line.text, lineNumber: line.oldLineNumber },
        right: { kind: "same", text: line.text, lineNumber: line.newLineNumber },
      });
      index += 1;
      continue;
    }

    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (index < diff.length && diff[index].kind !== "same") {
      const changed = diff[index];
      if (changed.kind === "remove") removed.push(changed);
      if (changed.kind === "add") added.push(changed);
      index += 1;
    }

    const rowCount = Math.max(removed.length, added.length);
    for (let offset = 0; offset < rowCount; offset += 1) {
      const oldLine = removed[offset];
      const newLine = added[offset];
      rows.push({
        left: oldLine
          ? { kind: "remove", text: oldLine.text, lineNumber: oldLine.oldLineNumber }
          : { kind: "empty", text: "", lineNumber: null },
        right: newLine
          ? { kind: "add", text: newLine.text, lineNumber: newLine.newLineNumber }
          : { kind: "empty", text: "", lineNumber: null },
      });
    }
  }

  return rows;
}
