"use client";

import { Dialog } from "../Dialog";
import { Button } from "../Button";

interface Props {
  open: boolean;
  onTopUp: () => void;
  onClose: () => void;
}

export function OutOfCredits({ open, onTopUp, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} label="Out of credits" className="spent">
      <p className="spent-text">You&apos;re out of credits.</p>
      <Button onClick={onTopUp}>Add credits</Button>
    </Dialog>
  );
}
