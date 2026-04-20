# Remotion Video Editing Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un layer di editing automatico (intro brandizzato, sottotitoli, zoom + text highlight sui concetti chiave, musica, outro CTA) ai video masterclass/videocorso dei partner, inserendosi nella pipeline esistente dopo il taglio smart-edit e prima dell'upload YouTube.

**Architecture:** Un microservizio Node.js (`remotion-service/`) wrappa `@remotion/renderer` ed espone un endpoint HTTP. Il backend Python chiama questo servizio passando i dati del partner + il transcript Whisper + i key moments estratti da Claude. Il servizio renderizza il video finale e restituisce un path GCS. La pipeline Celery esistente (`video_pipeline_task.py`) usa il video renderizzato al posto del `final_path` grezzo per l'upload YouTube.

**Tech Stack:** Remotion 4.x, React 18, TypeScript, Node.js 20, Express, `@remotion/renderer`, `@google-cloud/storage`, Python `httpx`, Claude API (key moments extraction), FFmpeg (già presente), Celery (già presente).

---

## Mappa file

| File | Azione | Responsabilità |
|---|---|---|
| `remotion/package.json` | Crea | Dipendenze Remotion |
| `remotion/remotion.config.ts` | Crea | Config Remotion |
| `remotion/src/types.ts` | Crea | Props types condivisi tra tutti i componenti |
| `remotion/src/Root.tsx` | Crea | Registra composition + calcola durata totale |
| `remotion/src/VideoComposition.tsx` | Crea | Composition principale: Intro + Main + Outro |
| `remotion/src/components/Intro.tsx` | Crea | 5s intro brandizzato (nome partner + niche) |
| `remotion/src/components/Outro.tsx` | Crea | 8s outro con CTA al corso |
| `remotion/src/components/SubtitleTrack.tsx` | Crea | Sottotitoli sincronizzati da Whisper words |
| `remotion/src/components/TextHighlight.tsx` | Crea | Overlay testo evidenziato sui key moments |
| `remotion/src/components/ZoomEffect.tsx` | Crea | Wrapper zoom CSS animato |
| `remotion-service/package.json` | Crea | Express + @remotion/renderer + GCS |
| `remotion-service/server.js` | Crea | HTTP server: riceve props → renderizza → carica GCS |
| `remotion-service/Dockerfile` | Crea | Node 20 + Chrome + dipendenze |
| `backend/remotion_client.py` | Crea | HTTP client Python per chiamare remotion-service |
| `backend/key_moments_extractor.py` | Crea | Usa Claude API per identificare key moments dal transcript |
| `backend/video_pipeline_task.py` | Modifica | Aggiunge step Remotion dopo smart-edit, prima di YouTube |

---

## Task 1: Remotion project — setup + types

**Files:**
- Crea: `remotion/package.json`
- Crea: `remotion/remotion.config.ts`
- Crea: `remotion/src/types.ts`

- [ ] **Step 1: Crea `remotion/package.json`**

```json
{
  "name": "evolution-pro-remotion",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "studio": "npx remotion studio",
    "build": "npx remotion bundle"
  },
  "dependencies": {
    "@remotion/cli": "4.0.290",
    "@remotion/renderer": "4.0.290",
    "remotion": "4.0.290",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/react": "18.3.1",
    "@types/react-dom": "18.3.1",
    "typescript": "5.4.5"
  }
}
```

- [ ] **Step 2: Crea `remotion/remotion.config.ts`**

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 3: Crea `remotion/src/types.ts`** — tipi condivisi tra tutti i componenti

```typescript
export type TranscriptWord = {
  word: string;
  start: number; // secondi
  end: number;   // secondi
};

export type KeyMoment = {
  startSec: number;
  endSec: number;
  text: string;        // testo da mostrare (concetto chiave)
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
};

// Costanti globali composizione
export const INTRO_DURATION_S = 5;
export const OUTRO_DURATION_S = 8;
export const FPS = 30;

export function secsToFrames(secs: number): number {
  return Math.round(secs * FPS);
}
```

- [ ] **Step 4: Installa dipendenze**

```bash
cd remotion && npm install
```

- [ ] **Step 5: Commit**

```bash
git add remotion/
git commit -m "feat: remotion project setup + types"
```

---

