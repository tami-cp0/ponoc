"use client";

import { useEffect, useState, useTransition } from "react";
import { signOutUserAction } from "@/app/admin/actions";
import { Button } from "../Button";

const CONFIRM_WINDOW_MS = 4000;

// Asks for a second click instead of a dialog; the first click only arms it.
export function SignOutButton({ userId }: { userId: string }) {
  const [armed, setArmed] = useState(false);
  const [pending, startSignOut] = useTransition();

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const click = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    startSignOut(() => signOutUserAction(userId));
  };

  return (
    <Button height={36} onClick={click} disabled={pending}>
      {pending ? "Signing out…" : armed ? "Click again to confirm" : "Sign out everywhere"}
    </Button>
  );
}
