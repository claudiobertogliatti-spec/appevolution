import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { adminFetch, apiGet, apiPost } from "../api";

export const formatCents = (cents) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(cents || 0) / 100);

export function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });

const dayLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) : "—");
const payByLabel = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "long", timeZone: "UTC" });
const currentMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);

/** Etichetta del mese di ingresso di una riga: vuota se il lead e di questo stesso mese. */
export const leadOrigin = (leadMese, viewedMonth) =>
  !leadMese ? "mese ignoto" : leadMese === viewedMonth ? "questo mese" : `lead di ${monthLabel(leadMese)}`;

/** Valori iniziali del form: lead nuovo (vuoto, ingresso = mese corrente) oppure scheda esistente. */
export function leadForm(lead) {
  return {
    email: lead?.email || "",
    nome: lead?.nome && lead.nome !== lead.email ? lead.nome : "",
    nota: lead?.nota || "",
    call_fatta_il: lead?.call_fatta_il || "",
    esito_start_il: lead?.esito_start_il || "",
    mese: lead ? lead.mese || "" : currentMonth(),
  };
}

const fieldClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400";

function LeadDialog({ lead, isNew, events, viewedMonth, busy, onSave, onRemove, onClose }) {
  const [form, setForm] = useState(() => leadForm(lead));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const firstField = useRef(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => { e.preventDefault(); onSave(form); };
  const removable = Boolean(lead?.manuale);
  const mine = (events || []).filter((ev) => lead && ev.email === lead.email);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-label={isNew ? "Aggiungi lead" : "Scheda lead"} onSubmit={submit}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{isNew ? "Aggiungi lead a Mariangela" : (lead.nome || lead.email)}</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">Email
            <input ref={isNew ? firstField : null} type="email" required readOnly={!isNew} value={form.email} onChange={set("email")}
              className={`${fieldClass} mt-1 ${isNew ? "" : "bg-slate-50 text-slate-500"}`} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Nome
            <input ref={isNew ? null : firstField} type="text" maxLength={120} value={form.nome} onChange={set("nome")} className={`${fieldClass} mt-1`} />
            {isNew && <span className="mt-1 block text-xs font-normal text-slate-500">Obbligatorio se il lead non è già in Ciak.</span>}
          </label>
          <label className="block text-sm font-medium text-slate-700">Mese di ingresso
            <input type="month" max={currentMonth()} value={form.mese} onChange={set("mese")} className={`${fieldClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Il lead viene contato solo in questo mese. Se lo lasci vuoto vale il mese del suo primo contatto in Ciak.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">Call fatta il
            <input type="date" max={today()} value={form.call_fatta_il} onChange={set("call_fatta_il")} className={`${fieldClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Solo per call fatte fuori da Ciak. Se la call è già registrata in Ciak, lascia vuoto: vale quella.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">Pacchetto su misura pagato il
            <input type="date" max={today()} value={form.esito_start_il} onChange={set("esito_start_il")} className={`${fieldClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate-500">Solo se ha pagato con un link Stripe personalizzato. Vale come esito Start (50 €). Se ha pagato il checkout Start di Ciak, lascia vuoto: lo vede da solo.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">Nota
            <textarea rows={3} maxLength={500} value={form.nota} onChange={set("nota")} className={`${fieldClass} mt-1`} />
          </label>
        </div>

        {!isNew && (
          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-900">Gettoni di {monthLabel(viewedMonth)}</p>
            {mine.length === 0 ? (
              <p className="mt-1 text-slate-500">Nessun evento che matura gettone in questo mese.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {mine.map((ev, i) => (
                  <li key={`${ev.tipo}-${i}`} className="flex justify-between text-slate-700"><span>{ev.etichetta} · {dayLabel(ev.data)}</span><span className="font-semibold">{formatCents(ev.importo_cents)}</span></li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">Attribuzione: {lead.manuale ? "inserito a mano" : "dal link di Mariangela"}.</p>
            <Link to={`/admin/leads/${encodeURIComponent(lead.email)}`} className="mt-2 inline-block text-xs font-semibold text-slate-700 underline">Apri la scheda completa del lead</Link>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {!isNew ? (
            confirmRemove ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-slate-700">Togliere questo lead da Mariangela?</span>
                <button type="button" disabled={busy} onClick={onRemove} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Sì, rimuovi</button>
                <button type="button" onClick={() => setConfirmRemove(false)} className="text-xs font-semibold text-slate-500 underline">No</button>
              </span>
            ) : (
              <button type="button" disabled={!removable} title={removable ? "" : "Attribuito dal link di Mariangela: non si toglie da qui"}
                onClick={() => setConfirmRemove(true)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Rimuovi</button>
            )
          ) : <span />}
          <span className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Annulla</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 disabled:opacity-50">{isNew ? "Aggiungi" : "Salva"}</button>
          </span>
        </div>
        {!isNew && !removable && <p className="mt-2 text-xs text-slate-500">Rimuovi è disattivato: questo lead è attribuito dal link con utm_source=mariangela, non da un inserimento a mano.</p>}
      </form>
    </div>
  );
}

function Section({ title, hint, action, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {hint && <span className="ml-2 text-xs text-slate-500">{hint}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const th = "px-5 py-2";

export function GettoniMariangela({ onAuthExpired }) {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // {lead, isNew}

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await apiGet("/collaboratori/mariangela/gettoni", { month }));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    }
  }, [month, onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const save = async (form, okMessage = "Lead salvato") => {
    setBusy(true);
    try {
      await apiPost("/collaboratori/mariangela/attribuzioni", {
        email: form.email.trim(), nome: form.nome, nota: form.nota,
        call_fatta_il: form.call_fatta_il || null, esito_start_il: form.esito_start_il || null, mese: form.mese || null,
      });
      toast.success(okMessage);
      setDialog(null);
      await load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Non salvato: " + e.message);
    } finally { setBusy(false); }
  };

  const remove = async (email) => {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/ciak/collaboratori/mariangela/attribuzioni/${encodeURIComponent(email)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Errore ${res.status}`);
      toast.success("Lead tolto da Mariangela");
      setDialog(null);
      await load();
    } catch (e) {
      toast.error("Non rimosso: " + e.message);
    } finally { setBusy(false); }
  };

  const attributeQuick = (row) => save({ email: row.email, nome: row.nome === row.email ? "" : row.nome, nota: "", call_fatta_il: "", esito_start_il: "", mese: "" }, "Lead attribuito a Mariangela");
  const openLead = (email) => {
    const lead = data.lead_detail[email];
    if (lead) setDialog({ lead, isNew: false });
  };

  if (error) return <p className="mt-6 text-sm text-red-600">Gettoni non disponibili: {error}</p>;
  if (!data) return <p className="mt-6 text-sm text-slate-400">Caricamento gettoni...</p>;

  const rates = data.rates.importi_cents;
  const dp = data.da_pagare;
  const closeDialog = () => setDialog(null);
  const rowClick = (email) => ({ onClick: () => openLead(email), className: "cursor-pointer hover:bg-slate-50" });

  return (
    <section className="mt-6 space-y-6" aria-label="Gettoni di Mariangela">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Mese precedente" onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <h2 className="min-w-40 text-center text-lg font-semibold capitalize text-slate-900">{monthLabel(month)}</h2>
            <button type="button" aria-label="Mese successivo" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth()} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Da pagare entro il <strong className="text-slate-900">{payByLabel(data.pay_by)}</strong>, sul fatturato incassato.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Totale da pagare</p>
          <p className="text-4xl font-semibold text-slate-900">{formatCents(data.total_cents)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Lead del mese</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{data.conteggio.lead}</p>
          <p className="mt-1 text-xs text-slate-500">entrati in {monthLabel(month)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Lead da pagare</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCents(dp.lead_cents)}</p>
          <p className="mt-1 text-xs text-slate-500">{data.conteggio.call_fatte} call fatte × {formatCents(rates.call_fatta)}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 md:col-span-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Bonus da pagare</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCents(dp.bonus_cents)}</p>
          <p className="mt-1 text-xs text-slate-500">{data.conteggio.bonus} {data.conteggio.bonus === 1 ? "esito" : "esiti"} · Start {formatCents(rates.start)}, Partnership {formatCents(rates.partnership)}, upgrade {formatCents(rates.upgrade)}</p>
        </div>
      </div>

      {data.purchases_to_verify.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Acquisti Start o Partnership senza attribuzione: li ha portati Mariangela?</p>
          <p className="mt-1 text-xs text-amber-700">Non entrano nel totale finché non li attribuisci.</p>
          <ul className="mt-3 divide-y divide-amber-200">
            {data.purchases_to_verify.map((p) => (
              <li key={`${p.email}-${p.tipo}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-800">{p.nome} <span className="text-slate-500">· {p.etichetta} · {dayLabel(p.data)} · varrebbe {formatCents(p.importo_cents)}</span></span>
                <button type="button" disabled={busy} onClick={() => attributeQuick(p)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-yellow-400 disabled:opacity-50">Attribuisci a Mariangela</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.to_verify.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> Call fatte senza attribuzione: spettano a Mariangela?</p>
          <p className="mt-1 text-xs text-amber-700">Non entrano nel totale finché non le attribuisci. Il link con <code>utm_source=mariangela</code> le attribuisce da solo.</p>
          <ul className="mt-3 divide-y divide-amber-200">
            {data.to_verify.map((l) => (
              <li key={l.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-800">{l.nome} <span className="text-slate-500">· {l.email} · {dayLabel(l.data)}</span></span>
                <button type="button" disabled={busy} onClick={() => attributeQuick(l)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-yellow-400 disabled:opacity-50">Attribuisci a Mariangela</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Lead da pagare" hint="call fatte in questo mese">
        {dp.lead.length === 0 ? <p className="p-5 text-sm text-slate-500">Nessuna call fatta in questo mese.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"><tr><th className={th}>Lead</th><th className={th}>Call fatta</th><th className={th}>Ingresso</th><th className={`${th} text-right`}>Gettone</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {dp.lead.map((e, i) => (
                  <tr key={`${e.email}-${i}`} {...rowClick(e.email)}>
                    <td className="px-5 py-3 text-slate-900">{e.nome}<span className="block text-xs text-slate-500">{e.email}</span></td>
                    <td className="px-5 py-3 text-slate-700">{dayLabel(e.data)}</td>
                    <td className="px-5 py-3 text-slate-500">{leadOrigin(e.lead_mese, month)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCents(e.importo_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Bonus da pagare" hint="Start, Partnership e upgrade incassati in questo mese">
        {dp.bonus.length === 0 ? <p className="p-5 text-sm text-slate-500">Nessun bonus maturato in questo mese.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"><tr><th className={th}>Lead</th><th className={th}>Bonus</th><th className={th}>Data</th><th className={th}>Ingresso</th><th className={`${th} text-right`}>Gettone</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {dp.bonus.map((e, i) => (
                  <tr key={`${e.email}-${e.tipo}-${i}`} {...rowClick(e.email)}>
                    <td className="px-5 py-3 text-slate-900">{e.nome}<span className="block text-xs text-slate-500">{e.email}</span></td>
                    <td className="px-5 py-3 text-slate-700">{e.etichetta}</td>
                    <td className="px-5 py-3 text-slate-500">{dayLabel(e.data)}</td>
                    <td className="px-5 py-3 text-slate-500">{leadOrigin(e.lead_mese, month)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCents(e.importo_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Lead del mese" hint="contati una volta sola, nel mese di ingresso"
        action={<button type="button" onClick={() => setDialog({ lead: null, isNew: true })} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-yellow-400"><Plus className="h-3.5 w-3.5" /> Aggiungi lead</button>}>
        {data.leads.length === 0 ? <p className="p-5 text-sm text-slate-500">Nessun lead entrato in questo mese. Usa «Aggiungi lead» per inserirne uno.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-400"><tr><th className={th}>Lead</th><th className={th}>Attribuzione</th><th className={`${th} text-right`}>Maturato in questo mese</th><th className="w-8" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.leads.map((l) => (
                  <tr key={l.email} className="cursor-pointer hover:bg-slate-50" onClick={() => setDialog({ lead: l, isNew: false })}>
                    <td className="px-5 py-3 text-slate-900">
                      <button type="button" className="text-left font-medium focus:outline-none focus-visible:underline" onClick={(e) => { e.stopPropagation(); setDialog({ lead: l, isNew: false }); }}>{l.nome}</button>
                      <span className="block text-xs text-slate-500">{l.email}</span>
                      {l.nota && <span className="block text-xs italic text-slate-400">{l.nota}</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{l.manuale ? "Manuale" : "Link"}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCents(l.pagato_nel_mese_cents)}</td>
                    <td className="pr-4 text-slate-300"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Regole in vigore dal {payByLabel(data.rates.valido_dal)}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Un lead è contato una sola volta, nel mese di ingresso. Call e bonus si pagano nel mese in cui maturano, anche se il lead è di un mese precedente.</li>
          <li>Il gettone sulla call vale solo per la call <strong>fatta</strong> (presentata). Una call solo fissata non dà nulla.</li>
          <li>Start {formatCents(rates.start)} · Partnership {formatCents(rates.partnership)} · Upgrade Start→Partnership {formatCents(rates.upgrade)} (Start + upgrade = Partnership piena).</li>
          <li>Si maturano solo su lead attribuiti a Mariangela e su incassi veri.</li>
        </ul>
        <p className="mt-3 text-xs text-amber-700">Fonte: {data.rates.fonte} Verifica l&apos;Allegato firmato prima di pagare.</p>
      </div>

      {dialog && (
        <LeadDialog lead={dialog.lead} isNew={dialog.isNew} events={data.events} viewedMonth={month} busy={busy} onClose={closeDialog}
          onSave={(form) => save(form)} onRemove={() => remove(dialog.lead.email)} />
      )}
    </section>
  );
}

export default GettoniMariangela;
