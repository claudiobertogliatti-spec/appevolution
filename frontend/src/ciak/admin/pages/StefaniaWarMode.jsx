/**
 * Ciak Admin — Campagne Ads (versione snellita, allineata alla realtà Ciak).
 *
 * Gestione campagne Meta Ads per i partner in fase Ottimizza (tier Growth/Scale
 * di Evolution One). Tre strumenti operativi e realmente cablati:
 *   - Overview KPI campagne (GET /api/stefania/war-mode/dashboard + /alerts)
 *   - Meta Hook Gallery (3 angoli per i primi 5 secondi del video-ad)
 *   - Generatore link tracciati UTM
 *
 * Rimosse le sezioni aspirazionali non cablate alla realtà Ciak (LinkedIn ABM,
 * Cross-Platform Analysis, config API real-time, ROI/MARTA CRM): la strategia è
 * organic-first, gli ads multi-canale arrivano dopo. Si reintroducono quando
 * esiste il backend reale dietro.
 *
 * Sorgenti: /api/stefania/war-mode/*. Chiamate via adminFetch (token admin Ciak).
 */
import { useState, useEffect } from "react";
import {
  Zap, Target, AlertTriangle, DollarSign, Users, Copy, RefreshCw,
  Loader2, Link2, Sparkles, BarChart3, Facebook, Video,
} from "lucide-react";
import { adminFetch } from "../api";

const HOOK_TYPES = [
  { id: "pain", label: "Angolo del Dolore", icon: "😤", color: "text-red-500", desc: "Colpisci il punto dolente" },
  { id: "secret", label: "Angolo del Segreto", icon: "🤫", color: "text-purple-500", desc: "Curiosity gap irresistibile" },
  { id: "result", label: "Angolo del Risultato", icon: "📈", color: "text-green-600", desc: "Social proof con numeri" },
];

