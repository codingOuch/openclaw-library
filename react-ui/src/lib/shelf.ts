import {
  basenameWithoutExt,
  BookItem,
  FileMeta,
  hashString,
  labelFromPath,
  ShelfKind,
  ShelfModel,
  TreeNode,
} from "./utils";

const ROOT_ORDER = ["SOUL", "IDENTITY", "USER", "AGENTS", "MEMORY", "HEARTBEAT", "TOOLS"];

export const SHELF_META: Record<Exclude<ShelfKind, "other">, Omit<ShelfModel, "books" | "kind">> = {
  scroll: {
    title: "Root Scrolls",
    hint: "",
    accent: "#FF9500",
  },
  memory: {
    title: "Memories",
    hint: "",
    accent: "#007AFF",
  },
  skill: {
    title: "Skills",
    hint: "",
    accent: "#AF52DE",
  },
};

export const KIND_ICONS: Record<ShelfKind, string> = {
  scroll: "scroll",
  memory: "journal-text",
  skill: "magic",
  other: "file-earmark-text",
};

interface Classified {
  kind: ShelfKind;
  shelfKind: ShelfKind;
  title: string;
  subtitle: string;
  order: number;
  skillName?: string;
}

export function classifyLabel(label: string, meta?: FileMeta): Classified {
  const clean = labelFromPath(label);
  const lower = clean.toLowerCase();
  const fileName = clean.split("/").pop() || clean;
  const baseName = basenameWithoutExt(fileName);

  const rootMatch = clean.match(/^workspace\/([^/]+)\.md$/i);
  if (rootMatch && ROOT_ORDER.includes(rootMatch[1].toUpperCase())) {
    const title = meta?.title || rootMatch[1].toUpperCase();
    return {
      kind: "scroll",
      shelfKind: "scroll",
      title,
      subtitle: "Root Scroll",
      order: ROOT_ORDER.indexOf(rootMatch[1].toUpperCase()),
    };
  }

  if (lower.startsWith("workspace/memory/") && lower.endsWith(".json")) {
    return {
      kind: "other",
      shelfKind: "other",
      title: meta?.title || baseName,
      subtitle: "JSON Archive",
      order: 0,
    };
  }

  if (lower.startsWith("workspace/memory/") && lower.endsWith(".md")) {
    return {
      kind: "memory",
      shelfKind: "memory",
      title: meta?.title || baseName,
      subtitle: "Memory",
      order: 0,
    };
  }

  const skillRoot = clean.match(/^skills\/([^/]+)\/SKILL\.md$/i);
  if (skillRoot) {
    return {
      kind: "skill",
      shelfKind: "skill",
      title: meta?.title || skillRoot[1],
      subtitle: skillRoot[1],
      order: 0,
      skillName: skillRoot[1],
    };
  }

  const skillProfile = clean.match(/^skills\/([^/]+)\/profiles\/(.+)\.md$/i);
  if (skillProfile) {
    return {
      kind: "skill",
      shelfKind: "skill",
      title: meta?.title || basenameWithoutExt(skillProfile[2]),
      subtitle: skillProfile[1],
      order: 1,
      skillName: skillProfile[1],
    };
  }

  return {
    kind: "other",
    shelfKind: "other",
    title: meta?.title || baseName,
    subtitle: clean.split("/").slice(0, -1).join("/") || "File",
    order: 0,
  };
}

export function bookFromNode(node: TreeNode, meta?: FileMeta): BookItem | null {
  if (node.type !== "file" || !node.path) return null;
  const label = labelFromPath(node.path);
  const classified = classifyLabel(label, meta);
  const fallbackAccent = classified.kind === "other" ? "#8E8E93" : SHELF_META[classified.kind].accent;
  return {
    path: node.path,
    label,
    name: node.name,
    title: classified.title,
    subtitle: classified.subtitle,
    blurb: meta?.blurb || label,
    kind: classified.kind,
    shelfKind: classified.shelfKind,
    accent: fallbackAccent,
    mood: hashString(label) % 4,
    size: node.size,
    mtime: node.mtime,
    order: classified.order,
    skillName: classified.skillName,
  };
}

export function buildBooks(nodes: TreeNode[], metas: Map<string, FileMeta>, filter: string) {
  const q = filter.trim().toLowerCase();
  return nodes
    .map((node) => bookFromNode(node, metas.get(node.path || "")))
    .filter((book): book is BookItem => Boolean(book))
    .filter((book) => {
      if (!q) return true;
      return [book.title, book.subtitle, book.label, book.blurb]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
}

export function buildShelves(books: BookItem[]): ShelfModel[] {
  const order: Exclude<ShelfKind, "other">[] = ["scroll", "memory", "skill"];
  return order
    .map((kind) => {
      const shelfBooks = books
        .filter((book) => book.shelfKind === kind)
        .sort(compareBooks);
      return {
        kind,
        ...SHELF_META[kind],
        books: shelfBooks,
      };
    })
    .filter((shelf) => shelf.books.length > 0);
}

function compareBooks(a: BookItem, b: BookItem) {
  if (a.shelfKind === "scroll" && b.shelfKind === "scroll") return a.order - b.order;
  if (a.shelfKind === "skill" && b.shelfKind === "skill") {
    const skill = (a.skillName || "").localeCompare(b.skillName || "", undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (skill !== 0) return skill;
    if (a.order !== b.order) return a.order - b.order;
  }
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}
