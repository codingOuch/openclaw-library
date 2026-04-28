import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { bookFromNode, classifyLabel, KIND_ICONS } from "../lib/shelf";
import { T } from "../lib/i18n";
import { LanguageCode } from "../lib/settings";
import { BookItem, BookOrigin, countFiles, labelFromPath, rectToOrigin, TreeNode } from "../lib/utils";
import Icon from "./Icon";

type SortField = "name" | "mtime" | "size" | "type";
type SortDir = "asc" | "desc";

interface SidebarProps {
  tree?: TreeNode;
  activePath?: string;
  bookByPath: Map<string, BookItem>;
  onOpen: (book: BookItem, origin: BookOrigin) => void;
  language: LanguageCode;
}

const sortIcons: Record<SortField, string> = {
  name: "sort-alpha-down",
  mtime: "clock",
  size: "hdd",
  type: "tags",
};

export default function Sidebar({ tree, activePath, bookByPath, onOpen, language }: SidebarProps) {
  const sortLabels: Record<SortField, string> = {
    name: T("sidebar.name", language),
    mtime: T("sidebar.mtime", language),
    size: T("sidebar.size", language),
    type: T("sidebar.type", language),
  };
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["Library", "Library/workspace", "Library/skills"]));
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onMouseDown = (event: MouseEvent | globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [menuOpen]);

  const viewTree = useMemo(() => {
    if (!tree) return undefined;
    const filtered = filterTree(tree, filter);
    return filtered ? sortTree(filtered, sortField, sortDir) : undefined;
  }, [filter, sortDir, sortField, tree]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        <div className="sidebar-title">
          <Icon name="folder-outline" />
          <span>Tree</span>
        </div>
        <div className="sort-wrap" ref={menuRef}>
          <button type="button" className="sort-btn" onClick={() => setMenuOpen((value) => !value)}>
            <span>{sortLabels[sortField]}</span>
            <Icon name={sortDir === "asc" ? "arrow-up" : "arrow-down"} />
            <Icon name="chevron-down" />
          </button>
          {menuOpen && (
            <div className="sort-menu">
              {(["name", "mtime", "size", "type"] as SortField[]).map((field) => (
                <button key={field} type="button" onClick={() => setSortField(field)}>
                  <Icon name={sortIcons[field]} />
                  <span>{sortLabels[field]}</span>
                  {sortField === field && <Icon name="check" />}
                </button>
              ))}
              <div className="sort-sep" />
              {(["asc", "desc"] as SortDir[]).map((dir) => (
                <button key={dir} type="button" onClick={() => setSortDir(dir)}>
                  <Icon name={dir === "asc" ? "sort-up" : "sort-down"} />
                  <span>{dir === "asc" ? T("sidebar.asc", language) : T("sidebar.desc", language)}</span>
                  {sortDir === dir && <Icon name="check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <label className="tree-filter">
        <Icon name="search-outline" />
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter" />
      </label>
      <div className="tree-scroll">
        {viewTree?.children?.map((node) => (
          <TreeRow
            key={node.name}
            node={node}
            depth={0}
            pathKey={`Library/${node.name}`}
            activePath={activePath}
            filtered={Boolean(filter.trim())}
            expanded={expanded}
            bookByPath={bookByPath}
            onToggle={toggle}
            onOpen={onOpen}
          />
        ))}
      </div>
    </aside>
  );
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  pathKey: string;
  activePath?: string;
  filtered: boolean;
  expanded: Set<string>;
  bookByPath: Map<string, BookItem>;
  onToggle: (key: string) => void;
  onOpen: (book: BookItem, origin: BookOrigin) => void;
}

function TreeRow({ node, depth, pathKey, activePath, filtered, expanded, bookByPath, onToggle, onOpen }: TreeRowProps) {
  if (node.type === "dir") {
    const open = filtered || expanded.has(pathKey);
    return (
      <div className="tree-group">
        <button
          type="button"
          className="tree-branch"
          style={{ paddingLeft: 12 + depth * 14 }}
          onClick={() => onToggle(pathKey)}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} />
          <Icon name={open ? "folder-open-outline" : "folder-outline"} />
          <span>{node.name}</span>
          <em>{countFiles(node)}</em>
        </button>
        {open &&
          node.children?.map((child) => (
            <TreeRow
              key={`${pathKey}/${child.name}`}
              node={child}
              depth={depth + 1}
              pathKey={`${pathKey}/${child.name}`}
              activePath={activePath}
              filtered={filtered}
              expanded={expanded}
              bookByPath={bookByPath}
              onToggle={onToggle}
              onOpen={onOpen}
            />
          ))}
      </div>
    );
  }

  const label = labelFromPath(node.path || node.name);
  const classified = classifyLabel(label);
  const icon = KIND_ICONS[classified.kind];
  const openLeaf = (event: MouseEvent<HTMLButtonElement>) => {
    const book = (node.path && bookByPath.get(node.path)) || bookFromNode(node);
    if (!book) return;
    onOpen(book, rectToOrigin(event.currentTarget.getBoundingClientRect(), book.mood));
  };

  return (
    <button
      type="button"
      className={`tree-leaf ${node.path === activePath ? "active" : ""}`}
      style={{ paddingLeft: 30 + depth * 14 }}
      onClick={openLeaf}
      title={label}
    >
      <Icon name={icon} />
      <span>{node.name.replace(/\.(md|json)$/i, "")}</span>
    </button>
  );
}

function filterTree(node: TreeNode, query: string): TreeNode | null {
  const q = query.trim().toLowerCase();
  if (!q) return structuredClone(node);
  const self = [node.name, node.path || "", node.path ? labelFromPath(node.path) : ""].join(" ").toLowerCase().includes(q);
  if (node.type === "file") return self ? { ...node } : null;
  const children = (node.children || []).map((child) => filterTree(child, query)).filter(Boolean) as TreeNode[];
  if (self || children.length) return { ...node, children: self ? node.children || [] : children };
  return null;
}

function sortTree(node: TreeNode, field: SortField, dir: SortDir): TreeNode {
  if (node.type === "file") return { ...node };
  const multiplier = dir === "asc" ? 1 : -1;
  const children = [...(node.children || [])]
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return compareField(a, b, field) * multiplier;
    })
    .map((child) => sortTree(child, field, dir));
  return { ...node, children };
}

function compareField(a: TreeNode, b: TreeNode, field: SortField) {
  if (field === "mtime") return new Date(a.mtime || 0).getTime() - new Date(b.mtime || 0).getTime();
  if (field === "size") return (a.size || 0) - (b.size || 0);
  if (field === "type") {
    const ak = a.type === "file" ? classifyLabel(labelFromPath(a.path || a.name)).kind : "dir";
    const bk = b.type === "file" ? classifyLabel(labelFromPath(b.path || b.name)).kind : "dir";
    return ak.localeCompare(bk);
  }
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}
