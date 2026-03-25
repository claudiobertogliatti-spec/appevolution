import React, { useState, useEffect } from "react";
import { 
  Bot, RefreshCw, TrendingUp, AlertTriangle, Zap, 
  Users, DollarSign, Target, Video, FileText, Shield,
  Trophy, MessageCircle, Loader2, ChevronRight, Activity,
  CheckSquare, Headphones, LayoutGrid, Search, Globe, Star, Play,
  X, ExternalLink, Mail, Phone, Linkedin, Instagram, Youtube, Trash2, Filter, SlidersHorizontal
} from "lucide-react";
import { API_URL, API } from "../../utils/api-config";

// Agent emoji and color mapping - UPDATED: 6 agents only
const AGENT_CONFIG = {
  MAIN: { emoji: "🎛️", color: "#6B7280", bgColor: "#F3F4F6", tag: "Sistema", tagColor: "#6B7280", tagBg: "#F3F4F6" },
  STEFANIA: { emoji: "💬", color: "#EC4899", bgColor: "#FCE7F3", tag: "Partner Contact", tagColor: "#EC4899", tagBg: "#FCE7F3" },
  ANDREA: { emoji: "🎬", color: "#8B5CF6", bgColor: "#EDE9FE", tag: "Produzione", tagColor: "#8B5CF6", tagBg: "#EDE9FE" },
  MARCO: { emoji: "📋", color: "#F59E0B", bgColor: "#FEF3C7", tag: "Accountability", tagColor: "#F59E0B", tagBg: "#FEF3C7" },
  GAIA: { emoji: "🔧", color: "#0EA5E9", bgColor: "#E0F2FE", tag: "Supporto Tech", tagColor: "#0EA5E9", tagBg: "#E0F2FE" },
  STEFANIA: { emoji: "🎯", color: "#10B981", bgColor: "#D1FAE5", tag: "Coordinamento", tagColor: "#10B981", tagBg: "#D1FAE5" }
};

// Agent descriptions - UPDATED
const AGENT_DESCRIPTIONS = {
  MAIN: "Sistema Centrale",
  STEFANIA: "Onboarding & Consulenza",
  ANDREA: "Avanzamento Corso & Video",
  MARCO: "Accountability Settimanale",
  GAIA: "Supporto Tecnico",
  STEFANIA: "Orchestrazione"
};

// Agent order for display
const AGENT_ORDER = ["STEFANIA", "ANDREA", "MARCO", "GAIA", "STEFANIA", "MAIN"];

