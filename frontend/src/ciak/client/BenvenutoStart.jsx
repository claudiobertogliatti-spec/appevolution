import React, { useState } from "react";
import { START_WELCOME_VIDEOS } from "./startWelcomeVideos";

/**
 * Benvenuto al primo accesso di Ciak Start (390 EUR).
 * Fa sentire il cliente a casa: accoglienza calda, il video di Claudio a tutta
 * larghezza, sotto una breve descrizione di cosa si fa insieme e un buon motivo
 * per iniziare subito. Parole di tutti i giorni, nessun gergo di marketing e
 * nessuna promessa di risultato. Il Metodo E.V.O. e' della Partnership.
 */
const TAPPE = [
  { n: 1, testo: "Il tuo marchio e la frase che spiega chi sei e cosa offri" },
  { n: 2, testo: "I tuoi profili social e una pagina web semplice" },
  { n: 3, testo: "Il calendario con le idee per i tuoi post dei prossimi 60 giorni" },
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
  const video = START_WELCOME_VIDEOS.filter((v) => v && (v.src || v.embed));

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
                {nome ? `Ciao ${nome}, siamo felici di averti con noi` : "Siamo felici di averti con noi"}
              </h1>
              <p className="text-[15px] leading-relaxed text-slate-300 mt-2">
                Io sono Simona e da oggi sono al tuo fianco. Hai fatto un’ottima scelta:
                partire da Ciak Start vuol dire mettere le basi del tuo lavoro online con
                calma, un passo alla volta. E non da solo.
              </p>
            </div>
          </div>
        </header>

        {video.length > 0 && (
          <section aria-label="Video di benvenuto" className="space-y-5">
            {video.map((v) => (
              <div key={v.src || v.embed} className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4">
                <p className="text-sm font-semibold px-1 pb-1">{v.titolo}</p>
                {v.descrizione && <p className="text-sm text-slate-500 px-1 pb-3">{v.descrizione}</p>}
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
                  {v.src ? (
                    <video
                      src={v.src}
                      title={v.titolo}
                      controls
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={v.embed}
                      title={v.titolo}
                      className="absolute inset-0 w-full h-full"
                      frameBorder="0"
                      allow="encrypted-media; fullscreen"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold">Cosa faremo insieme</h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Nelle prossime settimane mettiamo in ordine il tuo lavoro online, in tre tappe.
            Tu ci racconti chi sei e cosa fai. Al resto pensiamo noi, e ogni cosa la
            controlliamo prima di consegnartela.
          </p>
          <ol className="mt-4 space-y-3">
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
        </section>

        <section className="bg-slate-900 text-white rounded-2xl p-6">
          <h2 className="text-base font-semibold text-yellow-400">Il momento giusto per iniziare è adesso</h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            I primi passi sono quelli che contano di più. Per cominciare ci servono le tue
            risposte: prima ce le racconti, prima il tuo lavoro prende forma. Puoi
            fermarti quando vuoi, i tuoi progressi si salvano e riprendi da dove eri arrivato.
          </p>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            Ci siamo noi, ogni giorno, al tuo fianco.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="mt-5 w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-yellow-400 text-slate-900 text-base font-semibold hover:bg-yellow-300 active:bg-yellow-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {ctaLabel}
          </button>
        </section>
      </div>
    </div>
  );
}
