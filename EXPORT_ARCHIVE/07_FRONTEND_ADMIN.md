# PARTE 7: FRONTEND ADMIN COMPONENTS

## 📁 /app/frontend/src/components/admin/AdminClientiPanel.jsx
```jsx
import React, { useState, useEffect } from "react";
import { 
  Users, Search, Filter, Eye, CheckCircle, XCircle, 
  Clock, AlertTriangle, ChevronRight, Mail, Phone,
  FileText, Calendar, Target, X, Loader2, RefreshCw,
  ArrowRight, MapPin, Sparkles, Download, FileDown
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Status configuration
const STATUS_CONFIG = {
  registered: { label: "Registrato", color: "#9CA3AF", icon: Clock, bg: "#9CA3AF20" },
  pending: { label: "In attesa videocall", color: "#F5C518", icon: Clock, bg: "#F5C51820" },
  in_review: { label: "In revisione", color: "#3B82F6", icon: FileText, bg: "#3B82F620" },
  approved: { label: "Approvato", color: "#10B981", icon: CheckCircle, bg: "#10B98120" },
  not_approved: { label: "Non idoneo", color: "#EF4444", icon: XCircle, bg: "#EF444420" },
  roadmap: { label: "Roadmap", color: "#F59E0B", icon: MapPin, bg: "#F59E0B20" }
};

// Questionnaire labels
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

  useEffect(() => {
    loadClienti();
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

  // Filter clienti
  const filteredClienti = clienti.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
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

  // Stats
  const stats = {
    total: clienti.length,
    paid: clienti.filter(c => c.has_paid).length,
    pending: clienti.filter(c => c.status === "pending").length,
    approved: clienti.filter(c => c.status === "approved").length
  };

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
          { label: "Totale", value: stats.total, icon: Users, color: "#5F6572" },
          { label: "Pagati", value: stats.paid, icon: CheckCircle, color: "#10B981" },
          { label: "In attesa", value: stats.pending, icon: Clock, color: "#F5C518" },
          { label: "Approvati", value: stats.approved, icon: Target, color: "#10B981" }
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
                  const statusConf = STATUS_CONFIG[cliente.status] || STATUS_CONFIG.registered;
                  const StatusIcon = statusConf.icon;
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
                              PAGATO
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#9CA3AF] truncate">{cliente.email}</div>
                      </div>

                      {/* Status */}
                      <div 
                        className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
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
    </div>
  );
}

export default AdminClientiPanel;
```

