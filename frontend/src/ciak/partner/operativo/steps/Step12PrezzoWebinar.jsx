import React, { useState } from "react";
import StepBase from "./StepBase";

export default function Step12PrezzoWebinar({ step, onComplete, onSaveDraft }) {
  const [text, setText] = useState(step?.data?.strategia || "");
  return (
    <StepBase
      eyebrow="Step 12 — Prezzo + Webinar"
      title="Strategia prezzo + webinar live"
      ctaDisabled={text.trim().length < 100}
      onCta={() => onComplete({ strategia: text })}
      secondaryNote="🚧 Il generatore AI arriva nei prossimi giorni (sub-progetto B). Per ora scrivi tu — Stefania ti aiuta cliccando 'Chiedi →'."
    >
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onSaveDraft({ strategia: e.target.value });
        }}
        rows={14}
        placeholder={`Prezzo di lancio: €...\nPromo early bird: ... (durata e sconto)\nWebinar live: data X, ora Y, durata 90 min\nStruttura webinar: gancio, contenuto chiave, dimostrazione, offerta, Q&A\nUpsell post-webinar: ...`}
        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400 font-mono resize-y"
      />
      <div className="text-xs text-slate-500 mt-2">{text.trim().length} caratteri (min 100)</div>
    </StepBase>
  );
}