## Task 2: Componente Intro

**Files:**
- Crea: `remotion/src/components/Intro.tsx`

- [ ] **Step 1: Crea `remotion/src/components/Intro.tsx`**

Intro brandizzato 5 secondi: sfondo scuro, nome partner + niche + logo Evolution PRO, animazione slide-in giallo.

```tsx
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
  const slideIn = interpolate(frame, [0, fps * 0.5], [−100, 0], {
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
        {/* Linea accent */}
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
            textTransform: "uppercase",
          }}
        >
          Evolution PRO
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/components/Intro.tsx
git commit -m "feat: remotion Intro component"
```

---

## Task 3: Componente Outro

**Files:**
- Crea: `remotion/src/components/Outro.tsx`

- [ ] **Step 1: Crea `remotion/src/components/Outro.tsx`**

Outro 8 secondi: CTA al corso con fade-in, URL evidenziato, branding Evolution PRO.

```tsx
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

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
  const ctaScale = interpolate(frame, [fps * 1.5, fps * 2.2], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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

        {/* CTA Button */}
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

        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            color: "rgba(255,255,255,0.3)",
            marginTop: 48,
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Evolution PRO — {partnerName}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/components/Outro.tsx
git commit -m "feat: remotion Outro component"
```

---

## Task 4: Componente SubtitleTrack

**Files:**
- Crea: `remotion/src/components/SubtitleTrack.tsx`

- [ ] **Step 1: Crea `remotion/src/components/SubtitleTrack.tsx`**

Mostra le parole del transcript sincronizzate con il video. Gruppo di 6-8 parole per riga, parola attiva evidenziata in giallo.

```tsx
import { useCurrentFrame, useVideoConfig } from "remotion";
import { TranscriptWord, secsToFrames } from "../types";

type SubtitleTrackProps = {
  words: TranscriptWord[];
  videoOffsetSecs: number; // offset per allineare a posizione nella composition (intro_duration)
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

  // Frame corrente relativo al video (esclude intro)
  const videoFrame = frame - secsToFrames(videoOffsetSecs);
  const currentSec = videoFrame / fps;

  if (!words.length || videoFrame < 0) return null;

  // Trova la parola attiva
  const activeIdx = words.findIndex(
    (w) => currentSec >= w.start && currentSec <= w.end
  );
  if (activeIdx < 0) return null;

  // Gruppo: le 7 parole centrate sull'attiva
  const start = Math.max(0, activeIdx - 3);
  const group = words.slice(start, start + WORDS_PER_GROUP);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "10%",
        right: "10%",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {group.map((w, i) => {
        const isActive = start + i === activeIdx;
        return (
          <span
            key={`${w.word}-${w.start}`}
            style={{
              fontFamily: "sans-serif",
              fontSize: 44,
              fontWeight: isActive ? 900 : 600,
              color: isActive ? primaryColor : "#FFFFFF",
              textShadow: "0 2px 8px rgba(0,0,0,0.9)",
              transition: "color 0.1s",
              padding: "2px 4px",
              backgroundColor: isActive
                ? "rgba(0,0,0,0.6)"
                : "rgba(0,0,0,0.35)",
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
```

- [ ] **Step 2: Commit**

```bash
git add remotion/src/components/SubtitleTrack.tsx
git commit -m "feat: remotion SubtitleTrack component"
```

---

## Task 5: Componenti TextHighlight e ZoomEffect

**Files:**
- Crea: `remotion/src/components/TextHighlight.tsx`
- Crea: `remotion/src/components/ZoomEffect.tsx`

- [ ] **Step 1: Crea `remotion/src/components/TextHighlight.tsx`**

Overlay pill giallo con testo del concetto chiave, appare/scompare ai timestamp del key moment.

