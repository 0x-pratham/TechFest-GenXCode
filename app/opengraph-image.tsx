import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Take Off With GenXCode · GenXCode Tech Fest";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fcfaff",
          backgroundImage:
            "radial-gradient(circle at 85% 15%, rgba(199, 166, 243, 0.35), transparent 45%), radial-gradient(circle at 15% 85%, rgba(104, 40, 162, 0.14), transparent 45%)",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
          color: "#1b053e",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: 22,
              fontFamily: "sans-serif",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6828a2",
            }}
          >
            <span>GenXCode Tech Fest · First Anniversary</span>
          </div>

          <div
            style={{
              border: "1px solid #d9c5f0",
              backgroundColor: "#ffffff",
              borderRadius: "999px",
              padding: "10px 22px",
              fontSize: 18,
              fontFamily: "sans-serif",
              fontWeight: 700,
              color: "#5f2295",
            }}
          >
            Complimentary Entry · ₹0
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              color: "#1b053e",
            }}
          >
            Take Off With{" "}
            <span style={{ fontStyle: "italic", color: "#6828a2" }}>
              GenXCode.
            </span>
          </div>

          <div
            style={{
              fontSize: 28,
              fontFamily: "sans-serif",
              lineHeight: 1.4,
              color: "#5c4f6e",
              maxWidth: "940px",
            }}
          >
            Three days of building, 3 hands-on workshops, PromptWars, and a
            flagship hackathon.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e6dfd4",
            paddingTop: "24px",
            fontSize: 20,
            fontFamily: "sans-serif",
            color: "#6b6475",
          }}
        >
          <span>techfest.genxcode.in</span>
          <span>Powered by GenXCode &amp; Cosmolix Pvt Ltd</span>
        </div>
      </div>
    ),
    { ...size }
  );
}