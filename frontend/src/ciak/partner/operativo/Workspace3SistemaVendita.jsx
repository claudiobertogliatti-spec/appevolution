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
  funnel: "Costruiamo il funnel una pagina alla volta. Ti dico a cosa serve ognuna e da cosa si compone; poi guardi la bozza e mi dici se va bene.",
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

function DocsReader({ partnerId }) {
  const [docs, setDocs] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/partner-journey/funnel-review/${partnerId}/documents`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { if (alive) setDocs(d.documents || []); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [partnerId]);
  if (failed) return <p className="mt-2 text-[13px] text-red-700">Non riesco a mostrare i documenti. Riprova tra poco.</p>;
  if (!docs) return <p className="mt-2 text-[13px] text-slate-500">Carico i documenti…</p>;
  return (
    <div className="mt-3 space-y-2">
      {docs.map((d) => (
        <div key={d.id} className="rounded-lg border border-slate-200">
          <button
            onClick={() => setOpenId(openId === d.id ? null : d.id)} aria-expanded={openId === d.id}
            className="w-full min-h-[44px] flex items-center justify-between px-3.5 text-left text-[14px] font-semibold text-slate-900"
          >
            {d.title}<span aria-hidden="true">{openId === d.id ? "−" : "+"}</span>
          </button>
          {openId === d.id && (
            <div
              className="px-3.5 pb-4 text-[13.5px] leading-relaxed text-slate-800 [&_h1]:hidden [&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_a]:underline [&_.upd]:text-slate-500"
              dangerouslySetInnerHTML={{ __html: d.html }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PageStrip({ items, current, stateOf, onSelect }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 mb-5" aria-label="Le 4 pagine del tuo funnel">
      {items.map((it, i) => {
        const on = it.id === current;
        const done = stateOf(it.id) === "approvata";
        return (
          <li key={it.id} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(it.id)} aria-current={on ? "step" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 min-h-[40px] text-[12.5px] bg-white ${on ? "border-2 border-slate-900 font-semibold" : "border border-slate-200"}`}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: done ? "#16a34a" : ANTHRACITE, color: done ? "#fff" : BRAND_YELLOW }}>
                {done ? "✓" : i + 1}
              </span>
              {it.step}
            </button>
            {i < items.length - 1 && <span className="text-slate-400" aria-hidden="true">→</span>}
          </li>
        );
      })}
    </ol>
  );
}

