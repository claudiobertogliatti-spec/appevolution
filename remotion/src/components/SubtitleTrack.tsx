import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { TranscriptWord, secsToFrames } from "../types";

type SubtitleTrackProps = {
  words: TranscriptWord[];
  videoOffsetSecs: number; // secondi di offset (durata intro)
  primaryColor: string;
};

const WORDS_PER_GROUP = 7;

export const SubtitleTrack: React.FC<SubtitleTrackProps> = ({
  words,
  videoOffsetSecs,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const videoFrame = frame - secsToFrames(videoOffsetSecs);
  const currentSec = videoFrame / fps;

  if (!words.length || videoFrame < 0) return null;

  // Trova la parola attiva
  const activeIdx = words.findIndex(
    (w) => currentSec >= w.start && currentSec <= w.end
  );
  if (activeIdx < 0) return null;

  // Gruppo centrato sull'attiva
  const groupStart = Math.max(0, activeIdx - 3);
  const group = words.slice(groupStart, groupStart + WORDS_PER_GROUP);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "8%",
        right: "8%",
        display: "flex",
        flexWrap: "wrap" as const,
        justifyContent: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {group.map((w, i) => {
        const isActive = groupStart + i === activeIdx;
        return (
          <span
            key={`${w.word}-${w.start}`}
            style={{
              fontFamily: "sans-serif",
              fontSize: 44,
              fontWeight: isActive ? 900 : 600,
              color: isActive ? primaryColor : "#FFFFFF",
              textShadow: "0 2px 12px rgba(0,0,0,0.95)",
              padding: "2px 6px",
              backgroundColor: isActive
                ? "rgba(0,0,0,0.65)"
                : "rgba(0,0,0,0.40)",
              borderRadius: 6,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
};
