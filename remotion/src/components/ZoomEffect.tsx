import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { KeyMoment, secsToFrames } from "../types";

type ZoomEffectProps = {
  moment: KeyMoment;
  videoOffsetSecs: number;
  children: React.ReactNode;
};

export const ZoomEffect: React.FC<ZoomEffectProps> = ({
  moment,
  videoOffsetSecs,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = secsToFrames(videoOffsetSecs + moment.startSec);
  const endFrame = secsToFrames(videoOffsetSecs + moment.endSec);

  const isActive = frame >= startFrame && frame <= endFrame;
  const isAfter = frame > endFrame;

  const zoomScale = isActive
    ? spring({
        fps,
        frame: frame - startFrame,
        config: { damping: 20, stiffness: 80 },
        durationInFrames: Math.floor(fps * 0.6),
        from: 1,
        to: 1.08,
      })
    : isAfter
    ? spring({
        fps,
        frame: frame - endFrame,
        config: { damping: 20, stiffness: 80 },
        durationInFrames: Math.floor(fps * 0.5),
        from: 1.08,
        to: 1,
      })
    : 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        transform: `scale(${zoomScale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};
