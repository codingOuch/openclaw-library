export type DiffType = "context" | "add" | "del";

export interface DiffLine {
  type: DiffType;
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  added: number;
  removed: number;
  truncated: boolean;
}

export function buildDiff(before: string, after: string, maxLines = 40): DiffResult {
  const oldLines = before.split(/\r?\n/);
  const newLines = after.split(/\r?\n/);
  const raw = oldLines.length * newLines.length <= 250_000
    ? lcsDiff(oldLines, newLines)
    : directDiff(oldLines, newLines);
  const interesting = compressContext(raw);
  const lines = interesting.slice(0, maxLines);
  return {
    lines,
    added: raw.filter((line) => line.type === "add").length,
    removed: raw.filter((line) => line.type === "del").length,
    truncated: interesting.length > maxLines,
  };
}

function lcsDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint16Array(cols));
  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        oldLines[i] === newLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      out.push({ type: "context", text: oldLines[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (j < newLines.length && (i === oldLines.length || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ type: "add", text: newLines[j], newLine: j + 1 });
      j += 1;
    } else if (i < oldLines.length) {
      out.push({ type: "del", text: oldLines[i], oldLine: i + 1 });
      i += 1;
    }
  }
  return out;
}

function directDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const max = Math.max(oldLines.length, newLines.length);
  const out: DiffLine[] = [];
  for (let i = 0; i < max; i += 1) {
    if (oldLines[i] === newLines[i]) {
      out.push({ type: "context", text: oldLines[i] || "", oldLine: i + 1, newLine: i + 1 });
    } else {
      if (i < oldLines.length) out.push({ type: "del", text: oldLines[i], oldLine: i + 1 });
      if (i < newLines.length) out.push({ type: "add", text: newLines[i], newLine: i + 1 });
    }
  }
  return out;
}

function compressContext(lines: DiffLine[]) {
  const changed = lines
    .map((line, index) => (line.type === "context" ? -1 : index))
    .filter((index) => index >= 0);
  if (changed.length === 0) return lines.slice(0, 8);
  const keep = new Set<number>();
  for (const index of changed) {
    for (let i = Math.max(0, index - 2); i <= Math.min(lines.length - 1, index + 2); i += 1) {
      keep.add(i);
    }
  }
  const out: DiffLine[] = [];
  let last = -1;
  [...keep].sort((a, b) => a - b).forEach((index) => {
    if (last >= 0 && index > last + 1) {
      out.push({ type: "context", text: "…" });
    }
    out.push(lines[index]);
    last = index;
  });
  return out;
}
