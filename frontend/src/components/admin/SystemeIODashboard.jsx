import { useState, useEffect, useCallback } from "react";
import { 
  Users, TrendingUp, RefreshCw, Link2, CheckCircle, 
  AlertCircle, Loader2, Plus, Mail, Tag, Calendar,
  BarChart3, Target, ArrowUpRight, ArrowDownRight,
  Zap, Database, Clock, UserPlus
} from "lucide-react";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

// KPI Card Component
function KPICard({ label, value, delta, deltaType, icon: Icon, subtext }) {
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl p-5 card-hover" data-testid={`systeme-kpi-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-[#FFD24D]" />}
      </div>
      <div className="font-mono text-3xl font-bold mb-1">{value}</div>
      {delta && (
        <div className={`text-xs font-bold flex items-center gap-1 ${
          deltaType === "up" ? "text-[#10B981]" : 
          deltaType === "down" ? "text-[#EF4444]" : 
          "text-[#F59E0B]"
        }`}>
          {deltaType === "up" && <ArrowUpRight className="w-3 h-3" />}
          {deltaType === "down" && <ArrowDownRight className="w-3 h-3" />}
          {delta}
        </div>
      )}
      {subtext && <div className="text-xs text-[#9CA3AF] mt-1">{subtext}</div>}
    </div>
  );
}

