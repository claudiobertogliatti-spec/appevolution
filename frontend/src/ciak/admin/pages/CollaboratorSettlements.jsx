import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Download, Plus, X } from "lucide-react";
import { apiGet, apiMultipart, apiPost, downloadAdminFile } from "../api";

const STATUS = {
  draft: "Da chiudere",
  awaiting_invoice: "In attesa fattura",
  to_verify: "Da verificare",
  to_pay: "Da pagare",
  paid: "Pagata",
  cancelled: "Annullata",
};

export const settlementStatusLabel = (status) => STATUS[status] || status;
export const differenceNeedsNote = (invoice, calculated) => Math.abs(Number(invoice || 0) - Number(calculated || 0)) >= 0.005;

const euro = (value) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
      {children}
    </div>
  </div>;
}

const fieldClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

export function CollaboratorSettlements({ collaborator, onAuthExpired }) {
  const [data, setData] = useState({ summary: {}, settlements: [] });
  const [status, setStatus] = useState("");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await apiGet(`/collaboratori/${collaborator.id}/settlements`, { status }));
      setError("");
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); else setError(e.message);
    }
  }, [collaborator.id, onAuthExpired, status]);

  useEffect(() => { load(); }, [load]);

  const act = (kind, settlement) => { setSelected(settlement); setModal(kind); };
  const closeModal = () => { setModal(null); setSelected(null); };
  const submitJson = async (path, body) => {
    try { await apiPost(path, body); closeModal(); await load(); }
    catch (e) { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); else setError(e.message); }
  };
  const submitForm = async (path, form) => {
    try { await apiMultipart(path, new FormData(form)); closeModal(); await load(); }
    catch (e) { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); else setError(e.message); }
  };

  const base = `/collaboratori/${collaborator.id}/settlements`;
  const cards = [
    ["Maturato", data.summary.calculated], ["Fatturato", data.summary.invoiced],
    ["Da pagare", data.summary.to_pay], ["Pagato", data.summary.paid],
  ];

  return <div className="p-8 max-w-7xl">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Back office</p><h1 className="mt-1 text-3xl font-semibold text-slate-900">Fatture e pagamenti</h1><p className="mt-2 text-sm text-slate-500">Fatture passive di {collaborator.name}: controllo compensi, fatture ricevute e bonifici.</p></div>
      <button onClick={() => setModal("create")} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400"><Plus className="h-4 w-4" /> Nuovo periodo</button>
    </div>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-2 text-xl font-semibold">{euro(value)}</div></div>)}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Da verificare</div><div className="mt-2 text-xl font-semibold text-amber-900">{data.summary.anomalies || 0}</div></div>
    </div>
    <div className="mb-4"><select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass + " max-w-xs"}><option value="">Tutti gli stati</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Periodo</th><th className="p-4">Ore</th><th className="p-4">Calcolato</th><th className="p-4">Fattura</th><th className="p-4">Stato</th><th className="p-4">Azione</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{data.settlements.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">Nessuna liquidazione presente.</td></tr> : data.settlements.map((item) => <tr key={item.settlement_id}>
        <td className="p-4 font-medium">{item.period_start} → {item.period_end}</td><td className="p-4">{Math.round(item.approved_minutes / 60 * 10) / 10}h</td><td className="p-4">{euro(item.calculated_amount)}</td>
        <td className="p-4">{item.invoice ? <button className="inline-flex items-center gap-1 text-blue-700" onClick={() => downloadAdminFile(`${base}/${item.settlement_id}/files/invoice`, item.invoice.filename)}><Download className="h-4 w-4" />{euro(item.invoice.amount)}</button> : "—"}{differenceNeedsNote(item.invoice?.amount, item.calculated_amount) && <span className="ml-2 text-amber-600" title="Importi differenti"><AlertTriangle className="inline h-4 w-4" /></span>}</td>
        <td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{settlementStatusLabel(item.status)}</span></td>
        <td className="p-4">{item.status === "draft" && <button onClick={() => submitJson(`${base}/${item.settlement_id}/close`, {})} className="font-semibold text-blue-700">Chiudi periodo</button>}{item.status === "awaiting_invoice" && <button onClick={() => act("invoice", item)} className="font-semibold text-blue-700">Carica fattura</button>}{item.status === "to_verify" && <button onClick={() => act("verify", item)} className="font-semibold text-amber-700">Verifica</button>}{item.status === "to_pay" && <button onClick={() => act("payment", item)} className="font-semibold text-emerald-700">Registra bonifico</button>}{item.status === "paid" && <span className="text-emerald-700">Pagata il {item.payment?.paid_at}</span>}</td>
      </tr>)}</tbody></table></div>
    </div>

    {modal === "create" && <Modal title="Nuovo periodo" onClose={closeModal}><form onSubmit={(e) => { e.preventDefault(); const values = Object.fromEntries(new FormData(e.currentTarget)); submitJson(base, values); }} className="space-y-4"><label className="block text-sm">Dal<input required name="period_start" type="date" className={fieldClass} /></label><label className="block text-sm">Al<input required name="period_end" type="date" className={fieldClass} /></label><button className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-yellow-400">Crea periodo</button></form></Modal>}
    {modal === "invoice" && <Modal title="Carica fattura" onClose={closeModal}><form onSubmit={(e) => { e.preventDefault(); submitForm(`${base}/${selected.settlement_id}/invoice`, e.currentTarget); }} className="space-y-4"><label className="block text-sm">Fattura PDF<input required name="file" type="file" accept="application/pdf" className={fieldClass} /></label><label className="block text-sm">Numero fattura<input required name="invoice_number" className={fieldClass} /></label><label className="block text-sm">Data fattura<input required name="invoice_date" type="date" defaultValue={today()} className={fieldClass} /></label><label className="block text-sm">Importo<input required name="amount" type="number" min="0.01" step="0.01" className={fieldClass} /></label><label className="block text-sm">Scadenza<input name="due_date" type="date" className={fieldClass} /></label><button className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-yellow-400">Salva fattura</button></form></Modal>}
    {modal === "verify" && <Modal title="Verifica importi" onClose={closeModal}><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><small>Calcolato</small><strong className="block">{euro(selected.calculated_amount)}</strong></div><div className="rounded-lg bg-slate-50 p-3"><small>Fatturato</small><strong className="block">{euro(selected.invoice?.amount)}</strong></div></div><form onSubmit={(e) => { e.preventDefault(); submitJson(`${base}/${selected.settlement_id}/verify`, Object.fromEntries(new FormData(e.currentTarget))); }} className="space-y-4"><label className="block text-sm">Motivo della differenza<textarea required={differenceNeedsNote(selected.invoice?.amount, selected.calculated_amount)} name="difference_note" className={fieldClass} /></label><button className="w-full rounded-lg bg-slate-900 py-2 font-semibold text-yellow-400">Conferma verifica</button></form></Modal>}
    {modal === "payment" && <Modal title="Registra bonifico" onClose={closeModal}><form onSubmit={(e) => { e.preventDefault(); submitForm(`${base}/${selected.settlement_id}/payment`, e.currentTarget); }} className="space-y-4"><label className="block text-sm">Data pagamento<input required name="paid_at" type="date" defaultValue={today()} className={fieldClass} /></label><label className="block text-sm">Importo pagato<input required name="amount" type="number" min="0.01" step="0.01" defaultValue={selected.invoice?.amount} className={fieldClass} /></label><label className="block text-sm">CRO/TRN<input name="reference" className={fieldClass} /></label><label className="block text-sm">Distinta (facoltativa)<input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg" className={fieldClass} /></label><label className="block text-sm">Nota<textarea name="note" className={fieldClass} /></label><button className="w-full rounded-lg bg-emerald-700 py-2 font-semibold text-white">Segna come pagata</button></form></Modal>}
  </div>;
}

export default CollaboratorSettlements;
