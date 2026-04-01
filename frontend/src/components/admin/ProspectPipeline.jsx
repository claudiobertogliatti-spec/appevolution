import React, { useState, useEffect, useRef } from "react";
import {
  Search, RefreshCw, CheckCircle, Clock, Lock,
  ChevronRight, ExternalLink, AlertCircle, Loader2,
  FileText, CreditCard, Sparkles, Phone, Send,
  PenTool, DollarSign, Upload, User, FilePlus, Trash2, X, Eye
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Configurazione colonne del funnel
const STEPS = [
  { key: "step_registrazione",    label: "Registrazione", short: "Reg.",    icon: User },
  { key: "step_questionario",     label: "Questionario",  short: "Quest.",   icon: FileText },
  { key: "step_pagamento_67",     label: "€67",           short: "€67",      icon: CreditCard },
  { key: "step_analisi_approvata",label: "Analisi",        short: "Analisi",  icon: Sparkles },
  { key: "step_call_completata",  label: "Call",           short: "Call",     icon: Phone },
  { key: "step_proposta_inviata", label: "Proposta",       short: "Proposta", icon: Send },
  { key: "step_contratto_firmato",label: "Contratto",      short: "Contr.",   icon: PenTool },
  { key: "step_pagamento_2790",   label: "€2.790",         short: "€2.790",   icon: DollarSign },
  { key: "step_documenti",        label: "Documenti",      short: "Docs",     icon: Upload },
];

function StepCell({ done, partial, locked }) {
  if (done) return (
    <div className="flex justify-center">
      <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
    </div>
  );
  if (partial) return (
    <div className="flex justify-center">
      <Clock className="w-4 h-4" style={{ color: "#F2C418" }} />
    </div>
  );
  if (locked) return (
    <div className="flex justify-center">
      <Lock className="w-4 h-4" style={{ color: "#D1D5DB" }} />
    </div>
  );
  return (
    <div className="flex justify-center">
      <AlertCircle className="w-4 h-4" style={{ color: "#EF4444" }} />
    </div>
  );
}

function FunnelProgress({ cliente }) {
  const total = STEPS.length;
  const done = STEPS.filter(s => cliente[s.key]).length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-0.5" style={{ color: "#9CA3AF" }}>
        <span>{done}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "#F0EFEB" }}>
        <div className="h-1.5 rounded-full transition-all"
             style={{ width: `${pct}%`, background: pct === 100 ? "#22C55E" : "#F2C418" }} />
      </div>
    </div>
  );
}