```tsx
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
  });
  const opacity = interpolate(
    localFrame,
    [totalFrames - fps * 0.5, totalFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-start", alignItems: "center", pointerEvents: "none" }}
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
          maxWidth: "80%",
          textAlign: "center",
        }}
      >
        {moment.text}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Crea `remotion/src/components/ZoomEffect.tsx`**

Wrapper che applica uno zoom CSS spring ai suoi figli nel periodo di un key moment.

```tsx
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
  const localFrame = frame - startFrame;

  const isActive = frame >= startFrame && frame <= endFrame;

  const zoomIn = isActive
    ? spring({
        fps,
        frame: localFrame,
        config: { damping: 20, stiffness: 80 },
        durationInFrames: Math.floor(fps * 0.6),
        from: 1,
        to: 1.08,
      })
    : spring({
        fps,
        frame: frame - endFrame,
        config: { damping: 20, stiffness: 80 },
        durationInFrames: Math.floor(fps * 0.5),
        from: 1.08,
        to: 1,
      });

  const scale = isActive ? zoomIn : frame > endFrame ? zoomIn : 1;

  return (
    <div style={{ width: "100%", height: "100%", transform: `scale(${scale})` }}>
      {children}
    </div>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add remotion/src/components/
git commit -m "feat: remotion TextHighlight + ZoomEffect components"
```

---

## Task 6: VideoComposition + Root (registrazione)

**Files:**
- Crea: `remotion/src/VideoComposition.tsx`
- Crea: `remotion/src/Root.tsx`

- [ ] **Step 1: Crea `remotion/src/VideoComposition.tsx`**

Composition principale: sequenza Intro → video principale con overlay → Outro.

```tsx
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
}) => {
  const introFrames = secsToFrames(INTRO_DURATION_S);
  const videoFrames = secsToFrames(durationInSeconds);
  const outroFrames = secsToFrames(OUTRO_DURATION_S);

  const zoomMoments = keyMoments.filter(
    (m) => m.type === "zoom" || m.type === "both"
  );
  const highlightMoments = keyMoments.filter(
    (m) => m.type === "highlight" || m.type === "both"
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Musica di sottofondo */}
      <Audio
        src={staticFile("music/background.mp3")}
        volume={(f) => {
          // Fade in 2s, volume pieno, fade out ultimi 3s
          const totalFrames = introFrames + videoFrames + outroFrames;
          if (f < FPS * 2) return (f / (FPS * 2)) * musicVolume;
          if (f > totalFrames - FPS * 3)
            return ((totalFrames - f) / (FPS * 3)) * musicVolume;
          return musicVolume;
        }}
        loop
      />

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
        {/* Video di base con eventuale zoom */}
        <AbsoluteFill>
          {zoomMoments.length > 0 ? (
            zoomMoments.reduce(
              (acc, moment) => (
                <ZoomEffect
                  key={`${moment.startSec}`}
                  moment={moment}
                  videoOffsetSecs={INTRO_DURATION_S}
                >
                  {acc}
                </ZoomEffect>
              ),
              <OffthreadVideo src={videoUrl} /> as React.ReactNode
            )
          ) : (
            <OffthreadVideo src={videoUrl} />
          )}
        </AbsoluteFill>

        {/* Sottotitoli */}
        <SubtitleTrack
          words={words}
          videoOffsetSecs={INTRO_DURATION_S}
          primaryColor={primaryColor}
        />

        {/* Text highlights */}
        {highlightMoments.map((moment) => (
          <TextHighlight
            key={`hl-${moment.startSec}`}
            moment={moment}
            videoOffsetSecs={INTRO_DURATION_S}
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
```

- [ ] **Step 2: Crea `remotion/src/Root.tsx`** — registra la composition

```tsx
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import {
  FPS,
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
      fps={FPS}
      width={1920}
      height={1080}
      // Durata calcolata dinamicamente da calculateMetadata
      durationInFrames={secsToFrames(INTRO_DURATION_S + 60 + OUTRO_DURATION_S)} // placeholder
      defaultProps={{
        videoUrl: "https://example.com/video.mp4",
        partnerName: "Partner Name",
        partnerNiche: "Niche",
        durationInSeconds: 60,
        words: [],
        keyMoments: [],
      } as VideoCompositionProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: secsToFrames(
          INTRO_DURATION_S + props.durationInSeconds + OUTRO_DURATION_S
        ),
      })}
    />
  );
};
```

- [ ] **Step 3: Crea entry point `remotion/src/index.ts`**

```typescript
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

- [ ] **Step 4: Carica la musica di sottofondo**

Scarica una traccia royalty-free da https://pixabay.com/music/search/corporate%20background/ (es. "Corporate Motivational" o simile, max 5min).

```bash
mkdir -p remotion/public/music
# Scarica e salva come:
# remotion/public/music/background.mp3
```

- [ ] **Step 5: Verifica in Remotion Studio**

```bash
cd remotion && npm run studio
# Apri http://localhost:3000
# Verifica che la composition "PartnerVideo" appaia e il preview funzioni
```

- [ ] **Step 6: Commit**

```bash
git add remotion/
git commit -m "feat: remotion VideoComposition + Root completa"
```

---

## Task 7: Key Moments Extractor (Python + Claude API)

**Files:**
- Crea: `backend/key_moments_extractor.py`

- [ ] **Step 1: Crea `backend/key_moments_extractor.py`**

Usa Claude API per analizzare il transcript e restituire una lista di key moments con timestamp.

```python
"""
Estrae key moments dal transcript Whisper usando Claude API.
Un key moment è un concetto cardine da evidenziare/zoomare nel video.
"""
import os
import json
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sei un esperto di video editing per corsi online.
Analizza il transcript di una masterclass e identifica i momenti chiave:
concetti cardine, definizioni importanti, affermazioni ad alto impatto che
l'editore deve evidenziare visivamente per mantenere l'attenzione degli spettatori.

Restituisci SOLO JSON valido, nessun testo aggiuntivo."""

USER_TEMPLATE = """Transcript della masterclass di {partner_name} ({niche}):

{transcript}

Parole con timestamp (campione):
{words_sample}

Identifica 4-8 key moments di massimo 3 secondi ciascuno.
Scegli momenti dove viene detto un concetto chiave, una cifra importante,
una promessa forte o una definizione fondamentale.

Rispondi SOLO con questo JSON:
{{
  "key_moments": [
    {{
      "startSec": 12.5,
      "endSec": 15.0,
      "text": "Testo breve del concetto (max 6 parole)",
      "type": "highlight"
    }}
  ]
}}

type può essere: "highlight" (solo testo overlay), "zoom" (solo zoom), "both" (entrambi).
Usa "both" per i 2 momenti più importanti, "highlight" per gli altri."""


async def extract_key_moments(
    transcript: str,
    words: List[Dict],
    partner_name: str,
    niche: str,
    video_duration_s: float,
) -> List[Dict]:
    """
    Chiama Claude API per estrarre key moments dal transcript.
    Ritorna lista di dict compatibili con KeyMoment TypeScript type.
    """
    ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    if not ANTHROPIC_KEY:
        logger.warning("[KEY_MOMENTS] ANTHROPIC_API_KEY non configurata, skip")
        return []

    if not transcript or len(transcript.strip()) < 100:
        logger.info("[KEY_MOMENTS] Transcript troppo breve, skip")
        return []

    try:
        import anthropic

        # Campione words: max 100 parole uniformemente distribuite
        step = max(1, len(words) // 100)
        words_sample = json.dumps(
            [{"word": w["word"], "start": round(w["start"], 1), "end": round(w["end"], 1)}
             for w in words[::step][:100]],
            ensure_ascii=False
        )

        # Tronca transcript se lungo
        transcript_truncated = transcript[:4000]

        prompt = USER_TEMPLATE.format(
            partner_name=partner_name,
            niche=niche,
            transcript=transcript_truncated,
            words_sample=words_sample,
        )

        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        raw = message.content[0].text.strip()

        # Parse JSON
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            import re
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                result = json.loads(match.group(0))
            else:
                logger.warning(f"[KEY_MOMENTS] JSON parse failed: {raw[:200]}")
                return []

        moments = result.get("key_moments", [])

        # Validazione: scarta momenti fuori dalla durata del video
        valid = []
        for m in moments:
            start = float(m.get("startSec", 0))
            end = float(m.get("endSec", 0))
            if 0 <= start < end <= video_duration_s and (end - start) <= 5:
                valid.append({
                    "startSec": start,
                    "endSec": end,
                    "text": str(m.get("text", ""))[:50],
                    "type": m.get("type", "highlight"),
                })

        logger.info(f"[KEY_MOMENTS] Estratti {len(valid)} key moments per {partner_name}")
        return valid

    except Exception as e:
        logger.error(f"[KEY_MOMENTS] Errore estrazione: {e}", exc_info=True)
        return []
```

- [ ] **Step 2: Test manuale (opzionale, richiede ANTHROPIC_API_KEY)**

```bash
cd backend
python3 -c "
import asyncio
from key_moments_extractor import extract_key_moments

transcript = 'Oggi parliamo di come vendere corsi online. Il primo concetto fondamentale è il posizionamento. Senza posizionamento chiaro non puoi vendere. Il secondo è la prova sociale: testimonianze, risultati, numeri reali. Ricorda: vendi trasformazioni, non informazioni. La differenza tra chi guadagna 10.000 euro al mese e chi guadagna zero è questa: uno ha un sistema, laltro improvvisa.'
words = [{'word': w, 'start': i*0.5, 'end': i*0.5+0.4} for i, w in enumerate(transcript.split())]

moments = asyncio.run(extract_key_moments(transcript, words, 'Marco Serra', 'Wellness', 120.0))
import json; print(json.dumps(moments, indent=2, ensure_ascii=False))
"
```

- [ ] **Step 3: Commit**

```bash
git add backend/key_moments_extractor.py
git commit -m "feat: key_moments_extractor.py con Claude API"
```

---

## Task 8: Remotion Rendering Service (Node.js)

**Files:**
- Crea: `remotion-service/package.json`
- Crea: `remotion-service/server.js`
- Crea: `remotion-service/Dockerfile`

- [ ] **Step 1: Crea `remotion-service/package.json`**

```json
{
  "name": "remotion-rendering-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@remotion/renderer": "4.0.290",
    "@google-cloud/storage": "7.x",
    "express": "4.x"
  }
}
```

- [ ] **Step 2: Crea `remotion-service/server.js`**

```javascript
import express from "express";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { Storage } from "@google-cloud/storage";
import { createWriteStream, mkdirSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 8090;
const GCS_BUCKET = process.env.GCS_BUCKET || "gen-lang-client-0744698012_media";
const BUNDLE_PATH = process.env.REMOTION_BUNDLE_PATH || "/app/bundle/index.html";

const storage = new Storage();

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/render", async (req, res) => {
  const { props, outputGcsPath } = req.body;

  if (!props || !outputGcsPath) {
    return res.status(400).json({ error: "props e outputGcsPath obbligatori" });
  }

  const jobId = randomBytes(6).toString("hex");
  const tmpOut = `/tmp/render_${jobId}.mp4`;
  mkdirSync("/tmp", { recursive: true });

  console.log(`[RENDER] Start job ${jobId} — ${props.partnerName}`);

  try {
    // Seleziona composition e calcola durata dai props
    const comp = await selectComposition({
      serveUrl: BUNDLE_PATH,
      id: "PartnerVideo",
      inputProps: props,
    });

    await renderMedia({
      composition: comp,
      serveUrl: BUNDLE_PATH,
      codec: "h264",
      outputLocation: tmpOut,
      inputProps: props,
      concurrency: 2,
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 10 === 0) {
          console.log(`[RENDER] ${jobId} — ${Math.round(progress * 100)}%`);
        }
      },
    });

    // Upload su GCS
    await storage.bucket(GCS_BUCKET).upload(tmpOut, {
      destination: outputGcsPath,
      metadata: { contentType: "video/mp4" },
    });

    // URL firmato valido 1 ora per il download da Python
    const [signedUrl] = await storage
      .bucket(GCS_BUCKET)
      .file(outputGcsPath)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });

    console.log(`[RENDER] Done job ${jobId} → gs://${GCS_BUCKET}/${outputGcsPath}`);
    res.json({ success: true, gcsPath: outputGcsPath, downloadUrl: signedUrl });
  } catch (err) {
    console.error(`[RENDER] Error job ${jobId}:`, err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(PORT, () => console.log(`Remotion service listening on :${PORT}`));
```

- [ ] **Step 3: Crea `remotion-service/Dockerfile`**

```dockerfile
FROM node:20-slim

# Chrome per Remotion
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxkbcommon0 \
  libnss3 \
  libpango-1.0-0 \
  libcairo2 \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV REMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

WORKDIR /app

# Installa dipendenze Node
COPY remotion-service/package.json ./
RUN npm install

# Bundle Remotion (pre-compilato nel build step)
COPY remotion/bundle/ ./bundle/

# Server
COPY remotion-service/server.js ./

EXPOSE 8090
CMD ["node", "server.js"]
```

- [ ] **Step 4: Aggiungi bundle step al cloudbuild.yaml**

Nel file `cloudbuild.yaml` del repo (o in GCS se sovrascritto), aggiungere step per buildare il bundle Remotion prima del Docker build. Verificare quale file è source-of-truth:

```bash
cat "C:/Users/berto/Desktop/appevolution/cloudbuild.yaml" | head -30
```

Se la logica di build è nel bucket GCS, aggiornare lì. Il nuovo step da aggiungere prima del docker build del remotion-service:

```yaml
# Build Remotion bundle
- name: 'node:20'
  entrypoint: bash
  args:
    - -c
    - |
      cd remotion && npm ci && npx remotion bundle src/index.ts --out ../remotion-bundle
```

- [ ] **Step 5: Commit**

```bash
git add remotion-service/
git commit -m "feat: remotion-service Node.js rendering microservice"
```

---

## Task 9: Python client per remotion-service

**Files:**
- Crea: `backend/remotion_client.py`

- [ ] **Step 1: Crea `backend/remotion_client.py`**

```python
"""
Client Python per chiamare il remotion-service.
Invia props + attende rendering + scarica video finale.
"""
import os
import logging
import httpx
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

REMOTION_SERVICE_URL = os.environ.get(
    "REMOTION_SERVICE_URL", "http://evolution-pro-remotion:8090"
)


async def render_partner_video(
    partner_id: str,
    video_url: str,
    partner_name: str,
    partner_niche: str,
    duration_s: float,
    words: List[Dict],
    key_moments: List[Dict],
    output_path: str,
    outro_cta_text: str = "Scopri il corso completo",
    outro_cta_url: str = "evolution-pro.it",
    primary_color: str = "#FFD24D",
    music_volume: float = 0.12,
) -> Optional[str]:
    """
    Chiama remotion-service per renderizzare il video finale.
    Ritorna il path del file scaricato localmente, oppure None se fallisce.
    """
    gcs_output = f"remotion_renders/{partner_id}/{Path(output_path).name}"

    props = {
        "videoUrl": video_url,
        "partnerName": partner_name,
        "partnerNiche": partner_niche,
        "durationInSeconds": round(duration_s, 3),
        "words": words,
        "keyMoments": key_moments,
        "primaryColor": primary_color,
        "musicVolume": music_volume,
        "outroCtaText": outro_cta_text,
        "outroCtaUrl": outro_cta_url,
    }

    try:
        # Timeout alto: rendering ~1min per ogni minuto di video
        timeout = max(300, int(duration_s * 3))

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{REMOTION_SERVICE_URL}/render",
                json={"props": props, "outputGcsPath": gcs_output},
            )

        if response.status_code != 200:
            logger.error(
                f"[REMOTION] Service error {response.status_code}: {response.text[:300]}"
            )
            return None

        data = response.json()
        download_url = data.get("downloadUrl")
        if not download_url:
            logger.error("[REMOTION] No downloadUrl in response")
            return None

        # Scarica il video renderizzato
        async with httpx.AsyncClient(timeout=120) as client:
            dl = await client.get(download_url)

        Path(output_path).write_bytes(dl.content)
        logger.info(f"[REMOTION] Video scaricato: {output_path} ({len(dl.content)/1e6:.1f}MB)")
        return output_path

    except httpx.ConnectError:
        logger.warning(
            "[REMOTION] Servizio non raggiungibile — utilizzo video non editato"
        )
        return None
    except Exception as e:
        logger.error(f"[REMOTION] Errore render: {e}", exc_info=True)
        return None
```

- [ ] **Step 2: Commit**

```bash
git add backend/remotion_client.py
git commit -m "feat: remotion_client.py Python HTTP client"
```

---

## Task 10: Integrazione nella pipeline video esistente

**Files:**
- Modifica: `backend/video_pipeline_task.py`

- [ ] **Step 1: Aggiungere import in cima al file**

In `video_pipeline_task.py`, dopo gli import esistenti, aggiungere:

```python
# Import condizionale — non blocca se i moduli non sono presenti
try:
    from remotion_client import render_partner_video
    from key_moments_extractor import extract_key_moments
    REMOTION_ENABLED = True
except ImportError:
    REMOTION_ENABLED = False
```

- [ ] **Step 2: Aggiungere path e step Remotion nella funzione `_run_pipeline`**

Trovare la riga dove viene definito `final_path` e aggiungere `remotion_path` subito dopo:

```python
raw_path = str(tmp_dir / "raw.mp4")
clean_path = str(tmp_dir / "clean.mp4")
final_path = str(tmp_dir / "final.mp4")
remotion_path = str(tmp_dir / "remotion.mp4")   # ← AGGIUNGERE
audio_path = str(tmp_dir / "audio.mp3")
```

- [ ] **Step 3: Inserire step Remotion prima dell'upload YouTube**

Trovare il commento `# 6. YouTube upload` e inserire PRIMA di esso:

```python
        # 5b. Remotion: intro + sottotitoli + highlights + outro + musica
        youtube_source_path = final_path  # default: video senza editing
        if REMOTION_ENABLED and os.environ.get("REMOTION_SERVICE_URL"):
            try:
                await set_status("rendering_video")
                partner_niche = partner.get("niche", "") if partner else ""

                key_moments = await extract_key_moments(
                    transcript=transcript,
                    words=words,
                    partner_name=name,
                    niche=partner_niche,
                    video_duration_s=final_dur,
                )

                # Serve un URL HTTP accessibile per il video — usiamo il file locale
                # tramite un URL temporaneo firmato GCS o un endpoint interno
                # Per ora usiamo il path locale (il remotion-service è co-located)
                video_http_url = f"file://{final_path}"

                rendered = await render_partner_video(
                    partner_id=partner_id,
                    video_url=video_http_url,
                    partner_name=name,
                    partner_niche=partner_niche,
                    duration_s=final_dur,
                    words=words,
                    key_moments=key_moments,
                    output_path=remotion_path,
                    outro_cta_url="evolution-pro.it",
                )

                if rendered:
                    youtube_source_path = remotion_path
                    # Ricalcola durata (aggiunge intro+outro)
                    final_dur = get_video_duration(remotion_path)
                    logger.info(f"[VIDEO-PIPE] Remotion OK — durata finale: {final_dur:.0f}s")
                else:
                    logger.warning("[VIDEO-PIPE] Remotion fallito — uso video grezzo")

            except Exception as re:
                logger.error(f"[VIDEO-PIPE] Remotion step error: {re}", exc_info=True)

        # 6. YouTube upload
        await set_status("uploading_youtube")
        ts = datetime.now().strftime("%m/%Y")
        yt_title = f"{name} — {label.replace('_', ' ').title()} {ts}"
        youtube_url = upload_to_youtube_sync(youtube_source_path, yt_title, name)   # ← usa youtube_source_path
```

- [ ] **Step 4: Verificare che upload_to_youtube_sync usi `youtube_source_path`**

Assicurarsi che la chiamata esistente a `upload_to_youtube_sync` sia stata aggiornata a passare `youtube_source_path` invece di `final_path`.

- [ ] **Step 5: Commit**

```bash
git add backend/video_pipeline_task.py
git commit -m "feat: integrazione step Remotion nella video pipeline"
```

---

## Task 11: Deploy remotion-service su Cloud Run

**Files:**
- Modifica: `cloudbuild.yaml` (o GCS equivalent)

- [ ] **Step 1: Verificare la source-of-truth del cloudbuild.yaml**

```bash
cat "C:/Users/berto/Desktop/appevolution/cloudbuild.yaml"
```

Se il file è in GCS (`gs://gen-lang-client-0744698012_cloudbuild/`), aggiornare lì.

- [ ] **Step 2: Aggiungere build + deploy del remotion-service nel cloudbuild**

Aggiungere questi step al cloudbuild.yaml esistente (dopo il deploy del backend):

```yaml
# Build Remotion bundle
- name: 'node:20'
  id: 'remotion-bundle'
  entrypoint: bash
  args:
    - -c
    - |
      cd remotion && npm ci && npx remotion bundle src/index.ts --out ../remotion-service/bundle

# Build immagine remotion-service
- name: 'gcr.io/cloud-builders/docker'
  id: 'remotion-build'
  args:
    - build
    - -t
    - 'gcr.io/gen-lang-client-0744698012/evolution-pro-remotion:$BUILD_ID'
    - -f
    - 'remotion-service/Dockerfile'
    - '.'

# Push immagine
- name: 'gcr.io/cloud-builders/docker'
  id: 'remotion-push'
  args:
    - push
    - 'gcr.io/gen-lang-client-0744698012/evolution-pro-remotion:$BUILD_ID'

# Deploy Cloud Run
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  id: 'remotion-deploy'
  args:
    - gcloud
    - run
    - deploy
    - evolution-pro-remotion
    - --image=gcr.io/gen-lang-client-0744698012/evolution-pro-remotion:$BUILD_ID
    - --region=europe-west1
    - --project=gen-lang-client-0744698012
    - --platform=managed
    - --memory=4Gi
    - --cpu=4
    - --timeout=900
    - --concurrency=1
    - --no-allow-unauthenticated
    - --set-env-vars=GCS_BUCKET=gen-lang-client-0744698012_media
```

- [ ] **Step 3: Aggiungere REMOTION_SERVICE_URL alle variabili del backend**

```bash
gcloud run services update evolution-pro-backend \
  --region=europe-west1 \
  --project=gen-lang-client-0744698012 \
  --update-env-vars="REMOTION_SERVICE_URL=https://evolution-pro-remotion-977860235035.europe-west1.run.app"
```

- [ ] **Step 4: Commit e push per triggerare build**

```bash
git add cloudbuild.yaml remotion/ remotion-service/
git commit -m "feat: deploy remotion-service su Cloud Run"
git push origin main
```

- [ ] **Step 5: Verificare health check del servizio**

```bash
# Ottieni URL del servizio
URL=$(gcloud run services describe evolution-pro-remotion \
  --region=europe-west1 --format="value(status.url)")
echo $URL

# Test health (con auth token se no-allow-unauthenticated)
TOKEN=$(gcloud auth print-identity-token)
curl -H "Authorization: Bearer $TOKEN" "$URL/health"
# Expected: {"ok":true}
```

---

## Task 12: Test end-to-end

- [ ] **Step 1: Upload un video di test tramite admin panel**

Accedere a `app.evolution-pro.it` → admin → sezione partner → uno qualsiasi con video già presente → sottomettere di nuovo il link video.

- [ ] **Step 2: Monitorare i log della pipeline**

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" resource.labels.service_name="evolution-pro-backend" textPayload=~"VIDEO-PIPE|REMOTION|KEY_MOMENTS"' \
  --region=europe-west1 --project=gen-lang-client-0744698012 \
  --limit=50 --format=json | python3 -c "
import sys, json
for line in json.load(sys.stdin):
    print(line.get('textPayload',''))
"
```

- [ ] **Step 3: Verificare output**

- Il video su YouTube deve avere durata = video_originale + 5s intro + 8s outro
- Primi 5s: intro brandizzato
- Video principale: sottotitoli visibili, almeno 1 highlight/zoom
- Ultimi 8s: outro con CTA

- [ ] **Step 4: Fallback check**

Se `REMOTION_SERVICE_URL` non è impostata o il servizio è irraggiungibile, verificare che la pipeline continui normalmente con il video non editato (nessun blocco, solo un warning nei log).

---

## Note implementative critiche

1. **`file://` URL per il video**: il remotion-service e il backend Celery devono condividere lo stesso filesystem `/tmp` — su Cloud Run questo NON è garantito se sono servizi separati. Alternativa: uploadare `final_path` su GCS temporaneamente e passare un signed URL pubblico come `videoUrl`. Aggiungere questa logica in Task 10 se i servizi risultano separati.

2. **Musica royalty-free**: Il file `remotion/public/music/background.mp3` deve esistere prima del bundle. Scaricare da Pixabay Music (licenza gratuita per uso commerciale): cerca "corporate background" o "motivational instrumental".

3. **Memoria Cloud Run**: Il rendering richiede almeno 4GB RAM. Il servizio è configurato `--concurrency=1` per evitare OOM con render paralleli.

4. **Timeout**: `--timeout=900` (15 minuti) per Cloud Run. Un video da 60 minuti richiede ~20-30 minuti di render. Per video lunghi valutare Remotion Lambda.
