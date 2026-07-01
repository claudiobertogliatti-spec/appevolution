/**
 * Ciak Admin — Pipeline Prospect (portato da ProspectPipeline del back-office
 * Evolution). Tabella funnel a 9 step + modali contratto custom / audio analisi
 * / conferma eliminazione (tutte inline).
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, RefreshCw, CheckCircle, Clock, Lock,
  ChevronRight, AlertCircle, Loader2,
  FileText, CreditCard, Sparkles, Phone, Send,
  PenTool, DollarSign, Upload, User, FilePlus, Trash2, X, Eye, Headphones,
} from "lucide-react";
import { adminFetch } from "../api";

// Configurazione colonne del funnel
const STEPS = [
  { key: "step_registrazione", label: "Registrazione", short: "Reg.", icon: User },
  { key: "step_questionario", label: "Questionario", short: "Quest.", icon: FileText },
  { key: "step_pagamento_67", label: "€27", short: "€27", icon: CreditCard },
  { key: "step_analisi_approvata", label: "Analisi", short: "Analisi", icon: Sparkles },
  { key: "step_call_completata", label: "Call", short: "Call", icon: Phone },
  { key: "step_proposta_inviata", label: "Proposta", short: "Proposta", icon: Send },
  { key: "step_contratto_firmato", label: "Contratto", short: "Contr.", icon: PenTool },
  { key: "step_pagamento_2790", label: "€2.790", short: "€2.790", icon: DollarSign },
  { key: "step_documenti", label: "Documenti", short: "Docs", icon: Upload },
];

function StepCell({ done, partial, locked }) {
  if (done)
    return (
      <div className="flex justify-center">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      </div>
    );
  if (partial)
    return (
      <div className="flex justify-center">
        <Clock className="w-4 h-4 text-yellow-500" />
      </div>
    );
  if (locked)
    return (
      <div className="flex justify-center">
        <Lock className="w-4 h-4 text-gray-300" />
      </div>
    );
  return (
    <div className="flex justify-center">
      <AlertCircle className="w-4 h-4 text-red-500" />
    </div>
  );
}

function FunnelProgress({ cliente }) {
  const total = STEPS.length;
  const done = STEPS.filter((s) => cliente[s.key]).length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] mb-0.5 text-slate-400">
        <span>
          {done}/{total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-200">
        <div
          className={`h-1.5 rounded-full transition-all ${
            pct === 100 ? "bg-emerald-500" : "bg-yellow-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CallBadge({ stato }) {
  const map = {
    da_fissare: { label: "Da fissare", cls: "bg-red-100 text-red-500" },
    fissata: { label: "Fissata", cls: "bg-yellow-100 text-yellow-700" },
    completata: { label: "Completata", cls: "bg-emerald-100 text-emerald-500" },
    annullata: { label: "Annullata", cls: "bg-gray-100 text-slate-400" },
  };
  const cfg = map[stato] || map["da_fissare"];
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modale Contratto Custom
// ─────────────────────────────────────────────────────────────────────────────
function ContrattoCustomModal({ cliente, onClose, onAuthExpired }) {
  const [status, setStatus] = useState(null); // { custom_pdf_url, filename, uploaded_at }
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/contract/custom-pdf/${cliente.id}`);
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore caricamento stato");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      setError("Carica un file PDF");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminFetch(`/api/contract/custom-pdf/${cliente.id}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (data.success) {
        await loadStatus();
      } else {
        setError(data.detail || "Errore upload");
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Rimuovere il contratto custom? Il prospect tornerà al contratto standard generato."
      )
    )
      return;
    setDeleting(true);
    try {
      await adminFetch(`/api/contract/custom-pdf/${cliente.id}`, { method: "DELETE" });
      await loadStatus();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-900 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-white text-base">Contratto Custom</h3>
            <p className="text-white/60 text-xs">
              {cliente.nome} {cliente.cognome}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : status?.custom_pdf_url ? (
            <>
              {/* PDF presente */}
              <div className="rounded-xl p-4 space-y-3 bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 text-sm">
                    Contratto custom attivo
                  </span>
                </div>
                <p className="text-xs text-emerald-600">
                  File: <strong>{status.filename}</strong>
                </p>
                {status.uploaded_at && (
                  <p className="text-xs text-emerald-500">
                    Caricato: {new Date(status.uploaded_at).toLocaleString("it-IT")}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <a
                  href={status.custom_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 bg-slate-900 text-white"
                >
                  <Eye className="w-4 h-4" />
                  Visualizza PDF
                </a>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 bg-red-50 text-red-600 border border-red-200"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Rimuovi
                </button>
              </div>

              {/* Sostituisci */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Sostituisci con nuovo file:</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all bg-gray-50 text-slate-600 border border-dashed border-gray-300"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Caricamento..." : "Carica nuovo PDF"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Nessun PDF custom */}
              <div className="rounded-xl p-4 text-center space-y-2 bg-gray-50 border border-gray-200">
                <FilePlus className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-medium text-slate-600">Nessun contratto custom</p>
                <p className="text-xs text-slate-400">
                  Il prospect vedrà il contratto standard generato automaticamente.
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Carica un PDF per sostituire il contratto standard (sconti, condizioni
                  speciali, ecc.):
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 bg-slate-900 text-white"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Caricamento in corso..." : "Carica Contratto Custom (PDF)"}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Il PDF sostituisce il contratto generato. Le clausole e la firma rimangono
            invariate.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modale Upload Audio Analisi
// ─────────────────────────────────────────────────────────────────────────────
function AudioAnalisiModal({ cliente, onClose, onAuthExpired }) {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/cliente-analisi/audio/${cliente.id}`);
      const data = await res.json();
      setAudioUrl(data.available ? data.url : "");
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore caricamento stato");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    if (
      !file.name.endsWith(".mp3") &&
      !file.name.endsWith(".wav") &&
      !file.name.endsWith(".m4a")
    ) {
      setError("Formato non supportato. Carica un file .mp3, .wav o .m4a");
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminFetch(
        `/api/admin/cliente/${cliente.id}/upload-audio-analisi`,
        { method: "POST", body: form }
      );
      const data = await res.json();
      if (data.success) {
        setAudioUrl(data.url);
        setSuccess(`Audio caricato (${data.size_kb} KB)`);
      } else {
        setError(data.detail || "Errore upload");
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError("Errore upload: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-slate-900 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-white text-base">Audio Analisi</h3>
            <p className="text-white/60 text-xs">
              {cliente.nome} {cliente.cognome}
            </p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : audioUrl ? (
            <>
              <div className="rounded-xl p-4 space-y-3 bg-violet-50 border border-violet-200">
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-violet-600" />
                  <span className="font-semibold text-violet-700 text-sm">Audio caricato</span>
                </div>
                <audio controls className="w-full" style={{ height: 40 }}>
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">Sostituisci con nuovo file:</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".mp3,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all bg-gray-50 text-slate-600 border border-dashed border-gray-300"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Caricamento..." : "Carica nuovo audio"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl p-4 text-center space-y-2 bg-gray-50 border border-gray-200">
                <Headphones className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-sm font-medium text-slate-600">Nessun audio caricato</p>
                <p className="text-xs text-slate-400">
                  Genera l'audio con NotebookLM e caricalo qui.
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Carica il file MP3 generato da NotebookLM:
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".mp3,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 bg-slate-900 text-white"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? "Caricamento in corso..." : "Carica Audio Analisi (MP3)"}
                </button>
              </div>
            </>
          )}
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          {success && <p className="text-xs text-emerald-600 text-center">{success}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PipelineProspect({ onAuthExpired }) {
  const navigate = useNavigate();
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tutti");
  const [contrattoModal, setContrattoModal] = useState(null);
  const [audioModal, setAudioModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null); // { id, nome, cognome, email }
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCliente = (c) => {
    navigate(`/admin/prospect/${c.id}`);
  };

  const handleDeleteProspect = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/prospect/${deleteModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setClienti((prev) => prev.filter((c) => c.id !== deleteModal.id));
        setDeleteModal(null);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setDeleting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/prospect-pipeline");
      const data = await res.json();
      if (data.success) setClienti(data.clienti);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setLoading(false);
    }
  };

  const FILTRI = [
    { id: "tutti", label: "Tutti" },
    { id: "questionario", label: "Questionario ✓" },
    { id: "pagato_67", label: "Pagato €27" },
    { id: "analisi", label: "Analisi pronta" },
    { id: "call", label: "Call completata" },
    { id: "proposta", label: "Proposta inviata" },
    { id: "contratto", label: "Contratto firmato" },
    { id: "pagato_2790", label: "Pagato €2.790" },
  ];

  const filtered = clienti.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      `${c.nome} ${c.cognome}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    const matchFilter =
      filter === "tutti"
        ? true
        : filter === "questionario"
        ? c.step_questionario
        : filter === "pagato_67"
        ? c.step_pagamento_67
        : filter === "analisi"
        ? c.step_analisi_approvata
        : filter === "call"
        ? c.step_call_completata
        : filter === "proposta"
        ? c.step_proposta_inviata
        : filter === "contratto"
        ? c.step_contratto_firmato
        : filter === "pagato_2790"
        ? c.step_pagamento_2790
        : true;
    return matchSearch && matchFilter;
  });

  // KPI stats
  const stats = {
    totale: clienti.length,
    questionario: clienti.filter((c) => c.step_questionario).length,
    pagato_67: clienti.filter((c) => c.step_pagamento_67).length,
    analisi: clienti.filter((c) => c.step_analisi_approvata).length,
    contratto: clienti.filter((c) => c.step_contratto_firmato).length,
    partner: clienti.filter((c) => c.step_pagamento_2790).length,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
      </div>
    );

  return (
    <div className="p-10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prospect & Pipeline</h1>
          <p className="text-sm text-slate-400">
            {clienti.length} prospect totali — tutti gli step del funnel
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-yellow-50 text-slate-500 border border-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
          Aggiorna
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: "Totali", value: stats.totale, cls: "bg-gray-100 border-gray-200 text-slate-600" },
          {
            label: "Questionario",
            value: stats.questionario,
            cls: "bg-blue-50 border-blue-200 text-blue-500",
          },
          {
            label: "Pagato €27",
            value: stats.pagato_67,
            cls: "bg-yellow-50 border-yellow-200 text-yellow-600",
          },
          {
            label: "Analisi OK",
            value: stats.analisi,
            cls: "bg-violet-50 border-violet-200 text-violet-500",
          },
          {
            label: "Contratto",
            value: stats.contratto,
            cls: "bg-orange-50 border-orange-200 text-orange-500",
          },
          {
            label: "Partner",
            value: stats.partner,
            cls: "bg-emerald-50 border-emerald-200 text-emerald-500",
          },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl p-3 text-center border ${k.cls}`}>
            <div className="text-2xl font-semibold">{k.value}</div>
            <div className="text-[11px] font-medium mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtri + Ricerca */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none border border-gray-200 bg-gray-50 text-slate-900"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTRI.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.id
                  ? "bg-yellow-500 text-slate-900"
                  : "bg-gray-50 text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400"
                  style={{ minWidth: 200 }}
                >
                  Cliente
                </th>
                <th
                  className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-center text-slate-400"
                  style={{ minWidth: 60 }}
                >
                  Prog.
                </th>
                {STEPS.map((s) => (
                  <th
                    key={s.key}
                    className="px-2 py-3 text-xs font-semibold uppercase tracking-wider text-center text-slate-400"
                    style={{ minWidth: 68 }}
                  >
                    {s.short}
                  </th>
                ))}
                <th
                  className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-center text-slate-400"
                  style={{ minWidth: 90 }}
                >
                  Call
                </th>
                <th className="px-3 py-3" style={{ minWidth: 60 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={STEPS.length + 4}
                    className="text-center py-12 text-sm text-slate-400"
                  >
                    Nessun prospect trovato
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className={`transition-colors hover:bg-yellow-50 cursor-pointer ${
                    i < filtered.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                  onClick={() => openCliente(c)}
                >
                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-yellow-100 text-yellow-700">
                        {(c.nome?.[0] || "?").toUpperCase()}
                        {(c.cognome?.[0] || "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate text-slate-900">
                          {c.nome} {c.cognome}
                        </div>
                        <div className="text-xs truncate text-slate-400">{c.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Progress bar */}
                  <td className="px-3 py-3" style={{ minWidth: 80 }}>
                    <FunnelProgress cliente={c} />
                  </td>

                  {/* Step cells */}
                  {STEPS.map((s) => {
                    const done = Boolean(c[s.key]);
                    const stepIdx = STEPS.findIndex((x) => x.key === s.key);
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

                  {/* Azione apri + contratto custom + audio + elimina */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAudioModal(c);
                        }}
                        title="Carica audio analisi"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-violet-50 text-violet-600"
                      >
                        <Headphones className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setContrattoModal(c);
                        }}
                        title="Gestisci contratto custom"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-blue-50 text-blue-500"
                      >
                        <FilePlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCliente(c);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-yellow-100 text-yellow-600"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal(c);
                        }}
                        title="Elimina prospect"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-100 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
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
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Completato</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span>In attesa azione</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-gray-300" />
          <span>Bloccato (step precedente mancante)</span>
        </div>
        <div className="flex items-center gap-1">
          <Headphones className="w-3.5 h-3.5 text-violet-600" />
          <span>Carica audio analisi (NotebookLM)</span>
        </div>
        <div className="flex items-center gap-1">
          <FilePlus className="w-3.5 h-3.5 text-blue-500" />
          <span>Carica contratto custom (PDF)</span>
        </div>
      </div>

      {/* Modale contratto custom */}
      {contrattoModal && (
        <ContrattoCustomModal
          cliente={contrattoModal}
          onClose={() => setContrattoModal(null)}
          onAuthExpired={onAuthExpired}
        />
      )}

      {/* Modale audio analisi */}
      {audioModal && (
        <AudioAnalisiModal
          cliente={audioModal}
          onClose={() => setAudioModal(null)}
          onAuthExpired={onAuthExpired}
        />
      )}

      {/* Modale conferma eliminazione */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-900">Elimina Prospect</h3>
                  <p className="text-xs text-slate-400">Operazione irreversibile</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-600">
                Stai per eliminare{" "}
                <strong className="text-slate-900">
                  {deleteModal.nome} {deleteModal.cognome}
                </strong>{" "}
                ({deleteModal.email}) e tutti i suoi dati:
              </p>
              <ul className="space-y-1 text-xs text-slate-400">
                {[
                  "Account utente",
                  "Questionario",
                  "Analisi strategica",
                  "Proposta e contratto",
                  "Pagamenti e documenti",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all bg-gray-50 text-slate-600"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDeleteProspect}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 bg-red-500 text-white"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? "Eliminando..." : "Elimina"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PipelineProspect;