// Funnel Visualization
function FunnelVisualization({ stats }) {
  const { funnel_stats } = stats;
  const maxValue = funnel_stats?.leads || 1;
  
  const stages = [
    { key: "leads", label: "Lead", color: "#FFD24D", value: funnel_stats?.leads || 0 },
    { key: "engaged", label: "Engaged", color: "#8B5CF6", value: funnel_stats?.engaged || 0 },
    { key: "qualified", label: "Qualificati", color: "#3B82F6", value: funnel_stats?.qualified || 0 },
    { key: "customers", label: "Clienti", color: "#10B981", value: funnel_stats?.customers || 0 },
  ];
  
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl p-6" data-testid="systeme-funnel">
      <h3 className="text-sm font-bold text-[#5F6572] uppercase tracking-wider mb-6 flex items-center gap-2">
        <Target className="w-4 h-4 text-[#FFD24D]" />
        Funnel Conversione
      </h3>
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const width = (stage.value / maxValue) * 100;
          const conversionFromPrev = idx > 0 && stages[idx-1].value > 0 
            ? ((stage.value / stages[idx-1].value) * 100).toFixed(1) 
            : null;
          
          return (
            <div key={stage.key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold">{stage.value.toLocaleString()}</span>
                  {conversionFromPrev && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAFAF7] text-[#9CA3AF]">
                      {conversionFromPrev}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 bg-[#FAFAF7] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Conversion Rate */}
      <div className="mt-6 pt-6 border-t border-[#ECEDEF] flex items-center justify-between">
        <span className="text-sm text-[#5F6572]">Tasso Conversione Totale</span>
        <span className="font-mono text-2xl font-bold text-[#10B981]">{stats.conversion_rate || 0}%</span>
      </div>
    </div>
  );
}

// Tags Distribution
function TagsDistribution({ tags }) {
  const sortedTags = Object.entries(tags || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8);
  
  const maxCount = sortedTags[0]?.[1] || 1;
  
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl p-6" data-testid="systeme-tags">
      <h3 className="text-sm font-bold text-[#5F6572] uppercase tracking-wider mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-[#FFD24D]" />
        Distribuzione Tag
      </h3>
      <div className="space-y-3">
        {sortedTags.map(([tag, count]) => (
          <div key={tag} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5F6572] w-24 truncate">{tag}</span>
            <div className="flex-1 h-2 bg-[#FAFAF7] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FFD24D] rounded-full"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="font-mono text-sm font-bold w-12 text-right">{count}</span>
          </div>
        ))}
      </div>
      {sortedTags.length === 0 && (
        <div className="text-center py-8 text-[#9CA3AF]">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nessun tag trovato</p>
        </div>
      )}
    </div>
  );
}

// Recent Contacts
function RecentContacts({ contacts }) {
  return (
    <div className="bg-white border border-[#ECEDEF] rounded-xl p-6" data-testid="systeme-recent-contacts">
      <h3 className="text-sm font-bold text-[#5F6572] uppercase tracking-wider mb-4 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#FFD24D]" />
        Contatti Recenti
      </h3>
      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div key={contact.id || idx} className="flex items-center gap-3 p-3 bg-[#FAFAF7] rounded-lg">
            <div className="w-9 h-9 rounded-full bg-[#FFD24D] flex items-center justify-center text-sm font-bold text-black">
              {(contact.first_name || contact.email || "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {contact.first_name && contact.last_name 
                  ? `${contact.first_name} ${contact.last_name}`
                  : contact.email}
              </div>
              <div className="text-xs text-[#9CA3AF] truncate">{contact.email}</div>
            </div>
            <div className="text-[10px] text-[#9CA3AF]">
              {new Date(contact.created_at).toLocaleDateString("it-IT")}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="text-center py-8 text-[#9CA3AF]">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nessun contatto sincronizzato</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Connection Setup Modal
function ConnectionSetup({ partnerId, onConnect, onClose }) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setError("Inserisci la API Key di Systeme.io");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API}/api/systeme/credentials`, {
        partner_id: partnerId,
        api_key: apiKey.trim()
      });
      onConnect();
    } catch (e) {
      setError(e.response?.data?.detail || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" data-testid="systeme-connection-modal">
      <div className="bg-white border border-[#ECEDEF] rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#FFD24D] flex items-center justify-center">
            <Link2 className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Connetti Systeme.io</h2>
            <p className="text-sm text-[#5F6572]">Sincronizza i tuoi contatti e statistiche</p>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="text-sm font-bold text-[#5F6572] mb-2 block">API Key Systeme.io</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Incolla la tua API Key..."
            className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-3 text-sm focus:border-[#FFD24D] focus:outline-none"
          />
          <p className="text-xs text-[#9CA3AF] mt-2">
            Trova la tua API Key in Systeme.io → Impostazioni → Public API Keys
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-[#ECEDEF] text-[#5F6572] hover:bg-[#FAFAF7] transition-colors font-semibold"
          >
            Annulla
          </button>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-lg bg-[#FFD24D] text-black font-bold hover:bg-[#FFD24D]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Connetti
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export function SystemeIODashboard({ partnerId, partnerName }) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/systeme/dashboard/${partnerId}`);
      setDashboardData(res.data);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.detail || "Errore caricamento dati");
    } finally {
      setLoading(false);
    }
  }, [partnerId]);
  
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  
  const handleSync = async () => {
    try {
      setSyncing(true);
      await axios.post(`${API}/api/systeme/sync`, { partner_id: partnerId });
      await loadDashboard();
    } catch (e) {
      setError(e.response?.data?.detail || "Errore sincronizzazione");
    } finally {
      setSyncing(false);
    }
  };
  
  const handleConnect = () => {
    setShowSetup(false);
    loadDashboard();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="systeme-loading">
        <Loader2 className="w-8 h-8 text-[#FFD24D] animate-spin" />
      </div>
    );
  }
  
  const { connection, stats, recent_contacts } = dashboardData || {};
  const isConnected = connection?.connected;
  const isDemoMode = stats?.demo_mode;
  
  return (
    <div className="animate-slide-in space-y-6" data-testid="systeme-dashboard">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-[#ECEDEF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFD24D] flex items-center justify-center">
              <Database className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">Systeme.io Live Data</h2>
              <p className="text-sm text-[#5F6572]">
                {isConnected 
                  ? `Connesso · Ultimo sync: ${connection?.last_sync ? new Date(connection.last_sync).toLocaleString("it-IT") : "Mai"}`
                  : isDemoMode 
                    ? "Modalità Demo — Dati simulati"
                    : "Non connesso"
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              isConnected 
                ? "bg-green-500/20 text-green-400" 
                : isDemoMode 
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
            }`}>
              {isConnected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {isConnected ? "Connesso" : isDemoMode ? "Demo" : "Non Connesso"}
            </div>
            
            {/* Actions */}
            {isConnected && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 rounded-lg bg-[#FAFAF7] border border-[#ECEDEF] text-sm font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                data-testid="systeme-sync-btn"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                Sincronizza
              </button>
            )}
            
            {!isConnected && (
              <button
                onClick={() => setShowSetup(true)}
                className="px-4 py-2 rounded-lg bg-[#FFD24D] text-black font-bold text-sm hover:bg-[#FFD24D]/90 transition-colors flex items-center gap-2"
                data-testid="systeme-connect-btn"
              >
                <Plus className="w-4 h-4" />
                Connetti Systeme.io
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-yellow-400">Modalità Demo</span>
            <span className="text-sm text-[#5F6572] ml-2">I dati visualizzati sono simulati. Connetti il tuo account Systeme.io per dati reali.</span>
          </div>
          <button
            onClick={() => setShowSetup(true)}
            className="px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold text-xs hover:bg-yellow-500/30 transition-colors"
          >
            Connetti Ora
          </button>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}
      
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard 
          label="Contatti Totali" 
          value={stats?.total_contacts?.toLocaleString() || 0}
          icon={Users}
        />
        <KPICard 
          label="Nuovi Oggi" 
          value={stats?.new_contacts_today || 0}
          delta={`+${stats?.new_contacts_week || 0} questa settimana`}
          deltaType="up"
          icon={UserPlus}
        />
        <KPICard 
          label="Nuovi Mese" 
          value={stats?.new_contacts_month || 0}
          icon={Calendar}
        />
        <KPICard 
          label="Tasso Conversione" 
          value={`${stats?.conversion_rate || 0}%`}
          delta={stats?.conversion_rate > 3 ? "Sopra la media" : "Sotto la media"}
          deltaType={stats?.conversion_rate > 3 ? "up" : "down"}
          icon={TrendingUp}
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <FunnelVisualization stats={stats || {}} />
        <TagsDistribution tags={stats?.contacts_by_tag} />
      </div>
      
      {/* Piano Continuità Riepilogo */}
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-6" data-testid="systeme-piano-continuita">
        <h3 className="text-sm font-bold text-[#5F6572] uppercase tracking-wider mb-6 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#FFD24D]" />
          Piano Continuità — Riepilogo Systeme.io
        </h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
            <div className="font-mono text-2xl font-bold text-[#1E2128]">{stats?.piano_continuita?.partner_attivi || 0}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">Partner con piano attivo</div>
          </div>
          <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
            <div className="font-mono text-2xl font-bold text-[#10B981]">€{(stats?.piano_continuita?.mrr_totale || 0).toLocaleString()}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">MRR totale piani</div>
          </div>
          <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
            <div className="font-mono text-2xl font-bold text-[#3B82F6]">€{(stats?.piano_continuita?.fee_mensili || 0).toLocaleString()}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">Fee mensili attive</div>
          </div>
          <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
            <div className="font-mono text-2xl font-bold text-[#8B5CF6]">€{(stats?.piano_continuita?.commissioni_mese || 0).toLocaleString()}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">Commissioni questo mese</div>
          </div>
          <div className="text-center p-4 bg-[#FAFAF7] rounded-lg">
            <div className="font-mono text-2xl font-bold text-[#F59E0B]">{stats?.piano_continuita?.rinnovi_30gg || 0}</div>
            <div className="text-xs text-[#9CA3AF] mt-1">Prossimi rinnovi (30gg)</div>
          </div>
        </div>
        {isDemoMode && (
          <div className="mt-4 text-xs text-center text-[#9CA3AF]">
            I dati saranno reali dopo aver connesso l'account Systeme.io
          </div>
        )}
      </div>
      
      {/* Recent Contacts */}
      <RecentContacts contacts={recent_contacts || []} />
      
      {/* Connection Setup Modal */}
      {showSetup && (
        <ConnectionSetup 
          partnerId={partnerId}
          onConnect={handleConnect}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}

export default SystemeIODashboard;
