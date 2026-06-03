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
 * Skin allineata al resto dell'admin Ciak: slate-900 + yellow-400/500, neutri gray,
 * font di sistema (no font-mono). Sorgenti: /api/stefania/war-mode/*. Chiamate via
 * adminFetch (token admin Ciak).
 */
import { useState, useEffect } from "react";
import {
  Target, AlertTriangle, DollarSign, Users, Copy, RefreshCw,
  Loader2, Link2, Sparkles, BarChart3, Facebook, Video,
} from "lucide-react";
import { adminFetch } from "../api";

const HOOK_TYPES = [
  { id: "pain", label: "Angolo del Dolore", icon: "😤", color: "text-red-600", desc: "Colpisci il punto dolente" },
  { id: "secret", label: "Angolo del Segreto", icon: "🤫", color: "text-purple-600", desc: "Curiosity gap irresistibile" },
  { id: "result", label: "Angolo del Risultato", icon: "📈", color: "text-emerald-600", desc: "Social proof con numeri" },
];

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

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
        <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      </div>
    );
  }

  const KPI_CARDS = dashboard ? [
    { icon: Target, chip: "bg-yellow-100 text-yellow-600", label: "Campagne", value: dashboard.overview.total_campaigns },
    { icon: DollarSign, chip: "bg-slate-100 text-slate-600", label: "Spesa", value: `€${dashboard.overview.total_spend.toFixed(0)}` },
    { icon: Users, chip: "bg-emerald-100 text-emerald-600", label: "Lead", value: dashboard.overview.total_leads },
    { icon: BarChart3, chip: "bg-blue-100 text-blue-600", label: "CPL Medio", value: `€${dashboard.overview.avg_cpl.toFixed(2)}` },
    { icon: Facebook, chip: "bg-blue-100 text-blue-600", label: "Meta CPL", value: `€${dashboard.platform_comparison?.meta?.cpl?.toFixed(2) || "0.00"}` },
  ] : [];

  return (
    <div className="p-8 space-y-6" data-testid="stefania-war-mode">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-yellow-500" /> Campagne Ads
          </h1>
          <p className="text-slate-500 mt-1">
            Meta Ads per i partner in fase Ottimizza — tier Growth e Scale di Evolution One.
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-4 h-4" /> Aggiorna
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "overview", label: "Overview", icon: BarChart3 },
          { id: "meta", label: "Meta Ads", icon: Facebook },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-slate-900 text-yellow-400"
                : "bg-gray-50 border border-gray-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-amber-700">{alerts.length} alert attivi</span>
          </div>
          {alerts.slice(0, 2).map((alert) => (
            <div key={alert.id} className="mt-3 flex items-center justify-between bg-white border border-amber-100 rounded-lg p-3">
              <div className="min-w-0">
                <span className="text-sm font-semibold text-slate-900">{alert.message}</span>
                <p className="text-xs text-slate-500 mt-1">{alert.suggested_action}</p>
              </div>
              <button
                onClick={() => resolveAlert(alert.id)}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-slate-700 rounded-lg hover:bg-gray-200 transition flex-shrink-0 ml-3"
              >
                Risolvi
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Partner Selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Seleziona partner
        </label>
        {partners.length === 0 ? (
          <p className="text-sm text-slate-400">Nessun partner disponibile.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {partners.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPartner(p)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  selectedPartner?.id === p.id
                    ? "bg-slate-900 text-yellow-400"
                    : "bg-gray-50 border border-gray-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                  {initials(p.name)}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {KPI_CARDS.map((kpi) => (
              <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.chip}`}>
                    <kpi.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{kpi.label}</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Meta Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Facebook className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Meta Ads</h3>
                <p className="text-xs text-slate-400">Visceral · Emotional · Broad Targeting</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Spend</div>
                <div className="font-bold text-slate-900">€{dashboard.by_platform?.meta?.spend?.toFixed(0) || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">Leads</div>
                <div className="font-bold text-slate-900">{dashboard.by_platform?.meta?.leads || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">ROAS</div>
                <div className="font-bold text-emerald-600">{dashboard.platform_comparison?.meta?.roas?.toFixed(2) || "0.00"}x</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta Tab - Hook Gallery */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Facebook className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Meta Ads — Hook Gallery</h3>
                  <p className="text-sm text-slate-500">3 varianti per i primi 5 secondi del video</p>
                </div>
              </div>
              <button
                onClick={generateHookGallery}
                disabled={!selectedPartner || generatingHooks}
                className="flex items-center gap-2 bg-slate-900 text-yellow-400 rounded-lg px-5 py-2 font-semibold text-sm hover:bg-slate-800 transition disabled:opacity-50"
              >
                {generatingHooks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Genera Hook Gallery
              </button>
            </div>

            {!selectedPartner && (
              <div className="text-center py-8 text-slate-400">Seleziona un partner per generare gli hook.</div>
            )}

            {hookGallery && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {HOOK_TYPES.map((hookType) => (
                  <div key={hookType.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{hookType.icon}</span>
                      <div>
                        <span className={`font-semibold text-sm ${hookType.color}`}>{hookType.label}</span>
                        <p className="text-[10px] text-slate-400">{hookType.desc}</p>
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 min-h-[100px]">
                      <p className="text-sm text-slate-600 leading-relaxed">{hookGallery[hookType.id] || "Non generato"}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(hookGallery[hookType.id] || "")}
                      className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-900 py-2 transition"
                    >
                      <Copy className="w-3 h-3" /> Copia
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hookGallery?.targeting_note && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <span className="text-xs font-semibold text-yellow-700">📍 Targeting Note: </span>
                <span className="text-xs text-slate-600">{hookGallery.targeting_note}</span>
              </div>
            )}
          </div>

          {/* Richiesta video ad Andrea */}
          {hookGallery && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-slate-400" /> Passa i 3 hook ad Andrea
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">Copia gli hook qui sopra e inviali ad Andrea per la produzione dei video-ads.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UTM Generator (visibile con partner selezionato) */}
      {selectedPartner && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-yellow-500" /> Tracking automatizzato (UTM)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="URL destinazione (Systeme.io)"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
            <input
              type="text"
              placeholder="Nome campagna"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex gap-3 mt-3">
            <button
              onClick={generateUtmLink}
              disabled={!destinationUrl || !campaignName}
              className="flex items-center gap-2 bg-slate-900 text-yellow-400 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Facebook className="w-4 h-4" /> Genera UTM Meta
            </button>
          </div>

          {generatedUtm && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedUtm.tracked_url}
                  readOnly
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-slate-700"
                />
                <button
                  onClick={() => copyToClipboard(generatedUtm.tracked_url)}
                  className="p-2 bg-slate-900 rounded-lg hover:bg-slate-800 transition flex-shrink-0"
                >
                  <Copy className="w-4 h-4 text-yellow-400" />
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
