import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0BB8A8 0%, #0A8F85 100%)",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 520,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              display: "flex",
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 600,
              letterSpacing: "0.08em",
              opacity: 0.95,
              display: "flex",
            }}
          >
            SAÚDE
          </div>
        </div>
      </div>
    ),
    { width: 1024, height: 1024 },
  );
}
