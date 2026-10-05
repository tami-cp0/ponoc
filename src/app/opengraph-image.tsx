import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BOX, GAP, STEP, buildGrid } from "@/components/landing/grid-pattern";

// ImageResponse can't read woff2, so it loads a TTF copy of Bebas.
export const alt = "ponoc, facts or cap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse draws CSS radial gradients wrong, so the glows are SVG.
const glow = (x: number, y: number, w: number, h: number, rgb: string, alpha: number, end: number) => `
  <radialGradient id="g${x}" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="rgb(${rgb})" stop-opacity="${alpha}"/>
    <stop offset="${end}" stop-color="rgb(${rgb})" stop-opacity="0"/>
  </radialGradient>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${x})"/>`;

const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#F5F5F5"/>
  ${glow(-384, -208, 1440, 693, "233,224,201", 0.95, 0.71)}
  ${glow(276, 145, 1320, 693, "220,199,183", 0.8, 0.73)}
  ${glow(-840, 126, 2880, 1260, "0,0,0", 0.06, 0.6)}
</svg>`;

const GRID_COLS = 74;
const S = 1040 / (GRID_COLS * STEP + 40);
const grid = buildGrid(GRID_COLS);

export default async function OpengraphImage() {
  const bebas = await readFile(join(process.cwd(), "src/fonts/BebasNeue-Regular.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          overflow: "hidden",
          fontFamily: "Bebas Neue",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image doesn't run inside ImageResponse */}
        <img
          alt=""
          src={`data:image/svg+xml;base64,${Buffer.from(background).toString("base64")}`}
          width={1200}
          height={630}
          style={{ position: "absolute", left: 0, top: 0 }}
        />

        {/* Top row: tagline + verdict blocks, as in the app's verdict grid */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, letterSpacing: 6, color: "#565656" }}>
            FACTS OR CAP?
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 22, height: 22, borderRadius: 1, background: "#1C5334" }} />
            <div style={{ width: 22, height: 22, borderRadius: 1, background: "#8E1A1A" }} />
          </div>
        </div>

        {/* The mark, in the hero title's font */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 300,
              lineHeight: 0.78,
              letterSpacing: -6,
              color: "#171717",
              fontFamily: "Bebas Neue",
            }}
          >
            PONOC.
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            borderRadius: 34 * S,
            padding: `${24 * S}px ${20 * S}px`,
            background: "#F5F5F5",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
            {grid.map((row, r) => (
              <div key={r} style={{ display: "flex", justifyContent: "center" }}>
                {row.map((cell, c) => (
                  <div
                    key={c}
                    style={{
                      width: BOX * S,
                      height: BOX * S,
                      margin: (GAP / 2) * S,
                      borderRadius: 1 * S,
                      backgroundColor: cell.color,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 6 * S,
              top: 6 * S,
              right: 6 * S,
              bottom: 6 * S,
              borderRadius: 28 * S,
              boxShadow: [
                `0 ${-7 * S}px ${6 * S}px rgba(0, 0, 0, 0.15)`,
                `inset 0 ${8 * S}px ${12 * S}px rgba(0, 0, 0, 0.15)`,
                `0 ${4 * S}px ${8 * S}px rgba(255, 255, 255, 0.4)`,
                `inset 0 ${-8 * S}px ${12 * S}px rgba(255, 255, 255, 0.4)`,
              ].join(", "),
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bebas Neue", data: bebas, weight: 400, style: "normal" }],
    },
  );
}
