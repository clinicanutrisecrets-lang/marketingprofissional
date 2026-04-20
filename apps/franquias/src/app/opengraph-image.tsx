import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Scanner da Saúde — Plataforma Franquia Digital";
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
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background: "linear-gradient(135deg, #0BB8A8 0%, #1A2E45 100%)",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            opacity: 0.85,
            marginBottom: 24,
            letterSpacing: "0.02em",
          }}
        >
          Scanner da Saúde
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 24,
            maxWidth: 960,
          }}
        >
          Plataforma Franquia Digital
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            opacity: 0.9,
            maxWidth: 960,
            lineHeight: 1.4,
          }}
        >
          Marketing automatizado para nutricionistas franqueadas
        </div>
      </div>
    ),
    { ...size },
  );
}
