import React from "react";
import StepBase from "./StepBase";

// TODO: sostituire con vero video YouTube discovery quando disponibile.
// Per ora puntiamo al video masterclass canonico (E2XDEdJgzcQ).
const VIDEO_EMBED_URL = "https://www.youtube.com/embed/E2XDEdJgzcQ";

export default function Step02DiscoveryVideo({ onComplete }) {
  return (
    <StepBase
      eyebrow="Step 2 — Discovery"
      title="Guarda il video di onboarding (~15 min)"
      ctaLabel="L'ho visto, avanti →"
      onCta={() => onComplete({ watched_at: new Date().toISOString() })}
      secondaryNote="Spiega come funziona il percorso passo dopo passo. Guardalo con calma."
    >
      <div className="aspect-video w-full bg-slate-900 rounded-md overflow-hidden">
        <iframe
          src={VIDEO_EMBED_URL}
          title="Discovery video"
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        ></iframe>
      </div>
    </StepBase>
  );
}
