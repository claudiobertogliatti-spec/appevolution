import React, { useState, useEffect } from "react";
import { 
  Users, Search, Filter, Eye, CheckCircle, XCircle, 
  Clock, AlertTriangle, ChevronRight, Mail, Phone,
  FileText, Calendar, Target, X, Loader2, RefreshCw,
  ArrowRight, MapPin, Sparkles, Download, FileDown
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Status configuration (nuovo modello)
const STATUS_CONFIG = {
  pagato: { label: "Pagato", color: "#9CA3AF", icon: Clock, bg: "#9CA3AF20" },
  questionario_completato: { label: "Questionario ✓", color: "#3B82F6", icon: FileText, bg: "#3B82F620" },
  call_fissata: { label: "Call fissata", color: "#F5C518", icon: Calendar, bg: "#F5C51820" },
  proposta_inviata: { label: "Proposta inviata", color: "#F59E0B", icon: Target, bg: "#F59E0B20" },
  convertito: { label: "Partner ✓", color: "#10B981", icon: CheckCircle, bg: "#10B98120" },
  non_convertito: { label: "Non convertito", color: "#EF4444", icon: XCircle, bg: "#EF444420" },
  // Legacy statuses
  registered: { label: "Registrato", color: "#9CA3AF", icon: Clock, bg: "#9CA3AF20" },
  pending: { label: "In attesa", color: "#F5C518", icon: Clock, bg: "#F5C51820" },
  in_review: { label: "In revisione", color: "#3B82F6", icon: FileText, bg: "#3B82F620" },
  approved: { label: "Approvato", color: "#10B981", icon: CheckCircle, bg: "#10B98120" },
  not_approved: { label: "Non idoneo", color: "#EF4444", icon: XCircle, bg: "#EF444420" }
};

// Questionario pre-call labels
const QUESTIONARIO_LABELS = {
  expertise: "In cosa sei esperto/a",
  cliente_ideale: "Cliente ideale",
  pubblico_esistente: "Pubblico esistente",
  esperienze_passate: "Esperienze passate",
  ostacolo_principale: "Ostacolo principale",
  obiettivo_12_mesi: "Obiettivo 12 mesi",
  perche_adesso: "Perché adesso"
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
  aspettative: "Aspettative"
};

export function AdminClientiPanel() {
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

  useEffect(() => {
    loadClienti();
    loadStats();
  }, []);

  const loadClienti = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/clienti/admin/list`);
      setClienti(res.data || []);
    } catch (e) {
      console.error("Error loading clienti:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await axios.get(`${API}/clienti/stats`);
      setStats(res.data);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  };

  const updateStatus = async (clienteId, newStatus, notes = null) => {
    setUpdating(true);
    try {
      await axios.put(`${API}/clienti/admin/${clienteId}/status`, {
        status: newStatus,
        notes: notes
      });
      await loadClienti();
      if (selectedCliente?.id === clienteId) {
        setSelectedCliente(prev => ({ ...prev, status: newStatus, notes }));
      }
    } catch (e) {
      console.error("Error updating status:", e);
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
      const res = await axios.post(`${API}/clienti/admin/${clienteId}/generate-analysis`);
      if (res.data.success) {
        setAnalysis(res.data.analysis);
        setShowAnalysis(true);
      }
    } catch (e) {
      console.error("Error generating analysis:", e);
      alert(e.response?.data?.detail || "Errore nella generazione dell'analisi");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  // Load existing analysis
  const loadAnalysis = async (clienteId) => {
    try {
      const res = await axios.get(`${API}/clienti/admin/${clienteId}/analysis`);
      if (res.data.success) {
        setAnalysis(res.data.analysis);
        setShowAnalysis(true);
      } else {
        // No analysis exists, generate new one
        generateAnalysis(clienteId);
      }
    } catch (e) {
      console.error("Error loading analysis:", e);
    }
  };

  // Download analysis as text file (markdown)
  const downloadAnalysisMD = () => {
    if (!analysis || !selectedCliente) return;
    const blob = new Blob([analysis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
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
      const response = await axios.get(
        `${API}/clienti/admin/${selectedCliente.id}/analysis/pdf`,
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analisi_Strategica_${selectedCliente.nome}_${selectedCliente.cognome}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error downloading PDF:", e);
      alert("Errore nel download del PDF. Assicurati che l'analisi sia stata generata.");
    }
  };

  // Fissa call
  const fissaCall = async () => {
    if (!selectedCliente || !dataCall) return;
    setUpdating(true);
    try {
      await axios.post(`${API}/clienti/${selectedCliente.id}/fissa-call`, {
        data_call: dataCall,
        note: notesClaudio
      });
      setShowFissaCallModal(false);
      setDataCall("");
      await loadClienti();
      await loadStats();
    } catch (e) {
      console.error("Error fixing call:", e);
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
      await axios.post(`${API}/clienti/${selectedCliente.id}/note-claudio`, {
        note: notesClaudio
      });
      alert("Note salvate!");
    } catch (e) {
      console.error("Error saving notes:", e);
    } finally {
      setUpdating(false);
    }
  };

  // Converti in partner
  const convertiInPartner = async (clienteId) => {
    if (!confirm("Sei sicuro di voler convertire questo cliente in Partner F1?")) return;
    setUpdating(true);
    try {
      const res = await axios.post(`${API}/clienti/${clienteId}/converti-partner`);
      alert(res.data.message);
      await loadClienti();
      await loadStats();
      setShowQuestionarioModal(false);
    } catch (e) {
      console.error("Error converting to partner:", e);
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
      await axios.post(`${API}/clienti/${clienteId}/segna-non-adatto`);
      await loadClienti();
      await loadStats();
    } catch (e) {
      console.error("Error marking as not suitable:", e);
    } finally {
      setUpdating(false);
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
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2128]">Gestione Clienti</h1>
          <p className="text-sm text-[#9CA3AF]">Analisi Strategiche acquistate</p>
        </div>
        <button 
          onClick={loadClienti}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#ECEDEF] text-sm font-semibold text-[#5F6572] hover:border-[#F5C518] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Totale", value: stats.totale, icon: Users, color: "#5F6572" },
          { label: "Questionario ✓", value: stats.questionario_completato, icon: FileText, color: "#3B82F6" },
          { label: "Call fissata", value: stats.call_fissata, icon: Calendar, color: "#F5C518" },
          { label: "Convertiti", value: stats.convertiti, icon: CheckCircle, color: "#10B981" }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-[#ECEDEF]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1E2128]">{stat.value}</div>
                <div className="text-xs text-[#9CA3AF]">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per nome o email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
        >
          <option value="all">Tutti gli stati</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>

        <select
          value={filterPaid}
          onChange={(e) => setFilterPaid(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
        >
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
            <div className="bg-white rounded-2xl border border-[#ECEDEF] p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#F5C518] mx-auto mb-4" />
              <p className="text-sm text-[#9CA3AF]">Caricamento...</p>
            </div>
          ) : filteredClienti.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ECEDEF] p-12 text-center">
              <Users className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
              <p className="font-semibold text-[#1E2128]">Nessun cliente trovato</p>
              <p className="text-sm text-[#9CA3AF]">I clienti appariranno qui dopo l'acquisto dell'Analisi</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
              <div className="divide-y divide-[#ECEDEF]">
                {filteredClienti.map((cliente) => {
                  const stato = cliente.stato || cliente.status || "pagato";
                  const statusConf = STATUS_CONFIG[stato] || STATUS_CONFIG.pagato;
                  const StatusIcon = statusConf.icon;
                  const hasQuestionario = cliente.questionario?.completato;
                  const needsAlert = needsQuestionarioAlert(cliente);
                  return (
                    <div 
                      key={cliente.id}
                      onClick={() => setSelectedCliente(cliente)}
                      className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-[#FAFAF7] transition-colors ${
                        selectedCliente?.id === cliente.id ? 'bg-[#FEF9E7]' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F5C518] to-[#c49a12] flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-black">
                          {cliente.nome?.[0]}{cliente.cognome?.[0]}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E2128]">
                            {cliente.nome} {cliente.cognome}
                          </span>
                          {cliente.has_paid && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-600">
                              €67
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#9CA3AF] truncate">{cliente.email}</div>
                      </div>

                      {/* Questionario Column */}
                      <div className="text-center min-w-[100px]">
                        {hasQuestionario ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCliente(cliente); setShowQuestionarioModal(true); }}
                            className="text-xs font-bold text-[#3B82F6] hover:underline"
                          >
                            ✓ Vedi risposte
                          </button>
                        ) : needsAlert ? (
                          <span className="text-xs font-bold text-[#EF4444] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Non compilato
                          </span>
                        ) : (
                          <span className="text-xs text-[#9CA3AF]">⏳ In attesa</span>
                        )}
                      </div>

                      {/* Status */}
                      <div 
                        className="px-3 py-1.5 rounded-full flex items-center gap-1.5 min-w-[120px] justify-center"
                        style={{ background: statusConf.bg }}
                      >
                        <StatusIcon className="w-3.5 h-3.5" style={{ color: statusConf.color }} />
                        <span className="text-xs font-bold" style={{ color: statusConf.color }}>
                          {statusConf.label}
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedCliente && (
          <div className="w-[450px] bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden flex-shrink-0">
            {/* Header */}
            <div className="p-6 border-b border-[#ECEDEF] bg-gradient-to-r from-[#F5C518]/10 to-transparent">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F5C518] to-[#c49a12] flex items-center justify-center">
                    <span className="text-xl font-bold text-black">
                      {selectedCliente.nome?.[0]}{selectedCliente.cognome?.[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E2128]">
                      {selectedCliente.nome} {selectedCliente.cognome}
                    </h3>
                    <p className="text-sm text-[#9CA3AF]">
                      {new Date(selectedCliente.created_at).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCliente(null)}
                  className="p-1 hover:bg-black/5 rounded"
                >
                  <X className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* Contact Info */}
              <div>
                <h4 className="text-xs font-bold text-[#9CA3AF] mb-3">CONTATTI</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-[#9CA3AF]" />
                    <a href={`mailto:${selectedCliente.email}`} className="text-[#3B82F6] hover:underline">
                      {selectedCliente.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-[#9CA3AF]" />
                    <span className="text-[#1E2128]">{selectedCliente.telefono}</span>
                  </div>
                </div>
              </div>

              {/* Status Update */}
              <div>
                <h4 className="text-xs font-bold text-[#9CA3AF] mb-3">AGGIORNA STATO</h4>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { status: "approved", label: "🟢 Approvato", color: "#10B981" },
                    { status: "roadmap", label: "🟡 Roadmap", color: "#F59E0B" },
                    { status: "not_approved", label: "🔴 Non idoneo", color: "#EF4444" }
                  ].map((opt) => (
                    <button
                      key={opt.status}
                      onClick={() => updateStatus(selectedCliente.id, opt.status)}
                      disabled={updating || selectedCliente.status === opt.status}
                      className={`p-3 rounded-xl text-xs font-bold text-center transition-all border-2 ${
                        selectedCliente.status === opt.status
                          ? 'border-current opacity-100'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ 
                        background: `${opt.color}15`,
                        color: opt.color,
                        borderColor: selectedCliente.status === opt.status ? opt.color : 'transparent'
                      }}
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Analysis Button */}
              {selectedCliente.questionnaire && (
                <div>
                  <h4 className="text-xs font-bold text-[#9CA3AF] mb-3">DOCUMENTO ANALISI</h4>
                  <button
                    onClick={() => loadAnalysis(selectedCliente.id)}
                    disabled={generatingAnalysis}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#F5C518] to-[#e0b115] text-black hover:from-[#e0b115] hover:to-[#c49a12] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
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
                  <p className="text-xs text-[#9CA3AF] text-center mt-2">
                    Documento AI personalizzato per la videocall
                  </p>
                </div>
              )}

              {/* Questionnaire Answers */}
              {selectedCliente.questionnaire && (
                <div>
                  <h4 className="text-xs font-bold text-[#9CA3AF] mb-3">RISPOSTE QUESTIONARIO</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedCliente.questionnaire).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-xl bg-[#FAFAF7]">
                        <div className="text-xs font-bold text-[#9CA3AF] mb-1">
                          {QUESTION_LABELS[key] || key}
                        </div>
                        <div className="text-sm text-[#1E2128]">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedCliente.questionnaire && (
                <div className="p-4 rounded-xl bg-[#FAFAF7] text-center">
                  <AlertTriangle className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                  <p className="text-sm text-[#9CA3AF]">Questionario non compilato</p>
                </div>
              )}

              {/* Actions */}
              {selectedCliente.status === "approved" && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700 font-semibold mb-2">
                    ✅ Cliente approvato per la Partnership
                  </p>
                  <button className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    Crea Account Partner
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analysis Modal */}
      {showAnalysis && analysis && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#ECEDEF] flex items-center justify-between bg-gradient-to-r from-[#F5C518]/10 to-transparent">
              <div>
                <h2 className="text-xl font-bold text-[#1E2128]">
                  Analisi Strategica - {selectedCliente?.nome} {selectedCliente?.cognome}
                </h2>
                <p className="text-sm text-[#9CA3AF]">Documento generato con AI</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadAnalysisPDF}
                    className="px-4 py-2 rounded-xl bg-[#F5C518] text-black font-semibold text-sm hover:bg-[#e0b115] transition-colors flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={downloadAnalysisMD}
                    className="px-4 py-2 rounded-xl bg-white border border-[#ECEDEF] text-[#5F6572] font-semibold text-sm hover:border-[#F5C518] transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    MD
                  </button>
                </div>
                <button
                  onClick={() => { setShowAnalysis(false); setAnalysis(null); }}
                  className="p-2 hover:bg-black/5 rounded-lg"
                >
                  <X className="w-5 h-5 text-[#9CA3AF]" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none">
                {analysis.split('\n').map((line, i) => {
                  // Handle headers
                  if (line.startsWith('# ')) {
                    return <h1 key={i} className="text-2xl font-bold text-[#1E2128] mt-6 mb-4">{line.slice(2)}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="text-xl font-bold text-[#1E2128] mt-6 mb-3 border-b border-[#ECEDEF] pb-2">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={i} className="text-lg font-bold text-[#1E2128] mt-4 mb-2">{line.slice(4)}</h3>;
                  }
                  // Handle bold
                  if (line.includes('**')) {
                    const parts = line.split(/\*\*(.*?)\*\*/g);
                    return (
                      <p key={i} className="text-[#5F6572] mb-2">
                        {parts.map((part, j) => 
                          j % 2 === 1 ? <strong key={j} className="text-[#1E2128]">{part}</strong> : part
                        )}
                      </p>
                    );
                  }
                  // Handle list items
                  if (line.startsWith('- ')) {
                    return <li key={i} className="text-[#5F6572] ml-4 mb-1">{line.slice(2)}</li>;
                  }
                  // Handle numbered lists
                  if (/^\d+\.\s/.test(line)) {
                    return <li key={i} className="text-[#5F6572] ml-4 mb-1 list-decimal">{line.replace(/^\d+\.\s/, '')}</li>;
                  }
                  // Handle horizontal rule
                  if (line === '---') {
                    return <hr key={i} className="my-6 border-[#ECEDEF]" />;
                  }
                  // Empty line
                  if (!line.trim()) {
                    return <br key={i} />;
                  }
                  // Regular paragraph
                  return <p key={i} className="text-[#5F6572] mb-2">{line}</p>;
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#ECEDEF] bg-[#FAFAF7] flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">
                💡 Puoi scaricare questo documento e modificarlo prima della videocall
              </p>
              <button
                onClick={() => generateAnalysis(selectedCliente.id)}
                disabled={generatingAnalysis}
                className="px-4 py-2 rounded-xl bg-white border border-[#ECEDEF] text-sm font-semibold text-[#5F6572] hover:border-[#F5C518] transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${generatingAnalysis ? 'animate-spin' : ''}`} />
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
            <div className="p-6 border-b border-[#ECEDEF] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#1E2128]">Risposte Questionario</h2>
                <p className="text-sm text-[#9CA3AF]">{selectedCliente.nome} {selectedCliente.cognome}</p>
              </div>
              <button onClick={() => setShowQuestionarioModal(false)} className="p-2 hover:bg-[#FAFAF7] rounded-lg">
                <X className="w-5 h-5 text-[#9CA3AF]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {selectedCliente.questionario?.risposte ? (
                <div className="space-y-4">
                  {Object.entries(QUESTIONARIO_LABELS).map(([key, label]) => (
                    <div key={key} className={`p-4 rounded-xl ${key === 'perche_adesso' ? 'border-2 border-[#F5C518] bg-[#FEF9E7]/30' : 'bg-[#FAFAF7]'}`}>
                      {key === 'perche_adesso' && (
                        <div className="flex items-center gap-1 mb-2">
                          <Target className="w-4 h-4 text-[#F5C518]" />
                          <span className="text-xs font-bold text-[#C4990A]">LA PIÙ IMPORTANTE</span>
                        </div>
                      )}
                      <div className="text-xs font-bold text-[#9CA3AF] mb-1">{label}</div>
                      <div className="text-sm text-[#1E2128]">{selectedCliente.questionario.risposte[key] || "—"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-[#F5C518] mx-auto mb-3" />
                  <p className="text-[#9CA3AF]">Questionario non ancora compilato</p>
                </div>
              )}

              {/* Note Claudio */}
              <div className="mt-6 pt-6 border-t border-[#ECEDEF]">
                <label className="block text-sm font-bold text-[#1E2128] mb-2">Note interne di Claudio</label>
                <textarea
                  value={notesClaudio || selectedCliente.call?.note_claudio || ""}
                  onChange={(e) => setNotesClaudio(e.target.value)}
                  placeholder="Aggiungi note per la call..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
                />
                <button
                  onClick={saveNotesClaudio}
                  disabled={updating}
                  className="mt-2 px-4 py-2 rounded-lg bg-[#1E2128] text-white text-sm font-bold hover:bg-black transition-colors"
                >
                  Salva note
                </button>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#ECEDEF] bg-[#FAFAF7] flex items-center gap-3">
              <button
                onClick={() => convertiInPartner(selectedCliente.id)}
                disabled={updating || selectedCliente.stato === "convertito"}
                className="flex-1 py-2.5 rounded-xl bg-[#10B981] text-white font-bold text-sm hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                ✓ Converti in Partner
              </button>
              <button
                onClick={() => { setShowQuestionarioModal(false); setShowFissaCallModal(true); }}
                className="flex-1 py-2.5 rounded-xl bg-[#F5C518] text-[#1E2128] font-bold text-sm hover:bg-[#e0b115] transition-colors"
              >
                📅 Fissa Call
              </button>
              <button
                onClick={() => segnaNonAdatto(selectedCliente.id)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-white border border-[#ECEDEF] text-[#EF4444] font-bold text-sm hover:bg-red-50 transition-colors"
              >
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
            <div className="p-6 border-b border-[#ECEDEF]">
              <h2 className="text-xl font-bold text-[#1E2128]">Fissa Call</h2>
              <p className="text-sm text-[#9CA3AF]">Con {selectedCliente.nome} {selectedCliente.cognome}</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#1E2128] mb-2">Data e ora</label>
                <input
                  type="datetime-local"
                  value={dataCall}
                  onChange={(e) => setDataCall(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#1E2128] mb-2">Note (opzionale)</label>
                <textarea
                  value={notesClaudio}
                  onChange={(e) => setNotesClaudio(e.target.value)}
                  placeholder="Note per la call..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-[#ECEDEF] text-sm focus:outline-none focus:border-[#F5C518]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#ECEDEF] bg-[#FAFAF7] flex items-center gap-3">
              <button
                onClick={() => setShowFissaCallModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white border border-[#ECEDEF] text-[#5F6572] font-bold text-sm"
              >
                Annulla
              </button>
              <button
                onClick={fissaCall}
                disabled={!dataCall || updating}
                className="flex-1 py-2.5 rounded-xl bg-[#F5C518] text-[#1E2128] font-bold text-sm hover:bg-[#e0b115] transition-colors disabled:opacity-50"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Conferma Call"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClientiPanel;
