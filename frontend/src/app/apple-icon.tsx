import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 86,
            fontWeight: 700,
            color: "white",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          LI
        </span>
      </div>
    ),
    { ...size }
  );
}
