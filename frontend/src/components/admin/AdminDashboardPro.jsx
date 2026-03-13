import { useState, useEffect } from "react";
import { 
  Users, TrendingUp, Rocket, AlertTriangle, Clock, 
  ChevronRight, Search, Filter, Eye, Phone, CheckCircle2,
  Calendar, FileText, ArrowUpRight, RefreshCw, BarChart3
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE FASI
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_LABELS = {
  F0: "Onboarding",
  F1: "Onboarding", 
  F2: "Posizionamento",
  F3: "Masterclass",
  F4: "Struttura Corso",
  F5: "Produzione Video",
  F6: "Costruzione Accademia",
  F7: "Preparazione Lancio",
  F8: "Lancio",
  F9: "Ottimizzazione",
  F10: "Scalabilità"
};

const getPhaseProgress = (phase) => {
  const phaseNum = parseInt(phase?.replace('F', '') || '0');
  return Math.min(Math.round((phaseNum / 8) * 100), 100);
};

const getStatus = (lastActivity, phase) => {
  if (!lastActivity) return { label: "In attesa", color: "#F59E0B", bg: "#FEF3C7" };
  
  const daysSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceActivity > 10) return { label: "Bloccato", color: "#EF4444", bg: "#FEE2E2" };
  if (daysSinceActivity > 5) return { label: "In attesa", color: "#F59E0B", bg: "#FEF3C7" };
  return { label: "Attivo", color: "#22C55E", bg: "#DCFCE7" };
};

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, trend, color }) {
  return (
    <div className="bg-white rounded-xl border border-[#ECEDEF] p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center"
             style={{ background: `${color}20`, color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-2xl font-black" style={{ color: '#1E2128' }}>{value}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{label}</div>
        </div>
        {trend && (
          <div className="text-xs font-bold px-2 py-1 rounded-full"
               style={{ background: '#DCFCE7', color: '#22C55E' }}>
            +{trend}%
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerRow({ partner, onOpenProject }) {
  const status = getStatus(partner.lastActivity, partner.phase);
  const progress = getPhaseProgress(partner.phase);
  
  return (
    <tr className="border-b border-[#ECEDEF] hover:bg-[#FAFAF7] transition-all">
      {/* Nome */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
               style={{ background: '#F2C418', color: '#1E2128' }}>
            {partner.name?.split(" ").map(n => n[0]).join("") || "?"}
          </div>
          <div>
            <div className="font-medium text-sm" style={{ color: '#1E2128' }}>{partner.name}</div>
            <div className="text-xs" style={{ color: '#9CA3AF' }}>{partner.niche || "—"}</div>
          </div>
        </div>
      </td>
      
      {/* Email */}
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: '#5F6572' }}>{partner.email}</span>
      </td>
      
      {/* Fase */}
      <td className="py-3 px-4">
        <span className="text-sm font-medium" style={{ color: '#1E2128' }}>
          {PHASE_LABELS[partner.phase] || "—"}
        </span>
      </td>
      
      {/* Progresso */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div 
              className="h-full rounded-full transition-all"
              style={{ 
                width: `${progress}%`,
                background: progress === 100 ? '#22C55E' : '#F2C418'
              }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color: '#5F6572' }}>{progress}%</span>
        </div>
      </td>
      
      {/* Ultima attività */}
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {formatDate(partner.lastActivity)}
        </span>
      </td>
      
      {/* Stato */}
      <td className="py-3 px-4">
        <span 
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </td>
      
      {/* Azione */}
      <td className="py-3 px-4">
        <button
          onClick={() => onOpenProject(partner)}
          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <Eye className="w-3.5 h-3.5" />
          Apri
        </button>
      </td>
    </tr>
  );
}

function AlertCard({ partner }) {
  const daysSinceActivity = partner.lastActivity 
    ? Math.floor((Date.now() - new Date(partner.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FEF3C7', border: '1px solid #F59E0B40' }}>
      <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: '#92400E' }}>
          {partner.name} — fermo da {daysSinceActivity} giorni
        </div>
        <div className="text-xs" style={{ color: '#B45309' }}>
          Fase: {PHASE_LABELS[partner.phase] || "—"}
        </div>
      </div>
      <button className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: '#F59E0B', color: 'white' }}>
        Contatta
      </button>
    </div>
  );
}

function ClientAnalisiRow({ client }) {
  const questionarioStatus = client.questionario_completato 
    ? { label: "Completato", color: "#22C55E", bg: "#DCFCE7" }
    : { label: "Da completare", color: "#F59E0B", bg: "#FEF3C7" };
  
  const callStatus = client.call_fissata 
    ? { label: "Fissata", color: "#22C55E", bg: "#DCFCE7" }
    : client.analisi_generata
      ? { label: "Da fissare", color: "#F59E0B", bg: "#FEF3C7" }
      : { label: "In attesa analisi", color: "#9CA3AF", bg: "#F3F4F6" };
  
  return (
    <tr className="border-b border-[#ECEDEF] hover:bg-[#FAFAF7] transition-all">
      <td className="py-3 px-4">
        <div className="font-medium text-sm" style={{ color: '#1E2128' }}>
          {client.nome} {client.cognome}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: '#5F6572' }}>{client.email}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {formatDate(client.data_pagamento)}
        </span>
      </td>
      <td className="py-3 px-4">
        <span 
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: questionarioStatus.bg, color: questionarioStatus.color }}
        >
          {questionarioStatus.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span 
          className="text-xs font-bold px-2 py-1 rounded-full"
          style={{ background: callStatus.bg, color: callStatus.color }}
        >
          {callStatus.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <button className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{ background: '#3B82F6', color: 'white' }}>
          <FileText className="w-3.5 h-3.5" />
          Dettagli
        </button>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminDashboardPro({ onOpenPartnerProject }) {
  const [partners, setPartners] = useState([]);
  const [clientiAnalisi, setClientiAnalisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("partners"); // partners | analisi
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch partners
      const partnersRes = await fetch(`${API}/api/partners`);
      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        setPartners(partnersData.partners || []);
      }
      
      // Fetch clienti analisi
      const analisiRes = await fetch(`${API}/api/admin/clienti-analisi`);
      if (analisiRes.ok) {
        const analisiData = await analisiRes.json();
        setClientiAnalisi(analisiData.clienti || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };
  
  // Calcola statistiche
  const stats = {
    analisiVendute: clientiAnalisi.filter(c => c.pagamento_analisi).length,
    partnerAttivi: partners.length,
    inProduzione: partners.filter(p => ['F4', 'F5', 'F6'].includes(p.phase)).length,
    prontiLancio: partners.filter(p => ['F7', 'F8'].includes(p.phase)).length,
    conversionRate: partners.length > 0 && clientiAnalisi.length > 0 
      ? Math.round((partners.length / clientiAnalisi.filter(c => c.pagamento_analisi).length) * 100)
      : 0
  };
  
  // Filtra partner
  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === "all") return matchesSearch;
    
    const status = getStatus(p.lastActivity, p.phase);
    if (filterStatus === "active") return matchesSearch && status.label === "Attivo";
    if (filterStatus === "waiting") return matchesSearch && status.label === "In attesa";
    if (filterStatus === "blocked") return matchesSearch && status.label === "Bloccato";
    
    return matchesSearch;
  });
  
  // Partner bloccati (per alert)
  const blockedPartners = partners.filter(p => {
    const status = getStatus(p.lastActivity, p.phase);
    return status.label === "Bloccato";
  });
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-7xl mx-auto p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#1E2128' }}>
              Dashboard Evolution PRO
            </h1>
            <p className="text-sm" style={{ color: '#5F6572' }}>
              Panoramica completa del sistema
            </p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white"
            style={{ color: '#5F6572' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>
        
        {/* BLOCCO 1: Statistiche */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            icon={FileText} 
            label="Analisi vendute" 
            value={stats.analisiVendute} 
            color="#3B82F6"
          />
          <StatCard 
            icon={Users} 
            label="Partner attivi" 
            value={stats.partnerAttivi}
            color="#F2C418"
          />
          <StatCard 
            icon={TrendingUp} 
            label="In produzione" 
            value={stats.inProduzione}
            color="#8B5CF6"
          />
          <StatCard 
            icon={Rocket} 
            label="Pronti al lancio" 
            value={stats.prontiLancio}
            color="#22C55E"
          />
        </div>
        
        {/* BLOCCO 7: Conversione */}
        <div className="bg-white rounded-xl border border-[#ECEDEF] p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="w-5 h-5" style={{ color: '#F2C418' }} />
            <span className="font-bold" style={{ color: '#1E2128' }}>Statistiche Conversione</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: '#3B82F6' }}>{stats.analisiVendute}</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Analisi vendute</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: '#F2C418' }}>{stats.partnerAttivi}</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Partner attivati</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black" style={{ color: '#22C55E' }}>{stats.conversionRate}%</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Tasso conversione</div>
            </div>
          </div>
        </div>
        
        {/* BLOCCO 4: Alert partner bloccati */}
        {blockedPartners.length > 0 && (
          <div className="bg-white rounded-xl border border-[#ECEDEF] p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5" style={{ color: '#F59E0B' }} />
              <span className="font-bold" style={{ color: '#1E2128' }}>Alert: Partner inattivi</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#F59E0B' }}>
                {blockedPartners.length}
              </span>
            </div>
            <div className="space-y-2">
              {blockedPartners.slice(0, 3).map(partner => (
                <AlertCard key={partner.id} partner={partner} />
              ))}
            </div>
          </div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("partners")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "partners" ? 'bg-[#F2C418] text-[#1E2128]' : 'bg-white text-[#5F6572] hover:bg-[#FAFAF7]'
            }`}
          >
            Pipeline Partner
          </button>
          <button
            onClick={() => setActiveTab("analisi")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === "analisi" ? 'bg-[#F2C418] text-[#1E2128]' : 'bg-white text-[#5F6572] hover:bg-[#FAFAF7]'
            }`}
          >
            Clienti Analisi (€67)
          </button>
        </div>
        
        {activeTab === "partners" ? (
          <>
            {/* BLOCCO 2 & 3: Pipeline Partner */}
            <div className="bg-white rounded-xl border border-[#ECEDEF] overflow-hidden">
              {/* Search & Filters */}
              <div className="p-4 border-b border-[#ECEDEF] flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <input
                    type="text"
                    placeholder="Cerca partner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#F2C418]"
                    style={{ borderColor: '#ECEDEF' }}
                  />
                </div>
                <div className="flex gap-2">
                  {["all", "active", "waiting", "blocked"].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filterStatus === status 
                          ? 'bg-[#F2C418] text-[#1E2128]' 
                          : 'bg-[#FAFAF7] text-[#5F6572] hover:bg-[#ECEDEF]'
                      }`}
                    >
                      {status === "all" ? "Tutti" : 
                       status === "active" ? "🟢 Attivi" : 
                       status === "waiting" ? "🟡 In attesa" : "🔴 Bloccati"}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#FAFAF7' }}>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Partner</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Email</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Fase</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Progresso</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Ultima attività</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Stato</th>
                      <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Azione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#9CA3AF' }} />
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>Caricamento...</span>
                        </td>
                      </tr>
                    ) : filteredPartners.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#ECEDEF' }} />
                          <span className="text-sm" style={{ color: '#9CA3AF' }}>Nessun partner trovato</span>
                        </td>
                      </tr>
                    ) : (
                      filteredPartners.map(partner => (
                        <PartnerRow 
                          key={partner.id} 
                          partner={partner}
                          onOpenProject={onOpenPartnerProject}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* BLOCCO 6: Clienti Analisi */
          <div className="bg-white rounded-xl border border-[#ECEDEF] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF7' }}>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Nome</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Email</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Data acquisto</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Questionario</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Call</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: '#9CA3AF' }} />
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Caricamento...</span>
                      </td>
                    </tr>
                  ) : clientiAnalisi.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: '#ECEDEF' }} />
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Nessun cliente analisi</span>
                      </td>
                    </tr>
                  ) : (
                    clientiAnalisi.map(client => (
                      <ClientAnalisiRow key={client.id || client.email} client={client} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default AdminDashboardPro;
