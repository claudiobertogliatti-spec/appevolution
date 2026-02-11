import { useState, useEffect } from "react";
import {
  Zap, Target, TrendingUp, TrendingDown, AlertTriangle, 
  DollarSign, Users, Eye, Copy, ExternalLink, RefreshCw,
  Loader2, CheckCircle, XCircle, Link2, Settings, Sparkles,
  BarChart3, PieChart, Activity, Bell
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_CONFIG = {
  meta: { label: "Meta Ads", color: "bg-blue-500", icon: "📘" },
  google: { label: "Google Ads", color: "bg-red-500", icon: "🔍" },
  tiktok: { label: "TikTok Ads", color: "bg-pink-500", icon: "🎵" }
};

export function StefaniaWarMode({ partners }) {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState("meta");
  const [generatedHooks, setGeneratedHooks] = useState([]);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  const [utmUrl, setUtmUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [generatedUtm, setGeneratedUtm] = useState(null);
  
  // Metrics simulation (for demo)
  const [metricsForm, setMetricsForm] = useState({ spend: 100, leads: 10, conversions: 2, revenue: 500 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, alertsRes] = await Promise.all([
        axios.get(`${API}/stefania/war-mode/dashboard`),
        axios.get(`${API}/stefania/war-mode/alerts`)
      ]);
      setDashboard(dashRes.data);
      setAlerts(alertsRes.data);
    } catch (e) {
      console.error("Error loading war mode data:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateHooks = async () => {
    if (!selectedPartner) return;
    setGeneratingHooks(true);
    try {
      const res = await axios.post(`${API}/stefania/war-mode/generate-hooks`, {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        partner_niche: selectedPartner.niche,
        platform: selectedPlatform
      });
      setGeneratedHooks(res.data.hooks || []);
    } catch (e) {
      console.error("Error generating hooks:", e);
      alert("Errore nella generazione hooks");
    } finally {
      setGeneratingHooks(false);
    }
  };

  const generateUtmLink = async () => {
    if (!selectedPartner || !destinationUrl || !campaignName) return;
    try {
      const res = await axios.post(`${API}/stefania/war-mode/generate-utm`, {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        destination_url: destinationUrl,
        campaign_name: campaignName,
        medium: "paid",
        source: selectedPlatform
      });
      setGeneratedUtm(res.data);
    } catch (e) {
      console.error("Error generating UTM:", e);
    }
  };

  const updateMetrics = async (campaignId) => {
    try {
      const res = await axios.post(`${API}/stefania/war-mode/campaigns/${campaignId}/update-metrics`, null, {
        params: metricsForm
      });
      if (res.data.alerts_triggered > 0) {
        alert(`⚠️ ${res.data.alerts_triggered} alert generati! CPL troppo alto.`);
      }
      loadData();
    } catch (e) {
      console.error("Error updating metrics:", e);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API}/stefania/war-mode/alerts/${alertId}/resolve`);
      loadData();
    } catch (e) {
      console.error("Error resolving alert:", e);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copiato!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-in" data-testid="stefania-war-mode">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              STEFANIA — WAR MODE
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">ACTIVE</span>
            </h2>
            <p className="text-sm text-white/50">Ads & Traffic Intelligence · Auto-Optimization · UTM Tracking</p>
          </div>
          <button onClick={loadData} className="p-2 text-white/30 hover:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      {dashboard && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-red-500">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase">Campagne</span>
            </div>
            <div className="font-mono text-2xl font-bold text-white">{dashboard.overview.total_campaigns}</div>
          </div>
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase">Spesa Totale</span>
            </div>
            <div className="font-mono text-2xl font-bold text-white">€{dashboard.overview.total_spend.toFixed(0)}</div>
          </div>
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase">Lead Totali</span>
            </div>
            <div className="font-mono text-2xl font-bold text-white">{dashboard.overview.total_leads}</div>
          </div>
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase">CPL Medio</span>
            </div>
            <div className="font-mono text-2xl font-bold text-white">€{dashboard.overview.avg_cpl.toFixed(2)}</div>
          </div>
          <div className={`bg-[#1a2332] border rounded-xl p-4 border-t-4 ${dashboard.overview.active_alerts > 0 ? "border-t-red-500 border-red-500/30" : "border-t-green-500 border-white/10"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-red-400" />
              <span className="text-[10px] font-bold text-white/40 uppercase">Alert Attivi</span>
            </div>
            <div className={`font-mono text-2xl font-bold ${dashboard.overview.active_alerts > 0 ? "text-red-400" : "text-green-400"}`}>
              {dashboard.overview.active_alerts}
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
          <h3 className="text-sm font-extrabold text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Alert Performance Attivi
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="bg-[#1a2332] border border-red-500/20 rounded-lg p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${alert.severity === "critical" ? "bg-red-500/20" : "bg-orange-500/20"}`}>
                  {alert.severity === "critical" ? <XCircle className="w-5 h-5 text-red-400" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${alert.severity === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                      {alert.alert_type.toUpperCase().replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{alert.message}</div>
                  <div className="text-xs text-white/50">{alert.suggested_action}</div>
                </div>
                <button onClick={() => resolveAlert(alert.id)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10">
                  Risolvi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Ads Hook Generator */}
        <div className="space-y-4">
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" /> Ads Script Generator
            </h3>
            
            {/* Partner Selector */}
            <div className="mb-4">
              <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Seleziona Partner</label>
              <div className="flex gap-2 flex-wrap">
                {partners.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartner(p)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedPartner?.id === p.id ? "bg-orange-500 text-white" : "bg-white/5 border border-white/10 text-white/60 hover:border-orange-500/30"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Platform Selector */}
            <div className="mb-4">
              <label className="text-xs font-bold text-white/40 uppercase mb-2 block">Piattaforma</label>
              <div className="flex gap-2">
                {Object.entries(PLATFORM_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlatform(key)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${selectedPlatform === key ? `${config.color} text-white` : "bg-white/5 border border-white/10 text-white/60"}`}
                  >
                    {config.icon} {config.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateHooks}
              disabled={!selectedPartner || generatingHooks}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl px-4 py-3 font-extrabold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generatingHooks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Genera 5 Hook Potenti
            </button>

            {/* Generated Hooks */}
            {generatedHooks.length > 0 && (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-bold text-green-400 uppercase">Hook Generati</label>
                {generatedHooks.map((hook, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 text-sm text-white/80">{hook}</div>
                    <button onClick={() => copyToClipboard(hook)} className="text-white/30 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: UTM Generator & Metrics */}
        <div className="space-y-4">
          {/* UTM Generator */}
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" /> Tracking Automatizzato (UTM)
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                placeholder="URL Destinazione (es: https://systeme.io/...)"
                value={destinationUrl}
                onChange={e => setDestinationUrl(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30"
              />
              <input
                type="text"
                placeholder="Nome Campagna"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30"
              />
              <button
                onClick={generateUtmLink}
                disabled={!selectedPartner || !destinationUrl}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" /> Genera Link Tracciato
              </button>
            </div>

            {generatedUtm && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-xs font-bold text-green-400 uppercase mb-2">Link Generato</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={generatedUtm.tracked_url}
                    readOnly
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                  <button onClick={() => copyToClipboard(generatedUtm.tracked_url)} className="p-2 bg-green-500 rounded-lg">
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="mt-2 text-[10px] text-white/40">
                  UTM: source={generatedUtm.utm_params.utm_source}, campaign={generatedUtm.utm_params.utm_campaign}
                </div>
              </div>
            )}
          </div>

          {/* Metrics Simulator (for demo) */}
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Performance Bridge (MARTA)
            </h3>
            <p className="text-xs text-white/40 mb-4">Simula metriche per testare Auto-Optimization</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] text-white/40">Spesa (€)</label>
                <input
                  type="number"
                  value={metricsForm.spend}
                  onChange={e => setMetricsForm({ ...metricsForm, spend: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40">Lead</label>
                <input
                  type="number"
                  value={metricsForm.leads}
                  onChange={e => setMetricsForm({ ...metricsForm, leads: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40">Conversioni</label>
                <input
                  type="number"
                  value={metricsForm.conversions}
                  onChange={e => setMetricsForm({ ...metricsForm, conversions: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/40">Revenue (€)</label>
                <input
                  type="number"
                  value={metricsForm.revenue}
                  onChange={e => setMetricsForm({ ...metricsForm, revenue: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
            
            <div className="text-xs text-white/40 mb-3">
              CPL Calcolato: <span className={`font-bold ${metricsForm.spend / metricsForm.leads > 15 ? "text-red-400" : "text-green-400"}`}>
                €{(metricsForm.spend / metricsForm.leads).toFixed(2)}
              </span> (Soglia: €15)
            </div>

            {dashboard?.campaigns?.[0] && (
              <button
                onClick={() => updateMetrics(dashboard.campaigns[0].id)}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-purple-600"
              >
                <TrendingUp className="w-4 h-4" /> Aggiorna Metriche (Test Alert)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      {dashboard?.campaigns?.length > 0 && (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h3 className="font-bold">Campagne Attive</h3>
            <span className="text-xs text-white/40">{dashboard.campaigns.length} campagne</span>
          </div>
          <div className="divide-y divide-white/5">
            {dashboard.campaigns.map(campaign => {
              const platform = PLATFORM_CONFIG[campaign.platform] || PLATFORM_CONFIG.meta;
              const cplStatus = campaign.cpl > 15 ? "text-red-400" : campaign.cpl > 10 ? "text-orange-400" : "text-green-400";
              
              return (
                <div key={campaign.id} className="p-4 flex items-center gap-4 hover:bg-white/5">
                  <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center text-lg`}>
                    {platform.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white">{campaign.partner_name}</div>
                    <div className="text-xs text-white/40">{campaign.campaign_name}</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="font-mono text-sm font-bold text-white">€{campaign.spend_total?.toFixed(0) || 0}</div>
                    <div className="text-[10px] text-white/40">Spesa</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="font-mono text-sm font-bold text-white">{campaign.leads || 0}</div>
                    <div className="text-[10px] text-white/40">Lead</div>
                  </div>
                  <div className="text-center px-4">
                    <div className={`font-mono text-sm font-bold ${cplStatus}`}>€{campaign.cpl?.toFixed(2) || "0.00"}</div>
                    <div className="text-[10px] text-white/40">CPL</div>
                  </div>
                  <div className="text-center px-4">
                    <div className="font-mono text-sm font-bold text-blue-400">{campaign.roas?.toFixed(2) || "0.00"}x</div>
                    <div className="text-[10px] text-white/40">ROAS</div>
                  </div>
                  {campaign.hooks?.length > 0 && (
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded">
                      {campaign.hooks.length} hooks
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
