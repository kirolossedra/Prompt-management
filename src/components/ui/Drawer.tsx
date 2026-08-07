import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
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
  const isPhone = useMediaQuery("(max-width: 680px)");

  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", listener);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", listener);
    };
  }, [open, onClose]);

  const initial = isPhone ? { y: "100%", x: 0 } : { x: "100%", y: 0 };
  const exit = isPhone ? { y: "100%", x: 0 } : { x: "100%", y: 0 };

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
            initial={initial}
            animate={{ x: 0, y: 0 }}
            exit={exit}
            transition={{ type: "spring", stiffness: 430, damping: 38 }}
          >
            <div className="drawer-handle" aria-hidden />
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
