import { useState, useEffect } from "react";
import { 
  Webhook, RefreshCw, CheckCircle, AlertTriangle,
  Users, Tag, ShoppingCart, BookOpen, ArrowDownCircle,
  Clock, TrendingUp, ChevronDown, CreditCard, Calendar
} from "lucide-react";
import axios from "axios";
import { API, API_URL } from "../../utils/api-config";

// Event type icons and colors
const EVENT_CONFIG = {
  new_sale: { icon: ShoppingCart, color: "#34C77B", label: "Nuova Vendita" },
  new_order: { icon: ShoppingCart, color: "#34C77B", label: "Nuovo Ordine" },
  payment_received: { icon: ShoppingCart, color: "#34C77B", label: "Pagamento Ricevuto" },
  commission_calculated: { icon: TrendingUp, color: "#8B5CF6", label: "Commissione Calcolata" },
  plan_renewed: { icon: CheckCircle, color: "#3B82F6", label: "Piano Rinnovato" },
  plan_expired: { icon: AlertTriangle, color: "#EF4444", label: "Piano Scaduto" },
  new_subscriber: { icon: Users, color: "#3B82F6", label: "Nuovo Iscritto" },
  form_subscribed: { icon: Users, color: "#3B82F6", label: "Form Compilato" },
  tag_added: { icon: Tag, color: "#F59E0B", label: "Tag Aggiunto" },
  course_access: { icon: BookOpen, color: "#8B5CF6", label: "Accesso Corso" },
  refund: { icon: ArrowDownCircle, color: "#EF4444", label: "Rimborso" },
  unknown: { icon: Webhook, color: "#9CA3AF", label: "Sconosciuto" }
};

function EventIcon({ eventType, size = 20 }) {
  const config = EVENT_CONFIG[eventType] || EVENT_CONFIG.unknown;
  const Icon = config.icon;
  return <Icon className="flex-shrink-0" style={{ width: size, height: size, color: config.color }} />;
}

function StatCard({ icon: Icon, value, label, color, trend }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" 
                style={{ background: trend > 0 ? '#EAFAF1' : '#FEE2E2', color: trend > 0 ? '#34C77B' : '#EF4444' }}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-black" style={{ color: '#1E2128' }}>{value}</div>
      <div className="text-xs" style={{ color: '#9CA3AF' }}>{label}</div>
    </div>
  );
}

function WebhookLogItem({ log }) {
  const config = EVENT_CONFIG[log.event_type] || EVENT_CONFIG.unknown;
  const Icon = config.icon;
  
  return (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0" style={{ borderColor: '#ECEDEF' }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" 
           style={{ background: `${config.color}15` }}>
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm" style={{ color: '#1E2128' }}>{config.label}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            log.processed 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
          }`}>
            {log.processed ? 'PROCESSATO' : 'ERRORE'}
          </span>
        </div>
        
        <div className="space-y-1">
          {log.actions_taken?.map((action, i) => (
            <div key={i} className="text-xs" style={{ color: '#5F6572' }}>
              {action}
            </div>
          ))}
        </div>
        
        <div className="text-[10px] mt-2" style={{ color: '#9CA3AF' }}>
          {new Date(log.created_at).toLocaleString("it-IT")}
        </div>
      </div>
    </div>
  );
}

export function WebhookDashboard() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/webhooks/logs?limit=50`),
        axios.get(`${API}/api/webhooks/stats`)
      ]);
      
      setLogs(logsRes.data.logs || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Failed to load webhook data:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = eventFilter 
    ? logs.filter(l => l.event_type === eventFilter)
    : logs;

  const webhookUrl = `${API_URL}/api/webhooks/systeme`;

  return (
    <div className="space-y-6" data-testid="webhook-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: '#1E2128' }}>
            <Webhook className="w-6 h-6" style={{ color: '#F2C418' }} />
            Webhooks Systeme.io
          </h1>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Automazioni e sincronizzazione in tempo reale
          </p>
        </div>
        <button 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105"
          style={{ background: '#F2C418', color: '#1E2128' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Webhook URL Box */}
      <div className="rounded-xl p-4 border" style={{ background: '#FFF8DC', borderColor: '#F2C41850' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: '#C4990A' }}>
              URL Webhook da configurare su Systeme.io
            </div>
            <code className="text-sm font-mono" style={{ color: '#1E2128' }}>
              {webhookUrl}
            </code>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(webhookUrl)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            Copia
          </button>
        </div>
      </div>

      {/* Stats Grid - Metriche Piano Continuità */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          icon={Webhook} 
          value={stats?.events_by_type ? Object.values(stats.events_by_type).reduce((a, b) => a + b, 0) : 0}
          label="Tutti gli eventi ricevuti da Systeme.io"
          color="#3B82F6"
        />
        <StatCard 
          icon={CreditCard}
          value={stats?.payments_received || 0}
          label="Fee mensili + upfront partner"
          color="#34C77B"
        />
        <StatCard 
          icon={TrendingUp}
          value={`€${stats?.commissions_total || 0}`}
          label="% sul fatturato accademie partner"
          color="#8B5CF6"
        />
        <StatCard 
          icon={Calendar}
          value={stats?.renewals_expiring || 0}
          label="Piani con rinnovo nei prossimi 30 giorni"
          color="#F59E0B"
        />
      </div>

      {/* Log Eventi */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'white', borderColor: '#ECEDEF' }}>
          {/* Filter */}
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#ECEDEF' }}>
            <span className="text-sm font-bold" style={{ color: '#1E2128' }}>
              {filteredLogs.length} eventi
            </span>
            <div className="relative">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border"
                style={{ background: '#FAFAF7', borderColor: '#ECEDEF', color: '#5F6572' }}
              >
                <option value="">Tutti gli eventi</option>
                <option value="payment_received">Pagamenti</option>
                <option value="commission_calculated">Commissioni</option>
                <option value="plan_renewed">Rinnovi</option>
                <option value="plan_expired">Scadenze</option>
                <option value="new_sale">Vendite</option>
                <option value="new_subscriber">Iscritti</option>
                <option value="refund">Rimborsi</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" 
                           style={{ color: '#9CA3AF' }} />
            </div>
          </div>
          
          {/* Logs List */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Webhook className="w-12 h-12 mx-auto mb-3" style={{ color: '#ECEDEF' }} />
                <div className="font-bold" style={{ color: '#9CA3AF' }}>Nessun evento</div>
                <div className="text-sm" style={{ color: '#9CA3AF' }}>
                  Configura il webhook su Systeme.io per iniziare
                </div>
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <WebhookLogItem key={i} log={log} />
              ))
            )}
          </div>
        </div>

      {/* Quick Actions */}
      <div className="rounded-xl p-5 border" style={{ background: '#FAFAF7', borderColor: '#ECEDEF' }}>
        <h3 className="font-bold mb-3" style={{ color: '#1E2128' }}>Automazioni Attive</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-bold" style={{ color: '#1E2128' }}>Auto-Onboarding</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Crea partner su nuova vendita</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-bold" style={{ color: '#1E2128' }}>Sync Systeme.io</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Dati in tempo reale</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-bold" style={{ color: '#1E2128' }}>Auto-Progressione Fasi</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Avanza fase con tag</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ background: 'white', borderColor: '#ECEDEF' }}>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-bold" style={{ color: '#1E2128' }}>Sync Clienti</div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Aggiorna stats partner</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebhookDashboard;
