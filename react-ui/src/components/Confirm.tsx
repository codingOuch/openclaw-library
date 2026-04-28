import { PropsWithChildren, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

interface ConfirmProps extends PropsWithChildren {
  open: boolean;
  title: string;
  body?: string;
  confirmText: string;
  cancelText: string;
  tone?: "blue" | "orange" | "red";
  width?: "alert" | "wide";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function Confirm({
  open,
  title,
  body,
  children,
  confirmText,
  cancelText,
  tone = "blue",
  width = "alert",
  onConfirm,
  onCancel,
}: ConfirmProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-veil"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className={`confirm-card confirm-${width}`}
            initial={{ opacity: 0, scale: 1.04, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="confirm-copy">
              <h2>{title}</h2>
              {body && <p>{body}</p>}
              {children}
            </div>
            <div className="confirm-actions">
              <button type="button" onClick={onCancel}>
                {cancelText}
              </button>
              <button type="button" className={`confirm-primary confirm-${tone}`} onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
