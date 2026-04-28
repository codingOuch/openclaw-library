import { AnimatePresence, motion } from "motion/react";
import Icon from "./Icon";

export interface ToastMessage {
  id: number;
  tone: "ok" | "warn" | "error";
  text: string;
}

export default function Toast({ items }: { items: ToastMessage[] }) {
  return (
    <div className="toast-stack" aria-live="polite">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            className={`toast toast-${item.tone}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <Icon name={item.tone === "ok" ? "check-circle" : item.tone === "warn" ? "exclamation-triangle" : "x-circle"} />
            <span>{item.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
