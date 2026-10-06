"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, animate, motion, useReducedMotion, type Variants } from "motion/react";
import type { Card } from "@/shared/protocol";
import { TRIAL_CREDITS } from "@/shared/credits";
import { ClaimCard } from "../card/ClaimCard";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { ChevronIcon } from "../icons";
import { FLIP_SPRING, useCardDrag } from "./useCardDrag";

const GRASS: Card = {
  id: "tutorial-grass",
  claim: "Grass is green.",
  status: "true",
  reasoning:
    "Yes. Grass is full of chlorophyll, which absorbs almost every color of sunlight except green. The green bounces back, and that's what we see.",
  sources: ["https://askdruniverse.wsu.edu/2020/05/01/inside-blade-grass-green/"],
};

const BRAIN: Card = {
  id: "tutorial-brain",
  claim: "We only use ten percent of our brains.",
  status: "false",
  reasoning:
    "Brain scans show we use virtually every part of the brain, and most of it is active almost all the time.",
  sources: ["https://www.scientificamerican.com/article/do-we-only-use-10-percent-of-our-brains/"],
};

const CAT: Card = {
  id: "tutorial-cat",
  claim: "Shakespeare had a cat.",
  status: "unsure",
  reasoning: "Nothing in the records of Shakespeare's life mentions a cat, or any pet.",
};

// Mice and trackpads click and drag; touch screens tap and swipe. Both render,
// and the device's pointer decides which one shows.
function ByPointer({ fine, coarse }: { fine: ReactNode; coarse: ReactNode }) {
  return (
    <>
      <span className="pointer-coarse:hidden">{fine}</span>
      <span className="hidden pointer-coarse:inline">{coarse}</span>
    </>
  );
}

const STEPS: { title: string; body: ReactNode; visual: ReactNode }[] = [
  {
    title: "You talk. ponoc checks the facts.",
    body: "It picks out the claims people make, checks each one on the web, and calls it true or false.",
    visual: <HeardDemo />,
  },
  {
    title: "Every claim gets its own card.",
    body: (
      <ByPointer
        fine="Drag a card left for the next one, or right to go back. The arrows beside the deck do the same."
        coarse="Swipe a card left for the next one, or right to go back."
      />
    ),
    visual: <DeckDemo />,
  },
  {
    title: "The proof is on the back.",
    body: (
      <ByPointer
        fine="Drag a card up, or click “the finding”, to see the evidence and where it came from."
        coarse="Swipe a card up, or tap “the finding”, to see the evidence and where it came from."
      />
    ),
    visual: <FindingDemo />,
  },
  {
    title: `${TRIAL_CREDITS} credits, on us`,
    body: "They're already in your account, ready for your first session. No payment details needed.",
    visual: <Coin />,
  },
];

const LAST = STEPS.length - 1;

interface Props {
  onStart: () => void;
  onClose: () => void;
}

