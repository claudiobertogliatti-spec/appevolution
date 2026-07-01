/**
 * Ciak Admin — Clienti Analisi.
 * Gestione clienti che hanno acquistato l'Analisi Strategica (€27):
 * questionario, generazione analisi AI, fissa call, conversione partner.
 */

import { useState, useEffect } from "react";
import {
  Users, Search, Eye, CheckCircle, XCircle,
  Clock, AlertTriangle, ChevronRight, Mail, Phone,
  FileText, Calendar, Target, X, Loader2, RefreshCw,
  ArrowRight, Sparkles, Download, FileDown,
  Edit3, Save, User, ToggleLeft, Trash2,
} from "lucide-react";
import { adminFetch } from "../api";

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENTE EDIT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function ClienteEditModal({ cliente, onClose, onSaved, onAuthExpired }) {
  const [activeTab, setActiveTab] = useState("anagrafica");
  const [form, setForm] = useState({
    nome: cliente.nome || "",
    cognome: cliente.cognome || "",
    email: cliente.email || "",
    telefono: cliente.telefono || "",
    paese: cliente.paese || "",
    note_admin: cliente.note_admin || "",
    questionario_compilato: cliente.questionario_compilato || false,
    pagamento_analisi: cliente.pagamento_analisi || false,
    analisi_generata: cliente.analisi_generata || false,
    questionario: { ...(cliente.questionario || {}) },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/clienti-analisi/${cliente.id}/dati`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved({ ...cliente, ...form });
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "anagrafica", label: "Anagrafica", icon: User },
    { id: "questionario", label: "Questionario", icon: FileText },
    { id: "stato", label: "Stato & Note", icon: ToggleLeft },
  ];

  const QLABELS = {
    expertise: "Competenza / Esperienza",
    cliente_ideale: "Cliente ideale",
    pubblico_esistente: "Pubblico esistente",
    esperienze_passate: "Esperienze passate",
    ostacolo_principale: "Ostacolo principale",
    obiettivo_12_mesi: "Obiettivo 12 mesi",
    perche_adesso: "Perché adesso",
    attivita: "Attività e ruolo",
    guadagno: "Come guadagna oggi",
    difficolta: "Difficoltà principale",
    prodotto_digitale: "Prodotto digitale",
    audience: "Audience",
    investimento: "Pronto a investire",
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm bg-yellow-400 text-slate-900">
              {cliente.nome?.[0]}{cliente.cognome?.[0]}
            </div>
            <div>
              <div className="font-semibold text-white">{cliente.nome} {cliente.cognome}</div>
              <div className="text-xs text-white/50">{cliente.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id ? "border-yellow-400 text-slate-900 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "anagrafica" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[["nome", "Nome"], ["cognome", "Cognome"], ["email", "Email"], ["telefono", "Telefono"], ["paese", "Paese"]].map(([key, label]) => (
                  <div key={key} className={key === "email" ? "col-span-2" : ""}>
                    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-400">{label}</label>
                    <input type="text" value={form[key] || ""}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 text-slate-900 outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "questionario" && (
            <div className="space-y-4">
              {Object.entries(form.questionario || {}).length === 0 ? (
                <p className="text-sm text-center py-6 text-slate-400">Nessuna risposta al questionario.</p>
              ) : Object.entries(form.questionario).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-400">
                    {QLABELS[key] || key}
                  </label>
                  <textarea
                    value={val || ""}
                    onChange={e => setForm(p => ({ ...p, questionario: { ...p.questionario, [key]: e.target.value } }))}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 text-slate-900 outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
                  />
                </div>
              ))}
              {/* Aggiungi campo questionario */}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold mb-2 text-slate-400">Aggiungi campo:</p>
                <div className="flex gap-2">
                  <select className="flex-1 px-3 py-2 rounded-lg text-sm border border-gray-200"
                    onChange={e => {
                      if (e.target.value && !(e.target.value in form.questionario)) {
                        setForm(p => ({ ...p, questionario: { ...p.questionario, [e.target.value]: "" } }));
                      }
                      e.target.value = "";
                    }}>
                    <option value="">Seleziona campo...</option>
                    {Object.entries(QLABELS).filter(([k]) => !(k in (form.questionario || {}))).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stato" && (
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wide mb-3 text-slate-400">Flag funnel</div>
              {[
                ["questionario_compilato", "Questionario compilato"],
                ["pagamento_analisi", "Pagamento analisi (€27)"],
                ["analisi_generata", "Analisi generata"],
              ].map(([key, label]) => (
                <div key={key} className={`flex items-center justify-between p-3 rounded-xl border ${form[key] ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                  <button onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                    className={`w-12 h-6 rounded-full relative transition-colors ${form[key] ? "bg-emerald-500" : "bg-gray-300"}`}>
                    <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm"
                      style={{ left: form[key] ? "26px" : "2px" }} />
                  </button>
                </div>
              ))}
              <div className="pt-3">
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5 text-slate-400">
                  Note admin (interne)
                </label>
                <textarea value={form.note_admin || ""}
                  onChange={e => setForm(p => ({ ...p, note_admin: e.target.value }))}
                  rows={4} placeholder="Note interne su questo cliente..."
                  className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 text-slate-900 outline-none resize-y" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {error && <span className="text-sm text-red-600">{error}</span>}
          {!error && saved && <span className="text-sm font-semibold text-emerald-600">✓ Salvato</span>}
          {!error && !saved && <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-gray-100">
              Chiudi
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all bg-yellow-400 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status configuration (nuovo modello - solo stati attivi)
const STATUS_CONFIG = {
  pagato: { label: "Pagato", color: "text-slate-500", icon: Clock, bg: "bg-gray-100" },
  questionario_completato: { label: "Questionario ✓", color: "text-blue-500", icon: FileText, bg: "bg-blue-100" },
  analisi_pronta: { label: "Analisi pronta", color: "text-purple-600", icon: Sparkles, bg: "bg-purple-100" },
  call_fissata: { label: "Call fissata", color: "text-yellow-600", icon: Calendar, bg: "bg-yellow-100" },
  proposta_inviata: { label: "Proposta inviata", color: "text-yellow-600", icon: Target, bg: "bg-yellow-100" },
  convertito: { label: "Partner ✓", color: "text-emerald-600", icon: CheckCircle, bg: "bg-emerald-100" },
  non_convertito: { label: "Non convertito", color: "text-red-500", icon: XCircle, bg: "bg-red-100" },
};

// Status options for filter dropdown
const STATUS_OPTIONS = [
  { value: "all", label: "Tutti gli stati" },
  { value: "pagato", label: "Pagato" },
  { value: "questionario_completato", label: "Questionario ✓" },
  { value: "analisi_pronta", label: "Analisi pronta" },
  { value: "call_fissata", label: "Call fissata" },
  { value: "proposta_inviata", label: "Proposta inviata" },
  { value: "convertito", label: "Partner ✓" },
  { value: "non_convertito", label: "Non convertito" },
];

// Questionario pre-call labels
const QUESTIONARIO_LABELS = {
  expertise: "In cosa sei esperto/a",
  cliente_ideale: "Cliente ideale",
  pubblico_esistente: "Pubblico esistente",
  esperienze_passate: "Esperienze passate",
  ostacolo_principale: "Ostacolo principale",
  obiettivo_12_mesi: "Obiettivo 12 mesi",
  perche_adesso: "Perché adesso",
};

// Legacy questionnaire labels
const QUESTION_LABELS = {
  attivita: "Attività e ruolo",
  guadagno: "Come guadagna oggi",
  difficolta: "Difficoltà principale",
  prodotto_digitale: "Prodotto digitale",
  tipo_prodotto: "Tipo prodotto",
  tecnologia: "Livello tecnologia",
  investimento: "Disponibilità investimento",
  aspettative: "Aspettative",
};

export function ClientiAnalisi({ onAuthExpired }) {
  const [clienti, setClienti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPaid, setFilterPaid] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updating, setUpdating] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showQuestionarioModal, setShowQuestionarioModal] = useState(false);
  const [showFissaCallModal, setShowFissaCallModal] = useState(false);
  const [notesClaudio, setNotesClaudio] = useState("");
  const [dataCall, setDataCall] = useState("");
  const [stats, setStats] = useState({ totale: 0, questionario_completato: 0, call_fissata: 0, convertiti: 0 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClienti();
    loadStats();
  }, []);

  const loadClienti = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/clienti/admin/list");
      setClienti(await res.json() || []);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await adminFetch("/api/clienti/stats");
      setStats(await res.json());
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    }
  };

  const updateStatus = async (clienteId, newStatus, notes = null) => {
    setUpdating(true);
    try {
      await adminFetch(`/api/clienti/admin/${clienteId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes }),
      });
      await loadClienti();
      if (selectedCliente?.id === clienteId) {
        setSelectedCliente(prev => ({ ...prev, status: newStatus, notes }));
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nell'aggiornamento dello stato");
    } finally {
      setUpdating(false);
    }
  };

  // Generate AI Analysis
  const generateAnalysis = async (clienteId) => {
    setGeneratingAnalysis(true);
    setAnalysis(null);
    try {
      const res = await adminFetch(`/api/clienti/admin/${clienteId}/generate-analysis`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nella generazione dell'analisi");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  // Load existing analysis
  const loadAnalysis = async (clienteId) => {
    try {
      const res = await adminFetch(`/api/clienti/admin/${clienteId}/analysis`);
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
        setShowAnalysis(true);
      } else {
        generateAnalysis(clienteId);
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    }
  };

  // Download analysis as markdown
  const downloadAnalysisMD = () => {
    if (!analysis || !selectedCliente) return;
    const blob = new Blob([analysis], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Analisi_${selectedCliente.nome}_${selectedCliente.cognome}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download analysis as PDF
  const downloadAnalysisPDF = async () => {
    if (!selectedCliente) return;
    try {
      const res = await adminFetch(`/api/clienti/admin/${selectedCliente.id}/analysis/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Analisi_Strategica_${selectedCliente.nome}_${selectedCliente.cognome}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nel download del PDF. Assicurati che l'analisi sia stata generata.");
    }
  };

  // Download DOCX from workflow
  const downloadDOCX = (clienteId) => {
    window.open(`/api/clienti/${clienteId}/scarica-docx`, "_blank");
  };

  // Avvia workflow analisi
  const avviaAnalisi = async (clienteId) => {
    try {
      await adminFetch(`/api/clienti/${clienteId}/avvia-analisi`, { method: "POST" });
      alert("Workflow analisi avviato! Il documento sarà pronto in circa 30 secondi.");
      setTimeout(() => loadClienti(), 5000);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nell'avvio del workflow");
    }
  };

  // Fissa call
  const fissaCall = async () => {
    if (!selectedCliente || !dataCall) return;
    setUpdating(true);
    try {
      await adminFetch(`/api/clienti/${selectedCliente.id}/fissa-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data_call: dataCall, note: notesClaudio }),
      });
      setShowFissaCallModal(false);
      setDataCall("");
      await loadClienti();
      await loadStats();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nel fissare la call");
    } finally {
      setUpdating(false);
    }
  };

  // Save Claudio notes
  const saveNotesClaudio = async () => {
    if (!selectedCliente) return;
    setUpdating(true);
    try {
      await adminFetch(`/api/clienti/${selectedCliente.id}/note-claudio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: notesClaudio }),
      });
      alert("Note salvate!");
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setUpdating(false);
    }
  };

  // Converti in partner
  const convertiInPartner = async (clienteId) => {
    if (!confirm("Sei sicuro di voler convertire questo cliente in Partner F1?")) return;
    setUpdating(true);
    try {
      const res = await adminFetch(`/api/clienti/${clienteId}/converti-partner`, { method: "POST" });
      const data = await res.json();
      alert(data.message);
      await loadClienti();
      await loadStats();
      setShowQuestionarioModal(false);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") return onAuthExpired();
      alert("Errore nella conversione");
    } finally {
      setUpdating(false);
    }
  };

  // Segna non adatto
  const segnaNonAdatto = async (clienteId) => {
    if (!confirm("Sei sicuro di voler segnare questo cliente come non adatto?")) return;
    setUpdating(true);
    try {
      await adminFetch(`/api/clienti/${clienteId}/segna-non-adatto`, { method: "POST" });
      await loadClienti();
      await loadStats();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/clienti/admin/${deleteConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        setClienti(prev => prev.filter(c => c.id !== deleteConfirm.id));
        if (selectedCliente?.id === deleteConfirm.id) setSelectedCliente(null);
        setDeleteConfirm(null);
        loadStats();
      } else {
        window.alert("Errore nell'eliminazione del cliente.");
      }
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else window.alert("Errore nell'eliminazione del cliente.");
    } finally {
      setDeleting(false);
    }
  };

  // Check if cliente hasn't completed questionnaire after 24h
  const needsQuestionarioAlert = (cliente) => {
    if (cliente.questionario?.completato) return false;
    const dataAcquisto = new Date(cliente.data_acquisto || cliente.paid_at || cliente.created_at);
    const now = new Date();
    const hoursDiff = (now - dataAcquisto) / (1000 * 60 * 60);
    return hoursDiff > 24;
  };

  // Filter clienti
  const filteredClienti = clienti.filter(c => {
    const stato = c.stato || c.status;
    if (filterStatus !== "all" && stato !== filterStatus) return false;
    if (filterPaid === "paid" && !c.has_paid) return false;
    if (filterPaid === "unpaid" && c.has_paid) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        c.nome?.toLowerCase().includes(query) ||
        c.cognome?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Gestione Clienti</h1>
          <p className="text-sm text-slate-400">Analisi Strategiche acquistate</p>
        </div>
        <button onClick={loadClienti} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-slate-600 hover:border-yellow-400 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aggiorna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Totale", value: stats.totale, icon: Users, cls: "bg-gray-100 text-slate-600" },
          { label: "Questionario ✓", value: stats.questionario_completato, icon: FileText, cls: "bg-blue-100 text-blue-500" },
          { label: "Call fissata", value: stats.call_fissata, icon: Calendar, cls: "bg-yellow-100 text-yellow-600" },
          { label: "Convertiti", value: stats.convertiti, icon: CheckCircle, cls: "bg-emerald-100 text-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.cls}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400" />
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400">
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400">
          <option value="all">Tutti</option>
          <option value="paid">Solo pagati</option>
          <option value="unpaid">Non pagati</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1">
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-yellow-400 mx-auto mb-4" />
              <p className="text-sm text-slate-400">Caricamento...</p>
            </div>
          ) : filteredClienti.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-semibold text-slate-900">Nessun cliente trovato</p>
              <p className="text-sm text-slate-400">I clienti appariranno qui dopo l'acquisto dell'Analisi</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {filteredClienti.map((cliente) => {
                  const stato = cliente.stato || cliente.status || "pagato";
                  const statusConf = STATUS_CONFIG[stato] || STATUS_CONFIG.pagato;
                  const StatusIcon = statusConf.icon;
                  const hasQuestionario = cliente.questionario?.completato;
                  const needsAlert = needsQuestionarioAlert(cliente);
                  return (
                    <div key={cliente.id}
                      onClick={() => setSelectedCliente(cliente)}
                      className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedCliente?.id === cliente.id ? "bg-yellow-50" : ""
                      }`}>
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-semibold text-slate-900">
                          {cliente.nome?.[0]}{cliente.cognome?.[0]}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {cliente.nome} {cliente.cognome}
                          </span>
                          {cliente.has_paid && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                              €27
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400 truncate">{cliente.email}</div>
                      </div>

                      {/* Questionario Column */}
                      <div className="text-center min-w-[100px]">
                        {hasQuestionario ? (
                          <button onClick={(e) => { e.stopPropagation(); setSelectedCliente(cliente); setShowQuestionarioModal(true); }}
                            className="text-xs font-semibold text-blue-500 hover:underline">
                            ✓ Vedi risposte
                          </button>
                        ) : needsAlert ? (
                          <span className="text-xs font-semibold text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Non compilato
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">⏳ In attesa</span>
                        )}
                      </div>

                      {/* Analisi Column */}
                      <div className="text-center min-w-[100px]">
                        {cliente.docx_analisi_url ? (
                          <button onClick={(e) => { e.stopPropagation(); downloadDOCX(cliente.id); }}
                            className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1 justify-center">
                            <Download className="w-3 h-3" /> DOCX
                          </button>
                        ) : cliente.workflow_status === "generazione_ai" || cliente.workflow_status === "generazione_docx" ? (
                          <span className="text-xs text-yellow-600 flex items-center gap-1 justify-center">
                            <Loader2 className="w-3 h-3 animate-spin" /> In corso
                          </span>
                        ) : hasQuestionario && !cliente.docx_analisi_url ? (
                          <button onClick={(e) => { e.stopPropagation(); avviaAnalisi(cliente.id); }}
                            className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 justify-center">
                            <Sparkles className="w-3 h-3" /> Genera
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 min-w-[120px] justify-center ${statusConf.bg}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${statusConf.color}`} />
                        <span className={`text-xs font-semibold ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedCliente && (
          <div className="w-[450px] bg-white rounded-2xl border border-gray-200 overflow-hidden flex-shrink-0">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-yellow-50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center">
                    <span className="text-xl font-semibold text-slate-900">
                      {selectedCliente.nome?.[0]}{selectedCliente.cognome?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedCliente.nome} {selectedCliente.cognome}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {new Date(selectedCliente.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-yellow-400 text-slate-900"
                    title="Modifica dati cliente">
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifica
                  </button>
                  <button onClick={() => setDeleteConfirm(selectedCliente)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-red-100 text-red-600"
                    title="Elimina cliente">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setSelectedCliente(null)} className="p-1 hover:bg-black/5 rounded">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3">CONTATTI</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a href={`mailto:${selectedCliente.email}`} className="text-blue-500 hover:underline">
                      {selectedCliente.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-900">{selectedCliente.telefono}</span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 mb-3">AGGIORNA STATO</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { status: "approved", label: "🟢 Approvato", cls: "bg-emerald-50 text-emerald-600 border-emerald-500" },
                    { status: "roadmap", label: "🟡 Roadmap", cls: "bg-yellow-50 text-yellow-600 border-yellow-500" },
                    { status: "not_approved", label: "🔴 Non idoneo", cls: "bg-red-50 text-red-500 border-red-500" },
                  ].map((opt) => (
                    <button key={opt.status}
                      onClick={() => updateStatus(selectedCliente.id, opt.status)}
                      disabled={updating || selectedCliente.status === opt.status}
                      className={`p-3 rounded-xl text-xs font-semibold text-center transition-all border-2 ${opt.cls} ${
                        selectedCliente.status === opt.status ? "opacity-100" : "border-transparent opacity-70 hover:opacity-100"
                      }`}>
                      {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Analysis Button */}
              {selectedCliente.questionnaire && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-3">DOCUMENTO ANALISI</h4>
                  <button onClick={() => loadAnalysis(selectedCliente.id)} disabled={generatingAnalysis}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {generatingAnalysis ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generazione in corso...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Genera Analisi Strategica
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Documento AI personalizzato per la videocall
                  </p>
                </div>
              )}

              {/* Questionnaire Answers */}
              {selectedCliente.questionnaire && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-3">RISPOSTE QUESTIONARIO</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedCliente.questionnaire).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-xl bg-gray-50">
                        <div className="text-xs font-semibold text-slate-400 mb-1">
                          {QUESTION_LABELS[key] || key}
                        </div>
                        <div className="text-sm text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedCliente.questionnaire && (
                <div className="p-4 rounded-xl bg-gray-50 text-center">
                  <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Questionario non compilato</p>
                </div>
              )}

              {/* Actions */}
              {selectedCliente.status === "approved" && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-sm text-emerald-700 font-semibold mb-2">
                    ✅ Cliente approvato per la Partnership
                  </p>
                  <button className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                    Crea Account Partner
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modale conferma eliminazione cliente */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900">Elimina Cliente</h3>
                <p className="text-xs text-slate-400">Operazione irreversibile</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-slate-600">
                Stai per eliminare <strong className="text-slate-900">{deleteConfirm.nome} {deleteConfirm.cognome}</strong> ({deleteConfirm.email}) e tutti i dati collegati.
              </p>
              <ul className="space-y-1 text-xs text-slate-400">
                {["Account utente", "Questionario", "Analisi strategica", "Proposta e contratto", "Pagamenti"].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteConfirm(null)} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-slate-600">
                  Annulla
                </button>
                <button onClick={handleDeleteCliente} disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 bg-red-500 text-white">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? "Eliminando..." : "Elimina"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cliente Edit Modal */}
      {showEditModal && selectedCliente && (
        <ClienteEditModal
          cliente={selectedCliente}
          onClose={() => setShowEditModal(false)}
          onAuthExpired={onAuthExpired}
          onSaved={(updated) => {
            setSelectedCliente(updated);
            setClienti(prev => prev.map(c => c.id === updated.id ? updated : c));
            setShowEditModal(false);
          }}
        />
      )}

      {/* Analysis Modal */}
      {showAnalysis && analysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Analisi Strategica - {selectedCliente?.nome} {selectedCliente?.cognome}
                </h2>
                <p className="text-sm text-slate-400">Documento generato con AI</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadAnalysisPDF}
                  className="px-4 py-2 rounded-xl bg-yellow-400 text-slate-900 font-semibold text-sm hover:bg-yellow-500 transition-colors flex items-center gap-2">
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button onClick={downloadAnalysisMD}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-slate-600 font-semibold text-sm hover:border-yellow-400 transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  MD
                </button>
                <button onClick={() => { setShowAnalysis(false); setAnalysis(null); }}
                  className="p-2 hover:bg-black/5 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {analysis.split("\n").map((line, i) => {
                  if (line.startsWith("# ")) {
                    return <h1 key={i} className="text-2xl font-semibold text-slate-900 mt-6 mb-4">{line.slice(2)}</h1>;
                  }
                  if (line.startsWith("## ")) {
                    return <h2 key={i} className="text-xl font-semibold text-slate-900 mt-6 mb-3 border-b border-gray-200 pb-2">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith("### ")) {
                    return <h3 key={i} className="text-lg font-semibold text-slate-900 mt-4 mb-2">{line.slice(4)}</h3>;
                  }
                  if (line.includes("**")) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i} className="text-slate-600 mb-2">
                        {parts.map((part, j) =>
                          j % 2 === 1 ? <strong key={j} className="text-slate-900">{part}</strong> : part
                        )}
                      </p>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return <li key={i} className="text-slate-600 ml-4 mb-1">{line.slice(2)}</li>;
                  }
                  if (/^\d+\.\s/.test(line)) {
                    return <li key={i} className="text-slate-600 ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, "")}</li>;
                  }
                  if (line === "---") {
                    return <hr key={i} className="my-6 border-gray-200" />;
                  }
                  if (!line.trim()) {
                    return <br key={i} />;
                  }
                  return <p key={i} className="text-slate-600 mb-2">{line}</p>;
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                💡 Puoi scaricare questo documento e modificarlo prima della videocall
              </p>
              <button onClick={() => generateAnalysis(selectedCliente.id)} disabled={generatingAnalysis}
                className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-slate-600 hover:border-yellow-400 transition-colors flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${generatingAnalysis ? "animate-spin" : ""}`} />
                Rigenera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vedi Risposte Questionario */}
      {showQuestionarioModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Risposte Questionario</h2>
                <p className="text-sm text-slate-400">{selectedCliente.nome} {selectedCliente.cognome}</p>
              </div>
              <button onClick={() => setShowQuestionarioModal(false)} className="p-2 hover:bg-gray-50 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedCliente.questionario?.risposte ? (
                <div className="space-y-4">
                  {Object.entries(QUESTIONARIO_LABELS).map(([key, label]) => (
                    <div key={key} className={`p-4 rounded-xl ${key === "perche_adesso" ? "border-2 border-yellow-400 bg-yellow-50" : "bg-gray-50"}`}>
                      {key === "perche_adesso" && (
                        <div className="flex items-center gap-1 mb-2">
                          <Target className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-semibold text-yellow-600">LA PIÙ IMPORTANTE</span>
                        </div>
                      )}
                      <div className="text-xs font-semibold text-slate-400 mb-1">{label}</div>
                      <div className="text-sm text-slate-900">{selectedCliente.questionario.risposte[key] || "—"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-slate-400">Questionario non ancora compilato</p>
                </div>
              )}

              {/* Note Claudio */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="block text-sm font-semibold text-slate-900 mb-2">Note interne di Claudio</label>
                <textarea
                  value={notesClaudio || selectedCliente.call?.note_claudio || ""}
                  onChange={(e) => setNotesClaudio(e.target.value)}
                  placeholder="Aggiungi note per la call..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400"
                />
                <button onClick={saveNotesClaudio} disabled={updating}
                  className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-black transition-colors">
                  Salva note
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
              <button onClick={() => convertiInPartner(selectedCliente.id)}
                disabled={updating || selectedCliente.stato === "convertito"}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">
                ✓ Converti in Partner
              </button>
              <button onClick={() => { setShowQuestionarioModal(false); setShowFissaCallModal(true); }}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-slate-900 font-semibold text-sm hover:bg-yellow-500 transition-colors">
                📅 Fissa Call
              </button>
              <button onClick={() => segnaNonAdatto(selectedCliente.id)} disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors">
                ✗ Non adatto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fissa Call */}
      {showFissaCallModal && selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-slate-900">Fissa Call</h2>
              <p className="text-sm text-slate-400">Con {selectedCliente.nome} {selectedCliente.cognome}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Data e ora</label>
                <input type="datetime-local" value={dataCall} onChange={(e) => setDataCall(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Note (opzionale)</label>
                <textarea value={notesClaudio} onChange={(e) => setNotesClaudio(e.target.value)}
                  placeholder="Note per la call..." rows={2}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-yellow-400" />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
              <button onClick={() => setShowFissaCallModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-slate-600 font-semibold text-sm">
                Annulla
              </button>
              <button onClick={fissaCall} disabled={!dataCall || updating}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-slate-900 font-semibold text-sm hover:bg-yellow-500 transition-colors disabled:opacity-50">
                {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Conferma Call"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
