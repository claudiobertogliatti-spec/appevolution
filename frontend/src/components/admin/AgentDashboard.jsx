import React, { useState, useEffect } from "react";
import { 
  Bot, RefreshCw, TrendingUp, AlertTriangle, Zap, 
  Users, DollarSign, Target, Video, FileText, Shield,
  Trophy, MessageCircle, Loader2, ChevronRight, Activity,
  CheckSquare, Headphones, LayoutGrid, Search, Globe, Star, Play
} from "lucide-react";
import { API_URL, API } from "../../utils/api-config";

// Agent emoji and color mapping - UPDATED: 6 agents only
const AGENT_CONFIG = {
  MAIN: { emoji: "🎛️", color: "#6B7280", bgColor: "#F3F4F6", tag: "Sistema", tagColor: "#6B7280", tagBg: "#F3F4F6" },
  VALENTINA: { emoji: "💬", color: "#EC4899", bgColor: "#FCE7F3", tag: "Partner Contact", tagColor: "#EC4899", tagBg: "#FCE7F3" },
  ANDREA: { emoji: "🎬", color: "#8B5CF6", bgColor: "#EDE9FE", tag: "Produzione", tagColor: "#8B5CF6", tagBg: "#EDE9FE" },
  MARCO: { emoji: "📋", color: "#F59E0B", bgColor: "#FEF3C7", tag: "Accountability", tagColor: "#F59E0B", tagBg: "#FEF3C7" },
  GAIA: { emoji: "🔧", color: "#0EA5E9", bgColor: "#E0F2FE", tag: "Supporto Tech", tagColor: "#0EA5E9", tagBg: "#E0F2FE" },
  STEFANIA: { emoji: "🎯", color: "#10B981", bgColor: "#D1FAE5", tag: "Coordinamento", tagColor: "#10B981", tagBg: "#D1FAE5" }
};

// Agent descriptions - UPDATED
const AGENT_DESCRIPTIONS = {
  MAIN: "Sistema Centrale",
  VALENTINA: "Onboarding & Consulenza",
  ANDREA: "Avanzamento Corso & Video",
  MARCO: "Accountability Settimanale",
  GAIA: "Supporto Tecnico",
  STEFANIA: "Orchestrazione"
};

// Agent order for display
const AGENT_ORDER = ["VALENTINA", "ANDREA", "MARCO", "GAIA", "STEFANIA", "MAIN"];

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

  useEffect(() => {
    loadData();
    loadDiscoveryLeads();
  }, []);

  const loadDiscoveryLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch(`${API}/discovery/leads/hot?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveryLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Error loading discovery leads:', error);
    }
    setLoadingLeads(false);
  };

  const handleAnalyzeLead = async (leadId) => {
    setAnalyzingLead(leadId);
    try {
      const res = await fetch(`${API}/discovery/analyze-website/${leadId}`, { method: 'POST' });
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

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [agentsRes, summaryRes] = await Promise.all([
        fetch(`${API}/agent-hub/status`),
        fetch(`${API}/agent-hub/summary`)
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
                      style={{ background: '#EAFAF1', color: '#10B981' }}>
                  {discoveryLeads.filter(l => l.score_total >= 70).length} Hot Leads
                </span>
              </div>
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
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Nessun lead nel Discovery Engine</p>
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
                          className="border-t hover:bg-gray-50 transition-colors"
                          style={{ borderColor: '#F3F4F6' }}
                          data-testid={`discovery-lead-row-${lead.id}`}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {isHot && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                            <div>
                              <div className="font-bold text-sm" style={{ color: '#1E2128' }}>
                                {lead.display_name}
                              </div>
                              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                                {lead.niche_detected?.replace(/_/g, ' ') || lead.bio?.slice(0, 50) || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
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
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleAnalyzeLead(lead.id)}
                            disabled={analyzingLead === lead.id || lead.status === 'analyzed'}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 mx-auto disabled:opacity-50"
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
                                Avvia Analisi
                              </>
                            )}
                          </button>
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
                    fetch(`${API}/agent-hub/activate/${selectedAgent.id}`, { method: 'POST' })
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
    </div>
  );
}

export default AgentDashboard;
