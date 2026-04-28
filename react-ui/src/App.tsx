import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { api, getInitialAuth, storeToken } from "./lib/api";
import { buildPreview } from "./lib/preview";
import { AppSettings, LanguageCode, loadSettings, saveSettings } from "./lib/settings";
import { buildBooks, buildShelves } from "./lib/shelf";
import {
  BookItem,
  BookOrigin,
  collectLeaves,
  countFiles,
  FileDoc,
  FileMeta,
  LayoutMode,
  requestIdle,
  SavedFile,
  SearchHit,
  StatusPayload,
  TreeNode,
} from "./lib/utils";
import {
  getDemoFile,
  getDemoHistory,
  getDemoRevision,
  getDemoStatus,
  getDemoTree,
  preloadDemoMeta,
  saveDemoFile,
  searchDemo,
} from "./lib/demo";
import { T } from "./lib/i18n";
import Icon from "./components/Icon";
import Reader from "./components/Reader";
import SearchDrawer from "./components/SearchDrawer";
import SettingsSheet from "./components/SettingsSheet";
import Shelf from "./components/Shelf";
import Sidebar from "./components/Sidebar";
import Toast, { ToastMessage } from "./components/Toast";

interface ReaderState {
  book: BookItem;
  origin: BookOrigin;
}

interface BookMenuState {
  book: BookItem;
  x: number;
  y: number;
}

const LAYOUT_KEY = "openclaw-layout";

declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void> };
  }
}

