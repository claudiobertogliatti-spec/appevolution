/**
 * Contenuti — la stanza di Andrea (solo Claudio, anteprima su /admin/contenuti).
 *
 * 1) Le pagine contenuti che esistono già, raccolte in un posto (nessuna nuova: i link vanno
 *    alle pagine di sempre).
 * 2) «Chiedi ad Andrea»: bozze di post, email e SEO dal tuo brief e dalla Memoria Ciak.
 *    Sono BOZZE: Andrea non pubblica, non invia e non salva. Si copia e si usa.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../api";
import { messaggioErrore } from "../components/SollecitoPannello";

const PAGINE = [
  { to: "/admin/acquisizione-editoriale", titolo: "Editoriale", desc: "Caroselli con l'AI: obiettivi del mese, contenuti da approvare e pubblicare." },
  { to: "/admin/acq-calendario", titolo: "Calendario Editoriale", desc: "I tuoi contenuti per generare conversazioni e Blueprint." },
  { to: "/admin/calendario-editoriale", titolo: "Calendario partner", desc: "Il piano contenuti dei partner live." },
  { to: "/admin/casi-studio", titolo: "Casi studio", desc: "Prova sociale: i casi studio dei partner per il funnel." },
];

const TIPI = [
  { key: "post_linkedin", nome: "Post LinkedIn" },
  { key: "post_instagram", nome: "Post Instagram" },
  { key: "email", nome: "Email" },
  { key: "seo_pagina", nome: "SEO di una pagina" },
];

function Conteggio({ n, max }) {
  return <span className={n > max ? "font-semibold text-red-700" : "text-slate-500"}>{n}/{max} caratteri</span>;
}

export function Contenuti({ onAuthExpired }) {
  const [tipo, setTipo] = useState("post_linkedin");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [risultato, setRisultato] = useState(null); // { tipo, testo } | { tipo, seo }
  const [errore, setErrore] = useState(null);
  const [copiato, setCopiato] = useState(false);

  const genera = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setErrore(null);
    setRisultato(null);
    try {
      setRisultato(await apiPost("/contenuti/bozza", { tipo, brief }));
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
      setErrore(messaggioErrore(e));
    } finally {
      setBusy(false);
    }
  };

  const copia = async (testo) => {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore("Non riesco a copiare: seleziona il testo e copialo a mano.");
    }
  };

  const seo = risultato?.seo;
  const testoDaCopiare = seo
    ? `Title: ${seo.title}\nMeta description: ${seo.meta}\nH1: ${seo.h1}\nParole chiave: ${seo.parole_chiave.join(", ")}`
    : risultato?.testo;

  return (
    <div className="px-5 py-8 sm:px-10 lg:px-16 lg:py-12 max-w-5xl">
      <header className="mb-10 flex flex-wrap items-center gap-6">
        <img src="/agents/andrea.jpg" alt="" width={96} height={96} className="h-24 w-24 rounded-full object-cover ring-4 ring-yellow-400 bg-slate-200" />
        <div>
          <h1 className="text-4xl font-semibold text-slate-900">Contenuti</h1>
          <p className="mt-2 text-xl text-slate-600">Andrea scrive le bozze. Pubblicare e inviare resta a te.</p>
        </div>
      </header>

      <section aria-labelledby="t-pagine" className="mb-10">
        <h2 id="t-pagine" className="text-2xl font-semibold text-slate-900">Le pagine dei contenuti</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {PAGINE.map((p) => (
            <li key={p.to}>
              <Link to={p.to} className="block h-full rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
                <span className="block text-lg font-semibold text-slate-900">{p.titolo}</span>
                <span className="mt-1 block text-sm text-slate-600">{p.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="t-chiedi" className="mb-10">
        <h2 id="t-chiedi" className="text-2xl font-semibold text-slate-900">Chiedi ad Andrea</h2>
        <p className="mt-1 text-sm text-slate-500">Scrive solo dal tuo brief e dalla Memoria Ciak. Non inventa numeri, risultati o testimonianze: controlla sempre prima di usare il testo.</p>

        <form onSubmit={genera} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Cosa ti serve</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIPI.map((t) => (
                <label key={t.key} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${tipo === t.key ? "border-slate-900 bg-slate-900 text-yellow-400" : "border-slate-200 text-slate-700 hover:border-slate-900"}`}>
                  <input type="radio" name="tipo-contenuto" value={t.key} checked={tipo === t.key} onChange={() => setTipo(t.key)} className="sr-only" />
                  {t.nome}
                </label>
              ))}
            </div>
          </fieldset>

          <label htmlFor="brief-andrea" className="mt-4 block text-sm font-semibold text-slate-900">Brief</label>
          <textarea
            id="brief-andrea"
            value={brief}
            rows={5}
            maxLength={1500}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Di cosa parla, a chi è rivolto, cosa deve fare chi legge. Più fatti dai, meglio scrive."
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          />
          <div className="mt-3 flex justify-end">
            <button type="submit" disabled={busy || brief.trim().length < 10}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
              {busy ? "Andrea sta scrivendo…" : "Scrivi la bozza"}
            </button>
          </div>
        </form>

        {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}

        {risultato && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Bozza di Andrea <span className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">AI</span></p>
              <button type="button" onClick={() => copia(testoDaCopiare)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-900">
                {copiato ? "Copiato" : "Copia"}
              </button>
            </div>
            {seo ? (
              <dl className="mt-3 space-y-3 text-sm">
                <div><dt className="font-semibold text-slate-900">Title <Conteggio n={seo.title_len} max={60} /></dt><dd className="text-slate-700">{seo.title}</dd></div>
                <div><dt className="font-semibold text-slate-900">Meta description <Conteggio n={seo.meta_len} max={155} /></dt><dd className="text-slate-700">{seo.meta}</dd></div>
                <div><dt className="font-semibold text-slate-900">H1</dt><dd className="text-slate-700">{seo.h1}</dd></div>
                {seo.parole_chiave.length > 0 && <div><dt className="font-semibold text-slate-900">Parole chiave</dt><dd className="text-slate-700">{seo.parole_chiave.join(", ")}</dd></div>}
                {(!seo.title_ok || !seo.meta_ok) && <p className="text-red-700">Un limite è superato: accorcia a mano o chiedi un&apos;altra bozza.</p>}
              </dl>
            ) : (
              <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-900">{risultato.testo}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default Contenuti;
