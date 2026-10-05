/**
 * Scheda lead — blocco "Scrivi": lo Script (testi di risveglio approvati) dentro il lead.
 *
 * Si sceglie canale e messaggio, si legge il testo già compilato, si copia e si incolla a
 * mano su LinkedIn / Instagram / Facebook / WhatsApp. "Copia e segna come inviato" registra
 * il contatto (POST /api/admin/ciak/leads/{id}/tocco): nessun invio automatico, nessun
 * evento Systeme. Sotto, la cronologia di chi ha scritto, dove e quando.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { adminFetch, getAdminUser } from "../api";
import {
  CANALI, MESSAGGI, ORIGINI, MITTENTI, TAPPE,
  mittenteDefault, messaggioConsigliato, compila, segnapostoMancanti,
  etichettaMessaggio, etichettaCanale, cronologia, tappeFatte,
} from "../pages/schedaScriptModel";

function adminTypeCorrente() {
  try { return (typeof getAdminUser === "function" && getAdminUser()?.admin_type) || "claudio"; }
  catch { return "claudio"; }
}

const fmtData = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
};

export function LeadScriptPanel({ lead, onChanged, onAuthExpired }) {
  const [touches, setTouches] = useState(lead.touches || []);
  const [status, setStatus] = useState(lead.status);
  const [followup, setFollowup] = useState(lead.next_followup || null);
  const [origine, setOrigine] = useState(lead.origine || "");
  const [canale, setCanale] = useState("linkedin");
  const [mittente, setMittente] = useState(() => mittenteDefault(adminTypeCorrente()));
  const [chiave, setChiave] = useState(() => messaggioConsigliato({ origine: lead.origine, canale: "linkedin", touches: lead.touches }));
  const [testo, setTesto] = useState("");
  const [modificato, setModificato] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Il testo si rigenera quando cambia una scelta, mai mentre chi scrive lo sta modificando a mano.
  useEffect(() => {
    if (!modificato) setTesto(compila({ key: chiave, mittente, lead }));
  }, [chiave, mittente, lead, modificato]);

  const mancanti = useMemo(() => segnapostoMancanti(testo), [testo]);
  const tappe = tappeFatte({ touches, status });
  const hint = CANALI.find((c) => c.key === canale)?.hint;

  const scegli = (fn) => (v) => { fn(v); setModificato(false); setMsg(null); };
  const cambiaCanale = (c) => {
    setCanale(c); setModificato(false); setMsg(null);
    setChiave(messaggioConsigliato({ origine, canale: c, touches }));
  };
  const cambiaOrigine = async (o) => {
    setOrigine(o); setModificato(false);
    setChiave(messaggioConsigliato({ origine: o, canale, touches }));
    try {
      const res = await adminFetch(`/api/discovery/leads/${lead.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origine: o }),
      });
      if (res.ok) onChanged?.({ ...lead, origine: o });
    } catch (e) { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); }
  };

  const copia = async () => {
    try { await navigator.clipboard.writeText(testo); return true; } catch { return false; }
  };

  const soloCopia = async () => {
    const ok = await copia();
    setMsg(ok
      ? { err: false, text: `Testo copiato. Incollalo su ${etichettaCanale(canale)}.` }
      : { err: true, text: "Non riesco a copiare: seleziona il testo e copialo a mano." });
  };

  const registra = async (message) => {
    setBusy(true); setMsg(null);
    try {
      const res = await adminFetch(`/api/admin/ciak/leads/${lead.id}/tocco`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: canale, message, sender: mittente }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) { setMsg({ err: true, text: data.detail || "Non sono riuscito a segnarlo come inviato." }); return false; }
      const nuovi = [...touches, data.touch];
      setTouches(nuovi); setStatus(data.status); setFollowup(data.next_followup || null);
      onChanged?.({ ...lead, touches: nuovi, status: data.status, next_followup: data.next_followup, last_contacted_at: data.last_contacted_at, origine });
      return true;
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); else setMsg({ err: true, text: "Errore di rete: non è stato segnato." });
      return false;
    } finally { setBusy(false); }
  };

  const copiaESegna = async () => {
    if (busy || mancanti.length) return;
    const copiato = await copia();
    const ok = await registra(chiave);
    if (!ok) return;
    setModificato(false);
    setChiave(messaggioConsigliato({ origine, canale, touches: [...touches, { message: chiave }] }));
    setMsg({ err: false, text: `${copiato ? "Testo copiato · " : "Copia il testo a mano · "}segnato come inviato.` });
  };

  const profiloTrovato = async () => {
    if (busy) return;
    const ok = await registra("profilo_trovato");
    if (ok) setMsg({ err: false, text: "Profilo segnato come trovato." });
  };

  const storia = cronologia(touches);
  const haProfilo = touches.some((t) => t.message === "profilo_trovato");

  return (
    <div data-testid="lead-script-panel" className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide mb-2 text-slate-400">Avvicinamento</div>
        <ol className="flex" aria-label="Tappe di avvicinamento">
          {TAPPE.map((t, i) => {
            const fatta = tappe.flags[i];
            const prossima = tappe.prossima === i;
            return (
              <li key={t} aria-current={prossima ? "step" : undefined}
                className={`flex-1 text-center text-[11px] ${fatta ? "text-emerald-700" : prossima ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                <span className={`mx-auto mb-1 block h-3 w-3 rounded-full border-2 ${fatta ? "bg-emerald-600 border-emerald-600" : prossima ? "bg-yellow-400 border-yellow-500" : "bg-white border-slate-300"}`} />
                {t}{prossima && <span className="block font-normal text-slate-400">prossimo</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-gray-200 p-3 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[11px] font-semibold text-slate-500">Canale</span>
            <div role="group" aria-label="Canale" className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              {CANALI.map((c) => (
                <button key={c.key} type="button" aria-pressed={canale === c.key} onClick={() => cambiaCanale(c.key)}
                  className={`px-3 min-h-[36px] text-xs font-medium border-r last:border-r-0 border-gray-200 ${canale === c.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`msg-${lead.id}`} className="w-16 text-[11px] font-semibold text-slate-500">Messaggio</label>
            <select id={`msg-${lead.id}`} value={chiave} onChange={(e) => scegli(setChiave)(e.target.value)}
              className="min-h-[36px] max-w-full px-2 rounded-lg border border-gray-200 bg-white text-sm text-slate-900">
              {MESSAGGI.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}{m.origine && m.origine === origine ? "  ★ consigliato" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[11px] font-semibold text-slate-500">Scrive</span>
            <div role="group" aria-label="Chi scrive" className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white">
              {MITTENTI.map((m) => (
                <button key={m} type="button" aria-pressed={mittente === m} onClick={() => scegli(setMittente)(m)}
                  className={`px-3 min-h-[36px] text-xs font-medium border-r last:border-r-0 border-gray-200 ${mittente === m ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                  {m}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">preimpostato su chi è collegato</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`orig-${lead.id}`} className="w-16 text-[11px] font-semibold text-slate-500">Origine</label>
            <select id={`orig-${lead.id}`} value={origine} onChange={(e) => cambiaOrigine(e.target.value)}
              className="min-h-[36px] px-2 rounded-lg border border-gray-200 bg-white text-sm text-slate-900">
              <option value="">Non indicata</option>
              {ORIGINI.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          {mancanti.length > 0 && (
            <p role="alert" className="text-xs rounded-lg px-3 py-2 bg-yellow-50 text-amber-800">
              Da completare prima di segnarlo come inviato: {mancanti.join(", ")}.
            </p>
          )}
          <textarea aria-label="Testo del messaggio" value={testo} spellCheck={false} rows={9}
            onChange={(e) => { setTesto(e.target.value); setModificato(true); }}
            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900 resize-y leading-relaxed" />
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={soloCopia}
              className="min-h-[44px] px-4 text-sm font-semibold rounded-lg border border-gray-200 text-slate-900 hover:bg-gray-50">
              Copia
            </button>
            <button type="button" onClick={copiaESegna} disabled={busy || mancanti.length > 0}
              className="min-h-[44px] px-4 text-sm font-semibold rounded-lg bg-yellow-400 text-slate-900 hover:bg-yellow-300 disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Copia e segna come inviato
            </button>
            {!haProfilo && (
              <button type="button" onClick={profiloTrovato} disabled={busy}
                className="min-h-[44px] px-3 text-sm text-slate-600 rounded-lg hover:bg-gray-100 disabled:opacity-50">
                Ho trovato il profilo
              </button>
            )}
          </div>
          {msg && <p role="status" className={`text-xs ${msg.err ? "text-red-600" : "text-emerald-700"}`}>{msg.text}</p>}
        </div>
      </div>

      {followup && (
        <p className="text-xs rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
          Messaggio di seguito da mandare <b>il {fmtData(followup)}</b> se non risponde.
        </p>
      )}

      <div>
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">
          <span>Cronologia contatti</span><span className="normal-case font-medium">chi ha scritto, dove, quando</span>
        </div>
        {storia.length === 0 ? (
          <p className="text-xs text-slate-400">Ancora nessun contatto registrato.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {storia.map((t, i) => (
              <li key={`${t.at}-${i}`} className="flex gap-3 py-2 text-sm">
                <time className="w-12 shrink-0 text-xs text-slate-400">{fmtData(t.at)}</time>
                <div>
                  <div className="font-semibold text-slate-900">
                    {t.message === "profilo_trovato" ? "Profilo trovato" : `Inviato: ${etichettaMessaggio(t.message || t.subject || "")}`}
                  </div>
                  <div className="text-xs text-slate-500">{[t.by, etichettaCanale(t.channel)].filter(Boolean).join(" · ")}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default LeadScriptPanel;
