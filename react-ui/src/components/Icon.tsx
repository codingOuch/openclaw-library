import type { HTMLAttributes } from "react";

const aliases: Record<string, string> = {
  "library-outline": "journals",
  "folder-outline": "folder",
  "folder-open-outline": "folder2-open",
  "document-text-outline": "file-earmark-text",
  "search-outline": "search",
  "lock-closed-outline": "lock-fill",
  "lock-open-outline": "unlock-fill",
  "chevron-left-outline": "chevron-left",
  "chevron-down-outline": "chevron-down",
  "chevron-up-outline": "chevron-up",
  "grid-outline": "grid-3x2-gap",
  "book-outline": "journal-bookmark",
  "person-outline": "person",
  "time-outline": "clock",
  "save-outline": "save",
  "close-outline": "x-lg",
};

interface IconProps extends HTMLAttributes<HTMLElement> {
  name: string;
}

export default function Icon({ name, className = "", ...props }: IconProps) {
  const resolved = aliases[name] || name;
  return <i aria-hidden="true" className={`bi bi-${resolved} ${className}`.trim()} {...props} />;
}
