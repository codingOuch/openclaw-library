import { basenameWithoutExt, FileMeta } from "./utils";

interface ParsedFrontmatter {
  body: string;
  fields: Record<string, string>;
}

export function splitFrontmatter(text: string): ParsedFrontmatter {
  if (!text.startsWith("---")) return { body: text, fields: {} };
  const end = text.indexOf("\n---", 3);
  if (end < 0) return { body: text, fields: {} };
  const raw = text.slice(3, end).trim();
  const fields: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) fields[match[1].toLowerCase()] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return { body: text.slice(end + 4).trimStart(), fields };
}

export function buildPreview(content: string, label: string): FileMeta {
  const { body, fields } = splitFrontmatter(content);
  const fallbackTitle = basenameWithoutExt(label.split("/").pop() || label);
  const heading = body.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim();
  const title = fields.title || fields.name || heading || fallbackTitle;
  const blurb =
    fields.summary ||
    fields.description ||
    body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#") && !line.startsWith("```")) ||
    label;
  return {
    title: title.slice(0, 120),
    blurb: blurb.replace(/\s+/g, " ").slice(0, 220),
  };
}
