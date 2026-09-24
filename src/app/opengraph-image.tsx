import { ImageResponse } from "next/og";

// Social share preview (X, LinkedIn, iMessage, etc.). Next serves this at
// /opengraph-image and wires the meta tags automatically. Rendered on the edge
// with ImageResponse, so it uses inline styles and a system font stack (the
// local Array/Bebas faces aren't loaded here) tuned to echo the paper brand.
export const runtime = "edge";
export const alt = "ponoc, realtime claim validator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background:
            "radial-gradient(1000px 700px at 22% 18%, #ECE7DC 0%, transparent 60%), radial-gradient(900px 700px at 82% 88%, #E6E1D6 0%, transparent 62%), #F5F5F5",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        {/* Top row: wordmark + verdict dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: "#565656", fontFamily: "monospace" }}>
            REALTIME CLAIM VALIDATOR
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: "#16a34a" }} />
            <div style={{ width: 22, height: 22, borderRadius: 999, background: "#dc2626" }} />
          </div>
        </div>

        {/* The mark */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 300,
              lineHeight: 0.82,
              letterSpacing: -8,
              fontWeight: 800,
              color: "#171717",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            PONOC.
          </div>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 40, lineHeight: 1.35, color: "#565656", maxWidth: 900 }}>
          Every claim, checked the moment it&apos;s spoken. True or false, live.
        </div>
      </div>
    ),
    { ...size },
  );
}
