import React, { useState, useEffect, useCallback } from "react";
import { API } from "../../../utils/api-config";
import { authHeaders } from "../api";

/**
 * WORKSPACE 3 — "Il tuo funnel" (step F-13, Fase Valida, agente Gaia).
 *
 * Il funnel vive FUORI da Systeme: il partner lo guarda in anteprima (Vercel) e, per ogni
 * pagina, fa UNA scelta semplice: "Va bene" oppure "C'è un dato sbagliato" (cosa è sbagliato
 * + come dovrebbe essere). Non riscrive copy né struttura.
 *
 * Il partner non è tecnico: un'azione per volta, pulsanti grandi, frasi semplici.
 * Percorso in 5 passaggi (dati, funnel, pagine legali, indirizzo web, via libera): si apre sul
 * passaggio che tocca a lui e per ognuno dice cosa fa il team.
 *
 * API:
 *   stato:        GET  /api/partner-journey/workspace/{id}/vendita        → { review, ... }
 *   approva:      POST /api/partner-journey/funnel-review/{id}/approve    { page_id }
 *   segnala:      POST /api/partner-journey/funnel-review/{id}/correction { page_id, wrong, right }
 *   via libera:   POST /api/partner-journey/funnel-review/{id}/golive
 * Le azioni rispondono con lo stato aggiornato (`review`).
 */

const ANTHRACITE = "#1A1F24";
const BRAND_YELLOW = "#FFD24D";

const STATE_LABEL = {
  approvata: { text: "Hai detto che va bene", tone: "text-green-700 bg-green-50 border-green-200", icon: "✓" },
  in_modifica: { text: "Stiamo sistemando quello che ci hai segnalato", tone: "text-amber-800 bg-amber-50 border-amber-200", icon: "●" },
  da_controllare: { text: "Da controllare", tone: "text-slate-600 bg-slate-50 border-slate-200", icon: "○" },
};

