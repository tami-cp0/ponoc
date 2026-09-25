import { ArrowRightIcon } from "../icons";

interface Props {
  claim: string;
  word: string;
  onShowFinding: (() => void) | null;
}

export function VerdictFace({ claim, word, onShowFinding }: Props) {
  return (
    <>
      <span className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: "rgba(255,255,255,0.55)" }}>
        claim
      </span>
      <p className="mt-3 font-expose text-lg leading-[1.5]" style={{ color: "rgba(255,255,255,0.85)" }}>
        {claim}
      </p>
      <div className="flex flex-1 items-center justify-center py-4">
        <span
          className="stamp block whitespace-nowrap font-array-wide font-semibold leading-none tracking-[-0.03em] text-white"
          style={{ fontSize: "40cqw" }}
        >
          {word}
        </span>
      </div>
      {onShowFinding && (
        <button
          onClick={onShowFinding}
          className="group mt-auto flex w-full items-center justify-between border-t border-dashed pt-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
          style={{ borderColor: "rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.7)", opacity: 0.9 }}
        >
          the finding
          <ArrowRightIcon size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      )}
    </>
  );
}
