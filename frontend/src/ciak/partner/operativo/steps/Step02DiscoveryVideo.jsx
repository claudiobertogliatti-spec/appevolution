import React from "react";
import StepBase from "./StepBase";

// Video di benvenuto Claudio (HeyGen avatar, voce Claudio). Embed pubblico HeyGen.
const VIDEO_EMBED_URL = "https://app.heygen.com/embeds/ac77fcddae7f43c8830acb24bd584106";

/**
 * Step 2 — Benvenuto + Discovery.
 * È il primo schermo che il neo-partner vede dopo firma + pagamento.
 * Copy approvata da Claudio (29/5/2026) — registro scritto in-app.
 */
export default function Step02DiscoveryVideo({ onComplete, partnerName }) {
  const nome = (partnerName || "").split(" ")[0] || "";

  return (
    <StepBase
      eyebrow="Benvenuto in Evolution PRO"
      title={nome ? `${nome}, hai appena preso una decisione importante. Adesso costruiamo.` : "Hai appena preso una decisione importante. Adesso costruiamo."}
      ctaLabel="L'ho visto, iniziamo →"
      onCta={() => onComplete({ watched_at: new Date().toISOString() })}
      secondaryNote="Guarda il video con calma: spiega come funziona il percorso passo dopo passo."
    >
      <div className="space-y-4 text-slate-700 leading-relaxed text-sm">
        <p>
          Da oggi inizia il percorso operativo per portare online il tuo Progetto nel minor
          tempo utile e metterlo nelle condizioni di essere venduto. Nei prossimi{" "}
          <strong className="text-slate-900">21 giorni</strong> lavoreremo per costruire la
          prima versione vendibile della tua Accademia Digitale.
        </p>
        <p>
          L'obiettivo è chiaro: non restare mesi bloccati a costruire un prodotto "perfetto"
          che il mercato non ha ancora validato.
        </p>
        <p>
          Costruiamo prima una versione concreta, vendibile e migliorabile. Poi saranno i dati
          reali — non le ipotesi — a dirci cosa ottimizzare.
        </p>
        <p className="font-medium text-slate-900">
          Prima vendi, prima capisci.<br />
          Prima capisci, prima migliori.
        </p>
        <p>
          Per questo lavoriamo con un metodo rapido, guidato e progressivo. Non per fare le
          cose in modo superficiale, ma per evitare il rischio più grande: perdere tempo su
          dettagli che non spostano davvero le vendite.
        </p>

        <div className="bg-slate-50 border border-gray-200 rounded-md p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Il Metodo EVO
          </p>
          <ul className="space-y-1.5">
            <li>🎯 <strong className="text-slate-900">Esamina</strong> — chiariamo chi sei, a chi parli e qual è la tua promessa</li>
            <li>🚀 <strong className="text-slate-900">Valida</strong> — costruiamo accademia e funnel per andare online</li>
            <li>📈 <strong className="text-slate-900">Ottimizza</strong> — miglioriamo su dati reali, non su supposizioni</li>
          </ul>
        </div>

        <p>
          Non devi fare tutto oggi.<br />
          E soprattutto, non lo fai da solo.
        </p>
        <p>
          Ti accompagna <strong className="text-slate-900">Stefania</strong> e, in ogni fase,
          avrai uno specialista del team al tuo fianco.
        </p>
      </div>

      <div className="aspect-video w-full bg-slate-900 rounded-md overflow-hidden mt-5">
        <iframe
          src={VIDEO_EMBED_URL}
          title="Video di benvenuto"
          className="w-full h-full"
          frameBorder="0"
          allowFullScreen
          allow="encrypted-media; fullscreen"
        ></iframe>
      </div>
    </StepBase>
  );
}