function PartRow({ index, part, pageId, released, busy, onApprove, onEdit, onUpload }) {
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState("");
  const [gaia, setGaia] = useState(null);
  const [thread, setThread] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState("modifica");
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [upErr, setUpErr] = useState(null);
  const isLook = part.id === "aspetto";

  const addPhotos = async (files) => {
    setUpErr(null);
    const list = Array.from(files || []).slice(0, 3 - photos.length);
    if (!list.length) return;
    setUploading(true);
    for (const f of list) {
      if (!f.type.startsWith("image/")) { setUpErr("Puoi caricare solo foto."); continue; }
      if (f.size > 10 * 1024 * 1024) { setUpErr("Ogni foto può pesare al massimo 10 MB."); continue; }
      const url = await onUpload(f);
      if (url) setPhotos((p) => [...p, { url, name: f.name }]);
      else setUpErr("Non sono riuscita a caricare una foto. Riprova.");
    }
    setUploading(false);
  };

  const resetAll = () => { setGaia(null); setOpen(false); setWanted(""); setPhotos([]); setThread([]); setReply(""); };

  const send = async (text, insist, note, replyText) => {
    setSending(true);
    const r = await onEdit(pageId, part.id, text, insist, note, photos.map((x) => x.url), mode, thread, replyText);
    setSending(false);
    if (!r) return;
    if (r.verdict === "sconsiglio") {
      setThread((t) => [...t, ...(replyText ? [{ role: "partner", text: replyText }] : [{ role: "partner", text }]),
                        ...(r.message ? [{ role: "gaia", text: r.message }] : [])]);
      setReply("");
      setGaia(r);
      return;
    }
    resetAll();
  };

  return (
    <li className="rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="text-[12.5px] font-semibold text-slate-500">{index}. {part.label}</div>
      {part.text && <div className="text-[14px] text-slate-900 mt-0.5">«{part.text}»</div>}
      {released && part.state === "approvata" && <div className="mt-1.5 text-[12.5px] font-semibold text-green-700">✓ Approvato</div>}
      {released && part.state === "in_modifica" && (
        <div className="mt-1.5 text-[12.5px] font-semibold text-amber-800">● Stiamo sistemando la tua modifica</div>
      )}
      {released && part.state !== "in_modifica" && !open && (
        <div className="flex flex-wrap gap-2 mt-2">
          {part.state !== "approvata" && (
            <button onClick={() => onApprove(pageId, part.id)} disabled={busy}
                    className="min-h-[44px] px-5 rounded-lg text-[14px] font-semibold disabled:opacity-40"
                    style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
              Approva
            </button>
          )}
          <button onClick={() => { setMode("modifica"); setOpen(true); }} disabled={busy}
                  className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-700 border border-slate-300 bg-white disabled:opacity-40">
            Modifica
          </button>
          {part.add_label && (
            <button onClick={() => { setMode("aggiungi"); setOpen(true); }} disabled={busy}
                    className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-700 border border-slate-300 bg-white disabled:opacity-40">
              {part.add_label}
            </button>
          )}
        </div>
      )}
      {open && !gaia && (
        <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if ((wanted.trim().length >= 3 || photos.length) && !sending) send(wanted, false, null); }}>
          <label className="block text-[13px] font-semibold text-slate-800 mb-1" htmlFor={`w-${pageId}-${part.id}`}>
            {mode === "aggiungi" ? (part.add_label === "Aggiungi una domanda" ? "Quale domanda vuoi aggiungere?" : "Cosa vuoi aggiungere?")
              : isLook ? "Cosa vuoi cambiare?" : "Come lo vorresti?"}
          </label>
          <textarea id={`w-${pageId}-${part.id}`} value={wanted} onChange={(e) => setWanted(e.target.value)} maxLength={300} rows={3}
                    placeholder={mode === "aggiungi" ? (part.add_label === "Aggiungi una domanda" ? "Scrivi la domanda e, se vuoi, la risposta" : "Scrivi il punto che vuoi aggiungere")
              : isLook ? "Es. sfondo più chiaro, un'altra mia foto, un altro carattere" : "Scrivi qui la versione che preferisci"}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] mb-2" />
          {isLook && (
            <div className="mb-3">
              <label className="inline-flex items-center min-h-[44px] px-4 rounded-lg text-[14px] text-slate-800 border border-dashed border-slate-400 bg-white cursor-pointer">
                {uploading ? "Carico…" : photos.length ? "Aggiungi un'altra foto" : "Carica le foto che ti piacciono"}
                <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || photos.length >= 3}
                       onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
              <span className="ml-2 text-[12px] text-slate-500">Fino a 3 foto tue, massimo 10 MB l'una.</span>
              {photos.length > 0 && (
                <ul className="flex flex-wrap gap-2 mt-2">
                  {photos.map((ph) => (
                    <li key={ph.url} className="relative">
                      <img src={ph.url} alt={ph.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                      <button type="button" aria-label={`Togli ${ph.name}`} onClick={() => setPhotos((p) => p.filter((x) => x.url !== ph.url))}
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-300 text-[13px] leading-none">×</button>
                    </li>
                  ))}
                </ul>
              )}
              {upErr && <p className="mt-1 text-[12.5px] text-red-700">{upErr}</p>}
            </div>
          )}
          <p className="text-[12px] text-slate-500 mb-2">
            {isLook
              ? "Gaia controlla che sia in linea con il tuo brand kit. Se qualcosa non va, te lo spiega."
              : "Vuoi correggere un termine tecnico del tuo settore? Scrivilo qui: nella tua materia decidi tu. Sul copy, Gaia ti dice se funziona e, se no, perché."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={(wanted.trim().length < 3 && !photos.length) || sending || uploading}
                    className="min-h-[44px] px-5 rounded-lg text-[14px] font-semibold disabled:opacity-40"
                    style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
              {sending ? "Gaia sta guardando…" : "Invia"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setWanted(""); }}
                    className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-600 border border-slate-300 bg-white">
              Annulla
            </button>
          </div>
        </form>
      )}
      {open && gaia && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5" role="status">
          <div className="text-[13px] font-semibold text-slate-900 mb-2">Gaia ti spiega</div>
          <ul className="space-y-2 mb-3">
            {thread.map((t, i) => (
              <li key={i} className={`text-[13.5px] leading-relaxed rounded-lg px-3 py-2 ${t.role === "gaia" ? "bg-white text-slate-800" : "bg-amber-100 text-slate-900 ml-6"}`}>
                <span className="block text-[11.5px] font-semibold text-slate-500">{t.role === "gaia" ? "Gaia" : "Tu"}</span>
                {t.text}
              </li>
            ))}
          </ul>
          {gaia.proposal && (
            <p className="text-[13.5px] text-slate-900 mb-3"><span className="font-semibold">La mia proposta: </span>«{gaia.proposal}»</p>
          )}
          {!gaia.closed && (
            <form className="mb-3" onSubmit={(e) => { e.preventDefault(); if (reply.trim().length >= 3 && !sending) send(wanted, false, null, reply.trim()); }}>
              <label className="block text-[13px] font-semibold text-slate-800 mb-1" htmlFor={`r-${pageId}-${part.id}`}>Rispondi a Gaia</label>
              <textarea id={`r-${pageId}-${part.id}`} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={300} rows={2}
                        placeholder="Spiega il tuo motivo: se è valido, Gaia cambia idea"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[14px] mb-2" />
              <button type="submit" disabled={reply.trim().length < 3 || sending}
                      className="min-h-[44px] px-4 rounded-lg text-[14px] font-semibold disabled:opacity-40"
                      style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
                {sending ? "Gaia sta rispondendo…" : "Rispondi"}
              </button>
            </form>
          )}
          <div className="flex flex-wrap gap-2">
            {gaia.proposal && (
              <button onClick={() => send(gaia.proposal, true, thread.filter((t) => t.role === "gaia").map((t) => t.text).join(" | "))} disabled={sending}
                      className="min-h-[44px] px-4 rounded-lg text-[14px] font-semibold disabled:opacity-40"
                      style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
                Usa la proposta di Gaia
              </button>
            )}
            <button onClick={() => send(wanted, true, thread.filter((t) => t.role === "gaia").map((t) => t.text).join(" | "))} disabled={sending}
                    className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-700 border border-slate-300 bg-white disabled:opacity-40">
              Voglio comunque la mia
            </button>
            <button onClick={resetAll} disabled={sending}
                    className="min-h-[44px] px-4 rounded-lg text-[14px] text-slate-600 border border-slate-300 bg-white">
              Lascio com'è
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function PageInfo({ item, released, busy, onApprove, onEdit, onUpload }) {
  return (
    <div className="text-[13.5px] leading-relaxed text-slate-800 mt-2">
      <p className="mb-2">{item.purpose}</p>
      <div className="font-semibold text-slate-900 mb-1">Si compone di:</div>
      <ol className="mb-2 space-y-2">
        {(item.parts || []).map((x, i) => (
          <PartRow key={x.id} index={i + 1} part={x} pageId={item.id} released={released} busy={busy}
                   onApprove={onApprove} onEdit={onEdit} onUpload={onUpload} />
        ))}
      </ol>
      <p className="mb-2"><span className="font-semibold text-slate-900">Cosa ottieni: </span>{item.gain}</p>
      <p><span className="font-semibold text-slate-900">Cosa devi controllare: </span>{item.check}</p>
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
  const [pageSel, setPageSel] = useState(null);

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
  const approvePart = (pageId, partId) => act("part/approve", { page_id: pageId, part_id: partId });
  const uploadPhoto = async (file) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${API}/api/partner-journey/operativo/upload/${partnerId}?notify=false`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      const d = await r.json().catch(() => ({}));
      return r.ok && d.url ? d.url : null;
    } catch (e) {
      return null;
    }
  };
  const editPart = async (pageId, partId, wanted, insist, gaiaNote, photos, mode, thread, reply) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${API}/api/partner-journey/funnel-review/${partnerId}/part/edit`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ page_id: pageId, part_id: partId, wanted, insist: !!insist, gaia_note: gaiaNote || null, photos: photos || [], action: mode || "modifica", thread: thread || [], reply: reply || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Qualcosa non ha funzionato. Riprova.");
      if (d.verdict === "inviata") setState((st) => ({ ...st, review: d, progress: d.progress }));
      return d;
    } catch (e) {
      setErr(String(e.message || e));
      return null;
    } finally {
      setBusy(false);
    }
  };
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
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-[14px] leading-relaxed text-slate-800">{current === "funnel" && !review.released ? "Costruiamo il funnel una pagina alla volta. Ti spiego a cosa serve ognuna; le bozze le sto preparando e le trovi qui appena sono pronte." : GAIA[current]}</div>
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

        {current === "funnel" && (() => {
          const seq = review.sequence || [];
          const pageOf = (id) => (review.pages || []).find((p) => p.id === id);
          const stateOf = (id) => (pageOf(id) ? pageOf(id).state : "da_controllare");
          const firstOpen = seq.find((x) => stateOf(x.id) !== "approvata");
          const activeId = pageSel || (firstOpen ? firstOpen.id : (seq[0] && seq[0].id));
          const it = seq.find((x) => x.id === activeId);
          if (!it) return null;
          const page = pageOf(it.id);
          const idx = seq.findIndex((x) => x.id === it.id);
          return (
            <>
              <p className="text-[13px] text-slate-600 mb-3">
                Il tuo funnel sono 4 pagine, una dopo l'altra: portano chi ti incontra dal primo contatto fino al corso. Le vediamo una alla volta.
              </p>
              <PageStrip items={seq} current={it.id} stateOf={stateOf} onSelect={setPageSel} />
              <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
                <div className="text-[16px] font-semibold text-slate-900">{it.building}</div>
                <PageInfo item={it} released={!!review.released} busy={busy}
                          onApprove={approvePart} onEdit={editPart} onUpload={uploadPhoto} />
              </div>
              {!review.released && (
                <Waiting title="La bozza è in preparazione">
                  Quando è pronta la apri da qui e, per ogni elemento, scegli Approva o Modifica. <strong>Per ora non devi fare nulla.</strong>
                </Waiting>
              )}
              {review.released && page && (
                <div className="rounded-xl p-4 mb-3" style={{ background: ANTHRACITE }}>
                  <p className="text-[13.5px] text-slate-300 leading-relaxed mb-3">
                    Guarda la bozza di questa pagina, poi per ogni elemento qui sopra scegli Approva o Modifica.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href={page.url} target="_blank" rel="noreferrer"
                       className="inline-flex items-center min-h-[44px] px-5 rounded-lg text-[14px] font-bold"
                       style={{ background: BRAND_YELLOW, color: ANTHRACITE }}>
                      Guarda la bozza ↗
                    </a>
                    {page.state !== "approvata" && (
                      <button onClick={async () => { const ok = await approve(page.id); if (ok) setPageSel(null); }} disabled={busy}
                              className="min-h-[44px] px-4 rounded-lg text-[14px] text-white border border-slate-500 disabled:opacity-40">
                        Approva tutta la pagina
                      </button>
                    )}
                  </div>
                  <div className="mt-2"><Badge state={page.state} /></div>
                </div>
              )}
            </>
          );
        })()}

        {current === "documenti" && !(review.documents && review.documents.released) && (
          <Waiting title="Li prepariamo noi">
            Dopo che avrai guardato il funnel ti mostriamo qui privacy, cookie e condizioni di vendita.
            <strong> Per ora non devi fare nulla.</strong>
          </Waiting>
        )}
        {current === "documenti" && review.documents && review.documents.released && (
          <ReviewCard item={{ id: review.documents.id, title: "Privacy, cookie e condizioni di vendita",
                              descr: "Aprili e leggili. Il corso lo vende Evolution. I clienti hanno 14 giorni per chiedere il rimborso.",
                              state: review.documents.state }}
                      index="3" okLabel="Va bene" busy={busy} onApprove={approve} onCorrect={correct}>
            <DocsReader partnerId={partnerId} />
          </ReviewCard>
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
