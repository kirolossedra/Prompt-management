import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="drawer-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="drawer-scrim" aria-label="Close details" onClick={onClose} />
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <header className="drawer-header">
              <div>
                {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
                <h2 id={titleId}>{title}</h2>
              </div>
              <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
                <X size={19} />
              </Button>
            </header>
            {actions ? <div className="drawer-actions">{actions}</div> : null}
            <div className="drawer-content">{children}</div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
