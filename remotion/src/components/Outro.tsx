import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type OutroProps = {
  partnerName: string;
  ctaText: string;
  ctaUrl: string;
  primaryColor: string;
};

export const Outro: React.FC<OutroProps> = ({ partnerName, ctaText, ctaUrl, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaScale = spring({
    fps,
    frame: frame - fps * 1.5,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: Math.floor(fps * 0.7),
    from: 0.8,
    to: 1,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1E2128",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn,
      }}
    >
      <div style={{ textAlign: "center", padding: "0 80px" }}>
        {/* Testo CTA */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 38,
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1.3,
            marginBottom: 40,
          }}
        >
          {ctaText}
        </div>

        {/* Bottone CTA */}
        <div
          style={{
            display: "inline-block",
            backgroundColor: primaryColor,
            color: "#1E2128",
            fontFamily: "sans-serif",
            fontSize: 28,
            fontWeight: 900,
            padding: "20px 48px",
            borderRadius: 12,
            transform: `scale(${ctaScale})`,
            letterSpacing: -0.5,
          }}
        >
          {ctaUrl}
        </div>

        {/* Branding */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            color: "rgba(255,255,255,0.3)",
            marginTop: 48,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
          }}
        >
          Evolution PRO — {partnerName}
        </div>
      </div>
    </AbsoluteFill>
  );
};
