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
    </div>
  );
}

export default AdminClientiPanel;
