/**
 * Ciak Admin — Lead Manager.
 * Gestione Discovery Leads (New Lead). La Lista Fredda ha la sua pagina dedicata
 * (/admin/lista-fredda): qui NON è più possibile switchare alla Lista Fredda.
 * Import CSV / form manuale, edit inline, filtri, ricerca Google Places.
 */

import { useState, useEffect, useRef } from "react";
import {
  Users, Search, RefreshCw, Plus, Upload, Edit3, Trash2,
  X, Save, Loader2, Globe, Phone, Snowflake, TrendingUp,
  Flame, ExternalLink, UserPlus, MapPin,
} from "lucide-react";
import { adminFetch } from "../api";

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────

const DISCOVERY_STATUSES = {
  discovered:     { label: "Scoperto",      cls: "bg-blue-100 text-blue-600" },
  analyzing:      { label: "In analisi",    cls: "bg-purple-100 text-purple-600" },
  scored:         { label: "Scorato",       cls: "bg-yellow-100 text-yellow-700" },
  message_ready:  { label: "Msg pronto",    cls: "bg-yellow-100 text-yellow-600" },
  message_sent:   { label: "Msg inviato",   cls: "bg-emerald-100 text-emerald-600" },
  contacted:      { label: "Contattato",    cls: "bg-emerald-100 text-emerald-600" },
  interested:     { label: "Interessato",   cls: "bg-red-100 text-red-500" },
  not_interested: { label: "Non interes.",  cls: "bg-gray-100 text-slate-500" },
  pending:        { label: "In attesa",     cls: "bg-gray-100 text-slate-500" },
};

const SOURCES = {
  instagram:     { label: "Instagram",      cls: "bg-pink-100 text-pink-600" },
  linkedin:      { label: "LinkedIn",       cls: "bg-blue-100 text-blue-700" },
  youtube:       { label: "YouTube",        cls: "bg-red-100 text-red-600" },
  google:        { label: "Google",         cls: "bg-blue-100 text-blue-500" },
  google_places: { label: "Google Places",  cls: "bg-emerald-100 text-emerald-600" },
  facebook:      { label: "Facebook",       cls: "bg-blue-100 text-blue-600" },
  manual:        { label: "Manuale",        cls: "bg-gray-100 text-slate-500" },
};

// Categorie professionisti offline (speculare a backend PROFESSION_GROUPS)
const PROFESSION_GROUPS = [
  { key: "consulenza_fiscale",    label: "Commercialisti / Consulenti Fiscali" },
  { key: "consulenza_legale",     label: "Avvocati / Studi Legali" },
  { key: "consulenza_lavoro",     label: "Consulenti del Lavoro" },
  { key: "professioni_sanitarie", label: "Fisioterapisti / Osteopati / Nutrizionisti" },
  { key: "professioni_tecniche",  label: "Geometri / Architetti" },
  { key: "coaching_formazione",   label: "Coach / Formatori Aziendali" },
  { key: "assicurazioni",         label: "Agenti / Broker Assicurativi" },
  { key: "immobiliare",           label: "Agenti Immobiliari Indipendenti" },
];

const ITALIAN_CITIES = [
  "Milano","Roma","Torino","Napoli","Bologna","Firenze",
  "Venezia","Genova","Palermo","Bari","Catania","Verona",
  "Brescia","Padova","Trieste","Parma","Modena","Reggio Calabria",
  "Salerno","Livorno","Cagliari","Foggia","Messina","Taranto",
];

const TEMPERATURE = {
  caldo:   { label: "Caldo",   cls: "bg-red-100 text-red-500" },
  tiepido: { label: "Tiepido", cls: "bg-yellow-100 text-yellow-600" },
  freddo:  { label: "Freddo",  cls: "bg-blue-100 text-blue-500" },
};

