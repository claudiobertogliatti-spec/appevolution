export type TranscriptWord = {
  word: string;
  start: number; // secondi
  end: number;   // secondi
};

export type KeyMoment = {
  startSec: number;
  endSec: number;
  text: string;         // testo da mostrare (max 6 parole)
  type: "zoom" | "highlight" | "both";
};

export type VideoCompositionProps = {
  videoUrl: string;           // URL HTTP accessibile del video processato
  partnerName: string;
  partnerNiche: string;
  durationInSeconds: number;  // durata del video principale (senza intro/outro)
  words: TranscriptWord[];
  keyMoments: KeyMoment[];
  primaryColor?: string;      // default "#FFD24D"
  musicVolume?: number;       // default 0.12 (12%)
  outroCtaText?: string;      // default "Scopri il corso completo"
  outroCtaUrl?: string;       // URL del funnel/corso
  showSubtitles?: boolean;    // default true — false per lezioni videocorso
  showMusic?: boolean;        // default true — false per lezioni videocorso
  musicTrack?: "promo_1" | "promo_2" | "ambient_1" | "ambient_2"; // default "promo_1"
};

export const INTRO_DURATION_S = 5;
export const OUTRO_DURATION_S = 8;
export const FPS = 30;

export function secsToFrames(secs: number): number {
  return Math.round(secs * FPS);
}
