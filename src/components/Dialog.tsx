"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

// A native <dialog> in the settings panel's material. showModal() puts it in the
// top layer (escaping the deck's 3D transforms), traps focus and closes on Esc.
export function Dialog({ open, onClose, label, className, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // Focus the dialog, not its first button, so no focus ring shows until
      // the user actually navigates with the keyboard.
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
