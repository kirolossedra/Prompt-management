import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { cx } from "../../lib/utils";
import { Button } from "./Button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  backdropClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  backdropClassName?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={cx("modal-backdrop", backdropClassName)} />
        <Dialog.Content
          className={`modal-panel modal-panel--${size}`}
          onOpenAutoFocus={(event) => {
            const content = event.currentTarget as HTMLElement | null;
            const target = content?.querySelector<HTMLElement>("input, textarea, select") ?? null;

            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
        >
          <div className="modal-handle" aria-hidden />
          <header className="modal-header">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close dialog">
                <X size={19} />
              </Button>
            </Dialog.Close>
          </header>
          <div className="modal-content">{children}</div>
          {footer ? <footer className="modal-footer">{footer}</footer> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
