import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Eduonxai | AI-powered learning for exams and careers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const font = await readFile(join(process.cwd(), "app/fonts/Manrope-800.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 0%, #2A2799 0%, #0B1026 62%)",
          color: "#F1F5F9",
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="150" height="150" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="l" x1="8" y1="20" x2="50" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#4F46E5" />
                <stop offset="1" stopColor="#2A2799" />
              </linearGradient>
              <linearGradient id="r" x1="52" y1="80" x2="94" y2="20" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#4F46E5" />
                <stop offset="1" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <g strokeLinejoin="round" strokeWidth="5">
              <path d="M10 28 Q30 22 47 36 V73 Q30 61 10 67 Z" fill="url(#l)" stroke="url(#l)" />
              <path d="M90 28 Q70 22 53 36 V73 Q70 61 90 67 Z" fill="url(#r)" stroke="url(#r)" />
              <path d="M60 68 L62 87 L79 67 Z" fill="url(#r)" stroke="url(#r)" />
            </g>
          </svg>
          <div style={{ fontSize: 148, fontWeight: 800, letterSpacing: -4 }}>Eduonxai</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 40, color: "#A3B0C7" }}>AI-powered learning for exams and careers</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Manrope", data: font, weight: 800, style: "normal" }] },
  );
}
