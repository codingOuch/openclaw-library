import { AnimatePresence, motion } from "motion/react";
import { T } from "../lib/i18n";
import { LanguageCode } from "../lib/settings";
import { bookFromNode } from "../lib/shelf";
import { BookItem, BookOrigin, SearchHit } from "../lib/utils";
import Icon from "./Icon";

interface SearchDrawerProps {
  open: boolean;
  query: string;
  hits: SearchHit[];
  bookByPath: Map<string, BookItem>;
  onClose: () => void;
  onOpen: (book: BookItem, origin: BookOrigin) => void;
  language: LanguageCode;
}

export default function SearchDrawer({ open, query, hits, bookByPath, onClose, onOpen, language }: SearchDrawerProps) {
  const openHit = (hit: SearchHit) => {
    const book =
      bookByPath.get(hit.path) ||
      bookFromNode({
        name: hit.label.split("/").pop() || hit.label,
        type: "file",
        path: hit.path,
      });
    if (!book) return;
    onOpen(book, {
      x: window.innerWidth / 2 - 75,
      y: window.innerHeight / 2 - 112.5,
      width: 150,
      height: 225,
      mood: book.mood,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="search-drawer"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <header>
            <div>
              <strong>Search</strong>
              <span>{query}</span>
            </div>
            <button type="button" onClick={onClose} aria-label="Close search">
              <Icon name="x-lg" />
            </button>
          </header>
          <div className="search-results">
            {hits.length === 0 ? (
              <div className="empty-state">{T("search.noHits", language)}</div>
            ) : (
              hits.map((hit, index) => (
                <button key={`${hit.path}-${hit.line}-${index}`} type="button" onClick={() => openHit(hit)}>
                  <strong>
                    {hit.label}:{hit.line}
                  </strong>
                  <span>{hit.text.slice(0, 240)}</span>
                </button>
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
