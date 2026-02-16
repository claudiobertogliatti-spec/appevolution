import React, { useState, useEffect } from "react";
import { 
  Bot, RefreshCw, TrendingUp, AlertTriangle, Zap, 
  Users, DollarSign, Target, Video, FileText, Shield,
  Trophy, MessageCircle, Loader2, ChevronRight, Activity
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

// Agent emoji and color mapping
const AGENT_CONFIG = {
  MAIN: { emoji: "🎛️", color: "#1E2128", bgColor: "#F5F5F5" },
  VALENTINA: { emoji: "💬", color: "#EC4899", bgColor: "#FCE7F3" },
  ORION: { emoji: "🎯", color: "#F59E0B", bgColor: "#FEF3C7" },
  MARTA: { emoji: "💰", color: "#10B981", bgColor: "#D1FAE5" },
  GAIA: { emoji: "⚡", color: "#8B5CF6", bgColor: "#EDE9FE" },
  ANDREA: { emoji: "🎬", color: "#3B82F6", bgColor: "#DBEAFE" },
  STEFANIA: { emoji: "✍️", color: "#F472B6", bgColor: "#FCE7F3" },
  LUCA: { emoji: "⚖️", color: "#6B7280", bgColor: "#F3F4F6" },
  ATLAS: { emoji: "🏆", color: "#F2C418", bgColor: "#FFF8DC" }
};

export function AgentDashboard() {
  const [agents, setAgents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const [agentsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/agent-hub/status`),
        fetch(`${API_URL}/api/agent-hub/summary`)
      ]);
      
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
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
            Centro di controllo per i 9 agenti AI Evolution PRO
          </p>
        </div>
        
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:opacity-90"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Business Health Summary */}
      {summary && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: '#1E2128' }}>
              📊 Business Summary
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#9CA3AF' }}>Health:</span>
              <span className="text-2xl">{summary.health?.overall}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                {summary.summary?.total_partners || 0}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Partner Totali</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
              <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                {summary.summary?.total_leads || 0}
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Lead Totali</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#EAFAF1' }}>
              <div className="text-3xl font-black" style={{ color: '#10B981' }}>
                €{summary.summary?.mrr || 0}
              </div>
              <div className="text-xs" style={{ color: '#10B981' }}>MRR Mese</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FEF3C7' }}>
              <div className="text-3xl font-black" style={{ color: '#F59E0B' }}>
                {summary.summary?.hot_leads || 0}
              </div>
              <div className="text-xs" style={{ color: '#F59E0B' }}>Lead HOT 🔥</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: '#FFF8DC' }}>
              <div className="text-3xl font-black" style={{ color: '#1E2128' }}>
                €{summary.summary?.avg_ltv || 0}
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
                    fetch(`${API_URL}/api/agent-hub/activate/${selectedAgent.id}`, { method: 'POST' })
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
