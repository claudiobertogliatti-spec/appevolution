import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import {
  INTRO_DURATION_S,
  OUTRO_DURATION_S,
  VideoCompositionProps,
  secsToFrames,
} from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PartnerVideo"
      component={VideoComposition}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={secsToFrames(INTRO_DURATION_S + 60 + OUTRO_DURATION_S)} // placeholder
      defaultProps={{
        videoUrl: "https://example.com/video.mp4",
        partnerName: "Nome Partner",
        partnerNiche: "La tua nicchia",
        durationInSeconds: 60,
        words: [],
        keyMoments: [],
        primaryColor: "#FFD24D",
        musicVolume: 0.12,
        outroCtaText: "Scopri il corso completo",
        outroCtaUrl: "evolution-pro.it",
        showSubtitles: true,
        showMusic: true,
      } satisfies VideoCompositionProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: secsToFrames(
          INTRO_DURATION_S + props.durationInSeconds + OUTRO_DURATION_S
        ),
      })}
    />
  );
};
