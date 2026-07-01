import React, { useState } from "react";
import { WELCOME_VIDEO_EMBED } from "./phases";

/**
 * Schermata di Benvenuto al primo accesso del partner.
 * Voce di Stefania (coordinatrice del team). Ciak è presentato come un'azienda
 * digitale: un team di specialisti — ognuno potenziato dall'AI — che lavora al
 * progetto del partner. Contiene: accoglienza + video del fondatore + Metodo
 * E.V.O. + il team (foto reali) + CTA "Inizia il percorso".
 *
 * Usata come gate al primo accesso (PartnerOperativo) e come passo "Conosciamoci".
 */
const TEAM = [
  { id: "stefania", name: "Stefania", role: "Coordina il progetto e ti guida passo dopo passo.", img: "/agents/stefania.jpg" },
  { id: "valentina", name: "Valentina", role: "Brand, posizionamento e metodo.", img: "/agents/valentina.jpg" },
  { id: "andrea", name: "Andrea", role: "Masterclass, video e contenuti.", img: "/agents/andrea.jpg" },
  { id: "gaia", name: "Gaia", role: "Funnel, pagine e parte tecnica.", img: "/agents/gaia.jpg" },
  { id: "marco", name: "Marco", role: "Strategia commerciale e lancio.", img: "/agents/marco.jpg" },
  { id: "matteo", name: "Matteo", role: "Analisi dei risultati e ottimizzazione.", img: "/agents/matteo.jpg" },
];

const PHASES = [
  { n: 1, name: "Esamina", desc: "Costruiamo le fondamenta. Definiamo il tuo brand, il tuo posizionamento, il metodo e l'offerta." },
  { n: 2, name: "Valida", desc: "Trasformiamo il progetto in qualcosa che le persone possono acquistare. Creiamo corso, masterclass, funnel e lancio." },
  { n: 3, name: "Ottimizza", desc: "Analizziamo i risultati reali. Miglioriamo comunicazione, conversioni e vendite fino a costruire un sistema sempre più efficace." },
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

export default function Benvenuto({ partnerName, onStart, ctaLabel = "Ho visto il video, inizia il percorso" }) {
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
                Sarò il tuo punto di riferimento durante tutto il percorso. Dietro Ciak hai a
                disposizione un <strong className="text-white">vero team di specialisti</strong> che lavora al
                tuo progetto: ognuno segue una parte precisa del lavoro, esattamente come in un'azienda.
                Ogni fase è seguita dallo specialista più adatto, così hai sempre il supporto giusto
                senza doverti chiedere quale sia il prossimo passo.
              </p>
              <p className="text-[15px] leading-relaxed text-slate-300 mt-2">
                Il mio compito è tenere tutto sotto controllo, guidarti e assicurarmi che tu arrivi
                fino alla pubblicazione della tua accademia.
              </p>
            </div>
          </div>

          {/* Video del fondatore */}
          <div className="mt-6">
            <p className="text-[15px] font-semibold mb-1">Benvenuto nel Metodo EVO</p>
            <p className="text-sm text-slate-300 mb-3">
              Prima di iniziare, Claudio ti spiega come funziona il percorso e cosa succede nelle
              prossime settimane. Guardalo con calma: poi Ciak ti porterà al primo passo operativo.
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

        {/* Metodo E.V.O. */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">Il Metodo E.V.O.</h2>
          <p className="text-sm text-slate-500 mt-1 mb-3 leading-relaxed">Lavoreremo una fase alla volta. Ogni fase ha un obiettivo preciso.</p>
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

        {/* Il tuo team */}
        <div className="mt-6">
          <h2 className="text-base font-semibold text-slate-900">Il tuo team</h2>
          <p className="text-sm text-slate-500 mt-1 mb-3 leading-relaxed">
            Specialisti dedicati a ogni parte del percorso, ognuno potenziato dall'intelligenza artificiale.
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
                  <div className="text-[13px] text-slate-500 mt-0.5 leading-snug">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sei pronto? */}
        <div className="mt-6 bg-slate-900 text-white rounded-2xl p-6 text-center">
          <h2 className="text-xl font-bold">Tutto pronto?</h2>
          <p className="text-[15px] text-slate-300 mt-2 leading-relaxed">
            Il prossimo passo è iniziare a costruire il tuo progetto.<br />
            Una fase alla volta. Un obiettivo alla volta. Un risultato alla volta.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold rounded-xl py-4 text-base transition"
          >
            {ctaLabel}
          </button>
          <p className="text-[13px] text-slate-400 mt-3">
            Puoi interrompere il lavoro quando vuoi: Ciak salva automaticamente i tuoi progressi e
            riprendi esattamente da dove avevi lasciato.
          </p>
        </div>
      </div>
    </div>
  );
}
