import { buildPreview } from "./preview";
import { FileDoc, GitRecord, SavedFile, SearchHit, StatusPayload, TreeNode } from "./utils";

const now = new Date().toISOString();

const demoRecords = [
  ["workspace/SOUL.md", "# SOUL\n\n一份核心灵魂档案，用来固定 openclaw 的语气、偏好与边界。\n\n- 温柔\n- 好奇\n- 坚定"],
  ["workspace/IDENTITY.md", "# IDENTITY\n\n我是谁，我如何向用户介绍自己，以及哪些名字和上下文最重要。"],
  ["workspace/USER.md", "# USER\n\n用户档案的总索引，连接到 memory/user 下的更细条目。"],
  ["workspace/AGENTS.md", "# AGENTS\n\n协作代理、工具边界与执行习惯。"],
  ["workspace/MEMORY.md", "# MEMORY\n\n记忆系统的总览。"],
  ["workspace/HEARTBEAT.md", "# HEARTBEAT\n\n最近一次自检记录：运行良好。"],
  ["workspace/TOOLS.md", "# TOOLS\n\n工具使用约束与本地能力索引。"],
  ["workspace/memory/2026/quiet-preferences.md", "# Quiet Preferences\n\n喜欢紧凑、可扫读、不过度装饰的工作界面。"],
  ["workspace/memory/2026/library-idea.md", "# Library Idea\n\n把知识仓库做成能翻阅的真实书架，而不是普通文件列表。"],
  ["workspace/memory/events/session.json", "{\n  \"kind\": \"session\",\n  \"note\": \"JSON files are indexed but not placed on shelves.\"\n}"],
  ["skills/documents/SKILL.md", "# Documents\n\nCreate, edit, render, and verify Word documents with visual QA."],
  ["skills/documents/profiles/default.md", "# Document Profile\n\nDefault document rendering and verification behavior."],
  ["skills/browser/SKILL.md", "# Browser\n\nUse the in-app browser to inspect local pages and screenshots."],
  ["skills/browser/profiles/local.md", "# Local Browser Profile\n\nFocus on localhost targets and rendered UI checks."],
] as const;

let demoFiles = new Map<string, FileDoc>();

function resetDemoFiles() {
  demoFiles = new Map(
    demoRecords.map(([label, content]) => {
      const path = `/demo/${label}`;
      return [
        path,
        {
          path,
          label,
          content,
          size: new TextEncoder().encode(content).length,
          mtime: now,
        },
      ];
    }),
  );
}

resetDemoFiles();

export function getDemoStatus(): StatusPayload {
  return {
    host: "demo",
    port: 8787,
    ips: ["127.0.0.1"],
    uptimeSec: 0,
    tokenHint: "demo…mode",
  };
}

export function getDemoTree(): TreeNode {
  const root: TreeNode = { name: "Library", type: "dir", children: [] };
  for (const doc of demoFiles.values()) {
    const parts = doc.label.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      if (isFile) {
        current.children!.push({
          name: part,
          type: "file",
          path: doc.path,
          size: doc.size,
          mtime: doc.mtime,
        });
      } else {
        let dir = current.children!.find((child) => child.type === "dir" && child.name === part);
        if (!dir) {
          dir = { name: part, type: "dir", children: [] };
          current.children!.push(dir);
        }
        current = dir;
      }
    }
  }
  return root;
}

export async function getDemoFile(path: string) {
  const doc = demoFiles.get(path);
  if (!doc) throw new Error("Demo file not found");
  return { ...doc };
}

export async function saveDemoFile(path: string, content: string): Promise<SavedFile> {
  const doc = demoFiles.get(path);
  if (!doc) throw new Error("Demo file not found");
  const updated = {
    ...doc,
    content,
    size: new TextEncoder().encode(content).length,
    mtime: new Date().toISOString(),
  };
  demoFiles.set(path, updated);
  return {
    ok: true,
    path,
    label: updated.label,
    backup: "demo-memory",
    size: updated.size,
    mtime: updated.mtime,
  };
}

export async function searchDemo(q: string): Promise<SearchHit[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const doc of demoFiles.values()) {
    doc.content.split(/\r?\n/).forEach((line, index) => {
      if (hits.length < 200 && line.toLowerCase().includes(needle)) {
        hits.push({ path: doc.path, label: doc.label, line: index + 1, text: line });
      }
    });
  }
  return hits;
}

export async function preloadDemoMeta(paths: string[]) {
  const out = new Map<string, ReturnType<typeof buildPreview>>();
  for (const path of paths) {
    const doc = demoFiles.get(path);
    if (doc) out.set(path, buildPreview(doc.content, doc.label));
  }
  return out;
}

export async function getDemoHistory(path: string): Promise<GitRecord[]> {
  const doc = demoFiles.get(path);
  if (!doc) return [];
  const seed = doc.label.split("/").pop()?.replace(/\.(md|json)$/i, "") || "file";
  return [
    {
      hash: `demo-${seed}-003`,
      shortHash: "d3mo3",
      author: "openclaw",
      date: "2026-04-29T00:12:00+08:00",
      message: `Polish ${seed} library copy`,
    },
    {
      hash: `demo-${seed}-002`,
      shortHash: "d3mo2",
      author: "openclaw",
      date: "2026-04-27T21:40:00+08:00",
      message: `Add ${seed} shelf metadata`,
    },
    {
      hash: `demo-${seed}-001`,
      shortHash: "d3mo1",
      author: "openclaw",
      date: "2026-04-21T10:08:00+08:00",
      message: `Create ${seed} archive`,
    },
  ];
}

export async function getDemoRevision(path: string, hash: string): Promise<FileDoc> {
  const doc = demoFiles.get(path);
  if (!doc) throw new Error("Demo file not found");
  const record = (await getDemoHistory(path)).find((item) => item.hash === hash);
  if (!record) throw new Error("Demo revision not found");
  const stamp = record.shortHash.toUpperCase();
  const content = `${doc.content}\n\n---\n\n> Demo revision ${stamp}: ${record.message}`;
  return {
    ...doc,
    label: `${doc.label} @ ${record.shortHash}`,
    content,
    size: new TextEncoder().encode(content).length,
    mtime: record.date,
  };
}
