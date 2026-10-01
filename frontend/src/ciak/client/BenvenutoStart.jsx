import React, { useState } from "react";
import { START_WELCOME_VIDEOS } from "./startWelcomeVideos";

/**
 * Benvenuto al primo accesso di Ciak Start (390 EUR).
 * Scritto per chi non mastica il linguaggio del marketing digitale: parole di
 * tutti i giorni, cosa hai comprato, cosa faremo insieme, una sola azione.
 * Il Metodo E.V.O. (corso, lezioni, vendita, lancio) appartiene alla Partnership
 * e qui compare solo come passo successivo, in una riga.
 */
const COSA_RICEVI = [
  { titolo: "Il tuo marchio", testo: "Il nome, i colori e le lettere che userai ovunque, così le persone ti riconoscono subito." },
  { titolo: "Chi sei e cosa offri", testo: "Poche frasi chiare che spiegano chi aiuti, con quale problema e perché scegliere te." },
  { titolo: "I tuoi profili social", testo: "Sistemiamo foto, descrizione e presentazione, così fanno una buona prima impressione." },
  { titolo: "Una pagina web semplice", testo: "Una pagina con chi sei, cosa fai e come contattarti." },
  { titolo: "Cosa pubblicare per 60 giorni", testo: "Un calendario con le idee per i tuoi post, giorno per giorno, e una diretta video alla fine." },
  { titolo: "Un controllo finale", testo: "Verifichiamo insieme che sia tutto a posto per fare il passo successivo." },
];

const TAPPE = [
  { n: 1, testo: "Il tuo marchio e la frase che spiega chi sei e cosa offri" },
  { n: 2, testo: "I tuoi profili social e la pagina web" },
  { n: 3, testo: "Il calendario dei 60 giorni" },
];

function Photo({ src, alt, fallbackText, className }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={`${className} bg-slate-800 text-yellow-400 flex items-center justify-center font-semibold`}>
        {fallbackText}
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`${className} object-cover bg-slate-800`} />;
}

export default function BenvenutoStart({ clientName, consegne = [], onStart, ctaLabel = "Iniziamo" }) {
  const nome = (clientName || "").trim().split(/\s+/)[0] || "";
  const video = START_WELCOME_VIDEOS.filter((v) => v && v.embed);

  return (
    <div className="min-h-screen bg-slate-50 font-[Poppins,system-ui,sans-serif] text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <header className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <Photo
              src="/agents/stefania.jpg"
              alt="Simona"
              fallbackText="S"
              className="w-20 h-20 rounded-full flex-shrink-0 mx-auto sm:mx-0 ring-4 ring-yellow-400 text-2xl"
            />
            <div>
              <p className="text-xs font-semibold text-yellow-400 tracking-widest mb-1.5">CIAK START</p>
              <h1 className="text-2xl font-bold leading-tight">
                {nome ? `Ciao ${nome}, ti diamo il benvenuto in Ciak` : "Ti diamo il benvenuto in Ciak"}
              </h1>
              <p className="text-[15px] leading-relaxed text-slate-300 mt-2">
                Sono Simona e ti accompagno passo dopo passo. Qui sotto trovi cosa hai
                acquistato e cosa faremo insieme nelle prossime settimane.
              </p>
            </div>
          </div>
        </header>

        {video.length > 0 && (
          <section aria-label="Video di benvenuto" className="grid gap-5 sm:grid-cols-2">
            {video.map((v) => (
              <div key={v.embed} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-sm font-semibold mb-1">{v.titolo}</p>
                {v.descrizione && <p className="text-sm text-slate-500 mb-3">{v.descrizione}</p>}
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
                  <iframe
                    src={v.embed}
                    title={v.titolo}
                    className="absolute inset-0 w-full h-full"
                    frameBorder="0"
                    allow="encrypted-media; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold">Cosa hai acquistato</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4 leading-relaxed">
            Ciak Start è il primo passo per far conoscere il tuo lavoro online, in modo semplice
            e ordinato. Ti prepariamo tutto questo:
          </p>
          <ul className="divide-y divide-slate-100">
            {COSA_RICEVI.map((voce) => (
              <li key={voce.titolo} className="py-3">
                <p className="text-sm font-semibold">{voce.titolo}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{voce.testo}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold">Cosa faremo insieme</h2>
          <ol className="mt-3 space-y-3">
            {TAPPE.map((t, i) => (
              <li key={t.n} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-yellow-400 text-sm font-semibold flex items-center justify-center">
                  {t.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{t.testo}</p>
                  {consegne[i] && <p className="text-sm text-slate-500">Entro il {consegne[i]}</p>}
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-slate-600 mt-4 leading-relaxed">
            Come funziona: tu rispondi ad alcune domande sul tuo lavoro. Con le tue risposte
            prepariamo i materiali e li controlliamo noi prima di consegnarteli. Puoi fermarti
            quando vuoi: i tuoi progressi si salvano e riprendi da dove eri arrivato.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold">E dopo?</h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Se vorrai andare avanti con la Partnership (corso, lezioni video, vendita e lancio),
            i 390 € di Ciak Start verranno già scalati dal prezzo.
          </p>
        </section>

        <div className="pb-6">
          <button
            type="button"
            onClick={onStart}
            className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-yellow-400 text-slate-900 text-base font-semibold hover:bg-yellow-300 active:bg-yellow-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