export function AgentDashboard() {
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Discovery Leads state
  const [discoveryLeads, setDiscoveryLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [analyzingLead, setAnalyzingLead] = useState(null);
  const [activeTab, setActiveTab] = useState("leads"); // "leads" or "agents"
  const [selectedLead, setSelectedLead] = useState(null); // For modal
  const [deletingLead, setDeletingLead] = useState(null); // For delete loading state
  const [confirmDeleteLead, setConfirmDeleteLead] = useState(null); // For delete confirmation modal
  
  // Discovery Leads Filters
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, scored, discovered, contacted
  const [filterSource, setFilterSource] = useState("all"); // all, linkedin, instagram, youtube, facebook, google
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);

  useEffect(() => {
    loadData();
    loadDiscoveryLeads();
  }, []);

  // Reload leads when filters change
  useEffect(() => {
    loadDiscoveryLeads();
  }, [filterStatus, filterSource, filterMinScore]);

  const loadDiscoveryLeads = async () => {
    setLoadingLeads(true);
    try {
      // Build query params with filters
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterSource !== 'all') params.append('source', filterSource);
      if (filterMinScore > 0) params.append('min_score', filterMinScore.toString());
      
      const res = await fetch(`${API}/api/discovery/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveryLeads(data.leads || []);
        setLeadsTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading discovery leads:', error);
    }
    setLoadingLeads(false);
  };

  const handleAnalyzeLead = async (leadId) => {
    setAnalyzingLead(leadId);
    try {
      const res = await fetch(`${API}/api/discovery/analyze-website/${leadId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Analisi completata!\nLLM: ${data.llm_used || 'Claude'}\nScore: ${data.website_analysis?.opportunity_score || 'N/A'}`);
        loadDiscoveryLeads(); // Refresh
      } else {
        const err = await res.json();
        alert(`Errore: ${err.detail || 'Analisi fallita'}`);
      }
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
    setAnalyzingLead(null);
  };

  const handleDeleteLead = async (leadId) => {
    setDeletingLead(leadId);
    try {
      const res = await fetch(`${API}/api/discovery/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        setDiscoveryLeads(prev => prev.filter(l => l.id !== leadId));
        setConfirmDeleteLead(null);
      } else {
        const err = await res.json();
        alert(`Errore eliminazione: ${err.detail || 'Eliminazione fallita'}`);
      }
    } catch (error) {
      alert(`Errore: ${error.message}`);
    }
    setDeletingLead(null);
  };

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [agentsRes, summaryRes] = await Promise.all([
        fetch(`${API}/api/agent-hub/status`),
        fetch(`${API}/api/agent-hub/summary`)
      ]);
      
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        // Filter to only active 6 agents and sort by order
        const activeAgents = (data.agents || [])
          .filter(a => AGENT_ORDER.includes(a.id))
          .sort((a, b) => AGENT_ORDER.indexOf(a.id) - AGENT_ORDER.indexOf(b.id));
        setAgents(activeAgents);
      }
      
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: '#F2C418' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Caricamento Agent Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-3" style={{ color: '#1E2128' }}>
            <Bot className="w-8 h-8" />
            Agent Hub
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Centro di controllo per i 6 agenti AI Evolution PRO
          </p>
        </div>
        
        <button
          onClick={() => { loadData(true); loadDiscoveryLeads(); }}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={() => setActiveTab("leads")}
          className={`px-5 py-2.5 rounded-t-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "leads" 
              ? "bg-white shadow-sm" 
              : "hover:bg-gray-100"
          }`}
          style={{ 
            color: activeTab === "leads" ? '#1E2128' : '#9CA3AF',
            borderBottom: activeTab === "leads" ? '3px solid #F2C418' : 'none'
          }}
        >
          <Search className="w-4 h-4" />
          Discovery Leads ({discoveryLeads.length})
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-5 py-2.5 rounded-t-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === "agents" 
              ? "bg-white shadow-sm" 
              : "hover:bg-gray-100"
          }`}
          style={{ 
            color: activeTab === "agents" ? '#1E2128' : '#9CA3AF',
            borderBottom: activeTab === "agents" ? '3px solid #F2C418' : 'none'
          }}
        >
          <Bot className="w-4 h-4" />
          Team Agenti ({agents.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: DISCOVERY LEADS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "leads" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: '#1E2128' }}>
                  <Target className="w-5 h-5 text-orange-500" />
                  Discovery Leads - Manager Coach
                </h2>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Lead caldi scoperti da Gaia • Analizzati con Ollama/Llama 3.1
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1.5 rounded-full font-bold" 
                      style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {leadsTotal} Totali
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full font-bold" 
                      style={{ background: '#EAFAF1', color: '#10B981' }}>
                  {discoveryLeads.filter(l => l.score_total >= 70).length} Hot Leads
                </span>
              </div>
            </div>
            
            {/* ═══ FILTRI AVANZATI ═══ */}
            <div className="mt-4 p-4 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-2 mb-3">
                <SlidersHorizontal className="w-4 h-4" style={{ color: '#6B7280' }} />
                <span className="text-xs font-bold uppercase" style={{ color: '#6B7280' }}>Filtri</span>
              </div>
              <div className="flex flex-wrap gap-4">
                {/* Filtro Status */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    style={{ borderColor: '#E5E7EB', minWidth: 140 }}
                    data-testid="filter-status"
                  >
                    <option value="all">Tutti</option>
                    <option value="pending">🔵 Pending</option>
                    <option value="scored">⭐ Scored</option>
                    <option value="discovered">🔍 Discovered</option>
                    <option value="contacted">📧 Contacted</option>
                    <option value="qualified">✅ Qualified</option>
                    <option value="rejected">❌ Rejected</option>
                  </select>
                </div>
                
                {/* Filtro Piattaforma */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Piattaforma</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    style={{ borderColor: '#E5E7EB', minWidth: 140 }}
                    data-testid="filter-source"
                  >
                    <option value="all">Tutte</option>
                    <option value="linkedin">💼 LinkedIn</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="youtube">▶️ YouTube</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="google">🔍 Google</option>
                    <option value="manual">✍️ Manuale</option>
                  </select>
                </div>
                
                {/* Filtro Score Minimo */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: '#9CA3AF' }}>Score Minimo</label>
                  <select
                    value={filterMinScore}
                    onChange={(e) => setFilterMinScore(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    style={{ borderColor: '#E5E7EB', minWidth: 140 }}
                    data-testid="filter-score"
                  >
                    <option value="0">Qualsiasi</option>
                    <option value="50">≥ 50</option>
                    <option value="60">≥ 60</option>
                    <option value="70">≥ 70 (Hot)</option>
                    <option value="80">≥ 80 (Very Hot)</option>
                    <option value="90">≥ 90 (Super Hot)</option>
                  </select>
                </div>
                
                {/* Reset Filtri */}
                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterStatus('all'); setFilterSource('all'); setFilterMinScore(0); }}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:bg-gray-200"
                    style={{ background: '#E5E7EB', color: '#6B7280' }}
                    data-testid="reset-filters"
                  >
                    Reset Filtri
                  </button>
                </div>
              </div>
              
              {/* Filtri attivi badge */}
              {(filterStatus !== 'all' || filterSource !== 'all' || filterMinScore > 0) && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>Filtri attivi:</span>
                  {filterStatus !== 'all' && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                      Status: {filterStatus}
                    </span>
                  )}
                  {filterSource !== 'all' && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#FCE7F3', color: '#DB2777' }}>
                      {filterSource}
                    </span>
                  )}
                  {filterMinScore > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#EAFAF1', color: '#10B981' }}>
                      Score ≥ {filterMinScore}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {loadingLeads ? (
            <div className="p-10 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#F2C418' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Caricamento lead...</p>
            </div>
          ) : discoveryLeads.length === 0 ? (
            <div className="p-10 text-center">
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: '#E5E7EB' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                {filterStatus !== 'all' || filterSource !== 'all' || filterMinScore > 0 
                  ? 'Nessun lead corrisponde ai filtri selezionati' 
                  : 'Nessun lead nel Discovery Engine'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#FAFAF7' }}>
                    <th className="text-left p-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Nome</th>
                    <th className="text-left p-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Sito Web</th>
                    <th className="text-left p-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Source</th>
                    <th className="text-center p-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Relevance Score</th>
                    <th className="text-center p-4 text-xs font-bold uppercase" style={{ color: '#9CA3AF' }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveryLeads.map((lead, idx) => {
                    const scoreColor = lead.score_total >= 80 ? '#10B981' : lead.score_total >= 60 ? '#F59E0B' : '#9CA3AF';
                    const isHot = lead.score_total >= 70;
                    
                    return (
                      <tr key={lead.id} 
                          className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
                          style={{ borderColor: '#F3F4F6' }}
                          onClick={() => setSelectedLead(lead)}
                          data-testid={`discovery-lead-row-${lead.id}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {isHot && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                            <div>
                              <div 
                                className="font-bold text-sm hover:underline"
                                style={{ color: '#1E2128' }}
                              >
                                {lead.display_name}
                              </div>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {lead.niche_detected?.replace(/_/g, ' ') || lead.bio?.slice(0, 50) || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          {lead.website_url ? (
                            <a 
                              href={lead.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm flex items-center gap-1.5 hover:underline"
                              style={{ color: '#3B82F6' }}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              {lead.website_url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}
                            </a>
                          ) : (
                            <span className="text-xs" style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                                style={{ 
                                  background: lead.source === 'linkedin' ? '#E0F2FE' : 
                                             lead.source === 'instagram' ? '#FCE7F3' : 
                                             lead.source === 'youtube' ? '#FEE2E2' : '#F3F4F6',
                                  color: lead.source === 'linkedin' ? '#0284C7' : 
                                         lead.source === 'instagram' ? '#DB2777' : 
                                         lead.source === 'youtube' ? '#DC2626' : '#6B7280'
                                }}>
                            {lead.source}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div 
                              className="w-16 h-2 rounded-full overflow-hidden"
                              style={{ background: '#E5E7EB' }}
                            >
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${lead.score_total}%`, 
                                  background: scoreColor 
                                }}
                              />
                            </div>
                            <span className="text-sm font-black" style={{ color: scoreColor }}>
                              {lead.score_total}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAnalyzeLead(lead.id); }}
                              disabled={analyzingLead === lead.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
                              style={{ 
                                background: lead.website_analysis && !lead.website_analysis.error ? '#EAFAF1' : '#F2C418',
                                color: lead.website_analysis && !lead.website_analysis.error ? '#10B981' : '#1E2128'
                              }}
                              data-testid={`analyze-btn-${lead.id}`}
                            >
                              {analyzingLead === lead.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Analisi...
                                </>
                              ) : lead.website_analysis && !lead.website_analysis.error ? (
                                <>
                                  <CheckSquare className="w-3 h-3" />
                                  Analizzato
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  Analizza
                                </>
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteLead(lead); }}
                              className="p-1.5 rounded-lg transition-all hover:bg-red-100"
                              style={{ color: '#EF4444' }}
                              title="Elimina lead"
                              data-testid={`delete-btn-${lead.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: AGENTS (contenuto esistente) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "agents" && (
        <>
      {/* Business Health Summary - UPDATED: 3 cards instead of 5 */}
      {summary && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: '#1E2128' }}>
              📊 Business Summary
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Health:</span>
              <span className="text-2xl">{summary.health?.overall || "🟢"}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                {summary.summary?.total_partners || 0}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Partner Attivi</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#EAFAF1' }}>
              <div className="text-3xl font-black" style={{ color: '#10B981' }}>
                €{summary.summary?.mrr || 0}
              </div>
              <div className="text-xs" style={{ color: '#10B981' }}>MRR Mensile</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
              <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                €{summary.summary?.avg_ltv || "2.580"}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>LTV Medio</div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts & Opportunities */}
      {summary && (summary.alerts?.length > 0 || summary.opportunities?.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Alerts */}
          {summary.alerts?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#1E2128' }}>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Alert Attivi
              </h3>
              <div className="space-y-2">
                {summary.alerts.map((alert, idx) => (
                  <div key={idx} className="p-3 rounded-lg text-sm" 
                       style={{ background: alert.type === 'warning' ? '#FEF3C7' : '#F3F4F6' }}>
                    <span className="font-bold">[{alert.agent}]</span> {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Opportunities */}
          {summary.opportunities?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: '#1E2128' }}>
                <TrendingUp className="w-5 h-5 text-green-500" />
                Opportunità
              </h3>
              <div className="space-y-2">
                {summary.opportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 rounded-lg text-sm" style={{ background: '#EAFAF1' }}>
                    <div className="flex items-center justify-between">
                      <span><span className="font-bold">[{opp.agent}]</span> {opp.message}</span>
                      <span className="font-black text-green-600">{opp.potential}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent Grid */}
      <div>
        <h2 className="font-bold text-lg mb-4" style={{ color: '#1E2128' }}>
          🤖 Team Agenti ({agents.length})
        </h2>
        
        <div className="grid grid-cols-3 gap-4">
          {agents.map(agent => {
            const config = AGENT_CONFIG[agent.id] || { emoji: "🤖", color: "#666", bgColor: "#F5F5F5" };
            const isActive = agent.status === "ACTIVE";
            
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`bg-white rounded-2xl p-5 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-green-400' : ''
                }`}
                style={{ border: '1px solid #ECEDEF' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                         style={{ background: config.bgColor }}>
                      {config.emoji}
                    </div>
                    <div>
                      <div className="font-bold" style={{ color: '#1E2128' }}>{agent.id}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{agent.info?.name}</div>
                    </div>
                  </div>
                  
                  <div className={`w-3 h-3 rounded-full ${
                    isActive ? 'bg-green-400 animate-pulse' : 
                    agent.status === 'ALERT' ? 'bg-orange-400' : 'bg-gray-300'
                  }`} />
                </div>
                
                <div className="text-xs mb-3 px-2 py-1 rounded-full inline-block"
                     style={{ background: config.bgColor, color: config.color }}>
                  {agent.info?.category}
                </div>
                
                {/* Key Metrics */}
                {agent.metrics && Object.keys(agent.metrics).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #ECEDEF' }}>
                    {Object.entries(agent.metrics).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="text-center p-2 rounded-lg" style={{ background: '#FAFAF7' }}>
                        <div className="text-lg font-bold" style={{ color: config.color }}>
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </div>
                        <div className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: '1px solid #ECEDEF' }}>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    Budget: ${agent.budget || 0}
                  </span>
                  <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b" style={{ borderColor: '#ECEDEF' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                       style={{ background: AGENT_CONFIG[selectedAgent.id]?.bgColor }}>
                    {AGENT_CONFIG[selectedAgent.id]?.emoji}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: '#1E2128' }}>
                      {selectedAgent.id}
                    </h3>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      {selectedAgent.info?.name} - {selectedAgent.info?.category}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
                <span className="font-bold" style={{ color: '#5F6572' }}>Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  selectedAgent.status === 'ACTIVE' ? 'bg-green-100 text-green-600' :
                  selectedAgent.status === 'ALERT' ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {selectedAgent.status}
                </span>
              </div>
              
              {/* Metrics */}
              {selectedAgent.metrics && (
                <div>
                  <h4 className="font-bold mb-3" style={{ color: '#1E2128' }}>Metriche</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedAgent.metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg"
                           style={{ background: '#FAFAF7' }}>
                        <span className="text-sm" style={{ color: '#5F6572' }}>
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="font-bold" style={{ color: '#1E2128' }}>
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="pt-4">
                <button
                  onClick={() => {
                    // Activate agent
                    fetch(`${API}/api/agent-hub/activate/${selectedAgent.id}`, { method: 'POST' })
                      .then(() => {
                        loadData(true);
                        setSelectedAgent(null);
                      });
                  }}
                  className="w-full py-3 rounded-xl font-bold text-white"
                  style={{ background: AGENT_CONFIG[selectedAgent.id]?.color || '#1E2128' }}
                >
                  {selectedAgent.status === 'ACTIVE' ? '✓ Agente Attivo' : 'Attiva Agente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: LEAD DETAILS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedLead && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ 
                    background: selectedLead.score_total >= 70 ? '#FEF3C7' : '#F3F4F6'
                  }}
                >
                  {selectedLead.score_total >= 70 ? '⭐' : '👤'}
                </div>
                <div>
                  <h2 className="text-xl font-black" style={{ color: '#1E2128' }}>
                    {selectedLead.display_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                      style={{ 
                        background: selectedLead.source === 'linkedin' ? '#E0F2FE' : 
                                   selectedLead.source === 'instagram' ? '#FCE7F3' : '#FEE2E2',
                        color: selectedLead.source === 'linkedin' ? '#0284C7' : 
                               selectedLead.source === 'instagram' ? '#DB2777' : '#DC2626'
                      }}
                    >
                      {selectedLead.source}
                    </span>
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-bold"
                      style={{ 
                        background: selectedLead.score_total >= 70 ? '#EAFAF1' : '#FEF3C7',
                        color: selectedLead.score_total >= 70 ? '#10B981' : '#F59E0B'
                      }}
                    >
                      Score: {selectedLead.score_total}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Bio */}
              <div>
                <h3 className="text-xs font-bold uppercase mb-2" style={{ color: '#9CA3AF' }}>Bio</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#1E2128' }}>
                  {selectedLead.bio || 'Nessuna bio disponibile'}
                </p>
              </div>

              {/* Focus/Niche */}
              <div>
                <h3 className="text-xs font-bold uppercase mb-2" style={{ color: '#9CA3AF' }}>Focus / Nicchia</h3>
                <span 
                  className="inline-block px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ background: '#F3F4F6', color: '#1E2128' }}
                >
                  {selectedLead.niche_detected?.replace(/_/g, ' ') || 'Non rilevato'}
                </span>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-xs font-bold uppercase mb-3" style={{ color: '#9CA3AF' }}>Link Social</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedLead.platform_url && (
                    <a 
                      href={selectedLead.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ 
                        background: selectedLead.source === 'linkedin' ? '#E0F2FE' : 
                                   selectedLead.source === 'instagram' ? '#FCE7F3' : '#FEE2E2',
                        color: selectedLead.source === 'linkedin' ? '#0284C7' : 
                               selectedLead.source === 'instagram' ? '#DB2777' : '#DC2626'
                      }}
                    >
                      {selectedLead.source === 'linkedin' ? <Linkedin className="w-4 h-4" /> :
                       selectedLead.source === 'instagram' ? <Instagram className="w-4 h-4" /> :
                       <Youtube className="w-4 h-4" />}
                      Profilo {selectedLead.source}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedLead.website_url && (
                    <a 
                      href={selectedLead.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ background: '#F3F4F6', color: '#1E2128' }}
                    >
                      <Globe className="w-4 h-4" />
                      Sito Web
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-xs font-bold uppercase mb-3" style={{ color: '#9CA3AF' }}>Statistiche</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
                    <div className="text-lg font-black" style={{ color: '#1E2128' }}>
                      {selectedLead.followers_count?.toLocaleString() || '—'}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Followers</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
                    <div className="text-lg font-black" style={{ color: '#1E2128' }}>
                      {selectedLead.target_fit_level || '—'}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Target Fit</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
                    <div className="text-lg font-black" style={{ color: '#1E2128' }}>
                      {selectedLead.status || '—'}
                    </div>
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>Status</div>
                  </div>
                </div>
              </div>

              {/* Website Analysis (if available) */}
              {selectedLead.website_analysis && !selectedLead.website_analysis.error && (
                <div>
                  <h3 className="text-xs font-bold uppercase mb-3" style={{ color: '#9CA3AF' }}>
                    Analisi Sito (via {selectedLead.website_analysis.llm_used || 'AI'})
                  </h3>
                  <div className="p-4 rounded-xl" style={{ background: '#EAFAF1' }}>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedLead.website_analysis.titolo && (
                        <div>
                          <span className="font-bold">Titolo:</span> {selectedLead.website_analysis.titolo}
                        </div>
                      )}
                      {selectedLead.website_analysis.settore && (
                        <div>
                          <span className="font-bold">Settore:</span> {selectedLead.website_analysis.settore}
                        </div>
                      )}
                      {selectedLead.website_analysis.email && (
                        <div>
                          <span className="font-bold">Email:</span> {selectedLead.website_analysis.email}
                        </div>
                      )}
                      {selectedLead.website_analysis.opportunity_score && (
                        <div>
                          <span className="font-bold">Opportunity:</span> {selectedLead.website_analysis.opportunity_score}/10
                        </div>
                      )}
                    </div>
                    {selectedLead.website_analysis.servizi && (
                      <div className="mt-3">
                        <span className="font-bold text-sm">Servizi:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedLead.website_analysis.servizi.map((s, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-white">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => { handleAnalyzeLead(selectedLead.id); }}
                  disabled={analyzingLead === selectedLead.id}
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: '#F2C418', color: '#1E2128' }}
                >
                  {analyzingLead === selectedLead.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {selectedLead.website_analysis ? 'Ri-Analizza Sito' : 'Avvia Analisi'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setConfirmDeleteLead(selectedLead); setSelectedLead(null); }}
                  className="px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
                  style={{ background: '#FEE2E2', color: '#DC2626' }}
                  data-testid="delete-lead-from-modal"
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </button>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIRM DELETE LEAD */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {confirmDeleteLead && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDeleteLead(null)}
          data-testid="delete-lead-modal"
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: '#FEE2E2' }}
              >
                <Trash2 className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: '#1E2128' }}>
                  Conferma Eliminazione
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Questa azione non può essere annullata
                </p>
              </div>
            </div>
            
            <div 
              className="p-4 rounded-xl mb-6"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            >
              <p className="text-sm" style={{ color: '#1E2128' }}>
                Stai per eliminare il lead:
              </p>
              <p className="font-bold text-base mt-1" style={{ color: '#1E2128' }}>
                {confirmDeleteLead.display_name}
              </p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                {confirmDeleteLead.email || confirmDeleteLead.website_url || 'Nessun contatto'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteLead(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                Annulla
              </button>
              <button
                onClick={() => handleDeleteLead(confirmDeleteLead.id)}
                disabled={deletingLead === confirmDeleteLead.id}
                className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#DC2626', color: 'white' }}
                data-testid="confirm-delete-lead-btn"
              >
                {deletingLead === confirmDeleteLead.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Elimina Lead
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentDashboard;
