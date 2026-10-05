import { Button } from "../Button";

export function LowCredits({ credits, onTopUp }: { credits: number; onTopUp: () => void }) {
  const message = credits <= 0 ? "No credits left" : "Running low on credits";

  return (
    <div className="credit-low" role="status">
      <span className="credit-low-text">{message}</span>
      <Button height={32} onClick={onTopUp}>
        Top up
      </Button>
    </div>
  );
}
