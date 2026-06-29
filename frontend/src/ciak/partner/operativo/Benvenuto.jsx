import React, { useState } from "react";
import { WELCOME_VIDEO_EMBED } from "./phases";

/**
 * Schermata di Benvenuto al primo accesso del partner.
 * Voce di Stefania (agente AI coordinatrice): diretta, sicura, con prova sul campo.
 * Contiene: accoglienza + video del fondatore + spiegazione Metodo EVO + team
 * (foto reali grandi) + CTA "Inizia il percorso".
 *
 * Usata in due punti: come gate al primo accesso (PartnerOperativo) e come
 * contenuto del passo "Conosciamoci" (Step02), ri-apribile dalla mappa.
 */
const TEAM = [
  { id: "stefania", name: "Stefania", role: "Coordina il percorso", img: "/agents/stefania.jpg" },
  { id: "valentina", name: "Valentina", role: "Brand e posizionamento", img: "/agents/valentina.jpg" },
  { id: "andrea", name: "Andrea", role: "Video e contenuti", img: "/agents/andrea.jpg" },
  { id: "gaia", name: "Gaia", role: "Tecnica e funnel", img: "/agents/gaia.jpg" },
  { id: "marco", name: "Marco", role: "Strategia e lancio", img: "/agents/marco.jpg" },
  { id: "matteo", name: "Matteo", role: "Analisi e numeri", img: "/agents/matteo.jpg" },
];

const PHASES = [
  { n: 1, name: "Esamina", desc: "Chiariamo chi sei, a chi parli e qual è la tua offerta." },
  { n: 2, name: "Valida", desc: "Costruiamo accademia e pagine e andiamo online, pronti a vendere." },
  { n: 3, name: "Ottimizza", desc: "Miglioriamo sui numeri veri, fino a renderti il riferimento del mercato." },
];

function Photo({ src, alt, className, fallbackText }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={`${className} bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold`}>
        {fallbackText}
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`${className} object-cover bg-slate-900`} />;
}

export default function Benvenuto({ partnerName, onStart, ctaLabel = "Inizia il percorso →" }) {
  const nome = (partnerName || "").split(" ")[0] || "";

  return (
    <div className="min-h-screen bg-slate-50 font-[Poppins,system-ui,sans-serif] text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Hero — Stefania */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Photo
              src="/agents/stefania.jpg"
              alt="Stefania"
              fallbackText="S"
              className="w-24 h-24 rounded-full flex-shrink-0 mx-auto sm:mx-0 ring-4 ring-yellow-400 text-3xl"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-yellow-400 tracking-widest mb-1.5">BENVENUTO IN CIAK</div>
              <h1 className="text-2xl font-bold leading-tight">
                {nome ? `Ciao ${nome}, sono Stefania` : "Ciao, sono Stefania"}
              </h1>
              <p className="text-[15px] leading-relaxed text-slate-300 mt-2">
                Sono l'agente AI che coordina tutto il team che ti seguirà in questo percorso. In ogni
                fase ci sarà un'agente AI dedicata che ti supporterà e renderà tutto meno faticoso.
              </p>
            </div>
          </div>

          {/* Video del fondatore */}
          <div className="mt-6">
            <p className="text-sm text-slate-300 mb-3">
              Prima di tutto, due parole dal fondatore. Vale qualche minuto: parti con le idee chiare.
            </p>
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-700 bg-black" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={WELCOME_VIDEO_EMBED}
                title="Messaggio di benvenuto di Claudio"
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="encrypted-media; fullscreen"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Claudio · fondatore di Evolution PRO</p>
          </div>
        </div>

        {/* Blocco di sicurezza — voce di Stefania */}
        <div className="mt-4 bg-white border border-yellow-200 border-l-4 border-l-yellow-400 rounded-r-xl p-5">
          <p className="text-[15px] leading-relaxed text-slate-900 mb-2.5">
            L'obiettivo è portare <strong>online la tua accademia in 21 giorni</strong>. Se segui
            esattamente le nostre indicazioni, completare ogni passo sarà un gioco da ragazzi.
          </p>
          <p className="text-[15px] leading-relaxed text-slate-900">
            Perché ne sono così certa? Perché è un percorso <strong>testato sul campo</strong>, che ha
            già portato centinaia di professionisti partiti completamente da zero a risultati di vendita
            importanti.
          </p>
        </div>

        {/* Metodo EVO */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">Come funziona: il Metodo EVO</h2>
          <p className="text-sm text-slate-500 mt-1 mb-3 leading-relaxed">Tre fasi, una alla volta. Al ritmo pensiamo noi.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PHASES.map((p) => (
              <div key={p.n} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-md bg-yellow-50 text-yellow-700 text-xs font-bold flex items-center justify-center">{p.n}</span>
                  <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                </div>
                <p className="text-[12.5px] text-slate-500 leading-snug">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team — foto grandi */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">Chi ti segue, fase per fase</h2>
          <p className="text-sm text-slate-500 mt-1 mb-3 leading-relaxed">
            Un'agente AI dedicata per ogni parte del lavoro. Non sei mai sola.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {TEAM.map((m) => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <Photo
                  src={m.img}
                  alt={m.name}
                  fallbackText={m.name[0]}
                  className="w-full h-40 text-4xl"
                />
                <div className="px-4 py-3">
                  <div className="text-[15px] font-semibold text-slate-900">{m.name}</div>
                  <div className="text-[13px] text-slate-500 mt-0.5">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onStart}
          className="mt-7 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold rounded-xl py-4 text-base transition"
        >
          {ctaLabel}
        </button>
        <p className="text-center text-[13px] text-slate-400 mt-2.5">Puoi fermarti e riprendere quando vuoi</p>
      </div>
    </div>
  );
}
