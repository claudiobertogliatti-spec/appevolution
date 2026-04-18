import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type IntroProps = {
  partnerName: string;
  partnerNiche: string;
  primaryColor: string;
};

export const Intro: React.FC<IntroProps> = ({ partnerName, partnerNiche, primaryColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide-in da sinistra (0→0.5s), fermo (0.5→4s), fade-out (4→5s)
  const slideIn = interpolate(frame, [0, fps * 0.5], [-100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [fps * 4, fps * 5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineWidth = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1E2128",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ transform: `translateX(${slideIn}px)`, textAlign: "center" }}>
        {/* Linea accent gialla */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            backgroundColor: primaryColor,
            borderRadius: 2,
            margin: "0 auto 24px",
          }}
        />
        {/* Nome partner */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 72,
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.1,
            letterSpacing: -1,
          }}
        >
          {partnerName}
        </div>
        {/* Niche */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: primaryColor,
            marginTop: 16,
          }}
        >
          {partnerNiche}
        </div>
        {/* Watermark Evolution PRO */}
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "rgba(255,255,255,0.3)",
            marginTop: 40,
            letterSpacing: 3,
            textTransform: "uppercase" as const,
          }}
        >
          Evolution PRO
        </div>
      </div>
    </AbsoluteFill>
  );
};