// First-visit walkthrough: what ponoc does, how to move through cards, where the
// evidence is, then the free credits and Start listening.
export function Tutorial({ onStart, onClose }: Props) {
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, LAST));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { title, body, visual } = STEPS[step];
  const last = step === LAST;

  return (
    <Dialog open onClose={onClose} label="Welcome to ponoc">
      <div>
        <div className="-mt-2 flex h-9 items-center justify-end">
          {!last && (
            <button type="button" className="credit-link -mr-3" onClick={() => setStep(LAST)}>
              Skip
            </button>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex h-[264px] items-center justify-center">{visual}</div>
            {/* Room for a two-line title and three lines of text, so the buttons never move. */}
            <div className="mt-6 min-h-[8.75rem] text-center">
              <h2 className="gift-title font-array">{title}</h2>
              <p className="gift-lede" style={{ maxWidth: "34ch" }}>
                {body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="justify-self-start">
            {last ? (
              <button type="button" className="credit-link -ml-3" onClick={onClose}>
                Look around
              </button>
            ) : (
              step > 0 && (
                <button type="button" className="credit-link -ml-3" onClick={() => setStep(step - 1)}>
                  Back
                </button>
              )
            )}
          </div>
          <Dots step={step} />
          <div className="justify-self-end">
            <Button size="small" onClick={last ? onStart : () => setStep(step + 1)}>
              {last ? "Start listening" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Dots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="sr-only">
        Step {step + 1} of {STEPS.length}
      </span>
      {STEPS.map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="h-1.5 rounded-full transition-[width,background-color] duration-300"
          style={{ width: i === step ? 18 : 6, background: i === step ? "var(--fg)" : "rgba(23, 23, 23, 0.18)" }}
        />
      ))}
    </div>
  );
}

const NO_FLIP = () => {};

// What a tutorial card's claim and finding read at on screen. The cards are
// shrunk to fit, so those two are set larger inside them to come out readable.
const CLAIM_PX = 15;
const FINDING_PX = 14;

// A real claim card at full size, scaled down to fit the step.
function MiniCard({ card, scale, flipped = false, onFlip }: {
  card: Card;
  scale: number;
  flipped?: boolean;
  onFlip?: () => void;
}) {
  const { flip, rotateY } = useCardDrag();

  useEffect(() => {
    animate(flip, flipped ? 180 : 0, FLIP_SPRING);
  }, [flip, flipped]);

  return (
    <div className="relative" style={{ width: 300 * scale, height: 420 * scale }}>
      <div
        className="tutorial-card absolute top-0 left-0 origin-top-left rounded-[4px]"
        style={
          {
            width: 300,
            height: 420,
            transform: `scale(${scale})`,
            filter: "drop-shadow(0 14px 18px rgba(12, 12, 18, 0.3))",
            "--claim": `${CLAIM_PX / scale}px`,
            "--finding": `${FINDING_PX / scale}px`,
          } as CSSProperties
        }
      >
        <motion.div
          className="absolute inset-0"
          style={{ borderRadius: "inherit", transformStyle: "preserve-3d", transformPerspective: 1200, rotateY }}
        >
          <ClaimCard card={card} flipped={flipped} onToggleFlip={onFlip ?? NO_FLIP} />
        </motion.div>
      </div>
    </div>
  );
}

type Gesture = "idle" | "press" | "drag";

interface Offset {
  x?: number;
  y?: number;
}

// When a demo's fingertip lands, starts dragging and lets go, in ms from the start of a round.
const PRESS_MS = 300;
const RELEASE_MS = 950;
const DRAG_TIME = 0.55;

// A fingertip (or cursor) pressing a card at `from` and dragging it to `to`.
function TouchPoint({ gesture, from = {}, to }: { gesture: Gesture; from?: Offset; to: Offset }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 z-20 -mt-4 -ml-4 size-8 rounded-full"
      style={{
        background: "rgba(255, 255, 255, 0.8)",
        boxShadow: "0 0 0 1.5px rgba(23, 23, 23, 0.16), 0 6px 14px rgba(12, 12, 18, 0.28)",
      }}
      initial={{ opacity: 0 }}
      animate={
        gesture === "idle"
          ? { opacity: 0, transition: { duration: 0.25 } }
          : gesture === "press"
            ? {
                opacity: 1,
                scale: [1.35, 1],
                x: from.x ?? 0,
                y: from.y ?? 0,
                transition: { duration: 0.25, x: { duration: 0 }, y: { duration: 0 } },
              }
            : {
                opacity: 1,
                scale: 1,
                x: to.x ?? 0,
                y: to.y ?? 0,
                transition: { duration: DRAG_TIME, ease: "easeInOut" },
              }
      }
    />
  );
}

