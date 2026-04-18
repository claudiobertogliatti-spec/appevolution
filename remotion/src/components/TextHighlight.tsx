import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KeyMoment, secsToFrames } from "../types";

type TextHighlightProps = {
  moment: KeyMoment;
  videoOffsetSecs: number;
  primaryColor: string;
};

export const TextHighlight: React.FC<TextHighlightProps> = ({
  moment,
  videoOffsetSecs,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = secsToFrames(videoOffsetSecs + moment.startSec);
  const endFrame = secsToFrames(videoOffsetSecs + moment.endSec);
  const localFrame = frame - startFrame;
  const totalFrames = endFrame - startFrame;

  if (frame < startFrame || frame > endFrame) return null;

  const scaleIn = spring({
    fps,
    frame: localFrame,
    config: { damping: 14, stiffness: 120 },
    durationInFrames: Math.floor(fps * 0.4),
    from: 0.7,
    to: 1,
  });

  const opacity = interpolate(
    localFrame,
    [Math.max(0, totalFrames - fps * 0.5), totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          marginTop: 60,
          backgroundColor: primaryColor,
          color: "#1E2128",
          fontFamily: "sans-serif",
          fontSize: 42,
          fontWeight: 900,
          padding: "14px 36px",
          borderRadius: 50,
          transform: `scale(${scaleIn})`,
          opacity,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          maxWidth: "78%",
          textAlign: "center" as const,
        }}
      >
        {moment.text}
      </div>
    </AbsoluteFill>
  );
};
