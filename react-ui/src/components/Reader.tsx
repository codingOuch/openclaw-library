import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { motion } from "motion/react";
import { getRootCoverArt } from "../lib/coverArt";
import { splitFrontmatter } from "../lib/preview";
import { BookItem, BookOrigin, clamp, FileDoc, formatBytes, GitRecord, SavedFile } from "../lib/utils";
import { LanguageCode } from "../lib/settings";
import { T } from "../lib/i18n";
import Confirm from "./Confirm";
import DiffPanel from "./DiffPanel";
import Icon from "./Icon";

type Phase = "flight" | "flipping" | "open" | "closing-flip" | "closing-flight";
type ConfirmMode = "unlock" | "save" | "discard" | null;
type ReaderViewMode = "read" | "history" | "revision";

interface ReaderProps {
  book: BookItem;
  origin: BookOrigin;
  initialMode?: "read" | "history";
  customCover?: string;
  historyEnabled: boolean;
  language: LanguageCode;
  loadFile: (path: string) => Promise<FileDoc>;
  loadHistory: (path: string) => Promise<GitRecord[]>;
  loadRevision: (path: string, hash: string) => Promise<FileDoc>;
  saveFile: (path: string, content: string) => Promise<SavedFile>;
  onClosed: () => void;
  onSaved: (doc: FileDoc) => void;
  toast: (tone: "ok" | "warn" | "error", text: string) => void;
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Reader({
  book,
  origin,
  initialMode = "read",
  customCover,
  historyEnabled,
  language,
  loadFile,
  loadHistory,
  loadRevision,
  saveFile,
  onClosed,
  onSaved,
  toast,
}: ReaderProps) {
  const [phase, setPhase] = useState<Phase>("flight");
  const [target] = useState<TargetRect>(() => computeTarget());
  const [file, setFile] = useState<FileDoc | null>(null);
  const [draft, setDraft] = useState("");
  const [locked, setLocked] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmMode>(null);
  const [discardCloses, setDiscardCloses] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ReaderViewMode>(historyEnabled ? initialMode : "read");
  const [history, setHistory] = useState<GitRecord[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GitRecord | null>(null);
  const [revision, setRevision] = useState<FileDoc | null>(null);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const closingRef = useRef(false);

  const dirty = Boolean(file && draft !== file.content);
  const loading = !file || phase === "flight" || phase === "flipping";
  const lineCount = draft ? draft.split(/\r?\n/).length : file?.content.split(/\r?\n/).length || 0;
  const sx0 = origin.width / target.width;
  const sy0 = origin.height / target.height;
  const tx0 = origin.x - target.x;
  const ty0 = origin.y - target.y - (target.height - origin.height) / 2;
  const coverArt = getRootCoverArt(book.label);
  const customCoverStyle = customCover
    ? ({
        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.48)), url(${customCover})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } as CSSProperties)
    : undefined;

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setPhase("flipping"), 320),
      window.setTimeout(() => setPhase("open"), 800),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFile(null);
    setDraft("");
    loadFile(book.path)
      .then((doc) => {
        if (cancelled) return;
        setFile(doc);
        setDraft(doc.content);
      })
      .catch((error) => {
        if (!cancelled) toast("error", `${T("reader.loadFailed", language)}：${error.message}`);
      });
    setViewMode(historyEnabled ? initialMode : "read");
    setSelectedRecord(null);
    setRevision(null);
    return () => {
      cancelled = true;
    };
  }, [book.path, historyEnabled, initialMode, loadFile, toast]);

  useEffect(() => {
    if (!historyEnabled || phase !== "open" || history) return undefined;
    let cancelled = false;
    setHistoryLoading(true);
    loadHistory(book.path)
      .then((records) => {
        if (!cancelled) setHistory(records);
      })
      .catch((error) => {
        if (!cancelled) toast("error", `${T("reader.gitFailed", language)}：${error.message}`);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [book.path, history, historyEnabled, loadHistory, phase, toast]);

  const beginClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setConfirm(null);
    setPhase("closing-flip");
    window.setTimeout(() => setPhase("closing-flight"), 380);
    window.setTimeout(onClosed, 720);
  }, [onClosed]);

  const requestClose = useCallback(() => {
    if (dirty && phase === "open") {
      setDiscardCloses(true);
      setConfirm("discard");
    } else beginClose();
  }, [beginClose, dirty, phase]);

  const requestSave = useCallback(() => {
    if (!file || locked || !dirty) return;
    setConfirm("save");
  }, [dirty, file, locked]);

  const openRevision = useCallback(
    async (record: GitRecord) => {
      if (dirty && !locked) {
        toast("warn", T("reader.saveOrDiscard", language));
        return;
      }
      setSelectedRecord(record);
      setViewMode("revision");
      setRevision(null);
      setRevisionLoading(true);
      try {
        const doc = await loadRevision(book.path, record.hash);
        setRevision(doc);
      } catch (error) {
        toast("error", `${T("reader.revisionFailed", language)}：${error instanceof Error ? error.message : String(error)}`);
        setViewMode("history");
      } finally {
        setRevisionLoading(false);
      }
    },
    [book.path, dirty, loadRevision, locked, toast],
  );

  const unlock = useCallback(() => {
    setLocked(false);
    setConfirm(null);
    toast("warn", T("reader.unlocked", language));
  }, [toast]);

  const confirmSave = useCallback(async () => {
    if (!file || saving) return;
    setSaving(true);
    try {
      const saved = await saveFile(book.path, draft);
      const nextDoc: FileDoc = {
        ...file,
        path: saved.path,
        label: saved.label,
        content: draft,
        size: saved.size,
        mtime: saved.mtime,
      };
      setFile(nextDoc);
      setDraft(draft);
      setLocked(true);
      setConfirm(null);
      onSaved(nextDoc);
      toast("ok", saved.backup ? T("reader.savedBackup", language) : T("reader.saved", language));
    } catch (error) {
      toast("error", `${T("reader.saveFailed", language)}：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }, [book.path, draft, file, onSaved, saveFile, saving, toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (confirm) return;
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        requestSave();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm, requestClose, requestSave]);

  const flipAnimate = phaseToFlip(phase, tx0, ty0, sx0, sy0);
  const flipTransition = phaseToTransition(phase);
  const readerStyle = {
    left: target.x,
    top: target.y,
    width: target.width,
    height: target.height,
  } as CSSProperties;
  const coverStyle = {
    left: target.x,
    top: target.y,
    width: target.width,
    height: target.height,
    "--accent": book.accent,
  } as CSSProperties;

  return (
    <motion.div
      className="reader-veil"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest(".reader, .flip-cover, .confirm-veil")) requestClose();
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <BlankCloseZones target={target} onClose={requestClose} language={language} />
      <motion.div
        className={`flip-cover mood-${book.mood}`}
        style={coverStyle}
        onClick={(event) => event.stopPropagation()}
        initial={{ x: tx0, y: ty0, scaleX: sx0, scaleY: sy0, rotateY: 0 }}
        animate={flipAnimate}
        transition={flipTransition}
      >
        <div
          className={`flip-cover-front ${coverArt && !customCover ? `has-root-art art-${coverArt.key}` : ""} ${customCover ? "has-custom-cover" : ""}`}
          style={customCoverStyle}
        >
          <div className="book-kind">{book.kind}</div>
          {coverArt && !customCover && (
            <div className="flip-art" aria-hidden="true">
              <Icon name={coverArt.icon} />
              <span>{coverArt.sigil}</span>
            </div>
          )}
          <div className="flip-title">{book.title}</div>
          <div className="book-rule" />
          <div className="book-sub">{book.subtitle}</div>
        </div>
        <div className="flip-cover-back">
          <LeftPageLedger
            book={book}
            enabled={historyEnabled}
            records={history || []}
            loading={historyLoading}
            selectedHash={selectedRecord?.hash}
            onSelect={openRevision}
            language={language}
          />
        </div>
      </motion.div>
      <motion.article
        className="reader"
        style={readerStyle}
        onClick={(event) => event.stopPropagation()}
        animate={{
          opacity: phase === "flight" || phase === "closing-flight" ? 0 : 1,
          scale: phase === "flight" || phase === "closing-flight" ? 0.96 : 1,
        }}
        transition={{
          opacity: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
          scale: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
        }}
      >
        <header className="reader-nav">
          <button type="button" className="reader-back" onClick={requestClose}>
            <Icon name="chevron-left" />
            <span>{T("reader.library", language)}</span>
          </button>
          <div className="reader-title">
            <strong>{file?.label || book.label}</strong>
            <span>{book.subtitle}</span>
          </div>
          <button
            type="button"
            className={`reader-lock ${locked ? "" : "unlocked"} ${dirty ? "dirty" : ""}`}
            onClick={() => {
              if (locked) setConfirm("unlock");
              else if (dirty) {
                setDiscardCloses(false);
                setConfirm("discard");
              } else setLocked(true);
            }}
            aria-label={locked ? T("reader.unlockEdit", language) : T("reader.lockEdit", language)}
          >
            <Icon name={locked ? "lock-closed-outline" : "lock-open-outline"} />
          </button>
        </header>
        <main className="reader-body">
          {loading ? (
            <div className="reader-loading">{T("reader.loading", language)}</div>
          ) : viewMode === "history" ? (
            <HistoryView
              book={book}
              records={history || []}
              loading={historyLoading}
              selectedHash={selectedRecord?.hash}
              onSelect={openRevision}
              language={language}
            />
          ) : viewMode === "revision" ? (
            <RevisionView record={selectedRecord} doc={revision} loading={revisionLoading} language={language} />
          ) : locked ? (
            <ReadOnlyView text={file.content} />
          ) : (
            <textarea
              className="reader-editor"
              value={draft}
              spellCheck={false}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
        </main>
        <footer className="reader-tab">
          <span>
            {lineCount} {T("reader.lines", language)} · {formatBytes(file?.size || draft.length)}
          </span>
          <div>
            {historyEnabled && (
              <button
                type="button"
                className={viewMode !== "read" ? "primary ghost-primary" : ""}
                onClick={() => {
                  if (viewMode === "read") {
                    setViewMode("history");
                  } else {
                    setViewMode("read");
                    setSelectedRecord(null);
                  }
                }}
              >
                {viewMode === "read" ? T("reader.history", language) : T("reader.content", language)}
              </button>
            )}
            {locked ? (
              <button type="button" onClick={() => setConfirm("unlock")}>
                {T("reader.unlockEdit", language)}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (dirty) {
                      setDiscardCloses(false);
                      setConfirm("discard");
                    } else setLocked(true);
                  }}
                >
                  {T("reader.discardChanges", language)}
                </button>
                <button type="button" className="primary" disabled={!dirty || saving} onClick={requestSave}>
                  {T("reader.saveChanges", language)}
                </button>
              </>
            )}
          </div>
        </footer>
      </motion.article>

      <Confirm
        open={confirm === "unlock"}
        title={`${T("reader.unlockTitle", language)}《${book.title}》`}
        body={T("reader.unlockBody", language)}
        confirmText={T("reader.unlock", language)}
        cancelText={T("reader.stayReadonly", language)}
        tone="orange"
        onConfirm={unlock}
        onCancel={() => setConfirm(null)}
      />
      <Confirm
        open={confirm === "save"}
        title={`${T("reader.saveTitle", language)}《${book.title}》`}
        confirmText={saving ? T("reader.saving", language) : T("reader.confirmSave", language)}
        cancelText={T("reader.keepEditing", language)}
        tone="blue"
        width="wide"
        onConfirm={confirmSave}
        onCancel={() => setConfirm(null)}
      >
        <DiffPanel before={file?.content || ""} after={draft} language={language} />
      </Confirm>
      <Confirm
        open={confirm === "discard"}
        title={T("reader.discardTitle", language)}
        body={T("reader.discardBody", language)}
        confirmText={T("reader.discard", language)}
        cancelText={T("reader.thinkAgain", language)}
        tone="red"
        onConfirm={() => {
          if (file) setDraft(file.content);
          setLocked(true);
          if (discardCloses) beginClose();
          setConfirm(null);
          setDiscardCloses(false);
        }}
        onCancel={() => {
          setConfirm(null);
          setDiscardCloses(false);
        }}
      />
    </motion.div>
  );
}

function ReadOnlyView({ text }: { text: string }) {
  const html = useMemo(() => {
    const { body } = splitFrontmatter(text);
    return marked.parse(body, { async: false }) as string;
  }, [text]);
  return <div className="reader-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}

function BlankCloseZones({ target, onClose, language }: { target: TargetRect; onClose: () => void; language: LanguageCode }) {
  const bookLeft = Math.max(0, target.x - target.width);
  const bookRight = Math.min(window.innerWidth, target.x + target.width);
  const bookTop = Math.max(0, target.y);
  const bookBottom = Math.min(window.innerHeight, target.y + target.height);
  const zones: Array<{ key: string; style: CSSProperties }> = [
    { key: "top", style: { left: 0, top: 0, width: window.innerWidth, height: bookTop } },
    {
      key: "bottom",
      style: { left: 0, top: bookBottom, width: window.innerWidth, height: Math.max(0, window.innerHeight - bookBottom) },
    },
    { key: "left", style: { left: 0, top: bookTop, width: bookLeft, height: Math.max(0, bookBottom - bookTop) } },
    {
      key: "right",
      style: { left: bookRight, top: bookTop, width: Math.max(0, window.innerWidth - bookRight), height: Math.max(0, bookBottom - bookTop) },
    },
  ];
  return (
    <>
      {zones.map((zone) => (
        <button
          key={zone.key}
          type="button"
          className={`reader-blank-zone reader-blank-zone-${zone.key}`}
          style={zone.style}
          tabIndex={-1}
          aria-label={T("reader.closeBook", language)}
          onClick={onClose}
        />
      ))}
    </>
  );
}

function LeftPageLedger({
  book,
  enabled,
  records,
  loading,
  selectedHash,
  onSelect,
  language,
}: {
  book: BookItem;
  enabled: boolean;
  records: GitRecord[];
  loading: boolean;
  selectedHash?: string;
  onSelect: (record: GitRecord) => void;
  language: LanguageCode;
}) {
  return (
    <div className="left-ledger-page">
      <div className="left-ledger-kicker">Git Ledger</div>
      <h2>{book.title}</h2>
      <p>{enabled ? T("reader.ledgerHint", language) : T("reader.gitDisabled", language)}</p>
      {enabled && (
        <div className="left-ledger-list">
          {loading ? (
            <div className="left-ledger-empty">{T("reader.loading", language)}</div>
          ) : records.length === 0 ? (
            <div className="left-ledger-empty">{T("reader.noGitRecords", language)}</div>
          ) : (
            records.slice(0, 5).map((record) => (
              <button
                key={record.hash}
                type="button"
                className={`left-ledger-record ${selectedHash === record.hash ? "active" : ""}`}
                onClick={() => onSelect(record)}
              >
                <strong>{record.message || "Untitled change"}</strong>
                <span>
                  {record.shortHash} · {record.date ? new Date(record.date).toLocaleDateString() : "unknown"}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function HistoryView({
  book,
  records,
  loading,
  selectedHash,
  onSelect,
  language,
}: {
  book: BookItem;
  records: GitRecord[];
  loading: boolean;
  selectedHash?: string;
  onSelect: (record: GitRecord) => void;
  language: LanguageCode;
}) {
  if (loading) return <div className="reader-loading">{T("reader.loadingGit", language)}</div>;
  return (
    <div className="history-page">
      <div className="history-cover">
        <span>Git Ledger</span>
        <strong>{book.title}</strong>
        <em>{book.label}</em>
      </div>
      <div className="history-list">
        {records.length === 0 ? (
          <div className="history-empty">{T("reader.noGitRecords", language)}</div>
        ) : (
          records.map((record, index) => (
            <button
              key={record.hash}
              type="button"
              className={`history-record ${selectedHash === record.hash ? "active" : ""}`}
              onClick={() => onSelect(record)}
            >
              <div className="history-dot">{index + 1}</div>
              <div>
                <strong>{record.message || "Untitled change"}</strong>
                <span>
                  {record.shortHash} · {record.author || "unknown"} · {record.date ? new Date(record.date).toLocaleString() : "unknown time"}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function RevisionView({ record, doc, loading, language }: { record: GitRecord | null; doc: FileDoc | null; loading: boolean; language: LanguageCode }) {
  if (loading) return <div className="reader-loading">{T("reader.loadingRevision", language)}</div>;
  if (!doc) return <div className="reader-loading">{T("reader.selectRecord", language)}</div>;
  return (
    <div className="revision-page">
      <header className="revision-head">
        <span>Historical Version</span>
        <strong>{record?.message || doc.label}</strong>
        <em>
          {record?.shortHash || "revision"} · {record?.date ? new Date(record.date).toLocaleString() : "unknown time"}
        </em>
      </header>
      <ReadOnlyView text={doc.content} />
    </div>
  );
}

function computeTarget(): TargetRect {
  const pageW = clamp(360, (window.innerWidth - 80) / 2, 520);
  const pageH = Math.min(760, window.innerHeight - 60);
  const spineX = window.innerWidth / 2;
  return {
    x: spineX,
    y: (window.innerHeight - pageH) / 2,
    width: pageW,
    height: pageH,
  };
}

function phaseToFlip(phase: Phase, tx0: number, ty0: number, sx0: number, sy0: number) {
  if (phase === "closing-flight") return { x: tx0, y: ty0, scaleX: sx0, scaleY: sy0, rotateY: 0 };
  if (phase === "flipping" || phase === "open" || phase === "closing-flip") {
    return {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotateY: phase === "closing-flip" ? 0 : -172,
    };
  }
  return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotateY: 0 };
}

function phaseToTransition(phase: Phase) {
  if (phase === "flight") return { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] };
  if (phase === "flipping") return { duration: 0.48, ease: [0.4, 0, 0.2, 1] };
  if (phase === "closing-flip") return { duration: 0.38, ease: [0.4, 0, 0.2, 1] };
  if (phase === "closing-flight") return { duration: 0.34, ease: [0.2, 0.8, 0.2, 1] };
  return { duration: 0 };
}