// Plays a demo round shortly after mounting and then every `everyMs`. A round
// returns the timers it started, so they stop with the demo.
function useRounds(round: () => number[], everyMs: number, active: boolean) {
  const latest = useRef(round);
  useEffect(() => {
    latest.current = round;
  });

  useEffect(() => {
    if (!active) return;
    let timers: number[] = [];
    let loop = 0;
    const run = () => {
      timers = latest.current();
    };
    const first = window.setTimeout(() => {
      run();
      loop = window.setInterval(run, everyMs);
    }, 600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(loop);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [everyMs, active]);
}

const HEARD_LEAD = ["“Everyone", "knows"];
const HEARD_CLAIM = ["grass", "is", "green.”"];
const WORD_GAP = 0.1;
const HIGHLIGHT_AT = 1.1;
const CARD_AT = 1.5;
const VERDICT_AT = 2800;

// A sentence arrives word by word, the claim in it gets picked out, and its card
// goes from checking to TRUE.
function HeardDemo() {
  const reduce = useReducedMotion() ?? false;
  const [checked, setChecked] = useState(reduce);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setTimeout(() => setChecked(true), VERDICT_AT);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  const lastWord = HEARD_LEAD.length + HEARD_CLAIM.length - 1;
  const word = (text: string, i: number) => (
    <motion.span
      key={i}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * WORD_GAP, duration: 0.3 }}
    >
      {i < lastWord ? `${text} ` : text}
    </motion.span>
  );

  return (
    <div className="pointer-events-none flex flex-col items-center gap-4" aria-hidden>
      <p className="max-w-[17rem] text-center font-expose text-[15px] leading-[1.6]" style={{ color: "var(--muted)" }}>
        {HEARD_LEAD.map((w, i) => word(w, i))}
        <motion.span
          className="rounded-[4px] px-1 [box-decoration-break:clone]"
          initial={reduce ? false : { backgroundColor: "rgba(23, 23, 23, 0)", color: "#737373" }}
          animate={{ backgroundColor: "rgba(23, 23, 23, 0.08)", color: "#171717" }}
          transition={{ delay: reduce ? 0 : HIGHLIGHT_AT, duration: 0.35 }}
        >
          {HEARD_CLAIM.map((w, i) => word(w, HEARD_LEAD.length + i))}
        </motion.span>
      </p>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CARD_AT, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <MiniCard card={{ ...GRASS, status: checked ? "true" : "verifying" }} scale={0.44} />
      </motion.div>
    </div>
  );
}

const STACK = [GRASS, BRAIN, CAT];
const STACK_SCALE = 0.5;
const PULL = 64;

// Forward, the leaving card flies off left and a new one joins at the back.
// Back, the card from the back fades out and the previous one lands on top from the left.
const stackMotion: Variants = {
  enter: (dir: number) => (dir > 0 ? { opacity: 0, scale: 0.92, rotate: 8 } : { opacity: 0, x: -170, rotate: -12 }),
  exit: (dir: number) =>
    dir > 0
      ? { opacity: 0, x: -170, rotate: -12, transition: { duration: 0.38, ease: [0.36, 0, 0.66, -0.2] } }
      : { opacity: 0, scale: 0.92, transition: { duration: 0.25 } },
};

interface Round {
  dir: 1 | -1;
  by: "drag" | "arrow";
}

// Forward and back by dragging, then forward and back with the arrows. Phones
// don't show the deck's arrows, so there it only swipes.
const SWIPE_ROUNDS: Round[] = [
  { dir: 1, by: "drag" },
  { dir: -1, by: "drag" },
];
const ARROW_ROUNDS: Round[] = [...SWIPE_ROUNDS, { dir: 1, by: "arrow" }, { dir: -1, by: "arrow" }];
const ARROW_MS = 200;

