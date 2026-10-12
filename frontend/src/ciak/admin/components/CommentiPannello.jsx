/**
 * Commenti interni su un lead o un partner. Scrivere @Marco (o un altro agente) lo fa rispondere
 * sotto il tuo commento: l'agente legge il contesto e consiglia, non esegue niente. Le risposte
 * sono marcate «AI». Se l'agente non riesce a rispondere lo dice, senza inventare.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, SCOPE_DENIED_DETAIL } from "../api";
import { messaggioErrore } from "./SollecitoPannello";
import { AGENTI_CIAK, agentePerChiave } from "./agentiCiak";

const quando = (iso) => {
  try {
    return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

export function CommentiPannello({ tipo, id, onAuthExpired }) {
  const [commenti, setCommenti] = useState(undefined); // undefined = carico · null = non disponibili
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [esito, setEsito] = useState(null); // { errore } | { avviso }
  const [nascosto, setNascosto] = useState(false);

  const carica = useCallback(() => {
    apiGet("/commenti", { target_tipo: tipo, target_id: id })
      .then((r) => setCommenti(Array.isArray(r?.items) ? r.items : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        if (e?.message === SCOPE_DENIED_DETAIL) return setNascosto(true);
        if (/Errore 404/.test(String(e?.message))) return setCommenti([]);
        setCommenti(null);
      });
  }, [tipo, id, onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  if (nascosto) return null;

  const invia = async (ev) => {
    ev.preventDefault();
    if (invio || !testo.trim()) return;
    setInvio(true);
    setEsito(null);
    try {
      const r = await apiPost("/commenti", { target_tipo: tipo, target_id: id, testo });
      const avvisi = [];
      if (r.non_riuscite?.length) avvisi.push(`${r.non_riuscite.join(", ")} non ha potuto rispondere ora. Il tuo commento è salvato.`);
      if (r.saltati?.length) avvisi.push(`Rispondono al massimo due agenti per commento: ${r.saltati.join(", ")} non è stato interpellato.`);
      setEsito(avvisi.length ? { avviso: avvisi.join(" ") } : null);
      setTesto("");
      carica();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
      setEsito({ errore: messaggioErrore(e) });
    } finally {
      setInvio(false);
    }
  };

  const chiamaAgente = /@\p{L}+/u.test(testo);

  return (
    <section aria-labelledby={`comm-${tipo}`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 id={`comm-${tipo}`} className="text-sm font-semibold uppercase tracking-widest text-slate-400">Commenti</h3>

      {commenti === undefined && <p className="mt-3 text-sm text-slate-500">Carico…</p>}
      {commenti === null && (
        <p className="mt-3 text-sm text-slate-600">Commenti non disponibili. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button></p>
      )}
      {Array.isArray(commenti) && (
        commenti.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nessun commento. Scrivi @Marco, @Luca… per chiedere un consiglio.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {commenti.map((c) => {
              const ag = c.autore_tipo === "agente" ? agentePerChiave(c.agente) : null;
              return (
                <li key={c.id} className={`flex gap-3 ${c.risposta_a ? "ml-8" : ""}`}>
                  {ag ? (
                    <img src={ag.foto} alt="" width={32} height={32} className="h-8 w-8 flex-shrink-0 rounded-full object-cover bg-slate-200" />
                  ) : (
                    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600" aria-hidden>
                      {(c.autore || "?")[0].toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{c.autore}</span>
                      {ag && <span className="ml-1.5 rounded bg-yellow-100 px-1.5 py-0.5 font-semibold text-yellow-800">AI</span>}
                      <span className="ml-2">{quando(c.creato_at)}</span>
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-900">{c.testo}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}

      <form onSubmit={invia} className="mt-4">
        <label htmlFor={`comm-testo-${tipo}`} className="sr-only">Scrivi un commento</label>
        <textarea
          id={`comm-testo-${tipo}`}
          value={testo}
          rows={2}
          maxLength={2000}
          onChange={(e) => setTesto(e.target.value)}
          placeholder="Scrivi un commento. Con @Marco chiedi un consiglio a Marco."
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {AGENTI_CIAK.map((a) => (
              <button key={a.key} type="button" onClick={() => setTesto((t) => `${t}${t && !/\s$/.test(t) ? " " : ""}@${a.nome} `)}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-900">
                @{a.nome}
              </button>
            ))}
          </div>
          <button type="submit" disabled={invio || !testo.trim()}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
            {invio ? (chiamaAgente ? "L'agente sta rispondendo…" : "Invio…") : "Commenta"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Gli agenti sono assistenti AI: leggono e consigliano, non eseguono. Controlla prima di agire.</p>
        {esito?.errore && <p className="mt-2 text-sm text-red-700" role="alert">{esito.errore}</p>}
        {esito?.avviso && <p className="mt-2 text-sm text-amber-800" role="status">{esito.avviso}</p>}
      </form>
    </section>
  );
}

export default CommentiPannello;