export function StefaniaWarMode({ partners: partnersProp, onAuthExpired }) {
  const [partners, setPartners] = useState(partnersProp || []);
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | meta
  const [selectedPartner, setSelectedPartner] = useState(null);

  // Meta Hook Gallery
  const [hookGallery, setHookGallery] = useState(null);
  const [generatingHooks, setGeneratingHooks] = useState(false);

  // UTM Generator
  const [destinationUrl, setDestinationUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [generatedUtm, setGeneratedUtm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (partnersProp) {
      setPartners(partnersProp);
      return;
    }
    const loadPartners = async () => {
      try {
        const res = await adminFetch(`/api/admin/ciak/partners`);
        const data = await res.json();
        setPartners(data.items || []);
      } catch (e) {
        if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
        console.error("Error loading partners:", e);
      }
    };
    loadPartners();
  }, [partnersProp, onAuthExpired]);

  useEffect(() => {
    if (selectedPartner) {
      loadPartnerHooks();
    }
  }, [selectedPartner]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, alertsRes] = await Promise.all([
        adminFetch(`/api/stefania/war-mode/dashboard`),
        adminFetch(`/api/stefania/war-mode/alerts`),
      ]);
      setDashboard(await dashRes.json());
      setAlerts(await alertsRes.json());
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      console.error("Error loading war mode data:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerHooks = async () => {
    if (!selectedPartner) return;
    try {
      const res = await adminFetch(`/api/stefania/war-mode/multi-channel/${selectedPartner.id}`);
      const data = await res.json();
      if (data.meta?.hook_gallery) setHookGallery(data.meta.hook_gallery);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      console.error("Error loading hooks:", e);
    }
  };

  const generateHookGallery = async () => {
    if (!selectedPartner) return;
    setGeneratingHooks(true);
    try {
      const res = await adminFetch(`/api/stefania/war-mode/hook-gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: selectedPartner.id,
          partner_name: selectedPartner.name,
          partner_niche: selectedPartner.niche,
        }),
      });
      const data = await res.json();
      setHookGallery(data.hook_gallery);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      console.error("Error generating hooks:", e);
      alert("Errore nella generazione Hook Gallery");
    } finally {
      setGeneratingHooks(false);
    }
  };

  const generateUtmLink = async () => {
    if (!selectedPartner || !destinationUrl || !campaignName) return;
    try {
      const res = await adminFetch(`/api/stefania/war-mode/generate-utm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: selectedPartner.id,
          partner_name: selectedPartner.name,
          destination_url: destinationUrl,
          campaign_name: campaignName,
          medium: "paid",
          source: "meta",
        }),
      });
      setGeneratedUtm(await res.json());
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      console.error("Error generating UTM:", e);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      await adminFetch(`/api/stefania/war-mode/alerts/${alertId}/resolve`, { method: "POST" });
      loadData();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      console.error("Error resolving alert:", e);
    }
  };

  const copyToClipboard = (text) => navigator.clipboard.writeText(text);

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
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Zap className="w-7 h-7 text-[#0F172A] animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
              Campagne Ads Partner
              <span className="text-xs bg-[#FFD24D] text-[#0F172A] px-2 py-0.5 rounded-full">ADS</span>
            </h2>
            <p className="text-sm text-[#5F6572]">
              Meta Ads per i partner in fase Ottimizza — tier Growth e Scale di Evolution One
            </p>
          </div>
          <button onClick={loadData} className="p-2 text-[#9CA3AF] hover:text-[#0F172A]">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "meta", label: "Meta Ads", icon: Facebook },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? "bg-[#FFD24D] text-[#0F172A]"
                  : "bg-[#FAFAF7] text-[#9CA3AF] hover:text-[#5F6572]"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="font-bold text-red-400">{alerts.length} Alert Attivi</span>
          </div>
          {alerts.slice(0, 2).map((alert) => (
            <div key={alert.id} className="mt-3 flex items-center justify-between bg-white rounded-lg p-3">
              <div>
                <span className="text-sm font-bold text-[#0F172A]">{alert.message}</span>
                <p className="text-xs text-[#5F6572] mt-1">{alert.suggested_action}</p>
              </div>
              <button onClick={() => resolveAlert(alert.id)} className="px-3 py-1 text-xs font-bold bg-[#ECEDEF] rounded hover:bg-white/20">
                Risolvi
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Partner Selector */}
      <div className="bg-white border border-[#ECEDEF] rounded-xl p-4">
        <label className="text-xs font-bold text-[#9CA3AF] uppercase mb-3 block">Seleziona Partner</label>
        <div className="flex gap-2 flex-wrap">
          {partners.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPartner(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                selectedPartner?.id === p.id
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-[#0F172A]"
                  : "bg-[#FAFAF7] border border-[#ECEDEF] text-[#5F6572] hover:border-red-500/30"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#FFD24D] flex items-center justify-center text-[10px] font-bold text-black">
                {p.name?.split(" ").map((n) => n[0]).join("")}
              </div>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 border-t-4 border-t-red-500">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Campagne</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F172A]">{dashboard.overview.total_campaigns}</div>
            </div>
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 border-t-4 border-t-orange-500">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Spesa</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F172A]">€{dashboard.overview.total_spend.toFixed(0)}</div>
            </div>
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 border-t-4 border-t-green-500">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Lead</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F172A]">{dashboard.overview.total_leads}</div>
            </div>
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 border-t-4 border-t-blue-500">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">CPL Medio</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F172A]">€{dashboard.overview.avg_cpl.toFixed(2)}</div>
            </div>
            <div className="bg-white border border-[#ECEDEF] rounded-xl p-4 border-t-4 border-t-blue-400">
              <div className="flex items-center gap-2 mb-2">
                <Facebook className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-[#9CA3AF] uppercase">Meta CPL</span>
              </div>
              <div className="font-mono text-2xl font-bold text-blue-400">
                €{dashboard.platform_comparison?.meta?.cpl?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Meta Card */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Facebook className="w-5 h-5 text-[#0F172A]" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A]">Meta Ads</h3>
                <p className="text-xs text-[#9CA3AF]">Visceral · Emotional · Broad Targeting</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-[#9CA3AF]">Spend</div>
                <div className="font-mono font-bold text-[#0F172A]">€{dashboard.by_platform?.meta?.spend?.toFixed(0) || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">Leads</div>
                <div className="font-mono font-bold text-[#0F172A]">{dashboard.by_platform?.meta?.leads || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#9CA3AF]">ROAS</div>
                <div className="font-mono font-bold text-green-400">{dashboard.platform_comparison?.meta?.roas?.toFixed(2) || "0.00"}x</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta Tab - Hook Gallery */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                  <Facebook className="w-6 h-6 text-[#0F172A]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#0F172A]">Meta Ads — Hook Gallery</h3>
                  <p className="text-sm text-[#5F6572]">3 varianti per i primi 5 secondi del video</p>
                </div>
              </div>
              <button
                onClick={generateHookGallery}
                disabled={!selectedPartner || generatingHooks}
                className="flex items-center gap-2 bg-blue-500 text-[#0F172A] rounded-xl px-5 py-2 font-bold text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {generatingHooks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Genera Hook Gallery
              </button>
            </div>

            {!selectedPartner && (
              <div className="text-center py-8 text-[#9CA3AF]">Seleziona un partner per generare gli hook</div>
            )}

            {hookGallery && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {HOOK_TYPES.map((hookType) => (
                  <div key={hookType.id} className="bg-white border border-[#ECEDEF] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{hookType.icon}</span>
                      <div>
                        <span className={`font-bold text-sm ${hookType.color}`}>{hookType.label}</span>
                        <p className="text-[10px] text-[#9CA3AF]">{hookType.desc}</p>
                      </div>
                    </div>
                    <div className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg p-3 min-h-[100px]">
                      <p className="text-sm text-[#5F6572] leading-relaxed">{hookGallery[hookType.id] || "Non generato"}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(hookGallery[hookType.id] || "")}
                      className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-[#9CA3AF] hover:text-[#0F172A] py-2"
                    >
                      <Copy className="w-3 h-3" /> Copia
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hookGallery?.targeting_note && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <span className="text-xs font-bold text-yellow-600">📍 Targeting Note: </span>
                <span className="text-xs text-[#5F6572]">{hookGallery.targeting_note}</span>
              </div>
            )}
          </div>

          {/* Video Request for ANDREA */}
          {hookGallery && (
            <div className="bg-white border border-pink-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-pink-400" />
                <div className="flex-1">
                  <span className="font-bold text-sm text-[#0F172A]">Richiedi Video ad ANDREA</span>
                  <p className="text-xs text-[#9CA3AF]">Invia questi 3 hook ad Andrea per la produzione dei video-ads</p>
                </div>
                <button className="px-4 py-2 bg-pink-500 text-[#0F172A] rounded-lg text-sm font-bold hover:bg-pink-600">
                  Crea Task Video
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UTM Generator (visibile con partner selezionato) */}
      {selectedPartner && (
        <div className="bg-white border border-[#ECEDEF] rounded-xl p-5">
          <h3 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-500" /> Tracking Automatizzato (UTM)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="URL Destinazione (Systeme.io)"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="md:col-span-2 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2 text-sm text-[#0F172A] placeholder:text-[#9CA3AF]"
            />
            <input
              type="text"
              placeholder="Nome Campagna"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-4 py-2 text-sm text-[#0F172A] placeholder:text-[#9CA3AF]"
            />
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={generateUtmLink}
              disabled={!destinationUrl || !campaignName}
              className="flex items-center gap-2 bg-blue-500 text-[#0F172A] rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
            >
              <Facebook className="w-4 h-4" /> Genera UTM Meta
            </button>
          </div>

          {generatedUtm && (
            <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedUtm.tracked_url}
                  readOnly
                  className="flex-1 bg-[#FAFAF7] border border-[#ECEDEF] rounded-lg px-3 py-2 text-xs text-[#0F172A] font-mono"
                />
                <button onClick={() => copyToClipboard(generatedUtm.tracked_url)} className="p-2 bg-green-500 rounded-lg">
                  <Copy className="w-4 h-4 text-[#0F172A]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StefaniaWarMode;
