import React, { CSSProperties, useRef } from "react";
import { getRootCoverArt } from "../lib/coverArt";
import { BookItem, formatBytes, LayoutMode, rectToOrigin } from "../lib/utils";
import Icon from "./Icon";

interface BookProps {
  book: BookItem;
  layout: LayoutMode;
  customCover?: string;
  onOpen: (book: BookItem, origin: ReturnType<typeof rectToOrigin>) => void;
  onMenu: (book: BookItem, x: number, y: number) => void;
}

function Book({ book, layout, customCover, onOpen, onMenu }: BookProps) {
  const coverRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const isSpine = layout === "spine";
  const coverArt = getRootCoverArt(book.label);
  const style = { "--accent": book.accent } as CSSProperties;
  const customCoverStyle = customCover
    ? ({
        backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.48)), url(${customCover})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } as CSSProperties)
    : undefined;

  const open = () => {
    const target = isSpine ? spineRef.current : coverRef.current;
    if (!target) return;
    onOpen(book, rectToOrigin(target.getBoundingClientRect(), book.mood));
  };

  return (
    <button
      type="button"
      className={`book ${isSpine ? "book-spine-layout" : "book-cover-layout"} mood-${book.mood}`}
      style={style}
      onClick={open}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(book, event.clientX, event.clientY);
      }}
      title={book.label}
    >
      {isSpine ? (
        <div className="spine-body" ref={spineRef}>
          <div className="spine-edge-top" />
          <div className="spine-kind">{book.kind}</div>
          <div className="spine-title">{book.title}</div>
          <div className="spine-sub">{book.subtitle}</div>
          <div className="spine-edge-bottom" />
        </div>
      ) : (
        <>
          <div
            className={`book-cover ${coverArt && !customCover ? `has-root-art art-${coverArt.key}` : ""} ${customCover ? "has-custom-cover" : ""}`}
            ref={coverRef}
            style={customCoverStyle}
          >
            <div className="book-spine" />
            <div className="book-edge" />
            <div className="book-kind">{book.kind}</div>
            {coverArt && !customCover && (
              <div className="book-art" aria-hidden="true">
                <Icon name={coverArt.icon} />
                <span>{coverArt.sigil}</span>
              </div>
            )}
            <div className="book-title-print">{book.title}</div>
            <div className="book-rule" />
            <div className="book-sub">{book.subtitle}</div>
          </div>
          <div className="book-shadow" />
          <div className="book-caption">{book.title}</div>
          <div className="book-meta">
            {formatBytes(book.size || 0)} · {book.mtime ? new Date(book.mtime).toLocaleDateString() : "unknown"}
          </div>
        </>
      )}
    </button>
  );
}

function areEqual(prev: BookProps, next: BookProps) {
  const a = prev.book;
  const b = next.book;
  return (
    prev.layout === next.layout &&
    prev.customCover === next.customCover &&
    prev.onOpen === next.onOpen &&
    prev.onMenu === next.onMenu &&
    a.path === b.path &&
    a.label === b.label &&
    a.subtitle === b.subtitle &&
    a.accent === b.accent &&
    a.size === b.size &&
    a.mtime === b.mtime &&
    a.title === b.title &&
    a.blurb === b.blurb
  );
}

export default React.memo(Book, areEqual);
