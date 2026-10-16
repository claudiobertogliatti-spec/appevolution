/**
 * Analisi di un video virale di un competitor (Andrea). Andrea NON guarda il video: tu incolli
 * il testo (trascrizione o parlato) e, se le hai, le cifre. Andrea ne ricava gancio e struttura,
 * ipotesi su cosa ha funzionato e il brief di un reel tuo, con parole diverse.
 * «Usa per un reel» passa il brief alla sezione dei reel: da lì lo script e l'approvazione.
 * Se il server nega l'accesso (SCOPE_DENIED_DETAIL) il componente sparisce.
 */
import { useState } from "react";
import { apiPost, SCOPE_DENIED_DETAIL } from "../api";
import { messaggioErrore } from "./SollecitoPannello";

const PIATTAFORME = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "Altro"];

export function CompetitorAnalisi({ onUsaBrief, onAuthExpired }) {
  const [vietato, setVietato] = useState(false);
  const [piattaforma, setPiattaforma] = useState("Instagram");
  const [competitor, setCompetitor] = useState("");
  const [link, setLink] = useState("");
  const [testo, setTesto] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [commenti, setCommenti] = useState("");
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState(null);
  const [esito, setEsito] = useState(null);

  if (vietato) return null;

  const analizza = async (ev) => {
    ev.preventDefault();
    setBusy(true); setErrore(null); setEsito(null);
    try {
      setEsito(await apiPost("/competitor/analisi", {
        piattaforma, competitor, link, testo,
        views: views || null, likes: likes || null, commenti: commenti || null,
      }));
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
      if (String(e?.message || "").includes(SCOPE_DENIED_DETAIL)) return setVietato(true);
      setErrore(messaggioErrore(e));
    } finally { setBusy(false); }
  };

  const campo = "mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";
  const m = esito?.metriche;

  return (
    <section aria-labelledby="t-competitor" className="mb-10">
      <h2 id="t-competitor" className="text-2xl font-semibold text-slate-900">Video dei competitor</h2>
      <p className="mt-1 text-sm text-slate-500">Andrea non guarda il video: lavora sul testo e sulle cifre che incolli. Propone un reel tuo, con parole diverse, mai una copia.</p>

      <form onSubmit={analizza} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="comp-piattaforma" className="block text-sm font-semibold text-slate-900">Piattaforma</label>
            <select id="comp-piattaforma" value={piattaforma} onChange={(e) => setPiattaforma(e.target.value)} className={campo}>
              {PIATTAFORME.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="comp-nome" className="block text-sm font-semibold text-slate-900">Competitor (facoltativo)</label>
            <input id="comp-nome" value={competitor} maxLength={100} onChange={(e) => setCompetitor(e.target.value)} className={campo} />
          </div>
        </div>
        <label htmlFor="comp-link" className="mt-3 block text-sm font-semibold text-slate-900">Link al video (facoltativo)</label>
        <input id="comp-link" value={link} maxLength={500} onChange={(e) => setLink(e.target.value)} className={campo} />
        <label htmlFor="comp-testo" className="mt-3 block text-sm font-semibold text-slate-900">Testo o trascrizione del video</label>
        <textarea id="comp-testo" rows={6} maxLength={6000} value={testo} onChange={(e) => setTesto(e.target.value)}
          placeholder="Incolla qui quello che dice il video." className={campo} />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[["comp-views", "Visualizzazioni", views, setViews], ["comp-likes", "Like", likes, setLikes], ["comp-commenti", "Commenti", commenti, setCommenti]].map(([id, et, val, set]) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{et} (facoltativo)</label>
              <input id={id} inputMode="numeric" value={val} onChange={(e) => set(e.target.value)} className={campo} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={busy || testo.trim().length < 40}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
            {busy ? "Andrea sta analizzando…" : "Analizza"}
          </button>
        </div>
      </form>

      {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}

      {esito && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
          <p className="text-sm font-semibold text-slate-900">Analisi di Andrea <span className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">AI</span></p>
          {m?.tasso_interazione_pct != null && (
            <p className="mt-2 text-sm text-slate-600">Tasso di interazione calcolato sulle tue cifre: {m.tasso_interazione_pct}%.</p>
          )}
          <h3 className="mt-3 text-sm font-semibold text-slate-900">Gancio</h3>
          <p className="text-sm text-slate-700">{esito.gancio}</p>
          <h3 className="mt-3 text-sm font-semibold text-slate-900">Struttura</h3>
          <ol className="list-decimal pl-5 text-sm text-slate-700">{esito.struttura.map((x) => <li key={x}>{x}</li>)}</ol>
          {esito.perche_ha_funzionato?.length > 0 && (<>
            <h3 className="mt-3 text-sm font-semibold text-slate-900">Perché potrebbe aver funzionato (ipotesi dal testo)</h3>
            <ul className="list-disc pl-5 text-sm text-slate-700">{esito.perche_ha_funzionato.map((x) => <li key={x}>{x}</li>)}</ul>
          </>)}
          {esito.da_non_copiare && (<><h3 className="mt-3 text-sm font-semibold text-slate-900">Da non copiare</h3><p className="text-sm text-slate-700">{esito.da_non_copiare}</p></>)}
          {esito.adattamento && (<><h3 className="mt-3 text-sm font-semibold text-slate-900">Come renderlo tuo</h3><p className="text-sm text-slate-700">{esito.adattamento}</p></>)}
          <h3 className="mt-3 text-sm font-semibold text-slate-900">Brief per il tuo reel</h3>
          <p className="text-sm text-slate-900">{esito.brief_reel}</p>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => onUsaBrief?.(esito.brief_reel)}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800">
              Usa per un reel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CompetitorAnalisi;
