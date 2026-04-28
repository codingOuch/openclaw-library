import { buildDiff } from "../lib/diff";
import { T } from "../lib/i18n";
import { LanguageCode } from "../lib/settings";

interface DiffPanelProps {
  before: string;
  after: string;
  language: LanguageCode;
}

export default function DiffPanel({ before, after, language }: DiffPanelProps) {
  const diff = buildDiff(before, after);
  return (
    <div className="diff-panel">
      <div className="diff-summary">
        <span className="diff-add">+{diff.added}</span>
        <span className="diff-del">-{diff.removed}</span>
        {diff.truncated && <span>{T("diff.truncated", language)}</span>}
      </div>
      <div className="diff-lines">
        {diff.lines.map((line, index) => (
          <div key={`${line.type}-${index}`} className={`diff-line diff-${line.type}`}>
            <span className="diff-gutter">
              {line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
            </span>
            <span className="diff-number">{line.type === "add" ? line.newLine : line.oldLine}</span>
            <code>{line.text || " "}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