// The top card goes to the next one and comes back, by a fingertip dragging it
// or by the arrow beside the stack.
function DeckDemo() {
  const reduce = useReducedMotion() ?? false;
  const [turn, setTurn] = useState(0);
  const [dir, setDir] = useState(1);
  const [gesture, setGesture] = useState<Gesture>("idle");
  const [pressed, setPressed] = useState<"left" | "right" | null>(null);
  const rounds = useRef(0);

  useRounds(
    () => {
      const plan = window.matchMedia("(pointer: coarse)").matches ? SWIPE_ROUNDS : ARROW_ROUNDS;
      const { dir: d, by } = plan[rounds.current++ % plan.length];
      setDir(d);
      if (by === "arrow") {
        setPressed(d > 0 ? "right" : "left");
        return [
          window.setTimeout(() => setTurn((n) => n + d), ARROW_MS),
          window.setTimeout(() => setPressed(null), ARROW_MS + 350),
        ];
      }
      setGesture("press");
      return [
        window.setTimeout(() => setGesture("drag"), PRESS_MS),
        window.setTimeout(() => {
          setGesture("idle");
          setTurn((n) => n + d);
        }, RELEASE_MS),
      ];
    },
    2600,
    !reduce,
  );

  const pull = -dir * PULL;

  return (
    <div className="pointer-events-none flex items-center gap-6" aria-hidden>
      <DemoArrow dir="left" pressed={pressed === "left"} />
      <div className="relative" style={{ width: 300 * STACK_SCALE, height: 420 * STACK_SCALE }}>
        <AnimatePresence initial={false} custom={dir}>
          {STACK.map((_, pos) => {
            const card = STACK[(turn + pos) % STACK.length];
            // Stays the same while a card moves up the stack, changes once it goes round again.
            const lap = Math.floor((turn + pos) / STACK.length);
            const dragged = pos === 0 && gesture === "drag";
            return (
              <motion.div
                key={`${card.id}-${lap}`}
                custom={dir}
                variants={stackMotion}
                className="absolute inset-0"
                style={{ zIndex: STACK.length - pos }}
                initial="enter"
                exit="exit"
                animate={{
                  opacity: 1,
                  scale: 1 - pos * 0.04,
                  x: dragged ? pull : 0,
                  y: pos * 4,
                  rotate: dragged ? pull / 12 : pos * 3,
                }}
                transition={
                  dragged ? { duration: DRAG_TIME, ease: "easeInOut" } : { type: "spring", stiffness: 260, damping: 30 }
                }
              >
                <MiniCard card={card} scale={STACK_SCALE} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <TouchPoint gesture={gesture} to={{ x: pull }} />
      </div>
      <DemoArrow dir="right" pressed={pressed === "right"} />
    </div>
  );
}

function DemoArrow({ dir, pressed }: { dir: "left" | "right"; pressed: boolean }) {
  return (
    <motion.span
      className="pointer-coarse:hidden"
      animate={pressed ? { opacity: 1, scale: [0.8, 1] } : { opacity: 0.45, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ChevronIcon dir={dir} />
    </motion.span>
  );
}

const FINDING_SCALE = 0.6;
const LIFT = 26;

// A fingertip drags the card up and it turns over to its finding, then back.
// Turning it by hand stops the demo.
function FindingDemo() {
  const reduce = useReducedMotion() ?? false;
  const [flipped, setFlipped] = useState(false);
  const [gesture, setGesture] = useState<Gesture>("idle");
  const [auto, setAuto] = useState(true);

  useRounds(
    () => {
      setGesture("press");
      return [
        window.setTimeout(() => setGesture("drag"), PRESS_MS),
        window.setTimeout(() => {
          setGesture("idle");
          setFlipped(true);
        }, RELEASE_MS),
        window.setTimeout(() => setFlipped(false), RELEASE_MS + 1900),
      ];
    },
    3800,
    auto && !reduce,
  );

  const turnOver = () => {
    setAuto(false);
    setGesture("idle");
    setFlipped((f) => !f);
  };

  return (
    <div className="relative">
      <motion.div
        animate={{ y: gesture === "drag" ? -LIFT : 0 }}
        transition={
          gesture === "drag" ? { duration: DRAG_TIME, ease: "easeInOut" } : { type: "spring", stiffness: 260, damping: 30 }
        }
      >
        <MiniCard card={BRAIN} scale={FINDING_SCALE} flipped={flipped} onFlip={turnOver} />
      </motion.div>
      <TouchPoint gesture={gesture} from={{ y: 40 }} to={{ y: 40 - LIFT * 2 }} />
    </div>
  );
}

function Coin() {
  return (
    <div className="gift-coin" aria-hidden style={{ margin: 0, transform: "scale(1.4)" }}>
      <span className="gift-coin-face">
        <span className="gift-coin-num font-array">{TRIAL_CREDITS}</span>
        <span className="gift-coin-unit">credits</span>
      </span>
    </div>
  );
}