function CallBadge({ stato }) {
  const map = {
    da_fissare: { label: "Da fissare", color: "#EF4444" },
    fissata:    { label: "Fissata",    color: "#F2C418" },
    completata: { label: "Completata", color: "#22C55E" },
    annullata:  { label: "Annullata",  color: "#9CA3AF" },
  };
  const cfg = map[stato] || map["da_fissare"];
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: cfg.color + "20", color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modale Contratto Custom
// ─────────────────────────────────────────────────────────────────────────────
function ContrattoCustomModal({ cliente, onClose }) {
  const [status, setStatus] = useState(null); // { custom_pdf_url, filename, uploaded_at }
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/contract/custom-pdf/${cliente.id}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError("Errore caricamento stato");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.pdf')) { setError("Carica un file PDF"); return; }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/api/contract/custom-pdf/${cliente.id}`, {
        method: "POST",
        body: form
      });
      const data = await res.json();
      if (data.success) {
        await loadStatus();
      } else {
        setError(data.detail || "Errore upload");
      }
    } catch (e) {
      setError("Errore upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Rimuovere il contratto custom? Il prospect tornerà al contratto standard generato.")) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/contract/custom-pdf/${cliente.id}`, { method: "DELETE" });
      await loadStatus();
    } catch (e) {
      setError("Errore eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: "linear-gradient(135deg,#1a1a2e,#2d2d44)", borderRadius: "16px 16px 0 0" }}>
          <div>
            <h3 className="font-bold text-white text-base">Contratto Custom</h3>
            <p className="text-white/60 text-xs">{cliente.nome} {cliente.cognome}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : status?.custom_pdf_url ? (
            <>
              {/* PDF presente */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 text-sm">Contratto custom attivo</span>
                </div>
                <p className="text-xs text-emerald-600">File: <strong>{status.filename}</strong></p>
                {status.uploaded_at && (
                  <p className="text-xs text-emerald-500">Caricato: {new Date(status.uploaded_at).toLocaleString('it-IT')}</p>
                )}
              </div>

              <div className="flex gap-3">
                <a
                  href={status.custom_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: "#1a1a2e", color: "#fff" }}
                >
                  <Eye className="w-4 h-4" />
                  Visualizza PDF
                </a>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                  style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Rimuovi
                </button>
              </div>

              {/* Sostituisci */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Sostituisci con nuovo file:</p>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ background: "#F5F4F1", color: "#5F6572", border: "1px dashed #D1D5DB" }}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Caricamento..." : "Carica nuovo PDF"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Nessun PDF custom */}
              <div className="rounded-xl p-4 text-center space-y-2" style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}>
                <FilePlus className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm font-medium text-gray-600">Nessun contratto custom</p>
                <p className="text-xs text-gray-400">Il prospect vedrà il contratto standard generato automaticamente.</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Carica un PDF per sostituire il contratto standard (sconti, condizioni speciali, ecc.):</p>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#1a1a2e,#2d2d44)", color: "#fff" }}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Caricamento in corso..." : "Carica Contratto Custom (PDF)"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            Il PDF sostituisce il contratto generato. Le clausole e la firma rimangono invariate.
          </p>
        </div>
      </div>
    </div>
  );
}


export function ProspectPipeline({ onOpenCliente }) {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [contrattoModal, setContrattoModal] = useState(null); // cliente selezionato per modale

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/prospect-pipeline`);
      const data = await res.json();
      if (data.success) setClienti(data.clienti);
    } catch (e) {
      console.error("ProspectPipeline error:", e);
    } finally {
      setLoading(false);
    }
  };

  const FILTRI = [
    { id: "tutti",      label: "Tutti" },
    { id: "questionario", label: "Questionario ✓" },
    { id: "pagato_67",  label: "Pagato €67" },
    { id: "analisi",    label: "Analisi pronta" },
    { id: "call",       label: "Call completata" },
    { id: "proposta",   label: "Proposta inviata" },
    { id: "contratto",  label: "Contratto firmato" },
    { id: "pagato_2790",label: "Pagato €2.790" },
  ];

  const filtered = clienti.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    const matchFilter = filter === "tutti" ? true :
      filter === "questionario" ? c.step_questionario :
      filter === "pagato_67"    ? c.step_pagamento_67 :
      filter === "analisi"      ? c.step_analisi_approvata :
      filter === "call"         ? c.step_call_completata :
      filter === "proposta"     ? c.step_proposta_inviata :
      filter === "contratto"    ? c.step_contratto_firmato :
      filter === "pagato_2790"  ? c.step_pagamento_2790 : true;
    return matchSearch && matchFilter;
  });

  // KPI stats
  const stats = {
    totale:    clienti.length,
    questionario: clienti.filter(c => c.step_questionario).length,
    pagato_67: clienti.filter(c => c.step_pagamento_67).length,
    analisi:   clienti.filter(c => c.step_analisi_approvata).length,
    contratto: clienti.filter(c => c.step_contratto_firmato).length,
    partner:   clienti.filter(c => c.step_pagamento_2790).length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#F2C418" }} />
    </div>
  );

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "#1E2128" }}>Prospect & Pipeline</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            {clienti.length} prospect totali — tutti gli step del funnel
          </p>
        </div>
        <button onClick={loadData}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-[#FFF8DC]"
                style={{ color: "#8D929C", border: "1px solid #ECEDEF" }}>
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Totali",      value: stats.totale,      color: "#6B7280" },
          { label: "Questionario",value: stats.questionario, color: "#3B82F6" },
          { label: "Pagato €67",  value: stats.pagato_67,   color: "#F2C418" },
          { label: "Analisi OK",  value: stats.analisi,     color: "#8B5CF6" },
          { label: "Contratto",   value: stats.contratto,   color: "#F97316" },
          { label: "Partner",     value: stats.partner,     color: "#22C55E" },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-3 text-center"
               style={{ background: k.color + "12", border: `1px solid ${k.color}30` }}>
            <div className="text-2xl font-black" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: k.color + "CC" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri + Ricerca */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none"
            style={{ border: "1px solid #ECEDEF", background: "#FAFAF7", color: "#1E2128" }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTRI.map(f => (
            <button key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: filter === f.id ? "#F2C418" : "#F5F4F1",
                      color: filter === f.id ? "#1E2128" : "#5F6572"
                    }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#FAFAF7", borderBottom: "1px solid #ECEDEF" }}>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#9CA3AF", minWidth: 200 }}>
                  Cliente
                </th>
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-center"
                    style={{ color: "#9CA3AF", minWidth: 60 }}>
                  Prog.
                </th>
                {STEPS.map(s => (
                  <th key={s.key}
                      className="px-2 py-3 text-xs font-bold uppercase tracking-wider text-center"
                      style={{ color: "#9CA3AF", minWidth: 68 }}>
                    {s.short}
                  </th>
                ))}
                <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-center"
                    style={{ color: "#9CA3AF", minWidth: 90 }}>
                  Call
                </th>
                <th className="px-3 py-3" style={{ minWidth: 60 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={STEPS.length + 4}
                      className="text-center py-12 text-sm"
                      style={{ color: "#9CA3AF" }}>
                    Nessun prospect trovato
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => (
                <tr key={c.id}
                    className="transition-colors hover:bg-[#FFFDF5] cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F5F4F1" : "none" }}
                    onClick={() => onOpenCliente && onOpenCliente(c)}>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                           style={{ background: "#FFF3C4", color: "#C4990A" }}>
                        {(c.nome?.[0] || "?").toUpperCase()}{(c.cognome?.[0] || "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate" style={{ color: "#1E2128" }}>
                          {c.nome} {c.cognome}
                        </div>
                        <div className="text-xs truncate" style={{ color: "#9CA3AF" }}>{c.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Progress bar */}
                  <td className="px-3 py-3" style={{ minWidth: 80 }}>
                    <FunnelProgress cliente={c} />
                  </td>

                  {/* Step cells */}
                  {STEPS.map(s => {
                    const done = Boolean(c[s.key]);
                    // Determina se lo step è "bloccato" (tutti i precedenti non completati)
                    const stepIdx = STEPS.findIndex(x => x.key === s.key);
                    const prevDone = stepIdx === 0 || Boolean(c[STEPS[stepIdx - 1].key]);
                    return (
                      <td key={s.key} className="px-2 py-3">
                        <StepCell done={done} locked={!done && !prevDone} />
                      </td>
                    );
                  })}

                  {/* Call stato */}
                  <td className="px-3 py-3 text-center">
                    {c.step_pagamento_67 && <CallBadge stato={c.call_stato} />}
                  </td>

                  {/* Azione apri + contratto custom */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={e => { e.stopPropagation(); setContrattoModal(c); }}
                        title="Gestisci contratto custom"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[#EEF2FF]"
                        style={{ color: "#6366F1" }}>
                        <FilePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onOpenCliente && onOpenCliente(c); }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-[#FFF3C4]"
                        style={{ color: "#C4990A" }}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "#9CA3AF" }}>
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" style={{ color: "#22C55E" }} />
          <span>Completato</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
          <span>In attesa azione</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" style={{ color: "#D1D5DB" }} />
          <span>Bloccato (step precedente mancante)</span>
        </div>
        <div className="flex items-center gap-1">
          <FilePlus className="w-3.5 h-3.5" style={{ color: "#6366F1" }} />
          <span>Carica contratto custom (PDF)</span>
        </div>
      </div>

      {/* Modale contratto custom */}
      {contrattoModal && (
        <ContrattoCustomModal
          cliente={contrattoModal}
          onClose={() => setContrattoModal(null)}
        />
      )}
    </div>
  );
}

export default ProspectPipeline;
