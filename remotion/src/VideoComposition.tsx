import React from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Intro } from "./components/Intro";
import { Outro } from "./components/Outro";
import { SubtitleTrack } from "./components/SubtitleTrack";
import { TextHighlight } from "./components/TextHighlight";
import { ZoomEffect } from "./components/ZoomEffect";
import {
  FPS,
  INTRO_DURATION_S,
  OUTRO_DURATION_S,
  VideoCompositionProps,
  secsToFrames,
} from "./types";

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  videoUrl,
  partnerName,
  partnerNiche,
  durationInSeconds,
  words,
  keyMoments,
  primaryColor = "#FFD24D",
  musicVolume = 0.12,
  outroCtaText = "Scopri il corso completo",
  outroCtaUrl = "evolution-pro.it",
  showSubtitles = true,
  showMusic = true,
}) => {
  const { fps } = useVideoConfig();

  const introFrames = secsToFrames(INTRO_DURATION_S);
  const videoFrames = secsToFrames(durationInSeconds);
  const outroFrames = secsToFrames(OUTRO_DURATION_S);
  const totalFrames = introFrames + videoFrames + outroFrames;

  const zoomMoments = keyMoments.filter(
    (m) => m.type === "zoom" || m.type === "both"
  );
  const highlightMoments = keyMoments.filter(
    (m) => m.type === "highlight" || m.type === "both"
  );

  // Video base con eventuali zoom annidati
  // videoOffsetSecs=0: dentro la Sequence il frame è già relativo all'inizio del video
  const baseVideo = <OffthreadVideo src={videoUrl} />;
  const videoWithZoom = zoomMoments.reduce(
    (inner, moment) => (
      <ZoomEffect
        key={`zoom-${moment.startSec}`}
        moment={moment}
        videoOffsetSecs={0}
      >
        {inner}
      </ZoomEffect>
    ),
    baseVideo as React.ReactNode
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Musica di sottofondo con fade in/out — solo masterclass */}
      {showMusic && (
        <Audio
          src={staticFile("music/background.mp3")}
          volume={(f: number) => {
            if (f < fps * 2) return (f / (fps * 2)) * musicVolume;
            if (f > totalFrames - fps * 3)
              return ((totalFrames - f) / (fps * 3)) * musicVolume;
            return musicVolume;
          }}
          loop
        />
      )}

      {/* INTRO (5s) */}
      <Sequence from={0} durationInFrames={introFrames}>
        <Intro
          partnerName={partnerName}
          partnerNiche={partnerNiche}
          primaryColor={primaryColor}
        />
      </Sequence>

      {/* VIDEO PRINCIPALE */}
      <Sequence from={introFrames} durationInFrames={videoFrames}>
        <AbsoluteFill>{videoWithZoom}</AbsoluteFill>

        {/* Sottotitoli sincronizzati — solo masterclass */}
        {showSubtitles && (
          <SubtitleTrack
            words={words}
            videoOffsetSecs={0}
            primaryColor={primaryColor}
          />
        )}

        {/* Text highlights sui key moments */}
        {highlightMoments.map((moment) => (
          <TextHighlight
            key={`hl-${moment.startSec}`}
            moment={moment}
            videoOffsetSecs={0}
            primaryColor={primaryColor}
          />
        ))}
      </Sequence>

      {/* OUTRO (8s) */}
      <Sequence from={introFrames + videoFrames} durationInFrames={outroFrames}>
        <Outro
          partnerName={partnerName}
          ctaText={outroCtaText}
          ctaUrl={outroCtaUrl}
          primaryColor={primaryColor}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