function Badge({ state }) {
  const s = STATE_LABEL[state] || STATE_LABEL.da_controllare;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full border ${s.tone}`}>
      <span aria-hidden="true">{s.icon}</span> {s.text}
    </span>
  );
}

function CorrectionForm({ onSend, onCancel, busy }) {
  const [wrong, setWrong] = useState("");
  const [right, setRight] = useState("");
  const ready = wrong.trim().length >= 3 && right.trim().length >= 3;
  return (
    <form
      className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(e) => { e.preventDefault(); if (ready && !busy) onSend(wrong, right); }}
    >
      <label className="block text-[13px] font-semibold text-slate-800 mb-1" htmlFor="wrong-field">
        Cosa è sbagliato?
      </label>
      <input
        id="wrong-field" value={wrong} onChange={(e) => setWrong(e.target.value)} maxLength={200}
        placeholder="Es. il prezzo è scritto 297"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] mb-3"
      />
      <label className="block text-[13px] font-semibold text-slate-800 mb-1" htmlFor="right-field">
        Come dovrebbe essere?
      </label>
      <input
        id="right-field" value={right} onChange={(e) => setRight(e.target.value)} maxLength={300}
        placeholder="Es. il prezzo giusto è 247"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] mb-3"
      />
      <p className="text-[12px] text-slate-500 mb-3">
        Scrivi solo il dato da correggere. Testi e grafica li curiamo noi.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit" disabled={!ready || busy}
          className="min-h-[44px] px-5 rounded-lg text-[14px] font-semibold disabled:opacity-40"
          style={{ background: BRAND_YELLOW, color: ANTHRACITE }}
        >
          {busy ? "Invio…" : "Invia al team"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-600 border border-slate-300 bg-white">
          Annulla
        </button>
      </div>
    </form>
  );
}

function ReviewCard({ item, index, okLabel, busy, onApprove, onCorrect, children, url }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
             style={{ background: ANTHRACITE, color: BRAND_YELLOW }} aria-hidden="true">{index}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-slate-900">{item.title}</div>
          {item.descr && <p className="text-[13px] text-slate-600 mt-0.5">{item.descr}</p>}
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[13px] font-semibold text-slate-800 underline underline-offset-4">
              Apri questa pagina ↗
            </a>
          )}
          {children}
          <div className="mt-3"><Badge state={item.state} /></div>
          {item.state === "da_controllare" && !open && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => onApprove(item.id)} disabled={busy}
                className="min-h-[44px] px-5 rounded-lg text-[14px] font-semibold disabled:opacity-40"
                style={{ background: BRAND_YELLOW, color: ANTHRACITE }}
              >
                {okLabel}
              </button>
              <button onClick={() => setOpen(true)} disabled={busy}
                      className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-700 border border-slate-300 bg-white disabled:opacity-40">
                C'è un dato sbagliato
              </button>
            </div>
          )}
          {open && (
            <CorrectionForm
              busy={busy} onCancel={() => setOpen(false)}
              onSend={async (w, r) => { const ok = await onCorrect(item.id, w, r); if (ok) setOpen(false); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const GAIA = {
  dati: "Sono Gaia. Questi dati finiscono nelle pagine del tuo funnel e nei documenti legali. Controlla che siano giusti.",
  funnel: "Ecco le pagine del tuo funnel. Aprile e dimmi se vanno bene. Se c'è un dato sbagliato, scrivimi cosa cambiare.",
  documenti: "Privacy, cookie e condizioni di vendita le scriviamo noi con i tuoi dati. Quando sono pronti li leggi qui e, se tutto torna, li approvi.",
  dominio: "Qui colleghiamo il tuo indirizzo web al funnel. Quando arriviamo a questo passaggio ti guido io, riga per riga.",
  via_libera: "Quasi fatto. Quando è tutto a posto premi il pulsante e il funnel va online.",
};

const TEAM = {
  dati: "Il team: niente. I dati arrivano dal tuo contratto.",
  funnel: "Il team: costruisce le pagine, le mette in anteprima e applica le tue correzioni.",
  documenti: "Il team: scrive i documenti con i tuoi dati. Nessun testo con campi vuoti.",
  dominio: "Il team: prepara i valori giusti e controlla da solo che il collegamento funzioni.",
  via_libera: "Il team: collega iscrizioni, email e pagamento, poi pubblica.",
};

const STEP_TONE = {
  fatto: { icon: "✓", cls: "text-green-700" },
  da_fare: { icon: "●", cls: "text-slate-900" },
  attesa: { icon: "○", cls: "text-slate-400" },
};

function Stepper({ steps, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2 mb-5" role="tablist" aria-label="Passaggi del funnel">
      {steps.map((st, i) => {
        const tone = STEP_TONE[st.state] || STEP_TONE.attesa;
        const on = st.id === selected;
        return (
          <button
            key={st.id} role="tab" aria-selected={on} onClick={() => onSelect(st.id)}
            className={`flex-1 min-w-[112px] text-left rounded-lg px-3 py-2.5 min-h-[44px] bg-white ${on ? "border-2 border-slate-900" : "border border-slate-200"}`}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
              <span className={tone.cls} aria-hidden="true">{tone.icon}</span>{i + 1}. {st.title}
            </span>
            <span className="block text-[11.5px] text-slate-500 mt-0.5">
              {st.state === "fatto" ? "fatto" : st.state === "attesa" ? "in attesa" : st.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Waiting({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-[14px] text-slate-700 leading-relaxed">
      <div className="font-semibold text-slate-900 mb-1">{title}</div>
      {children}
    </div>
  );
}

export default function Workspace3SistemaVendita({ partnerId, onBack }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/partner-journey/workspace/${partnerId}/vendita`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setState(await r.json());
      setErr(null);
    } catch (e) {
      setErr("Non riesco a caricare il tuo funnel. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);
  useEffect(() => { load(); }, [load]);

  const act = async (path, body) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel-review/${partnerId}/${path}`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Qualcosa non ha funzionato. Riprova.");
      setState((s) => ({ ...s, review: d, progress: d.progress }));
      setSelected(null);
      return true;
    } catch (e) {
      setErr(String(e.message || e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto p-8 text-center text-slate-500">Carico il tuo funnel…</div>;
  if (!state) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        {onBack && <button onClick={onBack} className="text-[13px] text-slate-500 mb-3">← Torna indietro</button>}
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
      </div>
    );
  }

  const review = state.review || {};
  const steps = review.steps || [];
  const progress = state.progress || 0;
  const current = selected || review.current_step || (steps[0] && steps[0].id);
  const approve = (id) => act("approve", { page_id: id });
  const correct = (id, wrong, right) => act("correction", { page_id: id, wrong, right });
  const goLive = review.golive || {};
  const legal = review.legal || { id: "dati_legali", state: "da_controllare", data: {} };

  return (
    <div className="max-w-2xl mx-auto p-4 font-[Poppins,system-ui,sans-serif]">
      {onBack && <button onClick={onBack} className="text-[13px] text-slate-500 hover:text-slate-800 mb-3">← Torna indietro</button>}

      <div className="rounded-t-xl px-5 py-4 flex items-center justify-between gap-3" style={{ background: ANTHRACITE }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
            Fase Valida · {state.workspace_index || 3} di {state.workspace_total || 5}
          </span>
          <span className="text-[15px] font-semibold text-white truncate">{state.title}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[20px] font-bold leading-none" style={{ color: BRAND_YELLOW }}>{progress}%</div>
          <div className="text-[11px] text-slate-400">completato</div>
        </div>
      </div>
      <div className="h-1.5 bg-slate-700"><div className="h-1.5 transition-all" style={{ width: `${progress}%`, background: BRAND_YELLOW }} /></div>

      <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl p-5">
        <Stepper steps={steps} selected={current} onSelect={setSelected} />

        <div className="flex gap-3 mb-5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
               style={{ background: ANTHRACITE, color: BRAND_YELLOW }} aria-hidden="true">G</div>
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-[14px] leading-relaxed text-slate-800">{current === "funnel" && !review.released ? "Sto preparando le pagine del tuo funnel. Appena sono pronte le trovi qui e le guardi insieme a me." : GAIA[current]}</div>
        </div>

        {current === "dati" && (
          <ReviewCard item={{ id: legal.id, title: "Sono giusti questi dati?", state: legal.state }}
                      index="1" okLabel="Sì, sono giusti" busy={busy} onApprove={approve} onCorrect={correct}>
            <dl className="mt-2 text-[13.5px] text-slate-800 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {Object.entries(legal.data || {}).map(([k, v]) => (
                <React.Fragment key={k}><dt className="text-slate-500">{k}</dt><dd className="break-words">{v}</dd></React.Fragment>
              ))}
            </dl>
          </ReviewCard>
        )}

        {current === "funnel" && !review.released && (
          <Waiting title="Stiamo preparando il tuo funnel">
            Quando è pronto da guardare lo trovi qui. <strong>Per ora non devi fare nulla.</strong>
          </Waiting>
        )}
        {current === "funnel" && review.released && (
          <>
            <div className="rounded-xl p-5 mb-5" style={{ background: ANTHRACITE }}>
              <p className="text-[13.5px] text-slate-300 leading-relaxed mb-4">
                Scorri le pagine come farebbe una persona che arriva da te. Poi dicci se vanno bene.
              </p>
              <a href={review.preview_url} target="_blank" rel="noreferrer"
                 className="inline-flex items-center min-h-[48px] px-6 rounded-lg text-[15px] font-bold"
                 style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
                Guarda il tuo funnel ↗
              </a>
            </div>
            {(review.pages || []).map((p, i) => (
              <ReviewCard key={p.id} item={p} index={i + 1} url={p.url} okLabel="Va bene" busy={busy}
                          onApprove={approve} onCorrect={correct} />
            ))}
          </>
        )}

        {current === "documenti" && (
          <Waiting title="Li prepariamo noi">
            Dopo che avrai guardato il funnel ti mostriamo qui privacy, cookie e condizioni di vendita.
            <strong> Per ora non devi fare nulla.</strong>
          </Waiting>
        )}

        {current === "dominio" && (
          <Waiting title="Ti guidiamo noi, quando è il momento">
            Sono 3 righe da copiare nel pannello dove hai comprato il tuo dominio. Ti diciamo noi quando farlo.
            <strong> Per ora non devi fare nulla.</strong>
          </Waiting>
        )}

        {current === "via_libera" && (
          <>
            <div className="bg-slate-50 rounded-xl px-3.5 py-1.5 mb-5">
              {(review.connections || []).map((c, i, arr) => (
                <div key={c.id} className={`flex items-center gap-2.5 py-2 text-[14px] ${i < arr.length - 1 ? "border-b border-slate-200" : ""}`}>
                  <span className={c.done ? "text-green-600" : "text-slate-300"} aria-hidden="true">{c.done ? "✓" : "○"}</span>
                  <span className={c.done ? "text-slate-900" : "text-slate-600"}>{c.label}</span>
                  <span className="sr-only">{c.done ? "fatto" : "in corso"}</span>
                </div>
              ))}
            </div>
            {goLive.requested ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-[14px] text-green-800">
                <strong>Grazie!</strong> Abbiamo il tuo via libera. Ora mettiamo online il tuo funnel e ti avvisiamo qui.
              </div>
            ) : (
              <>
                <button
                  onClick={() => act("golive")} disabled={!goLive.can_request || busy}
                  className="w-full min-h-[52px] rounded-xl text-[15px] font-bold disabled:opacity-40"
                  style={{ background: BRAND_YELLOW, color: ANTHRACITE }}
                >
                  {busy ? "Un attimo…" : "Va tutto bene: mettiamolo online"}
                </button>
                {!goLive.can_request && (goLive.missing || []).length > 0 && (
                  <ul className="mt-3 text-[13px] text-slate-600 list-disc pl-5 space-y-1">
                    {goLive.missing.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        <p className="text-[12px] text-slate-500 mt-5">{TEAM[current]}</p>

        <div aria-live="polite">
          {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-[13.5px] text-red-700">{err}</div>}
        </div>
      </div>
    </div>
  );
}