## 📁 /app/frontend/src/components/admin/AdminSidebarLight.jsx
```jsx
import { useState } from "react";
import { LayoutDashboard, Users, Film, FileText, BarChart3, MessageCircle, AlertTriangle, Settings, ChevronDown, ChevronRight, LogOut, Database, Edit3, Trophy, Zap, HelpCircle, Webhook, Bot, Target, DollarSign, UsersRound, FileCheck, ClipboardCheck, UserPlus } from "lucide-react";

const CLAUDIO_NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clienti", label: "Clienti Analisi", icon: UserPlus, dot: true },
  { id: "partner", label: "Partner", icon: Users },
  { id: "team", label: "Team Evolution", icon: UsersRound },
  { id: "agenti", label: "Agent Hub", icon: Bot },
  { id: "approvals", label: "Approvazioni", icon: ClipboardCheck, dot: true },
  { id: "orion", label: "ORION Lead Scoring", icon: Target },
  { id: "sales-kpi", label: "Sales KPI", icon: DollarSign, badge: "€7" },
  { id: "documenti-partner", label: "Documenti Partner", icon: FileText },
  { id: "onboarding-admin", label: "Onboarding Docs", icon: FileCheck },
  { id: "andrea", label: "Editing", icon: Film },
  { id: "metriche", label: "Post-Lancio", icon: BarChart3 },
  { id: "valentina", label: "VALENTINA", icon: MessageCircle, dot: true },
];

const ANTONELLA_NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clienti", label: "Clienti Analisi", icon: UserPlus, dot: true },
  { id: "partner", label: "Partner", icon: Users },
  { id: "team", label: "Team Evolution", icon: UsersRound },
  { id: "agenti", label: "Agent Hub", icon: Bot },
  { id: "approvals", label: "Approvazioni", icon: ClipboardCheck, dot: true },
  { id: "orion", label: "ORION Lead Scoring", icon: Target },
  { id: "sales-kpi", label: "Sales KPI", icon: DollarSign, badge: "€7" },
  { id: "documenti-partner", label: "Documenti Partner", icon: FileText },
  { id: "onboarding-admin", label: "Onboarding Docs", icon: FileCheck },
  { id: "andrea", label: "ANDREA — Editing Feed", icon: Film },
  { id: "copyfactory", label: "STEFANIA — Copy Factory", icon: Edit3 },
  { id: "atlas", label: "ATLAS", icon: Trophy },
];

const TOOLS_NAV = [
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "systeme", label: "Systeme.io", icon: Database },
  { id: "gaia", label: "GAIA Funnel", icon: Zap },
  { id: "warmode", label: "War Mode Ads", icon: AlertTriangle },
  { id: "compliance", label: "LUCA Compliance", icon: FileText },
];

export function AdminSidebarLight({ currentNav, onNavigate, adminUser, setAdminUser, alerts, onLogout, onSwitchToPartner, currentUser }) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const navItems = adminUser === "antonella" ? ANTONELLA_NAV : CLAUDIO_NAV;
  const isToolNav = TOOLS_NAV.some(t => t.id === currentNav);

  return (
    <div className="w-64 min-w-64 flex flex-col h-full border-r overflow-hidden" 
         style={{ background: '#FFFFFF', borderColor: '#F0EFEB' }}>
      
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: '#F0EFEB' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
               style={{ background: '#F2C418' }}>
            <span className="text-lg font-black text-[#1E2128]">E</span>
          </div>
          <div>
            <div className="font-black text-base" style={{ color: '#2D3239' }}>
              Evolution<span style={{ color: '#F2C418' }}>Pro</span>
            </div>
            <div className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>OS Platform</div>
          </div>
        </div>
      </div>

      {/* Admin/Partner Toggle */}
      <div className="px-4 py-3">
        <div className="flex rounded-lg p-1" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
          <button 
            className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
            style={{ background: '#F2C418', color: '#1E2128', boxShadow: '0 4px 20px rgba(242,196,24,0.25)' }}
          >
            Admin
          </button>
          <button 
            onClick={onSwitchToPartner}
            className="flex-1 py-1.5 text-xs font-bold rounded-md transition-all"
            style={{ color: '#9CA3AF' }}
          >
            Partner
          </button>
        </div>
      </div>

      {/* Admin Switcher */}
      <div className="px-4 pb-2">
        <div className="flex rounded-lg p-1" style={{ background: '#FAFAF7' }}>
          <button 
            onClick={() => { setAdminUser("claudio"); onNavigate("overview"); }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              adminUser === "claudio" ? '' : ''
            }`}
            style={{ 
              background: adminUser === "claudio" ? '#1E2128' : 'transparent',
              color: adminUser === "claudio" ? '#F2C418' : '#9CA3AF'
            }}
          >
            Claudio
          </button>
          <button 
            onClick={() => { setAdminUser("antonella"); onNavigate("overview"); }}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all`}
            style={{ 
              background: adminUser === "antonella" ? '#7B68AE' : 'transparent',
              color: adminUser === "antonella" ? 'white' : '#9CA3AF'
            }}
          >
            Antonella
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 my-1" style={{ height: 1, background: '#F5F4F1' }} />

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-2" 
             style={{ color: '#9CA3AF' }}>
          {adminUser === "antonella" ? "Area Antonella" : "Area Claudio"}
        </div>
        
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentNav === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                style={{ 
                  background: isActive ? '#FFF3C4' : 'transparent',
                  borderLeft: isActive ? '3px solid #F2C418' : '3px solid transparent',
                  color: isActive ? '#1E2128' : '#3B4049'
                }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ 
                       background: isActive ? '#F2C418' : '#FFF8DC',
                       color: isActive ? '#1E2128' : '#C4990A'
                     }}>
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-sm flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {item.dot && (
                  <span className="w-2 h-2 rounded-full" style={{ background: '#34C77B' }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Tools Section - Solo per Claudio */}
        {adminUser === "claudio" && (
          <div className="mt-3">
            <button 
              onClick={() => setToolsOpen(!toolsOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all"
              style={{ 
                background: isToolNav ? '#FFF8DC' : 'transparent',
                color: isToolNav ? '#1E2128' : '#8D929C'
              }}
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-bold flex-1">Strumenti</span>
              {toolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {toolsOpen && (
              <nav className="mt-1 ml-2 pl-3 border-l space-y-0.5" style={{ borderColor: '#F5F4F1' }}>
                {TOOLS_NAV.map(item => {
                  const isActive = currentNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all"
                      style={{ 
                        background: isActive ? '#FFF8DC' : 'transparent',
                        color: isActive ? '#1E2128' : '#8D929C'
                      }}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}

        {/* Alert Button */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F5F4F1' }}>
          <button 
            onClick={() => onNavigate("alert")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all"
            style={{ 
              background: currentNav === "alert" ? '#FDECEF' : alerts?.length > 0 ? '#FFFDF5' : 'transparent',
              color: alerts?.length > 0 ? '#EF476F' : '#8D929C'
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold flex-1">Alert</span>
            {alerts?.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#EF476F', color: 'white' }}>
                {alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t" style={{ borderColor: '#F5F4F1' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
               style={{ 
                 background: adminUser === "antonella" ? '#7B68AE' : '#F2C418',
                 color: adminUser === "antonella" ? 'white' : '#1E2128'
               }}>
            {currentUser?.name?.split(" ").map(n => n[0]).join("") || "CB"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: '#1E2128' }}>
              {currentUser?.name || (adminUser === "antonella" ? "Antonella Rossi" : "Claudio Bertogliatti")}
            </div>
            <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
              Admin · {adminUser === "antonella" ? "Operations" : "Fondatore"}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all hover:bg-[#FFF8DC]"
            style={{ color: '#8D929C' }}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Aiuto</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all hover:bg-red-50 hover:text-red-500"
            style={{ color: '#8D929C' }}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-semibold">Esci</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSidebarLight;
```
