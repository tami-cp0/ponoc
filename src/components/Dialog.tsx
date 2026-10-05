"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

export function Dialog({ open, onClose, label, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // So no focus ring shows until the user navigates with the keyboard.
      el.focus();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="settings-dialog"
      aria-label={label}
      tabIndex={-1}
      onClose={onClose}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={className ? `settings-panel ${className}` : "settings-panel"}>{children}</div>
    </dialog>
  );
}
