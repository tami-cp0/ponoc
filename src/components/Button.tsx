import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  // Renders a link styled as this button instead of a <button>.
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  "aria-label"?: string;
  width?: number | string;
  height?: number | string;
  radius?: number;
  // A straight side, for buttons that join into one pill (start / reset).
  squareEdge?: "left" | "right" | null;
}

export function Button({
  children,
  onClick,
  href,
  type = "button",
  disabled,
  "aria-label": ariaLabel,
  width,
  height,
  radius,
  squareEdge,
}: Props) {
  const style = {
    width,
    height,
    padding: width !== undefined ? 0 : undefined,
    "--key-radius": radius !== undefined ? `${radius}px` : undefined,
  } as CSSProperties;

  if (href) {
    return (
      <Link href={href} className="btn" style={style} aria-label={ariaLabel} data-square={squareEdge ?? undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className="btn"
      style={style}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-square={squareEdge ?? undefined}
    >
      {children}
    </button>
  );
}
