import { useRef, type CSSProperties } from "react";
import { BackIcon } from "../icons";
import { SourceLinks } from "./SourceLinks";
import { useFitText } from "./useFitText";

interface Props {
  text: string;
  sources: string[];
  onBack: () => void;
}

export function FindingFace({ text, sources, onBack }: Props) {
  const textRef = useRef<HTMLParagraphElement>(null);
  useFitText(textRef, text);

  return (
    <>
      <button
        onClick={onBack}
        className="verdict-back group flex w-full items-center gap-2 py-2 font-mono text-[9px] uppercase tracking-[0.2em] transition-opacity duration-200 hover:opacity-100"
        style={
          {
            color: "rgba(255,255,255,0.7)",
            opacity: 0.9,
            "--edge": "rgba(255,255,255,0.28)",
          } as CSSProperties
        }
        aria-label="Back to the verdict"
      >
        <BackIcon className="transition-transform duration-200 group-hover:-translate-x-0.5" />
        The verdict
      </button>
      <div className="flex min-h-0 flex-1 flex-col">
        <p
          ref={textRef}
          className="mt-1 min-h-0 flex-1 overflow-hidden font-expose leading-[1.62]"
          style={{ color: "rgba(255,255,255,0.9)" }}
        >
          {text}
        </p>
        {sources.length > 0 && <SourceLinks sources={sources} />}
      </div>
    </>
  );
}
