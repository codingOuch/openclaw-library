import React, { CSSProperties } from "react";
import { T } from "../lib/i18n";
import { LanguageCode } from "../lib/settings";
import { BookItem, LayoutMode, ShelfModel } from "../lib/utils";
import Book from "./Book";

interface ShelfProps {
  shelf: ShelfModel;
  layout: LayoutMode;
  customCovers: Record<string, string>;
  onOpen: (book: BookItem, origin: { x: number; y: number; width: number; height: number; mood: number }) => void;
  onMenu: (book: BookItem, x: number, y: number) => void;
  language: LanguageCode;
}

function Shelf({ shelf, layout, customCovers, onOpen, onMenu, language }: ShelfProps) {
  const style = { "--accent": shelf.accent } as CSSProperties;
  return (
    <section className={`shelf shelf-${shelf.kind}`} style={style}>
      <header className="shelf-head">
        <div>
          <h2>{shelf.title}</h2>
          <p>{T(`shelf.${shelf.kind}`, language)}</p>
        </div>
        <span>{shelf.books.length} {T("shelf.books", language)}</span>
      </header>
      <div className={`shelf-row shelf-row-${layout}`}>
        {shelf.books.map((book) => (
          <Book
            key={book.path}
            book={book}
            layout={layout}
            customCover={customCovers[book.path]}
            onOpen={onOpen}
            onMenu={onMenu}
          />
        ))}
      </div>
    </section>
  );
}

function areEqual(prev: ShelfProps, next: ShelfProps) {
  if (prev.language !== next.language || prev.layout !== next.layout || prev.onOpen !== next.onOpen || prev.onMenu !== next.onMenu) return false;
  if (prev.shelf.kind !== next.shelf.kind || prev.shelf.books.length !== next.shelf.books.length) return false;
  for (let i = 0; i < prev.shelf.books.length; i += 1) {
    const a = prev.shelf.books[i];
    const b = next.shelf.books[i];
    if (
      a.path !== b.path ||
      a.label !== b.label ||
      a.subtitle !== b.subtitle ||
      a.accent !== b.accent ||
      a.size !== b.size ||
      a.mtime !== b.mtime ||
      a.title !== b.title ||
      a.blurb !== b.blurb ||
      prev.customCovers[a.path] !== next.customCovers[b.path]
    ) {
      return false;
    }
  }
  return true;
}

export default React.memo(Shelf, areEqual);
