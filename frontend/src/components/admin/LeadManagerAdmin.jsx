/**
 * LeadManagerAdmin
 * Gestione unificata: Discovery Leads (trovati dal sistema) + Lista Fredda
 * - Import CSV / form manuale
 * - Edit inline per lead
 * - Filtri per stato, fonte, score
 */

import { useState, useEffect, useRef } from "react";
import {
  Users, Search, RefreshCw, Plus, Upload, Edit3, Trash2,
  X, Save, Loader2, CheckCircle, AlertCircle, ChevronDown,
  Instagram, Linkedin, Youtube, Globe, Mail, Phone, Target,
  Flame, Snowflake, TrendingUp, Filter, Download, Copy, Check,
  ExternalLink, UserPlus, MapPin
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it"))
  ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ─────────────────────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────────────────────

const DISCOVERY_STATUSES = {
  discovered:    { label: "Scoperto",      color: "#3B82F6" },
  analyzing:     { label: "In analisi",    color: "#8B5CF6" },
  scored:        { label: "Scorato",       color: "#F59E0B" },
  message_ready: { label: "Msg pronto",   color: "#F2C418" },
  message_sent:  { label: "Msg inviato",  color: "#22C55E" },
  contacted:     { label: "Contattato",   color: "#10B981" },
  interested:    { label: "Interessato",  color: "#EF4444" },
  not_interested:{ label: "Non interes.", color: "#9CA3AF" },
  pending:       { label: "In attesa",    color: "#6B7280" },
};

const SOURCES = {
  instagram:     { label: "Instagram",      color: "#E1306C" },
  linkedin:      { label: "LinkedIn",       color: "#0A66C2" },
  youtube:       { label: "YouTube",        color: "#FF0000" },
  google:        { label: "Google",         color: "#4285F4" },
  google_places: { label: "Google Places",  color: "#0F9D58" },
  facebook:      { label: "Facebook",       color: "#1877F2" },
  manual:        { label: "Manuale",        color: "#6B7280" },
};

// Categorie professionisti offline (speculare a backend PROFESSION_GROUPS)
const PROFESSION_GROUPS = [
  { key: "consulenza_fiscale",   label: "Commercialisti / Consulenti Fiscali" },
  { key: "consulenza_legale",    label: "Avvocati / Studi Legali" },
  { key: "consulenza_lavoro",    label: "Consulenti del Lavoro" },
  { key: "professioni_sanitarie",label: "Fisioterapisti / Osteopati / Nutrizionisti" },
  { key: "professioni_tecniche", label: "Geometri / Architetti" },
  { key: "coaching_formazione",  label: "Coach / Formatori Aziendali" },
  { key: "assicurazioni",        label: "Agenti / Broker Assicurativi" },
  { key: "immobiliare",          label: "Agenti Immobiliari Indipendenti" },
];

const ITALIAN_CITIES = [
  "Milano","Roma","Torino","Napoli","Bologna","Firenze",
  "Venezia","Genova","Palermo","Bari","Catania","Verona",
  "Brescia","Padova","Trieste","Parma","Modena","Reggio Calabria",
  "Salerno","Livorno","Cagliari","Foggia","Messina","Taranto",
];

const TEMPERATURE = {
  caldo:   { label: "Caldo",   color: "#EF4444", icon: Flame },
  tiepido: { label: "Tiepido", color: "#F59E0B", icon: TrendingUp },
  freddo:  { label: "Freddo",  color: "#3B82F6", icon: Snowflake },
};

const FREDDA_STATI = {
  nuovo:       { label: "Nuovo",       color: "#3B82F6" },
  in_sequenza: { label: "In sequenza", color: "#F59E0B" },
  caldo:       { label: "Caldo 🔥",   color: "#EF4444" },
  in_funnel:   { label: "In funnel",  color: "#22C55E" },
  convertito:  { label: "Convertito", color: "#16A34A" },
  disiscritto: { label: "Disiscritto",color: "#9CA3AF" },
  non_risponde:{ label: "Non risponde",color: "#6B7280" },
};

// ─────────────────────────────────────────────────────────────
// BADGE HELPERS
// ─────────────────────────────────────────────────────────────

function StatusBadge({ status, map }) {
  const cfg = map[status] || { label: status || "—", color: "#9CA3AF" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.color + "20", color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#9CA3AF";
  return (
    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg"
      style={{ background: color + "20", color }}>
      {score || 0}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT MODAL — DISCOVERY LEAD
// ─────────────────────────────────────────────────────────────

function DiscoveryEditModal({ lead, onClose, onSaved }) {
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
    // Google Places specific
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
      const res = await fetch(`${API}/api/discovery/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      onSaved({ ...lead, ...form });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, k, multiline, type = "text", options }) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD", color: "#1E2128" }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : multiline ? (
        <textarea value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          rows={3} className="w-full px-3 py-2 rounded-lg text-sm border resize-y"
          style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
      ) : (
        <input type={type} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm border"
          style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ background: "#1E2128" }}>
          <div>
            <div className="font-black text-white">{lead.display_name || lead.platform_username}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{lead.source} · {lead.id}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isPlaces && (
            <div className="p-3 rounded-xl text-xs font-semibold" style={{ background: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}>
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
              ...Object.entries(TEMPERATURE).map(([v, c]) => ({ value: v, label: c.label }))
            ]} />
          </div>
          {!isPlaces && <F label="Bio / Descrizione" k="bio" multiline />}
          <F label="Note admin (interne)" k="notes_admin" multiline />
        </div>
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: "#F0EDE8", background: "#FAFAF7" }}>
          {error ? <span className="text-sm text-red-600">{error}</span> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Annulla</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#F2C418", color: "#1E2128" }}>
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

function FreddaEditModal({ lead, onClose, onSaved }) {
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
      const res = await fetch(`${API}/api/lista-fredda/leads/${encodedEmail}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      onSaved({ ...lead, ...form });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ background: "#1E2128" }}>
          <div>
            <div className="font-black text-white">{lead.first_name} {lead.last_name}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{lead.email}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[["Nome", "first_name"], ["Cognome", "last_name"], ["Email", "email"], ["Telefono", "phone"], ["Tag", "tag"]].map(([label, k]) => (
              <div key={k}>
                <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>{label}</label>
                <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Stato</label>
              <select value={form.stato} onChange={e => setForm(p => ({ ...p, stato: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD" }}>
                {Object.entries(FREDDA_STATI).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[["Risposta ricevuta", "risposta_ricevuta"], ["Entrato in funnel", "entrato_in_funnel"]].map(([label, k]) => (
              <div key={k} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: form[k] ? "#F0FDF4" : "#FAFAF7", border: `1px solid ${form[k] ? "#BBF7D0" : "#F0EDE8"}` }}>
                <span className="text-sm" style={{ color: "#1E2128" }}>{label}</span>
                <button onClick={() => setForm(p => ({ ...p, [k]: !p[k] }))}
                  className="w-10 h-5 rounded-full relative transition-colors"
                  style={{ background: form[k] ? "#22C55E" : "#D1D5DB" }}>
                  <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                    style={{ left: form[k] ? "22px" : "2px" }} />
                </button>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Note admin</label>
            <textarea value={form.note_admin} onChange={e => setForm(p => ({ ...p, note_admin: e.target.value }))}
              rows={3} className="w-full px-3 py-2 rounded-lg text-sm border resize-y"
              style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
          </div>
        </div>
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: "#F0EDE8", background: "#FAFAF7" }}>
          {error ? <span className="text-sm text-red-600">{error}</span> : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Annulla</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: "#F2C418", color: "#1E2128" }}>
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

function ImportModal({ type, onClose, onImported }) {
  const [tab, setTab] = useState("csv");
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  // Form manuale
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
        ? `${API}/api/discovery/import-csv`
        : `${API}/api/lista-fredda/import`;
      const res = await fetch(url, { method: "POST", body: fd });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0 || data.success) onImported();
    } catch (e) {
      setResult({ error: e.message });
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
        url = `${API}/api/discovery/import`;
        body = { leads: [{ ...form, source: form.source }], auto_score: false };
      } else {
        url = `${API}/api/lista-fredda/leads`;
        body = form;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore");
      setForm(emptyForm);
      onImported();
      setResult({ imported: 1, skipped: 0 });
    } catch (e) {
      setManualError(e.message);
    } finally {
      setManualSaving(false);
    }
  };

  const csvTemplate = type === "discovery"
    ? "display_name,email,source,platform_username,bio,website_url,niche_detected\nMario Rossi,mario@rossi.it,instagram,mariorossi,Coach business,https://mariorossi.it,Business Coaching"
    : "email,first_name,last_name,phone,tag,date_registered\nmario@rossi.it,Mario,Rossi,+393331234567,lista-fredda-2025,2025-01-01";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ background: "#1E2128" }}>
          <div>
            <div className="font-black text-white">Importa Lead</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              {type === "discovery" ? "Discovery Leads" : "Lista Fredda"}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ background: "#FAFAF7" }}>
          {[["csv", "CSV Upload"], ["manual", "Inserimento manuale"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${tab === id ? "border-yellow-400 text-gray-900 bg-white" : "border-transparent text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "csv" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl text-xs" style={{ background: "#F0EDE8" }}>
                <strong>Formato CSV atteso:</strong>
                <pre className="mt-1 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap" style={{ color: "#6B7280" }}>
                  {csvTemplate}
                </pre>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:bg-gray-50"
                style={{ borderColor: csvFile ? "#22C55E" : "#E5E2DD" }}>
                <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: csvFile ? "#22C55E" : "#9CA3AF" }} />
                <p className="text-sm font-medium" style={{ color: "#1E2128" }}>
                  {csvFile ? csvFile.name : "Clicca o trascina il file CSV"}
                </p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Solo file .csv</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => setCsvFile(e.target.files[0])} />
              </div>
              {result && (
                <div className="p-3 rounded-xl text-sm" style={{ background: result.error ? "#FEF2F2" : "#F0FDF4" }}>
                  {result.error
                    ? <span style={{ color: "#DC2626" }}>Errore: {result.error}</span>
                    : <span style={{ color: "#16A34A" }}>✓ Importati: {result.imported || result.success} · Saltati: {result.skipped || 0}</span>}
                </div>
              )}
              <button onClick={handleCsvUpload} disabled={!csvFile || uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                style={{ background: csvFile && !uploading ? "#1E2128" : "#F0EDE8", color: csvFile && !uploading ? "#F2C418" : "#9CA3AF" }}>
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
                      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>{label}</label>
                      <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Fonte</label>
                    <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD" }}>
                      {Object.entries(SOURCES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Bio / Note</label>
                    <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      rows={2} className="w-full px-3 py-2 rounded-lg text-sm border resize-y" style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[["Nome", "first_name"], ["Cognome", "last_name"], ["Email", "email"], ["Telefono", "phone"], ["Tag", "tag"]].map(([label, k]) => (
                    <div key={k}>
                      <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>{label}</label>
                      <input type="text" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5E2DD", color: "#1E2128" }} />
                    </div>
                  ))}
                </div>
              )}
              {manualError && <p className="text-sm text-red-600">{manualError}</p>}
              <button onClick={handleManualSave} disabled={manualSaving || !form.email}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                style={{ background: !form.email || manualSaving ? "#F0EDE8" : "#1E2128", color: !form.email || manualSaving ? "#9CA3AF" : "#F2C418" }}>
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

function PlacesSearchModal({ onClose, onImported }) {
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
      const res = await fetch(`${API}/api/discovery/search-places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Errore ricerca");
      setResult(data);
      if (data.new_leads > 0) onImported();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ background: "#0F9D58" }}>
          <div>
            <div className="font-black text-white text-base">Cerca su Google Attività</div>
            <div className="text-xs text-white/60">Liberi professionisti offline · P.IVA · Passaparola</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5 text-white" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tipo ricerca */}
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setForm(p => ({ ...p, use_group: v }))}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                style={{
                  background: form.use_group === v ? "#0F9D58" : "transparent",
                  color: form.use_group === v ? "#FFF" : "#6B7280",
                  borderColor: form.use_group === v ? "#0F9D58" : "#E5E2DD",
                }}>
                {v ? "Categoria predefinita" : "Testo libero"}
              </button>
            ))}
          </div>

          {form.use_group ? (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Categoria professionale</label>
              <select value={form.profession_group} onChange={e => setForm(p => ({ ...p, profession_group: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD" }}>
                {PROFESSION_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Professione (testo libero)</label>
              <input type="text" value={form.custom_profession} onChange={e => setForm(p => ({ ...p, custom_profession: e.target.value }))}
                placeholder="es. commercialista, fisioterapista..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD" }} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Città</label>
              <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD" }}>
                {ITALIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Max risultati</label>
              <select value={form.max_results} onChange={e => setForm(p => ({ ...p, max_results: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD" }}>
                {[10, 20, 40, 60].map(n => <option key={n} value={n}>{n} professionisti</option>)}
              </select>
            </div>
          </div>

          {/* Filtro solo senza sito */}
          <div className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: form.only_without_website ? "#F0FDF4" : "#FAFAF7", border: `1px solid ${form.only_without_website ? "#BBF7D0" : "#F0EDE8"}` }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#1E2128" }}>Solo senza sito web</div>
              <div className="text-[11px]" style={{ color: "#9CA3AF" }}>Filtra solo chi non ha un sito → segnale offline forte</div>
            </div>
            <button onClick={() => setForm(p => ({ ...p, only_without_website: !p.only_without_website }))}
              className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
              style={{ background: form.only_without_website ? "#0F9D58" : "#D1D5DB" }}>
              <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                style={{ left: form.only_without_website ? "22px" : "2px" }} />
            </button>
          </div>

          {/* Info costi */}
          <div className="p-3 rounded-xl text-xs" style={{ background: "#F0EDE8" }}>
            <strong>Costo API stimato:</strong> ~€0,37 per 20 risultati (Text Search + Place Details).<br/>
            Richiede <code>GOOGLE_PLACES_API_KEY</code> nelle variabili d'ambiente.
          </div>

          {/* Risultato */}
          {result && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
              <div className="font-bold" style={{ color: "#16A34A" }}>
                ✓ {result.new_leads} nuovi lead · {result.hot_leads} HOT (score ≥75)
              </div>
              {result.duplicates_skipped > 0 && (
                <div className="text-xs mt-1" style={{ color: "#9CA3AF" }}>{result.duplicates_skipped} già presenti, saltati</div>
              )}
              {result.errors?.length > 0 && (
                <div className="text-xs mt-1" style={{ color: "#EF4444" }}>Errori: {result.errors.join(", ")}</div>
              )}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "#FEF2F2" }}>
              <span style={{ color: "#DC2626" }}>Errore: {error}</span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button onClick={run} disabled={loading || (form.use_group ? false : !form.custom_profession)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ background: loading ? "#E5E2DD" : "#0F9D58", color: loading ? "#9CA3AF" : "#FFF" }}>
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

export default function LeadManagerAdmin() {
  const [activeTab, setActiveTab] = useState("discovery");
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

  const PER_PAGE = 50;

  const load = async () => {
    setLoading(true);
    try {
      if (activeTab === "discovery") {
        const params = new URLSearchParams({ limit: PER_PAGE, skip: page * PER_PAGE });
        if (filterStatus) params.set("status", filterStatus);
        if (filterSource) params.set("source", filterSource);
        if (filterScore > 0) params.set("min_score", filterScore);
        const res = await fetch(`${API}/api/discovery/leads?${params}`);
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
      } else {
        const params = new URLSearchParams({ limit: PER_PAGE, skip: page * PER_PAGE });
        if (filterStatus) params.set("stato", filterStatus);
        const res = await fetch(`${API}/api/lista-fredda/leads?${params}`);
        const data = await res.json();
        let items = data.leads || [];
        if (search) {
          const q = search.toLowerCase();
          items = items.filter(l =>
            (l.first_name || "").toLowerCase().includes(q) ||
            (l.last_name || "").toLowerCase().includes(q) ||
            (l.email || "").toLowerCase().includes(q)
          );
        }
        setLeads(items);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error("Error loading leads:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [activeTab, filterStatus, filterSource, filterScore, page]);

  const handleDelete = async (lead) => {
    if (!window.confirm(`Eliminare "${lead.display_name || lead.email}"?`)) return;
    const id = lead.id || encodeURIComponent(lead.email);
    const url = activeTab === "discovery"
      ? `${API}/api/discovery/leads/${id}`
      : `${API}/api/lista-fredda/leads/${encodeURIComponent(lead.email)}`;
    setDeletingId(id);
    try {
      await fetch(url, { method: "DELETE" });
      setLeads(prev => prev.filter(l => (l.id || l.email) !== (lead.id || lead.email)));
      setTotal(t => t - 1);
    } catch (e) {} finally {
      setDeletingId(null);
    }
  };

  const handleSaved = (updated) => {
    setLeads(prev => prev.map(l => (l.id || l.email) === (updated.id || updated.email) ? updated : l));
    setEditLead(null);
  };

  const isDiscovery = activeTab === "discovery";

  return (
    <div className="h-full flex flex-col" style={{ background: "#FAFAF7" }}>
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-4" style={{ background: "#FFFFFF", borderColor: "#F0EDE8" }}>
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#F0EDE8" }}>
          {[["discovery", "Discovery Lead", Users], ["fredda", "Lista Fredda", Snowflake]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => { setActiveTab(id); setPage(0); setFilterStatus(""); setFilterSource(""); setLeads([]); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: activeTab === id ? "#FFFFFF" : "transparent", color: activeTab === id ? "#1E2128" : "#9CA3AF", boxShadow: activeTab === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}>
              <Icon className="w-4 h-4" />
              {label}
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: activeTab === id ? "#F2C41820" : "transparent", color: "#F2C418" }}>
                {activeTab === id ? total : ""}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white border" style={{ borderColor: "#E5E2DD" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Cerca per nome, email, nicchia..."
            className="flex-1 text-sm bg-transparent outline-none" style={{ color: "#1E2128" }} />
        </div>

        {/* Filtri */}
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
          className="px-3 py-2 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD", background: "#FFF" }}>
          <option value="">Tutti gli stati</option>
          {Object.entries(isDiscovery ? DISCOVERY_STATUSES : FREDDA_STATI).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        {isDiscovery && (
          <>
            <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(0); }}
              className="px-3 py-2 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD", background: "#FFF" }}>
              <option value="">Tutte le fonti</option>
              {Object.entries(SOURCES).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
            </select>
            <select value={filterScore} onChange={e => { setFilterScore(Number(e.target.value)); setPage(0); }}
              className="px-3 py-2 rounded-xl text-sm border" style={{ borderColor: "#E5E2DD", background: "#FFF" }}>
              <option value={0}>Tutti gli score</option>
              <option value={80}>Hot (≥80)</option>
              <option value={50}>Warm (≥50)</option>
            </select>
          </>
        )}

        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50 transition-colors" style={{ borderColor: "#E5E2DD" }}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} style={{ color: "#9CA3AF" }} />
        </button>

        {isDiscovery && (
          <button onClick={() => setShowPlacesSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "#0F9D58", color: "#FFF" }}>
            <MapPin className="w-4 h-4" />
            Google Attività
          </button>
        )}

        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{ background: "#1E2128", color: "#F2C418" }}>
          <Plus className="w-4 h-4" />
          Importa
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Users className="w-12 h-12" style={{ color: "#D1D5DB" }} />
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Nessun lead trovato</p>
          </div>
        ) : isDiscovery ? (
          <table className="w-full text-sm">
            <thead style={{ background: "#FAFAF7", position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                {["Nome", "Email / Username", "Fonte", "Nicchia", "Score", "Stato", "Temp.", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9CA3AF", borderBottom: "1px solid #F0EDE8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id || i} className="hover:bg-white transition-colors border-b" style={{ borderColor: "#F5F3F0" }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold" style={{ color: "#1E2128" }}>{lead.display_name || "—"}</div>
                    {lead.source === "google_places" ? (
                      <div className="text-[11px] mt-0.5" style={{ color: "#9CA3AF" }}>
                        {lead.business_address?.split(",").slice(0,2).join(",")}
                      </div>
                    ) : lead.website_url ? (
                      <a href={lead.website_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                        <Globe className="w-3 h-3" /> {lead.website_url.replace(/^https?:\/\//, "").slice(0, 30)}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {lead.source === "google_places" ? (
                      <div>
                        {lead.business_phone && (
                          <div className="text-xs flex items-center gap-1" style={{ color: "#1E2128" }}>
                            <Phone className="w-3 h-3" style={{ color: "#0F9D58" }} />
                            {lead.business_phone}
                          </div>
                        )}
                        {lead.google_rating && (
                          <div className="text-[11px]" style={{ color: "#9CA3AF" }}>
                            ★ {lead.google_rating} ({lead.google_review_count || 0} rec.)
                            {!lead.has_website && <span className="ml-1 font-bold" style={{ color: "#0F9D58" }}>· no sito</span>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs" style={{ color: "#6B7280" }}>{lead.email}</div>
                        {lead.platform_username && (
                          <div className="text-[11px]" style={{ color: "#9CA3AF" }}>@{lead.platform_username}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.source && <StatusBadge status={lead.source} map={SOURCES} />}
                  </td>
                  <td className="px-4 py-3 max-w-[150px]">
                    <span className="text-xs truncate block" style={{ color: "#6B7280" }}>{lead.niche_detected || "—"}</span>
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
                          <ExternalLink className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                        </a>
                      )}
                      <button onClick={() => setEditLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: "#F2C418" }} />
                      </button>
                      <button onClick={() => handleDelete(lead)} disabled={deletingId === lead.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        {deletingId === lead.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#EF4444" }} />
                          : <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: "#FAFAF7", position: "sticky", top: 0, zIndex: 1 }}>
              <tr>
                {["Nome", "Email", "Telefono", "Tag", "Stato", "Email seq.", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: "#9CA3AF", borderBottom: "1px solid #F0EDE8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id || lead.email || i} className="hover:bg-white transition-colors border-b" style={{ borderColor: "#F5F3F0" }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: "#1E2128" }}>
                    {lead.first_name} {lead.last_name}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{lead.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{lead.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#F0EDE8", color: "#6B7280" }}>{lead.tag}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.stato} map={FREDDA_STATI} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {lead.email_inviata > 0 ? `${lead.email_inviata} inv.` : "—"}
                      {lead.risposta_ricevuta ? " ✓ Risposta" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditLead(lead)}
                        className="p-1.5 rounded-lg hover:bg-yellow-50 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" style={{ color: "#F2C418" }} />
                      </button>
                      <button onClick={() => handleDelete(lead)} disabled={deletingId === lead.email}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        {deletingId === lead.email
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#EF4444" }} />
                          : <Trash2 className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />}
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
        <div className="px-6 py-3 border-t flex items-center justify-between" style={{ background: "#FFF", borderColor: "#F0EDE8" }}>
          <span className="text-xs" style={{ color: "#9CA3AF" }}>
            {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} di {total}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40" style={{ borderColor: "#E5E2DD" }}>
              ← Prec
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PER_PAGE >= total}
              className="px-3 py-1.5 rounded-lg text-sm border disabled:opacity-40" style={{ borderColor: "#E5E2DD" }}>
              Succ →
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {editLead && isDiscovery && (
        <DiscoveryEditModal lead={editLead} onClose={() => setEditLead(null)} onSaved={handleSaved} />
      )}
      {editLead && !isDiscovery && (
        <FreddaEditModal lead={editLead} onClose={() => setEditLead(null)} onSaved={handleSaved} />
      )}
      {showImport && (
        <ImportModal type={activeTab === "discovery" ? "discovery" : "fredda"}
          onClose={() => setShowImport(false)}
          onImported={() => { load(); }} />
      )}
      {showPlacesSearch && (
        <PlacesSearchModal
          onClose={() => setShowPlacesSearch(false)}
          onImported={() => { load(); }} />
      )}
    </div>
  );
}
