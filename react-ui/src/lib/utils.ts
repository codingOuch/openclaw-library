export type NodeType = "dir" | "file";
export type ShelfKind = "scroll" | "memory" | "skill" | "other";
export type LayoutMode = "cover" | "spine";

export interface TreeNode {
  name: string;
  type: NodeType;
  path?: string;
  children?: TreeNode[];
  size?: number;
  mtime?: string;
}

export interface FileDoc {
  path: string;
  label: string;
  content: string;
  size: number;
  mtime: string;
}

export interface SavedFile {
  ok: boolean;
  path: string;
  label: string;
  backup?: string;
  size: number;
  mtime: string;
}

export interface SearchHit {
  path: string;
  label: string;
  line: number;
  text: string;
}

export interface GitRecord {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface StatusPayload {
  host: string;
  port: number;
  ips: string[];
  uptimeSec: number;
  tokenHint: string;
}

export interface FileMeta {
  title: string;
  blurb: string;
}

export interface BookOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
  mood: number;
}

export interface BookItem {
  path: string;
  label: string;
  name: string;
  title: string;
  subtitle: string;
  blurb: string;
  kind: ShelfKind;
  shelfKind: ShelfKind;
  accent: string;
  mood: number;
  size?: number;
  mtime?: string;
  order: number;
  skillName?: string;
}

export interface ShelfModel {
  kind: ShelfKind;
  title: string;
  hint: string;
  accent: string;
  books: BookItem[];
}

export function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let i = 1; i < units.length && value >= 1024; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${unit}`;
}

export function relativeTime(input?: string) {
  if (!input) return "unknown";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = minute * 60;
  const day = hour * 24;
  const month = day * 30;
  if (abs < minute) return "just now";
  if (abs < hour) return `${Math.round(abs / minute)}m ago`;
  if (abs < day) return `${Math.round(abs / hour)}h ago`;
  if (abs < month) return `${Math.round(abs / day)}d ago`;
  return new Date(input).toLocaleDateString();
}

export function basenameWithoutExt(name: string) {
  return name.replace(/\.(md|json)$/i, "");
}

export function labelFromPath(filePath: string) {
  const normalized = filePath.split("\\").join("/");
  if (normalized.startsWith("skills/") || normalized.startsWith("workspace/")) return normalized;
  const skillsIndex = normalized.lastIndexOf("/skills/");
  if (skillsIndex >= 0) return `skills/${normalized.slice(skillsIndex + "/skills/".length)}`;
  const workspaceIndex = normalized.lastIndexOf("/workspace/");
  if (workspaceIndex >= 0) return `workspace/${normalized.slice(workspaceIndex + "/workspace/".length)}`;
  const demoIndex = normalized.lastIndexOf("/demo/");
  if (demoIndex >= 0) return normalized.slice(demoIndex + "/demo/".length);
  return normalized.replace(/^\/+/, "");
}

export function collectLeaves(node?: TreeNode): TreeNode[] {
  if (!node) return [];
  if (node.type === "file") return [node];
  return (node.children || []).flatMap(collectLeaves);
}

export function countFiles(node?: TreeNode): number {
  if (!node) return 0;
  if (node.type === "file") return 1;
  return (node.children || []).reduce((sum, child) => sum + countFiles(child), 0);
}

export function requestIdle(fn: () => void) {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(fn, { timeout: 800 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}

export function rectToOrigin(rect: DOMRect, mood: number): BookOrigin {
  return {
    x: rect.left,
    y: rect.top,
    width: Math.max(150, rect.width),
    height: Math.max(225, rect.height),
    mood,
  };
}
