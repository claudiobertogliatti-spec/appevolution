import React from "react";
import Benvenuto from "../Benvenuto";

/**
 * Passo "Conosciamoci": riusa la schermata di Benvenuto (Stefania + video del
 * fondatore + Metodo EVO + team). Ri-apribile dalla mappa; il CTA completa lo step.
 */
export default function Step02DiscoveryVideo({ onComplete, partnerName }) {
  return (
    <Benvenuto
      partnerName={partnerName}
      ctaLabel="L'ho visto, continuo →"
      onStart={() => onComplete({ watched_at: new Date().toISOString() })}
    />
  );
}
