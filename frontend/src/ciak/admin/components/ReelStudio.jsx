/**
 * Reel con il tuo avatar HeyGen. Andrea scrive lo script, tu lo leggi e lo modifichi, e SOLO
 * con «Approva e genera» parte il video (consuma crediti HeyGen; c'è un tetto mensile).
 *
 * 1) Avatar e voce: scelti tra quelli che HeyGen ha sul tuo account (una volta sola).
 * 2) Brief -> bozza di Andrea (non genera nulla).
 * 3) Approvazione -> HeyGen in verticale 1080x1920.
 * 4) Elenco dei reel con lo stato letto da HeyGen.
 * Se il server nega l'accesso (SCOPE_DENIED_DETAIL) il componente sparisce.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, SCOPE_DENIED_DETAIL } from "../api";
import { messaggioErrore } from "./SollecitoPannello";

const ETICHETTA_STATO = { in_generazione: "In generazione…", pronto: "Pronto", fallito: "Non riuscito", pubblicato: "Pubblicato" };

export function ReelStudio({ briefIniziale = "", onAuthExpired }) {
  const [vietato, setVietato] = useState(false);
  const [conf, setConf] = useState(null);       // risposta di GET /reel/avatar
  const [avatarId, setAvatarId] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [tetto, setTetto] = useState(8);
  const [reel, setReel] = useState([]);
  const [brief, setBrief] = useState("");
  const [bozza, setBozza] = useState(null);     // { script, didascalia, secondi }
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState(null);
  const [info, setInfo] = useState(null);

  const gestisci = useCallback((e) => {
    if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
    if (String(e?.message || "").includes(SCOPE_DENIED_DETAIL)) return setVietato(true);
    setErrore(messaggioErrore(e));
  }, [onAuthExpired]);

  const carica = useCallback(async () => {
    try {
      const [c, r] = await Promise.all([apiGet("/reel/avatar"), apiGet("/reel")]);
      setConf(c);
      setAvatarId(c.scelta?.avatar_id || "");
      setVoiceId(c.scelta?.voice_id || "");
      setTetto(c.scelta?.tetto_mensile || 8);
      setReel(Array.isArray(r.items) ? r.items : []);
    } catch (e) { gestisci(e); }
  }, [gestisci]);

  useEffect(() => { carica(); }, [carica]);
  // Un brief che arriva da fuori (analisi competitor) riempie il campo; poi lo modifichi tu.
  useEffect(() => { if (briefIniziale) setBrief(briefIniziale); }, [briefIniziale]);

  if (vietato) return null;

  const salvaAvatar = async () => {
    setErrore(null); setInfo(null);
    try {
      await apiPost("/reel/avatar", { avatar_id: avatarId, voice_id: voiceId, tetto_mensile: Number(tetto) });
      setInfo("Avatar e voce salvati.");
    } catch (e) { gestisci(e); }
  };

  const scrivi = async (ev) => {
    ev.preventDefault();
    setBusy(true); setErrore(null); setInfo(null); setBozza(null);
    try { setBozza(await apiPost("/reel/bozza", { brief })); }
    catch (e) { gestisci(e); }
    finally { setBusy(false); }
  };

  const genera = async () => {
    setBusy(true); setErrore(null); setInfo(null);
    try {
      await apiPost("/reel/genera", { script: bozza.script, didascalia: bozza.didascalia, approvato: true });
      setInfo("Reel in generazione: di solito servono alcuni minuti. Lo trovi qui sotto.");
      setBozza(null); setBrief("");
      await carica();
    } catch (e) { gestisci(e); }
    finally { setBusy(false); }
  };

  const scelto = Boolean(conf?.scelta?.avatar_id && conf?.scelta?.voice_id);
  const campo = "mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400";

  return (
    <section aria-labelledby="t-reel" className="mb-10">
      <h2 id="t-reel" className="text-2xl font-semibold text-slate-900">Reel con il tuo avatar</h2>
      <p className="mt-1 text-sm text-slate-500">Andrea scrive lo script, tu approvi e HeyGen produce il video in verticale. Ogni video consuma crediti HeyGen: il tetto mensile ti protegge.</p>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Il tuo avatar e la tua voce</p>
        {conf && !conf.heygen_ok && <p className="mt-2 text-sm text-amber-800" role="status">{conf.errore || "HeyGen non risponde."} Puoi inserire a mano gli identificativi.</p>}
        <label htmlFor="reel-avatar" className="mt-3 block text-sm font-semibold text-slate-900">Avatar</label>
        {conf?.avatars?.length > 0 ? (
          <select id="reel-avatar" value={avatarId} onChange={(e) => setAvatarId(e.target.value)} className={campo}>
            <option value="">Scegli…</option>
            {conf.avatars.map((a) => <option key={a.avatar_id} value={a.avatar_id}>{a.nome}</option>)}
          </select>
        ) : (
          <input id="reel-avatar" value={avatarId} onChange={(e) => setAvatarId(e.target.value)} className={campo} />
        )}
        <label htmlFor="reel-voce" className="mt-3 block text-sm font-semibold text-slate-900">Voce</label>
        {conf?.voices?.length > 0 ? (
          <select id="reel-voce" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={campo}>
            <option value="">Scegli…</option>
            {conf.voices.map((v) => <option key={v.voice_id} value={v.voice_id}>{v.nome}</option>)}
          </select>
        ) : (
          <input id="reel-voce" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className={campo} />
        )}
        <label htmlFor="reel-tetto" className="mt-3 block text-sm font-semibold text-slate-900">Tetto di reel al mese</label>
        <input id="reel-tetto" type="number" min={1} max={60} value={tetto} onChange={(e) => setTetto(e.target.value)} className={campo + " sm:w-32"} />
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={salvaAvatar} disabled={!avatarId || !voiceId}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50">
            Salva avatar e voce
          </button>
        </div>
      </div>

      <form onSubmit={scrivi} className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="reel-brief" className="block text-sm font-semibold text-slate-900">Di cosa parla il reel</label>
        <textarea id="reel-brief" rows={3} maxLength={1000} value={brief} onChange={(e) => setBrief(e.target.value)}
          placeholder="Un concetto solo, a chi parla, cosa deve fare chi guarda." className={campo} />
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy || brief.trim().length < 10}
            className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
            {busy && !bozza ? "Andrea sta scrivendo…" : "Fai scrivere lo script"}
          </button>
        </div>
      </form>

      {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}
      {info && <p className="mt-4 text-sm text-slate-700" role="status">{info}</p>}

      {bozza && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Script di Andrea <span className="ml-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-800">AI</span> · circa {bozza.secondi} secondi</p>
          <label htmlFor="reel-script" className="mt-3 block text-sm font-semibold text-slate-900">Script parlato</label>
          <textarea id="reel-script" rows={6} maxLength={900} value={bozza.script}
            onChange={(e) => setBozza({ ...bozza, script: e.target.value })} className={campo} />
          <label htmlFor="reel-did" className="mt-3 block text-sm font-semibold text-slate-900">Didascalia</label>
          <textarea id="reel-did" rows={2} maxLength={220} value={bozza.didascalia}
            onChange={(e) => setBozza({ ...bozza, didascalia: e.target.value })} className={campo} />
          {!scelto && <p className="mt-3 text-sm text-amber-800">Salva prima avatar e voce: senza non si può generare.</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setBozza(null)} disabled={busy}
              className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50">Scarta</button>
            <button type="button" onClick={genera} disabled={busy || !scelto}
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500">
              {busy ? "Invio a HeyGen…" : "Approva e genera"}
            </button>
          </div>
        </div>
      )}

      {reel.length > 0 && (
        <ul className="mt-4 space-y-3">
          {reel.map((r) => (
            <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{ETICHETTA_STATO[r.stato] || r.stato} · {r.mese}</p>
              <p className="mt-1 text-sm text-slate-600">{r.didascalia || r.script.slice(0, 120)}</p>
              {r.video_url && <a href={r.video_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-slate-900 underline">Guarda il video</a>}
              {r.stato === "fallito" && r.errore && <p className="mt-1 text-sm text-red-700">{r.errore}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ReelStudio;
