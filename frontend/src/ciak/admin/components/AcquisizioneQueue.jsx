/**
 * Ciak Admin — Coda Acquisizione (outbound) + inserimento manuale lead.
 *
 * Fonte: i discovery lead (GET /api/discovery/leads), la pipeline OUTBOUND dove
 * entrano anche i lead inseriti a mano da Mariangela/Claudio (es. trattative).
 * Riusa la tabella <DepartmentQueue>. Nulla di inventato:
 *  - Passaggio ← stato del lead (mappa leggibile).
 *  - Prossima azione ← derivata dallo stato (nessun campo persistito).
 *  - Responsabile ← campo reale `owner` (— se assente).
 *  - Scadenza ← campo reale `next_followup` (— se assente).
 *  - Blocco ← "In ritardo" se il follow-up è scaduto o nessun contatto da 21+ gg.
 */
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { adminFetch } from "../api";
import { DepartmentQueue } from "./DepartmentQueue";

const STATUS_LABEL = {
  discovered: "Scoperto",
  pending: "Da lavorare",
  analyzing: "In analisi",
  scored: "Valutato",
  message_ready: "Messaggio pronto",
  message_sent: "Messaggio inviato",
  contacted: "Contattato",
  interested: "Interessato",
  not_interested: "Non interessato",
};

// Prossima azione DERIVATA dallo stato (non esiste un campo persistito).
const STATUS_ACTION = {
  discovered: "Analizza e valuta",
  pending: "Analizza e valuta",
  analyzing: "Completa l'analisi",
  scored: "Prepara il messaggio",
  message_ready: "Invia il messaggio",
  message_sent: "Attendi risposta / richiama",
  contacted: "Richiama o fai avanzare",
  interested: "Porta a call / Blueprint",
  not_interested: "Archivia",
};

const OWNERS = ["Mariangela", "Claudio"];

// Campo a livello di modulo: identità stabile → l'input NON perde il focus a ogni
// tasto (definirlo dentro il form lo rimonterebbe a ogni render).
function LeadField({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-900"
      />
    </label>
  );
}

function scadLabel(raw) {
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

function daysSince(iso) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

function toItem(l) {
  const status = l.status || "pending";
  const today = new Date().toISOString().slice(0, 10);
  const overdue = l.next_followup && String(l.next_followup).slice(0, 10) < today;
  return {
    id: l.id,
    name: l.display_name || l.email || "—",
    passaggio: STATUS_LABEL[status] || status,
    next_action: STATUS_ACTION[status] || null,
    owner: l.owner || null,
    scadenza: scadLabel(l.next_followup),
    blocked: false,
    stale: Boolean(overdue) || daysSince(l.updated_at) > 21,
    incoerenza: false,
  };
}

function NuovoLead({ onCreated, onCancel, onAuthExpired }) {
  const [f, setF] = useState({
    display_name: "", email: "", business_phone: "", niche_detected: "",
    owner: "Mariangela", next_followup: "", status: "contacted", notes_admin: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.display_name.trim() && !f.email.trim()) {
      setError("Serve almeno nome o email.");
      return;
    }
    setSaving(true);
    setError(null);
    const key = (f.email || f.display_name).trim().toLowerCase().replace(/\s+/g, "-");
    const body = {
      source: "manual",
      platform_username: key,
      platform_url: "",
      display_name: f.display_name.trim() || f.email.trim(),
      email: f.email.trim() || null,
      business_phone: f.business_phone.trim() || null,
      niche_detected: f.niche_detected.trim() || null,
      owner: f.owner,
      next_followup: f.next_followup || null,
      status: f.status,
      notes_admin: f.notes_admin.trim() || null,
    };
    try {
      const res = await adminFetch("/api/discovery/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t.includes("gi") ? "Lead già presente." : "Errore nel salvataggio.");
      }
      onCreated();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4" data-testid="nuovo-lead-form">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Nuovo lead</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LeadField label="Nome" value={f.display_name} onChange={set("display_name")} />
        <LeadField label="Email" value={f.email} onChange={set("email")} type="email" />
        <LeadField label="Telefono" value={f.business_phone} onChange={set("business_phone")} />
        <LeadField label="Nicchia" value={f.niche_detected} onChange={set("niche_detected")} />
        <label className="block">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Responsabile</span>
          <select value={f.owner} onChange={set("owner")} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-900">
            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <LeadField label="Prossimo follow-up" value={f.next_followup} onChange={set("next_followup")} type="date" />
      </div>
      <label className="block mt-3">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Note</span>
        <textarea value={f.notes_admin} onChange={set("notes_admin")} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-slate-900 resize-y" />
      </label>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50"
          data-testid="salva-lead"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : null}
          {saving ? "Salvataggio…" : "Salva lead"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          Annulla
        </button>
      </div>
    </div>
  );
}

export function AcquisizioneQueue({ onAuthExpired }) {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    adminFetch("/api/discovery/leads?limit=200")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Errore nel caricamento"))))
      .then((d) => setLeads(d.leads || []))
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const items = (leads || []).map(toItem);

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-xl font-semibold text-slate-900">Coda del reparto</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800"
          data-testid="toggle-nuovo-lead"
        >
          <Plus className="w-4 h-4" aria-hidden /> Nuovo lead
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-3">Lead outbound e trattative: a che punto sono, chi ci lavora, cosa manca.</p>

      {showForm && (
        <NuovoLead
          onCreated={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
          onAuthExpired={onAuthExpired}
        />
      )}

      {error ? (
        <p className="text-sm text-slate-500">Coda non disponibile: {error}</p>
      ) : leads === null ? (
        <p className="text-sm text-slate-400">Caricamento coda…</p>
      ) : (
        <DepartmentQueue items={items} firstColLabel="Lead" />
      )}
    </div>
  );
}