export default function App() {
  const initial = useMemo(() => getInitialAuth(), []);
  const [token, setToken] = useState(initial.token);
  const [demo] = useState(initial.demo);
  const [status, setStatus] = useState<StatusPayload | null>(demo ? getDemoStatus() : null);
  const [tree, setTree] = useState<TreeNode | undefined>(demo ? getDemoTree() : undefined);
  const [metas, setMetas] = useState<Map<string, FileMeta>>(new Map());
  const [layout, setLayout] = useState<LayoutMode>(() => {
    const stored = localStorage.getItem(LAYOUT_KEY);
    return stored === "spine" ? "spine" : "cover";
  });
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bookMenu, setBookMenu] = useState<BookMenuState | null>(null);
  const [coverEditor, setCoverEditor] = useState<BookItem | null>(null);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [activePath, setActivePath] = useState<string | undefined>();
  const [reader, setReader] = useState<ReaderState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const coverUploadRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<BookItem | null>(null);

  const leaves = useMemo(() => collectLeaves(tree), [tree]);
  const books = useMemo(() => buildBooks(leaves, metas, libraryFilter), [leaves, libraryFilter, metas]);
  const shelves = useMemo(() => buildShelves(books), [books]);
  const bookByPath = useMemo(() => new Map(books.map((book) => [book.path, book])), [books]);
  const lang = settings.language;
  const searchPlaceholder = T("search.placeholder", lang);

  const showToast = useCallback((tone: ToastMessage["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, tone, text }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2600);
  }, []);

  const updateSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  const saveCover = useCallback(
    async (bookPath: string, dataUrl: string) => {
      if (demo) {
        setCustomCovers((prev) => ({ ...prev, [bookPath]: dataUrl }));
        return;
      }
      try {
        await api.saveCover(token, bookPath, dataUrl);
        setCustomCovers((prev) => ({ ...prev, [bookPath]: dataUrl }));
      } catch {
        showToast("error", T("cover.quota", lang));
      }
    },
    [demo, token, showToast, lang],
  );

  const deleteCover = useCallback(
    async (bookPath: string) => {
      if (demo) {
        setCustomCovers((prev) => {
          const next = { ...prev };
          delete next[bookPath];
          return next;
        });
        return;
      }
      try {
        await api.deleteCover(token, bookPath);
        setCustomCovers((prev) => {
          const next = { ...prev };
          delete next[bookPath];
          return next;
        });
      } catch {
        showToast("error", "Failed to delete cover");
      }
    },
    [demo, token, showToast],
  );

  const openBookMenu = useCallback((book: BookItem, x: number, y: number) => {
    setBookMenu({ book, x, y });
  }, []);

  const beginCoverUpload = useCallback((book: BookItem) => {
    uploadTargetRef.current = book;
    setBookMenu(null);
    coverUploadRef.current?.click();
  }, []);

  const clearCustomCover = useCallback(
    (book: BookItem) => {
      deleteCover(book.path);
      showToast("ok", T("cover.reset", lang));
    },
    [deleteCover, showToast, lang],
  );

  const handleCoverUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      const book = uploadTargetRef.current;
      input.value = "";
      if (!file || !book) return;
      if (!file.type.startsWith("image/")) {
        showToast("error", T("cover.selectImage", lang));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const img = new Image();
        img.onload = () => {
          const dataUrl = resizeCoverImage(img);
          saveCover(book.path, dataUrl);
          setCoverEditor(book);
          showToast("ok", T("cover.updated", lang));
        };
        img.onerror = () => showToast("error", T("cover.readFailed", lang));
        img.src = reader.result as string;
      };
      reader.onerror = () => showToast("error", T("cover.readFailed", lang));
      reader.readAsDataURL(file);
    },
    [saveCover, showToast, lang],
  );

  useEffect(() => {
    if (demo || !token) return;
    api.covers(token).then(setCustomCovers).catch(() => {});
  }, [demo, token]);

  useEffect(() => {
    if (!bookMenu && !coverEditor) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setBookMenu(null);
      setCoverEditor(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [bookMenu, coverEditor]);

  const loadLibrary = useCallback(async () => {
    if (demo) {
      setStatus(getDemoStatus());
      setTree(getDemoTree());
      return;
    }
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [nextStatus, nextTree] = await Promise.all([api.status(token), api.tree(token)]);
      setStatus(nextStatus);
      setTree(nextTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [demo, token]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  useEffect(() => {
    if (!leaves.length) return undefined;
    let cancelled = false;
    const pending = leaves.filter((node) => node.path && !metas.has(node.path));
    if (!pending.length) return undefined;

    const cancelIdle = requestIdle(() => {
      const run = async () => {
        const next = new Map<string, FileMeta>();
        if (demo) {
          const demoMeta = await preloadDemoMeta(pending.map((node) => node.path!));
          demoMeta.forEach((value, key) => next.set(key, value));
        } else if (token) {
          let cursor = 0;
          const workers = Array.from({ length: Math.min(8, pending.length) }, async () => {
            while (cursor < pending.length && !cancelled) {
              const node = pending[cursor];
              cursor += 1;
              if (!node.path) continue;
              try {
                const doc = await api.file(token, node.path);
                next.set(node.path, buildPreview(doc.content, doc.label));
              } catch {
                next.set(node.path, { title: node.name.replace(/\.(md|json)$/i, ""), blurb: node.path });
              }
            }
          });
          await Promise.all(workers);
        }
        if (!cancelled && next.size) {
          requestIdle(() => {
            if (!cancelled) setMetas((prev) => new Map([...prev, ...next]));
          });
        }
      };
      run();
    });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [demo, leaves, metas, token]);

  const setAndPersistLayout = (mode: LayoutMode) => {
    if (mode === layout) return;
    const commit = () => {
      setLayout(mode);
      localStorage.setItem(LAYOUT_KEY, mode);
    };
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(commit));
      return;
    }
    commit();
  };

  const openBook = useCallback((book: BookItem, origin: BookOrigin) => {
    setActivePath(book.path);
    setReader({ book, origin });
  }, []);

  const loadFile = useCallback(
    (path: string) => (demo ? getDemoFile(path) : api.file(token, path)),
    [demo, token],
  );

  const loadHistory = useCallback(
    (path: string) => (demo ? getDemoHistory(path) : api.gitHistory(token, path)),
    [demo, token],
  );

  const loadRevision = useCallback(
    (path: string, hash: string) => (demo ? getDemoRevision(path, hash) : api.gitFile(token, path, hash)),
    [demo, token],
  );

  const saveFile = useCallback(
    (path: string, content: string) => (demo ? saveDemoFile(path, content) : api.saveFile(token, path, content)),
    [demo, token],
  );

  const onSaved = useCallback((doc: FileDoc) => {
    setMetas((prev) => new Map(prev).set(doc.path, buildPreview(doc.content, doc.label)));
    setTree((prev) => updateTreeFile(prev, doc));
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query) return;
      setSearching(true);
      try {
        const hits = demo ? await searchDemo(query) : await api.search(token, query);
        setSearchHits(hits);
        setSearchOpen(true);
      } catch (err) {
        showToast("error", `${T("search.failed", lang)}：${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setSearching(false);
      }
    },
    [demo, showToast, token],
  );

  if (!demo && !token) {
    return <Login onLogin={(value) => {
      storeToken(value);
      setToken(value);
    }} language={lang} />;
  }

  return (
    <div className="hall">
      <nav className="navbar">
        <div className="brand">
          <Icon name="library-outline" />
          <div>
            <strong>openclaw</strong>
            <span>{shelves.length} {T("shelf.count", lang)} · {countFiles(tree)} {T("book.count", lang)}</span>
          </div>
        </div>
        <form
          className="nav-search"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch(libraryFilter);
          }}
        >
          <Icon name="search-outline" />
          <input
            value={libraryFilter}
            onChange={(event) => setLibraryFilter(event.target.value)}
            placeholder={searchPlaceholder}
          />
          {searching && <span>…</span>}
        </form>
        <div className="nav-status">
          <span className="lan-dot" />
          <span>{status?.ips?.[0] || status?.host || "LAN"}</span>
          {demo && <em>DEMO</em>}
        </div>
      </nav>

      <Sidebar tree={tree} activePath={activePath} bookByPath={bookByPath} onOpen={openBook} language={lang} />

      <main className="hall-body">
        <section className={`shelves shelves-${layout}`}>
          <header className="page-hero">
            <div>
              <h1>Library</h1>
              <p>{loading ? "Loading shelves…" : error ? "Token or API needs attention" : status?.tokenHint ? `token ${status.tokenHint}` : "Local knowledge shelves"}</p>
            </div>
            <div className="page-hero-tools">
              <div className="layout-toggle" role="group" aria-label="Layout">
                <button
                  type="button"
                  className={layout === "cover" ? "active" : ""}
                  onClick={() => setAndPersistLayout("cover")}
                  title="Cover"
                >
                  <Icon name="grid-3x2-gap" />
                </button>
                <button
                  type="button"
                  className={layout === "spine" ? "active" : ""}
                  onClick={() => setAndPersistLayout("spine")}
                  title="Spine"
                >
                  <Icon name="journals" />
                </button>
              </div>
              <button type="button" className="avatar" onClick={() => setSettingsOpen(true)} aria-label="Settings">
                oc
              </button>
            </div>
          </header>

          <div className={`shelf-list shelf-list-${layout}`}>
            {error && <div className="inline-error">{error}</div>}
            {!error && shelves.length === 0 && <div className="empty-library">{T("library.empty", lang)} <a href="/?demo=1">demo=1</a>。</div>}
            {shelves.map((shelf) => (
              <Shelf
                key={shelf.kind}
                shelf={shelf}
                layout={layout}
                customCovers={customCovers}
                onOpen={openBook}
                onMenu={openBookMenu}
                language={lang}
              />
            ))}
          </div>
        </section>
      </main>

      <SearchDrawer
        open={searchOpen}
        query={libraryFilter}
        hits={searchHits}
        bookByPath={bookByPath}
        onClose={() => setSearchOpen(false)}
        onOpen={openBook}
        language={lang}
      />

      {reader && (
        <Reader
          book={reader.book}
          origin={reader.origin}
          customCover={customCovers[reader.book.path]}
          historyEnabled={settings.allowGitRecords}
          language={lang}
          loadFile={loadFile}
          loadHistory={loadHistory}
          loadRevision={loadRevision}
          saveFile={saveFile}
          onClosed={() => setReader(null)}
          onSaved={onSaved}
          toast={showToast}
        />
      )}
      <SettingsSheet open={settingsOpen} settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      <input ref={coverUploadRef} className="cover-upload-input" type="file" accept="image/*" onChange={handleCoverUpload} />
      <BookContextMenu
        state={bookMenu}
        hasCustomCover={Boolean(bookMenu && customCovers[bookMenu.book.path])}
        onClose={() => setBookMenu(null)}
        onEdit={(book) => {
          setBookMenu(null);
          setCoverEditor(book);
        }}
        onUpload={beginCoverUpload}
        onClear={clearCustomCover}
        language={lang}
      />
      <CoverEditor
        book={coverEditor}
        cover={coverEditor ? customCovers[coverEditor.path] : undefined}
        onClose={() => setCoverEditor(null)}
        onUpload={beginCoverUpload}
        onClear={clearCustomCover}
        language={lang}
      />
      <Toast items={toasts} />
    </div>
  );
}

function BookContextMenu({
  state,
  hasCustomCover,
  onClose,
  onEdit,
  onUpload,
  onClear,
  language,
}: {
  state: BookMenuState | null;
  hasCustomCover: boolean;
  onClose: () => void;
  onEdit: (book: BookItem) => void;
  onUpload: (book: BookItem) => void;
  onClear: (book: BookItem) => void;
  language: LanguageCode;
}) {
  if (!state) return null;
  const left = Math.min(state.x, window.innerWidth - 236);
  const top = Math.min(state.y, window.innerHeight - (hasCustomCover ? 188 : 142));
  return (
    <div className="book-menu-catcher" onClick={onClose} onContextMenu={(event) => event.preventDefault()}>
      <div className="book-context-menu" style={{ left, top }} onClick={(event) => event.stopPropagation()}>
        <div className="book-context-title">{state.book.title}</div>
        <button type="button" onClick={() => onEdit(state.book)}>
          <Icon name="pencil-square" />
          <span>{T("menu.editCover", language)}</span>
        </button>
        <button type="button" onClick={() => onUpload(state.book)}>
          <Icon name="upload" />
          <span>{T("menu.uploadImage", language)}</span>
        </button>
        {hasCustomCover && (
          <button type="button" className="danger" onClick={() => onClear(state.book)}>
            <Icon name="trash3" />
            <span>{T("menu.resetCover", language)}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function CoverEditor({
  book,
  cover,
  onClose,
  onUpload,
  onClear,
  language,
}: {
  book: BookItem | null;
  cover?: string;
  onClose: () => void;
  onUpload: (book: BookItem) => void;
  onClear: (book: BookItem) => void;
  language: LanguageCode;
}) {
  if (!book) return null;
  return (
    <div className="cover-editor-veil" role="dialog" aria-modal="true" aria-label={T("coverEditor.title", language)} onClick={onClose}>
      <section className="cover-editor-card" onClick={(event) => event.stopPropagation()}>
        <header>
          <button type="button" onClick={onClose}>
            {T("coverEditor.cancel", language)}
          </button>
          <strong>{T("coverEditor.title", language)}</strong>
          <button type="button" onClick={onClose}>
            {T("coverEditor.done", language)}
          </button>
        </header>
        <main>
          <div className={`cover-editor-preview ${cover ? "has-image" : ""}`}>
            {cover ? <img src={cover} alt="" /> : <Icon name="image" />}
          </div>
          <div className="cover-editor-copy">
            <strong>{book.title}</strong>
            <span>{book.label}</span>
          </div>
          <div className="cover-editor-actions">
            <button type="button" onClick={() => onUpload(book)}>
              <Icon name="upload" />
              <span>{T("coverEditor.upload", language)}</span>
            </button>
            <button type="button" disabled={!cover} onClick={() => onClear(book)}>
              <Icon name="trash3" />
              <span>{T("coverEditor.reset", language)}</span>
            </button>
          </div>
        </main>
      </section>
    </div>
  );
}

function Login({ onLogin, language }: { onLogin: (token: string) => void; language: LanguageCode }) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) onLogin(value.trim());
  };
  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <Icon name="library-outline" />
        <h1>openclaw Library</h1>
        <p>{T("login.hint", language)}</p>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="token" autoFocus />
        <button type="submit">{T("login.enter", language)}</button>
        <a href="/?demo=1">{T("login.demo", language)}</a>
      </form>
    </main>
  );
}

function resizeCoverImage(img: HTMLImageElement): string {
  const MAX = 400;
  let { width, height } = img;
  if (width <= MAX && height <= MAX) return img.src;
  if (width > height) {
    height = Math.round(height * (MAX / width));
    width = MAX;
  } else {
    width = Math.round(width * (MAX / height));
    height = MAX;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

function updateTreeFile(tree: TreeNode | undefined, doc: FileDoc): TreeNode | undefined {
  if (!tree) return tree;
  if (tree.type === "file") {
    if (tree.path !== doc.path) return tree;
    return { ...tree, size: doc.size, mtime: doc.mtime };
  }
  return {
    ...tree,
    children: tree.children?.map((child) => updateTreeFile(child, doc)),
  };
}
