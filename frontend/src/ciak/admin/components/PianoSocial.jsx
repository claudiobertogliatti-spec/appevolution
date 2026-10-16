/**
 * Piano social del mese. Andrea propone il calendario, tu lo correggi e lo approvi UNA volta:
 * ogni voce riceve un link tracciato verso il sito e il conteggio dei clic. Il piano non pubblica
 * da solo: ogni voce dice come si realizza (Editoriale, flusso reel, manuale).
 * Su Instagram i link nelle didascalie non sono cliccabili: il link tracciato va nella bio.
 * Se il server nega l'accesso (SCOPE_DENIED_DETAIL) il componente sparisce.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, SCOPE_DENIED_DETAIL } from "../api";
import { messaggioErrore } from "./SollecitoPannello";

const CANALI = [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["linkedin", "LinkedIn"], ["blog", "Blog"]];

export function mesiDisponibili(oggi = new Date()) {
  return [0, 1, 2].map((i) => {
    const d = new Date(oggi.getFullYear(), oggi.getMonth() + i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return [v, d.toLocaleDateString("it-IT", { month: "long", year: "numeric" })];
  });
}

export function PianoSocial({ onUsaBrief, onAuthExpired }) {
  const mesi = useMemo(() => mesiDisponibili(), []);
  const [mese, setMese] = useState(mesi[1][0]);
  const [obiettivo, setObiettivo] = useState("");
  const [canali, setCanali] = useState(["instagram", "facebook"]);
  const [destinazione, setDestinazione] = useState("");
  const [bozza, setBozza] = useState(null);       // { voci, scartate }
  const [approvato, setApprovato] = useState(null); // piano salvato (con link e clic)
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState(null);
  const [vietato, setVietato] = useState(false);

  const gestisci = useCallback((e) => {
    if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
    if (String(e?.message || "").includes(SCOPE_DENIED_DETAIL)) return setVietato(true);
    setErrore(messaggioErrore(e));
  }, [onAuthExpired]);

  useEffect(() => {
    let vivo = true;
    setApprovato(null); setBozza(null); setErrore(null);
    apiGet(`/piano-social?mese=${mese}`)
      .then((r) => vivo && setApprovato(r?.piano || null))
      .catch((e) => vivo && gestisci(e));
    return () => { vivo = false; };
  }, [mese, gestisci]);

  if (vietato) return null;

  const proponi = async (ev) => {
    ev.preventDefault();
    setBusy(true); setErrore(null); setBozza(null);
    try { setBozza(await apiPost("/piano-social/bozza", { mese, obiettivo, canali })); }
    catch (e) { gestisci(e); }
    finally { setBusy(false); }
  };

  const approva = async () => {
    setBusy(true); setErrore(null);
    try {
      const voci = bozza.voci.map(({ data, canale, formato, tema, brief, invito }) => ({ data, canale, formato, tema, brief, invito }));
      await apiPost("/piano-social", { mese, voci, destinazione, approvato: true });
      const r = await apiGet(`/piano-social?mese=${mese}`);
      setApprovato(r?.piano || null); setBozza(null);
    } catch (e) { gestisci(e); }
    finally { setBusy(false); }
  };

  const modifica = (i, campo, valore) =>
    setBozza((b) => ({ ...b, voci: b.voci.map((v, k) => (k === i ? { ...v, [campo]: valore } : v)) }));
  const togli = (i) => setBozza((b) => ({ ...b, voci: b.voci.filter((_, k) => k !== i) }));
  const scambia = (c) => setCanali((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  const campo = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";

  return (
    <section aria-labelledby="t-piano" className="mb-10">
      <h2 id="t-piano" className="text-2xl font-semibold text-slate-900">Piano social del mese</h2>
      <p className="mt-1 text-sm text-slate-500">Andrea propone il calendario, tu lo approvi una volta. Ogni voce riceve un link tracciato verso il sito e il conteggio dei clic. Il piano non pubblica da solo: ogni voce dice come si realizza.</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="piano-mese" className="block text-sm font-semibold text-slate-900">Mese</label>
        <select id="piano-mese" value={mese} onChange={(e) => setMese(e.target.value)} className={campo + " sm:w-60"}>
          {mesi.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
        </select>

        {approvato ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">Piano approvato da {approvato.approvato_da} · {approvato.clic_totali} clic in totale</p>
            <p className="mt-1 text-xs text-slate-500">I clic escludono i robot riconoscibili. Su Instagram metti il link nella bio: nelle didascalie non è cliccabile.</p>
            <ul className="mt-3 space-y-3">
              {approvato.voci.map((v) => (
                <li key={v.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{v.data} · {v.canale} · {v.formato} · {v.clic} clic</p>
                  <p className="text-sm text-slate-700">{v.tema}</p>
                  <p className="mt-1 text-xs text-slate-500">{v.come_si_fa}</p>
                  <p className="mt-1 break-all text-xs text-slate-600">Link: {v.link}</p>
                  {v.formato === "reel" && (
                    <button type="button" onClick={() => onUsaBrief?.(v.brief)} className="mt-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-900">
                      Crea il reel
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <form onSubmit={proponi} className="mt-4">
            <label htmlFor="piano-obiettivo" className="block text-sm font-semibold text-slate-900">Obiettivo del mese</label>
            <textarea id="piano-obiettivo" rows={3} maxLength={800} value={obiettivo} onChange={(e) => setObiettivo(e.target.value)}
              placeholder="Cosa vuoi ottenere e per chi: più persone sul sito, quale offerta far conoscere." className={campo} />
            <fieldset className="mt-3">
              <legend className="text-sm font-semibold text-slate-900">Canali</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {CANALI.map(([id, et]) => (
                  <label key={id} className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${canali.includes(id) ? "border-slate-900 bg-slate-900 text-yellow-400" : "border-slate-200 text-slate-700"}`}>
                    <input type="checkbox" className="sr-only" checked={canali.includes(id)} onChange={() => scambia(id)} />{et}
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="piano-dest" className="mt-3 block text-sm font-semibold text-slate-900">Pagina di destinazione (facoltativa, di default la home del sito)</label>
            <input id="piano-dest" value={destinazione} onChange={(e) => setDestinazione(e.target.value)} placeholder="https://…" className={campo} />
            <div className="mt-3 flex justify-end">
              <button type="submit" disabled={busy || obiettivo.trim().length < 10 || canali.length === 0}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
                {busy && !bozza ? "Andrea sta preparando il piano…" : "Proponi il piano"}
              </button>
            </div>
          </form>
        )}
      </div>

      {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}

      {bozza && !approvato && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Proposta di Andrea <span className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">AI</span> · {bozza.voci.length} voci</p>
          {bozza.scartate > 0 && <p className="mt-1 text-xs text-amber-800">Andrea ha proposto {bozza.scartate} voci non valide (data, canale, formato o tetto reel): le ho scartate.</p>}
          <ul className="mt-3 space-y-3">
            {bozza.voci.map((v, i) => (
              <li key={`${v.data}-${v.canale}-${i}`} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">{v.canale} · {v.formato} · {v.come_si_fa}</p>
                <label htmlFor={`pv-tema-${i}`} className="mt-2 block text-xs font-semibold text-slate-900">Tema</label>
                <input id={`pv-tema-${i}`} value={v.tema} maxLength={200} onChange={(e) => modifica(i, "tema", e.target.value)} className={campo} />
                <label htmlFor={`pv-brief-${i}`} className="mt-2 block text-xs font-semibold text-slate-900">Brief</label>
                <textarea id={`pv-brief-${i}`} rows={2} value={v.brief} maxLength={600} onChange={(e) => modifica(i, "brief", e.target.value)} className={campo} />
                <div className="mt-2 flex items-end justify-between gap-3">
                  <div>
                    <label htmlFor={`pv-data-${i}`} className="block text-xs font-semibold text-slate-900">Data</label>
                    <input id={`pv-data-${i}`} type="date" value={v.data} onChange={(e) => modifica(i, "data", e.target.value)} className={campo} />
                  </div>
                  <button type="button" onClick={() => togli(i)} className="rounded-full border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:border-slate-900">Togli</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setBozza(null)} disabled={busy} className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50">Scarta</button>
            <button type="button" onClick={approva} disabled={busy || bozza.voci.length < 3}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
              {busy ? "Salvo…" : "Approva il piano"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default PianoSocial;