const FREDDA_STATI = {
  nuovo:        { label: "Nuovo",        cls: "bg-blue-100 text-blue-500" },
  in_sequenza:  { label: "In sequenza",  cls: "bg-yellow-100 text-yellow-600" },
  caldo:        { label: "Caldo 🔥",     cls: "bg-red-100 text-red-500" },
  in_funnel:    { label: "In funnel",    cls: "bg-emerald-100 text-emerald-600" },
  convertito:   { label: "Convertito",   cls: "bg-emerald-100 text-emerald-700" },
  disiscritto:  { label: "Disiscritto",  cls: "bg-gray-100 text-slate-500" },
  non_risponde: { label: "Non risponde", cls: "bg-gray-100 text-slate-500" },
};

// ─────────────────────────────────────────────────────────────
// BADGE HELPERS
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status, map }) {
  const cfg = map[status] || { label: status || "—", cls: "bg-gray-100 text-slate-500" };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }) {
  const cls =
    score >= 80 ? "bg-emerald-100 text-emerald-600"
    : score >= 50 ? "bg-yellow-100 text-yellow-600"
    : "bg-gray-100 text-slate-500";
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${cls}`}>
      {score || 0}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT MODAL — DISCOVERY LEAD
// ─────────────────────────────────────────────────────────────

function DiscoveryEditModal({ lead, onClose, onSaved, onAuthExpired }) {
  const isPlaces = lead.source === "google_places";
  const [form, setForm] = useState({
    display_name: lead.display_name || "",
    email: lead.email || "",
    bio: lead.bio || "",
    website_url: lead.website_url || "",
    platform_url: lead.platform_url || "",
    platform_username: lead.platform_username || "",
    phone: lead.phone || lead.business_phone || "",
    niche_detected: lead.niche_detected || "",
    source: lead.source || "manual",
    status: lead.status || "discovered",
    score_total: lead.score_total || 0,
    temperatura: lead.temperatura || "",
    notes_admin: lead.notes_admin || "",
    business_phone: lead.business_phone || "",
    business_address: lead.business_address || "",
    profession_category: lead.profession_category || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/discovery/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      onSaved({ ...lead, ...form });
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, k, multiline, type = "text", options }) => (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900">
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : multiline ? (
        <textarea value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          rows={3} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900 resize-y" />
      ) : (
        <input type={type} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 bg-slate-900">
          <div>
            <div className="font-semibold text-white">{lead.display_name || lead.platform_username}</div>
            <div className="text-xs text-white/50">{lead.source} · {lead.id}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isPlaces && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Google Attività · {lead.google_rating ? `★ ${lead.google_rating}` : ""} · {lead.google_review_count || 0} recensioni · {lead.has_website ? "ha sito" : "no sito web ✓"}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <F label="Nome" k="display_name" />
            <F label="Email" k="email" type="email" />
            {isPlaces ? (
              <>
                <F label="Telefono (Google)" k="business_phone" />
                <F label="Categoria professionale" k="profession_category" />
                <div className="col-span-2">
                  <F label="Indirizzo" k="business_address" />
                </div>
              </>
            ) : (
              <>
                <F label="Username piattaforma" k="platform_username" />
                <F label="Telefono" k="phone" />
                <F label="Sito web" k="website_url" />
                <F label="URL profilo" k="platform_url" />
              </>
            )}
            <F label="Nicchia rilevata" k="niche_detected" />
            <F label="Score (0-100)" k="score_total" type="number" />
            <F label="Fonte" k="source" options={Object.entries(SOURCES).map(([v, c]) => ({ value: v, label: c.label }))} />
            <F label="Stato" k="status" options={Object.entries(DISCOVERY_STATUSES).map(([v, c]) => ({ value: v, label: c.label }))} />
            <F label="Temperatura ELENA" k="temperatura" options={[
              { value: "", label: "— non classificato —" },
              ...Object.entries(TEMPERATURE).map(([v, c]) => ({ value: v, label: c.label })),
            ]} />
          </div>
          {!isPlaces && <F label="Bio / Descrizione" k="bio" multiline />}
          <F label="Note admin (interne)" k="notes_admin" multiline />
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {error ? <span className="text-sm text-red-600">{error}</span> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-gray-100">Annulla</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT MODAL — LISTA FREDDA
// ─────────────────────────────────────────────────────────────

function FreddaEditModal({ lead, onClose, onSaved, onAuthExpired }) {
  const [form, setForm] = useState({
    first_name: lead.first_name || "",
    last_name: lead.last_name || "",
    email: lead.email || "",
    phone: lead.phone || "",
    tag: lead.tag || "lista-fredda-2025",
    stato: lead.stato || "in_sequenza",
    risposta_ricevuta: lead.risposta_ricevuta || false,
    entrato_in_funnel: lead.entrato_in_funnel || false,
    note_admin: lead.note_admin || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const encodedEmail = encodeURIComponent(lead.email);
      const res = await adminFetch(`/api/lista-fredda/leads/${encodedEmail}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      onSaved({ ...lead, ...form });
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 bg-slate-900">
          <div>
            <div className="font-semibold text-white">{lead.first_name} {lead.last_name}</div>
            <div className="text-xs text-white/50">{lead.email}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[["Nome", "first_name"], ["Cognome", "last_name"], ["Email", "email"], ["Telefono", "phone"], ["Tag", "tag"]].map(([label, k]) => (
              <div key={k}>
                <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">{label}</label>
                <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Stato</label>
              <select value={form.stato} onChange={e => setForm(p => ({ ...p, stato: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200">
                {Object.entries(FREDDA_STATI).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Risposta ricevuta", "risposta_ricevuta"], ["Entrato in funnel", "entrato_in_funnel"]].map(([label, k]) => (
              <div key={k} className={`flex items-center justify-between p-3 rounded-xl border ${form[k] ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                <span className="text-sm text-slate-900">{label}</span>
                <button onClick={() => setForm(p => ({ ...p, [k]: !p[k] }))}
                  className={`w-10 h-5 rounded-full relative transition-colors ${form[k] ? "bg-emerald-500" : "bg-gray-300"}`}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                    style={{ left: form[k] ? "22px" : "2px" }} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Note admin</label>
            <textarea value={form.note_admin} onChange={e => setForm(p => ({ ...p, note_admin: e.target.value }))}
              rows={3} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900 resize-y" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {error ? <span className="text-sm text-red-600">{error}</span> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-gray-100">Annulla</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-400 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// IMPORT MODAL — Discovery (CSV + manuale)
// ─────────────────────────────────────────────────────────────

function ImportModal({ type, onClose, onImported, onAuthExpired }) {
  const [tab, setTab] = useState("csv");
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const emptyForm = type === "discovery"
    ? { display_name: "", email: "", source: "manual", platform_username: "", bio: "", website_url: "", niche_detected: "", phone: "" }
    : { first_name: "", last_name: "", email: "", phone: "", tag: "lista-fredda-2025" };
  const [form, setForm] = useState(emptyForm);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState(null);

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", csvFile);
    try {
      const url = type === "discovery"
        ? "/api/discovery/import-csv"
        : "/api/lista-fredda/import";
      const res = await adminFetch(url, { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0 || data.success) onImported();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setResult({ error: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleManualSave = async () => {
    setManualSaving(true);
    setManualError(null);
    try {
      let url, body;
      if (type === "discovery") {
        url = "/api/discovery/import";
        body = { leads: [{ ...form, source: form.source }], auto_score: false };
      } else {
        url = "/api/lista-fredda/leads";
        body = form;
      }
      const res = await adminFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore");
      setForm(emptyForm);
      onImported();
      setResult({ imported: 1, skipped: 0 });
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setManualError(e.message);
    } finally {
      setManualSaving(false);
    }
  };

  const csvTemplate = type === "discovery"
    ? "display_name,email,source,platform_username,bio,website_url,niche_detected\nMario Rossi,mario@rossi.it,instagram,mariorossi,Coach business,https://mariorossi.it,Business Coaching"
    : "email,first_name,last_name,phone,tag,date_registered\nmario@rossi.it,Mario,Rossi,+393331234567,lista-fredda-2025,2025-01-01";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 bg-slate-900">
          <div>
            <div className="font-semibold text-white">Importa Lead</div>
            <div className="text-xs text-white/50">
              {type === "discovery" ? "Discovery Leads" : "Lista Fredda"}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          {[["csv", "CSV Upload"], ["manual", "Inserimento manuale"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === id ? "border-yellow-400 text-slate-900 bg-white" : "border-transparent text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "csv" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl text-xs bg-gray-100">
                <strong>Formato CSV atteso:</strong>
                <pre className="mt-1 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap text-slate-500">
                  {csvTemplate}
                </pre>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-gray-50 ${csvFile ? "border-emerald-500" : "border-gray-200"}`}>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${csvFile ? "text-emerald-500" : "text-slate-400"}`} />
                <p className="text-sm font-medium text-slate-900">
                  {csvFile ? csvFile.name : "Clicca o trascina il file CSV"}
                </p>
                <p className="text-xs mt-1 text-slate-400">Solo file .csv</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => setCsvFile(e.target.files[0])} />
              </div>
              {result && (
                <div className={`p-3 rounded-xl text-sm ${result.error ? "bg-red-50" : "bg-emerald-50"}`}>
                  {result.error
                    ? <span className="text-red-600">Errore: {result.error}</span>
                    : <span className="text-emerald-700">✓ Importati: {result.imported || result.success} · Saltati: {result.skipped || 0}</span>}
                </div>
              )}
              <button onClick={handleCsvUpload} disabled={!csvFile || uploading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${csvFile && !uploading ? "bg-slate-900 text-yellow-400" : "bg-gray-100 text-slate-400"}`}>
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {uploading ? "Importazione..." : "Importa CSV"}
              </button>
            </div>
          )}

          {tab === "manual" && (
            <div className="space-y-3">
              {type === "discovery" ? (
                <div className="grid grid-cols-2 gap-3">
                  {[["Nome completo", "display_name"], ["Email", "email"], ["Username", "platform_username"], ["Telefono", "phone"], ["Sito web", "website_url"], ["Nicchia", "niche_detected"]].map(([label, k]) => (
                    <div key={k}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">{label}</label>
                      <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900" />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Fonte</label>
                    <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200">
                      {Object.entries(SOURCES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Bio / Note</label>
                    <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900 resize-y" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[["Nome", "first_name"], ["Cognome", "last_name"], ["Email", "email"], ["Telefono", "phone"], ["Tag", "tag"]].map(([label, k]) => (
                    <div key={k}>
                      <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">{label}</label>
                      <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 text-slate-900" />
                    </div>
                  ))}
                </div>
              )}
              {manualError && <p className="text-sm text-red-600">{manualError}</p>}
              <button onClick={handleManualSave} disabled={manualSaving || !form.email}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm ${!form.email || manualSaving ? "bg-gray-100 text-slate-400" : "bg-slate-900 text-yellow-400"}`}>
                {manualSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                Aggiungi lead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GOOGLE PLACES SEARCH MODAL
// ─────────────────────────────────────────────────────────────

function PlacesSearchModal({ onClose, onImported, onAuthExpired }) {
  const [form, setForm] = useState({
    profession_group: "consulenza_fiscale",
    custom_profession: "",
    use_group: true,
    city: "Milano",
    max_results: 20,
    only_without_website: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body = {
        profession: form.use_group ? form.profession_group : form.custom_profession,
        city: form.city,
        max_results: Number(form.max_results),
        only_without_website: form.only_without_website,
        use_group: form.use_group,
      };
      const res = await adminFetch("/api/discovery/search-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore ricerca");
      setResult(data);
      if (data.new_leads > 0) onImported();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 bg-emerald-600">
          <div>
            <div className="font-semibold text-white text-base">Cerca su Google Attività</div>
            <div className="text-xs text-white/60">Liberi professionisti offline · P.IVA · Passaparola</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setForm(p => ({ ...p, use_group: v }))}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${form.use_group === v ? "bg-emerald-600 text-white border-emerald-600" : "bg-transparent text-slate-600 border-gray-200"}`}>
                {v ? "Categoria predefinita" : "Testo libero"}
              </button>
            ))}
          </div>

          {form.use_group ? (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Categoria professionale</label>
              <select value={form.profession_group} onChange={e => setForm(p => ({ ...p, profession_group: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200">
                {PROFESSION_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Professione (testo libero)</label>
              <input type="text" value={form.custom_profession} onChange={e => setForm(p => ({ ...p, custom_profession: e.target.value }))}
                placeholder="es. commercialista, fisioterapista..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Città</label>
              <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200">
                {ITALIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide mb-1 text-slate-400">Max risultati</label>
              <select value={form.max_results} onChange={e => setForm(p => ({ ...p, max_results: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border border-gray-200">
                {[10, 20, 40, 60].map(n => <option key={n} value={n}>{n} professionisti</option>)}
              </select>
            </div>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl border ${form.only_without_website ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
            <div>
              <div className="text-sm font-semibold text-slate-900">Solo senza sito web</div>
              <div className="text-[11px] text-slate-400">Filtra solo chi non ha un sito → segnale offline forte</div>
            </div>
            <button onClick={() => setForm(p => ({ ...p, only_without_website: !p.only_without_website }))}
              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${form.only_without_website ? "bg-emerald-600" : "bg-gray-300"}`}>
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                style={{ left: form.only_without_website ? "22px" : "2px" }} />
            </button>
          </div>

          <div className="p-3 rounded-xl text-xs bg-gray-100">
            <strong>Costo API stimato:</strong> ~€0,37 per 20 risultati (Text Search + Place Details).<br/>
            Richiede <code>GOOGLE_PLACES_API_KEY</code> nelle variabili d'ambiente.
          </div>

          {result && (
            <div className="p-3 rounded-xl text-sm bg-emerald-50 border border-emerald-200">
              <div className="font-semibold text-emerald-700">
                ✓ {result.new_leads} nuovi lead · {result.hot_leads} HOT (score ≥75)
              </div>
              {result.duplicates_skipped > 0 && (
                <div className="text-xs mt-1 text-slate-400">{result.duplicates_skipped} già presenti, saltati</div>
              )}
              {result.errors?.length > 0 && (
                <div className="text-xs mt-1 text-red-500">Errori: {result.errors.join(", ")}</div>
              )}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl text-sm bg-red-50">
              <span className="text-red-600">Errore: {error}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={run} disabled={loading || (form.use_group ? false : !form.custom_profession)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${loading ? "bg-gray-200 text-slate-400" : "bg-emerald-600 text-white"}`}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? "Ricerca in corso..." : "Avvia ricerca su Google Attività"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

const PER_PAGE = 50;

export function LeadManager({ onAuthExpired }) {
  // Solo Discovery Leads: lo switch alla Lista Fredda è stato rimosso
  // (la Lista Fredda ha la sua pagina dedicata /admin/lista-fredda).
  const activeTab = "discovery";
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterScore, setFilterScore] = useState(0);
  const [page, setPage] = useState(0);
  const [editLead, setEditLead] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PER_PAGE, skip: page * PER_PAGE });
      if (filterStatus) params.set("status", filterStatus);
      if (filterSource) params.set("source", filterSource);
      if (filterScore > 0) params.set("min_score", filterScore);
      const res = await adminFetch(`/api/discovery/leads?${params}`);
      const data = await res.json();
      let items = data.leads || [];
      if (search) {
        const q = search.toLowerCase();
        items = items.filter(l =>
          (l.display_name || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q) ||
          (l.platform_username || "").toLowerCase().includes(q) ||
          (l.niche_detected || "").toLowerCase().includes(q)
        );
      }
      setLeads(items);
      setTotal(data.total || 0);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterStatus, filterSource, filterScore, page]);

  const handleDelete = async (lead) => {
    if (!window.confirm(`Eliminare "${lead.display_name || lead.email}"?`)) return;
    const id = lead.id || encodeURIComponent(lead.email);
    const url = `/api/discovery/leads/${id}`;
    setDeletingId(id);
    try {
      await adminFetch(url, { method: "DELETE" });
      setLeads(prev => prev.filter(l => (l.id || l.email) !== (lead.id || lead.email)));
      setTotal(t => t - 1);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (updated) => {
    setLeads(prev => prev.map(l => (l.id || l.email) === (updated.id || updated.email) ? updated : l));
    setEditLead(null);
  };

  const isDiscovery = true;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Lead Manager</h1>
      <p className="text-slate-500 mb-6">Discovery Leads — import, edit, filtri.</p>

      {/* Header / toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-slate-900 shadow-sm">
            <Users className="w-4 h-4" />
            Discovery Lead
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-600">
              {total}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200">
          <Search className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Cerca per nome, email, nicchia..."
            className="flex-1 text-sm bg-transparent outline-none text-slate-900" />
        </div>

        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white">
          <option value="">Tutti gli stati</option>
          {Object.entries(DISCOVERY_STATUSES).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white">
          <option value="">Tutte le fonti</option>
          {Object.entries(SOURCES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
        <select value={filterScore} onChange={e => { setFilterScore(Number(e.target.value)); setPage(0); }}
          className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white">
          <option value={0}>Tutti gli score</option>
          <option value={80}>Hot (≥80)</option>
          <option value={50}>Warm (≥50)</option>
        </select>

        <button onClick={load} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button onClick={() => setShowPlacesSearch(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white">
          <MapPin className="w-4 h-4" />
          Google Attività
        </button>

        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-yellow-400">
          <Plus className="w-4 h-4" />
          Importa
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Users className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-slate-400">Nessun lead trovato</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                {["Nome", "Email / Username", "Fonte", "Nicchia", "Score", "Stato", "Temp.", ""].map(h => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id || i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{lead.display_name || "—"}</div>
                    {lead.source === "google_places" ? (
                      <div className="text-[11px] mt-0.5 text-slate-400">
                        {lead.business_address?.split(",").slice(0, 2).join(",")}
                      </div>
                    ) : lead.website_url ? (
                      <a href={lead.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-1 text-slate-400">
                        <Globe className="w-3 h-3" /> {lead.website_url.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {lead.source === "google_places" ? (
                      <div>
                        {lead.business_phone && (
                          <div className="text-xs flex items-center gap-1 text-slate-900">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {lead.business_phone}
                          </div>
                        )}
                        {lead.google_rating && (
                          <div className="text-[11px] text-slate-400">
                            ★ {lead.google_rating} ({lead.google_review_count || 0} rec.)
                            {!lead.has_website && <span className="ml-1 font-semibold text-emerald-600">· no sito</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs text-slate-600">{lead.email}</div>
                        {lead.platform_username && (
                          <div className="text-[11px] text-slate-400">@{lead.platform_username}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.source && <StatusBadge status={lead.source} map={SOURCES} />}
                  </td>
                  <td className="px-4 py-3 max-w-[150px]">
                    <span className="text-xs truncate block text-slate-600">{lead.niche_detected || "—"}</span>
                  </td>
                  <td className="px-4 py-3"><ScoreBadge score={lead.score_total} /></td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} map={DISCOVERY_STATUSES} />
                  </td>
                  <td className="px-4 py-3">
                    {lead.temperatura && <StatusBadge status={lead.temperatura} map={TEMPERATURE} />}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {lead.platform_url && (
                        <a href={lead.platform_url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-gray-100">
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                      )}
                      <button onClick={() => setEditLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors">
                        <Edit3 className="w-3.5 h-3.5 text-yellow-600" />
                      </button>
                      <button onClick={() => handleDelete(lead)} disabled={deletingId === lead.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        {deletingId === lead.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          : <Trash2 className="w-3.5 h-3.5 text-red-500" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>
            {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} di {total}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
              ← Precedente
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER_PAGE >= total}
              className="px-3 py-1.5 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50">
              Successiva →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {editLead && (
        <DiscoveryEditModal lead={editLead} onClose={() => setEditLead(null)} onSaved={handleSaved} onAuthExpired={onAuthExpired} />
      )}
      {showImport && (
        <ImportModal type="discovery"
          onClose={() => setShowImport(false)}
          onImported={() => { load(); }}
          onAuthExpired={onAuthExpired} />
      )}
      {showPlacesSearch && (
        <PlacesSearchModal
          onClose={() => setShowPlacesSearch(false)}
          onImported={() => { load(); }}
          onAuthExpired={onAuthExpired} />
      )}
    </div>
  );
}
