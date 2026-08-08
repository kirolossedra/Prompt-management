export type DiffLine = { kind: "same" | "add" | "remove"; text: string };

export function lineDiff(previous: string, next: string): DiffLine[] {
  const a = previous.split("\n");
  const b = next.split("\n");
  if (a.length * b.length > 90000) {
    return [
      ...a.map((text) => ({ kind: "remove" as const, text })),
      ...b.map((text) => ({ kind: "add" as const, text })),
    ];
  }
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ kind: "same", text: a[i] }); i += 1; j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ kind: "remove", text: a[i] }); i += 1;
    } else {
      result.push({ kind: "add", text: b[j] }); j += 1;
    }
  }
  while (i < a.length) result.push({ kind: "remove", text: a[i++] });
  while (j < b.length) result.push({ kind: "add", text: b[j++] });
  return result;
}
