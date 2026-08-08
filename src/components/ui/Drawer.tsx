import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
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
  return (
    <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-scrim" />
        <Dialog.Content className="drawer">
          <div className="drawer-handle" aria-hidden />
          <header className="drawer-header">
            <div>
              {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
              <Dialog.Title>{title}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close details"><X size={19} /></Button>
            </Dialog.Close>
          </header>
          {actions ? <div className="drawer-actions">{actions}</div> : null}
          <div className="drawer-content">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
