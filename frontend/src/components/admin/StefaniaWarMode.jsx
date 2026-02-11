import { useState, useEffect } from "react";
import {
  Zap, Target, TrendingUp, TrendingDown, AlertTriangle, 
  DollarSign, Users, Eye, Copy, ExternalLink, RefreshCw,
  Loader2, CheckCircle, XCircle, Link2, Settings, Sparkles,
  BarChart3, PieChart, Activity, Bell, ArrowRight, ArrowLeftRight,
  Linkedin, Facebook, Video, FileText, MessageSquare, ShieldCheck,
  Key, Plug, CreditCard, Receipt, Database
} from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_CONFIG = {
  meta: { 
    label: "Meta Ads", 
    color: "bg-blue-500", 
    icon: Facebook,
    strategy: "Visceral/Emotional",
    targeting: "Broad (let copy filter)"
  },
  linkedin: { 
    label: "LinkedIn Ads", 
    color: "bg-sky-700", 
    icon: Linkedin,
    strategy: "Authority/Professional",
    targeting: "ABM (Account-Based)"
  }
};

const HOOK_TYPES = [
  { id: "pain", label: "Angolo del Dolore", icon: "😤", color: "text-red-400", desc: "Colpisci il punto dolente" },
  { id: "secret", label: "Angolo del Segreto", icon: "🤫", color: "text-purple-400", desc: "Curiosity gap irresistibile" },
  { id: "result", label: "Angolo del Risultato", icon: "📈", color: "text-green-400", desc: "Social proof con numeri" }
];

const LINKEDIN_CONTENT_TYPES = [
  { id: "thought_leadership", label: "Thought Leadership", icon: "💡", desc: "Post analisi di mercato" },
  { id: "abm_ad", label: "ABM Targeting", icon: "🎯", desc: "Ad per decision-maker" },
  { id: "lead_gen_form", label: "Lead Gen Form", icon: "📋", desc: "Form pre-compilato nativo" }
];

export function StefaniaWarMode({ partners }) {
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, meta, linkedin, analysis, api, roi
  const [selectedPartner, setSelectedPartner] = useState(null);
  
  // Meta Hook Gallery
  const [hookGallery, setHookGallery] = useState(null);
  const [generatingHooks, setGeneratingHooks] = useState(false);
  
  // LinkedIn Content
  const [linkedinContent, setLinkedinContent] = useState({});
  const [generatingLinkedin, setGeneratingLinkedin] = useState(false);
  const [selectedLinkedinType, setSelectedLinkedinType] = useState("thought_leadership");
  const [targetSegment, setTargetSegment] = useState("agency_owners");
  
  // Cross-Platform Analysis
  const [crossAnalysis, setCrossAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // UTM Generator
  const [destinationUrl, setDestinationUrl] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [generatedUtm, setGeneratedUtm] = useState(null);
  
  // Metrics simulator
  const [metricsForm, setMetricsForm] = useState({ 
    spend: 500, leads: 25, qualified_leads: 8, conversions: 3, revenue: 2500, ltv_avg: 800 
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      loadPartnerMultiChannel();
    }
  }, [selectedPartner]);

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

  const loadPartnerMultiChannel = async () => {
    if (!selectedPartner) return;
    try {
      const res = await axios.get(`${API}/stefania/war-mode/multi-channel/${selectedPartner.id}`);
      if (res.data.meta?.hook_gallery) {
        setHookGallery(res.data.meta.hook_gallery);
      }
      if (res.data.linkedin?.linkedin_content) {
        setLinkedinContent(res.data.linkedin.linkedin_content);
      }
    } catch (e) {
      console.error("Error loading multi-channel:", e);
    }
  };

  const generateHookGallery = async () => {
    if (!selectedPartner) return;
    setGeneratingHooks(true);
    try {
      const res = await axios.post(`${API}/stefania/war-mode/hook-gallery`, {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        partner_niche: selectedPartner.niche
      });
      setHookGallery(res.data.hook_gallery);
    } catch (e) {
      console.error("Error generating hooks:", e);
      alert("Errore nella generazione Hook Gallery");
    } finally {
      setGeneratingHooks(false);
    }
  };

  const generateLinkedinContent = async () => {
    if (!selectedPartner) return;
    setGeneratingLinkedin(true);
    try {
      const res = await axios.post(`${API}/stefania/war-mode/linkedin-content`, {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        partner_niche: selectedPartner.niche,
        content_type: selectedLinkedinType,
        target_segment: targetSegment
      });
      setLinkedinContent(prev => ({
        ...prev,
        [selectedLinkedinType]: res.data.linkedin_content
      }));
    } catch (e) {
      console.error("Error generating LinkedIn content:", e);
    } finally {
      setGeneratingLinkedin(false);
    }
  };

  const runCrossAnalysis = async () => {
    if (!selectedPartner) return;
    setAnalyzing(true);
    try {
      const res = await axios.post(`${API}/stefania/war-mode/cross-platform-analysis?partner_id=${selectedPartner.id}`);
      setCrossAnalysis(res.data);
      loadData(); // Refresh alerts
    } catch (e) {
      console.error("Error analyzing:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  const generateUtmLink = async (platform) => {
    if (!selectedPartner || !destinationUrl || !campaignName) return;
    try {
      const res = await axios.post(`${API}/stefania/war-mode/generate-utm`, {
        partner_id: selectedPartner.id,
        partner_name: selectedPartner.name,
        destination_url: destinationUrl,
        campaign_name: campaignName,
        medium: "paid",
        source: platform
      });
      setGeneratedUtm(res.data);
    } catch (e) {
      console.error("Error generating UTM:", e);
    }
  };

  const updateMetrics = async (platform) => {
    if (!dashboard?.campaigns?.length) return;
    const campaign = dashboard.campaigns.find(c => c.platform === platform);
    if (!campaign) return;
    
    try {
      await axios.post(`${API}/stefania/war-mode/campaigns/${campaign.id}/update-metrics`, null, {
        params: {
          spend: metricsForm.spend,
          leads: metricsForm.leads,
          conversions: metricsForm.conversions,
          revenue: metricsForm.revenue
        }
      });
      // Update LTV separately
      await axios.post(`${API}/stefania/war-mode/campaigns/${campaign.id}/update-ltv`, null, {
        params: {
          ltv_avg: metricsForm.ltv_avg,
          qualified_leads: metricsForm.qualified_leads
        }
      });
      loadData();
      alert("Metriche aggiornate!");
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
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Zap className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              STEFANIA — WAR MODE
              <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">MULTI-CHANNEL</span>
            </h2>
            <p className="text-sm text-white/50">Meta (Visceral) + LinkedIn (Authority) · Auto-Pivot · LTV Tracking</p>
          </div>
          <button onClick={loadData} className="p-2 text-white/30 hover:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "meta", label: "Meta Ads", icon: Facebook },
            { id: "linkedin", label: "LinkedIn Ads", icon: Linkedin },
            { id: "analysis", label: "Cross-Platform", icon: ArrowLeftRight }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? "bg-white/10 text-white border border-white/20" 
                  : "text-white/40 hover:text-white/60"
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
          {alerts.slice(0, 2).map(alert => (
            <div key={alert.id} className="mt-3 flex items-center justify-between bg-[#1a2332] rounded-lg p-3">
              <div>
                <span className="text-sm font-bold text-white">{alert.message}</span>
                <p className="text-xs text-white/50 mt-1">{alert.suggested_action}</p>
              </div>
              <button onClick={() => resolveAlert(alert.id)} className="px-3 py-1 text-xs font-bold bg-white/10 rounded hover:bg-white/20">
                Risolvi
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Partner Selector */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4">
        <label className="text-xs font-bold text-white/40 uppercase mb-3 block">Seleziona Partner per War Mode</label>
        <div className="flex gap-2 flex-wrap">
          {partners.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPartner(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                selectedPartner?.id === p.id 
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
                  : "bg-white/5 border border-white/10 text-white/60 hover:border-red-500/30"
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#F5C518] flex items-center justify-center text-[10px] font-bold text-black">
                {p.name?.split(" ").map(n => n[0]).join("")}
              </div>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && dashboard && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-6 gap-4">
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
                <span className="text-[10px] font-bold text-white/40 uppercase">Spesa</span>
              </div>
              <div className="font-mono text-2xl font-bold text-white">€{dashboard.overview.total_spend.toFixed(0)}</div>
            </div>
            <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-green-500">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-green-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Lead</span>
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
            <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-blue-400">
              <div className="flex items-center gap-2 mb-2">
                <Facebook className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Meta CPL</span>
              </div>
              <div className="font-mono text-2xl font-bold text-blue-400">
                €{dashboard.platform_comparison?.meta?.cpl?.toFixed(2) || "0.00"}
              </div>
            </div>
            <div className="bg-[#1a2332] border border-white/10 rounded-xl p-4 border-t-4 border-t-sky-600">
              <div className="flex items-center gap-2 mb-2">
                <Linkedin className="w-4 h-4 text-sky-500" />
                <span className="text-[10px] font-bold text-white/40 uppercase">LinkedIn CPL</span>
              </div>
              <div className="font-mono text-2xl font-bold text-sky-400">
                €{dashboard.platform_comparison?.linkedin?.cpl?.toFixed(2) || "0.00"}
              </div>
            </div>
          </div>

          {/* Platform Comparison Visual */}
          <div className="grid grid-cols-2 gap-6">
            {/* Meta Card */}
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white">Meta Ads</h3>
                  <p className="text-xs text-white/40">Visceral · Emotional · Broad Targeting</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-white/40">Spend</div>
                  <div className="font-mono font-bold text-white">€{dashboard.by_platform?.meta?.spend?.toFixed(0) || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Leads</div>
                  <div className="font-mono font-bold text-white">{dashboard.by_platform?.meta?.leads || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">ROAS</div>
                  <div className="font-mono font-bold text-green-400">{dashboard.platform_comparison?.meta?.roas?.toFixed(2) || "0.00"}x</div>
                </div>
              </div>
            </div>

            {/* LinkedIn Card */}
            <div className="bg-gradient-to-br from-sky-900/20 to-sky-800/10 border border-sky-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-sky-700 flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white">LinkedIn Ads</h3>
                  <p className="text-xs text-white/40">Authority · Professional · ABM Targeting</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-white/40">Spend</div>
                  <div className="font-mono font-bold text-white">€{dashboard.by_platform?.linkedin?.spend?.toFixed(0) || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Leads</div>
                  <div className="font-mono font-bold text-white">{dashboard.by_platform?.linkedin?.leads || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-white/40">Lead Quality</div>
                  <div className="font-mono font-bold text-sky-400">{(dashboard.platform_comparison?.linkedin?.lead_quality * 100)?.toFixed(0) || 0}%</div>
                </div>
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
                  <Facebook className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Meta Ads — Hook Gallery</h3>
                  <p className="text-sm text-white/50">3 varianti per i primi 5 secondi del video</p>
                </div>
              </div>
              <button
                onClick={generateHookGallery}
                disabled={!selectedPartner || generatingHooks}
                className="flex items-center gap-2 bg-blue-500 text-white rounded-xl px-5 py-2 font-bold text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {generatingHooks ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Genera Hook Gallery
              </button>
            </div>

            {!selectedPartner && (
              <div className="text-center py-8 text-white/40">
                Seleziona un partner per generare gli hook
              </div>
            )}

            {hookGallery && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {HOOK_TYPES.map(hookType => (
                  <div key={hookType.id} className="bg-[#1a2332] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{hookType.icon}</span>
                      <div>
                        <span className={`font-bold text-sm ${hookType.color}`}>{hookType.label}</span>
                        <p className="text-[10px] text-white/40">{hookType.desc}</p>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 min-h-[100px]">
                      <p className="text-sm text-white/80 leading-relaxed">
                        {hookGallery[hookType.id] || "Non generato"}
                      </p>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(hookGallery[hookType.id] || "")}
                      className="mt-2 w-full flex items-center justify-center gap-2 text-xs text-white/40 hover:text-white py-2"
                    >
                      <Copy className="w-3 h-3" /> Copia
                    </button>
                  </div>
                ))}
              </div>
            )}

            {hookGallery?.targeting_note && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <span className="text-xs font-bold text-yellow-400">📍 Targeting Note: </span>
                <span className="text-xs text-white/60">{hookGallery.targeting_note}</span>
              </div>
            )}
          </div>

          {/* Video Request for ANDREA */}
          {hookGallery && (
            <div className="bg-[#1a2332] border border-pink-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-pink-400" />
                <div className="flex-1">
                  <span className="font-bold text-sm text-white">Richiedi Video ad ANDREA</span>
                  <p className="text-xs text-white/40">Invia questi 3 hook ad Andrea per la produzione dei video-ads</p>
                </div>
                <button className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-bold hover:bg-pink-600">
                  Crea Task Video
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LinkedIn Tab */}
      {activeTab === "linkedin" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-sky-900/20 to-sky-800/10 border border-sky-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-sky-700 flex items-center justify-center">
                  <Linkedin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">LinkedIn Ads — Content Hub</h3>
                  <p className="text-sm text-white/50">Thought Leadership · ABM · Lead Gen Forms</p>
                </div>
              </div>
            </div>

            {/* Content Type Selector */}
            <div className="flex gap-3 mb-4">
              {LINKEDIN_CONTENT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedLinkedinType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedLinkedinType === type.id
                      ? "bg-sky-600 text-white"
                      : "bg-white/5 border border-white/10 text-white/60"
                  }`}
                >
                  <span>{type.icon}</span> {type.label}
                </button>
              ))}
            </div>

            {/* Target Segment (for ABM) */}
            {selectedLinkedinType === "abm_ad" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-white/40 mb-2 block">Target Segment</label>
                <select
                  value={targetSegment}
                  onChange={e => setTargetSegment(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white"
                >
                  <option value="agency_owners">Titolari di Agenzie</option>
                  <option value="senior_consultants">Consulenti Senior</option>
                  <option value="ceo_founders">CEO / Founders</option>
                  <option value="marketing_directors">Marketing Directors</option>
                </select>
              </div>
            )}

            <button
              onClick={generateLinkedinContent}
              disabled={!selectedPartner || generatingLinkedin}
              className="flex items-center gap-2 bg-sky-600 text-white rounded-xl px-5 py-2 font-bold text-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {generatingLinkedin ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Genera {LINKEDIN_CONTENT_TYPES.find(t => t.id === selectedLinkedinType)?.label}
            </button>

            {/* Generated Content Display */}
            {linkedinContent[selectedLinkedinType] && (
              <div className="mt-4 bg-[#1a2332] border border-white/10 rounded-xl p-4">
                <h4 className="text-sm font-bold text-sky-400 mb-3">
                  {LINKEDIN_CONTENT_TYPES.find(t => t.id === selectedLinkedinType)?.icon}{" "}
                  {LINKEDIN_CONTENT_TYPES.find(t => t.id === selectedLinkedinType)?.label}
                </h4>
                
                {selectedLinkedinType === "thought_leadership" && linkedinContent.thought_leadership && (
                  <div className="space-y-3">
                    {linkedinContent.thought_leadership.headline && (
                      <div>
                        <span className="text-[10px] text-white/40">Headline</span>
                        <p className="text-sm font-bold text-white">{linkedinContent.thought_leadership.headline}</p>
                      </div>
                    )}
                    {linkedinContent.thought_leadership.post_text && (
                      <div>
                        <span className="text-[10px] text-white/40">Post</span>
                        <p className="text-sm text-white/80 whitespace-pre-wrap">{linkedinContent.thought_leadership.post_text}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedLinkedinType === "abm_ad" && linkedinContent.abm_ad && (
                  <div className="space-y-3">
                    {linkedinContent.abm_ad.headline && (
                      <div>
                        <span className="text-[10px] text-white/40">Headline</span>
                        <p className="text-sm font-bold text-white">{linkedinContent.abm_ad.headline}</p>
                      </div>
                    )}
                    {linkedinContent.abm_ad.ad_copy && (
                      <div>
                        <span className="text-[10px] text-white/40">Ad Copy</span>
                        <p className="text-sm text-white/80">{linkedinContent.abm_ad.ad_copy}</p>
                      </div>
                    )}
                    {linkedinContent.abm_ad.target_criteria && (
                      <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-2">
                        <span className="text-[10px] text-sky-400">🎯 Targeting: </span>
                        <span className="text-xs text-white/60">{linkedinContent.abm_ad.target_criteria}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedLinkedinType === "lead_gen_form" && linkedinContent.lead_gen_form && (
                  <div className="space-y-3">
                    {linkedinContent.lead_gen_form.form_headline && (
                      <div>
                        <span className="text-[10px] text-white/40">Form Headline</span>
                        <p className="text-sm font-bold text-white">{linkedinContent.lead_gen_form.form_headline}</p>
                      </div>
                    )}
                    {linkedinContent.lead_gen_form.lead_magnet_name && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                        <span className="text-xs text-green-400">📥 Lead Magnet: </span>
                        <span className="text-sm font-bold text-white">{linkedinContent.lead_gen_form.lead_magnet_name}</span>
                      </div>
                    )}
                    {linkedinContent.lead_gen_form.bullet_points && (
                      <div>
                        <span className="text-[10px] text-white/40">Bullet Points</span>
                        <ul className="text-sm text-white/80 list-disc list-inside">
                          {linkedinContent.lead_gen_form.bullet_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => copyToClipboard(JSON.stringify(linkedinContent[selectedLinkedinType], null, 2))}
                  className="mt-3 flex items-center gap-2 text-xs text-white/40 hover:text-white"
                >
                  <Copy className="w-3 h-3" /> Copia tutto
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cross-Platform Analysis Tab */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/10 border border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <ArrowLeftRight className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Cross-Platform Analysis</h3>
                  <p className="text-sm text-white/50">Auto-Pivot · LTV Comparison · Budget Optimization</p>
                </div>
              </div>
              <button
                onClick={runCrossAnalysis}
                disabled={!selectedPartner || analyzing}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl px-5 py-2 font-bold text-sm hover:opacity-90 disabled:opacity-50"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Analizza
              </button>
            </div>

            {!selectedPartner && (
              <div className="text-center py-8 text-white/40">
                Seleziona un partner per l'analisi cross-platform
              </div>
            )}

            {crossAnalysis && (
              <div className="space-y-4">
                {/* Pivot Suggestion */}
                {crossAnalysis.pivot_suggestion && (
                  <div className={`rounded-xl p-4 border ${
                    crossAnalysis.recommended_platform === "linkedin" 
                      ? "bg-sky-500/10 border-sky-500/30" 
                      : "bg-blue-500/10 border-blue-500/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      <span className="font-bold text-yellow-400">Auto-Pivot Suggerito</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{crossAnalysis.pivot_suggestion}</p>
                    
                    {crossAnalysis.budget_recommendation && (
                      <div className="mt-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-bold text-green-400">
                          Sposta {crossAnalysis.budget_recommendation.percentage}% budget a{" "}
                          {crossAnalysis.budget_recommendation.action === "shift_to_linkedin" ? "LinkedIn" : "Meta"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Comparison Table */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Meta Data */}
                  {crossAnalysis.meta && (
                    <div className="bg-[#1a2332] border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Facebook className="w-5 h-5 text-blue-400" />
                        <span className="font-bold text-white">Meta</span>
                        {crossAnalysis.meta.cpl_exceeded && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">CPL ALTO</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-white/40">CPL</span>
                          <p className={`font-mono font-bold ${crossAnalysis.meta.cpl_exceeded ? "text-red-400" : "text-white"}`}>
                            €{crossAnalysis.meta.cpl?.toFixed(2) || "0.00"}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/40">ROAS</span>
                          <p className="font-mono font-bold text-white">{crossAnalysis.meta.roas?.toFixed(2) || "0.00"}x</p>
                        </div>
                        <div>
                          <span className="text-white/40">LTV Medio</span>
                          <p className="font-mono font-bold text-white">€{crossAnalysis.meta.ltv_avg?.toFixed(0) || 0}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Lead/Qualificati</span>
                          <p className="font-mono font-bold text-white">
                            {crossAnalysis.meta.leads}/{crossAnalysis.meta.qualified_leads}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LinkedIn Data */}
                  {crossAnalysis.linkedin && (
                    <div className="bg-[#1a2332] border border-sky-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Linkedin className="w-5 h-5 text-sky-400" />
                        <span className="font-bold text-white">LinkedIn</span>
                        {crossAnalysis.linkedin.qualification_rate > 0.3 && (
                          <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">ALTA QUALITÀ</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-white/40">CPL</span>
                          <p className="font-mono font-bold text-white">€{crossAnalysis.linkedin.cpl?.toFixed(2) || "0.00"}</p>
                        </div>
                        <div>
                          <span className="text-white/40">ROAS</span>
                          <p className="font-mono font-bold text-white">{crossAnalysis.linkedin.roas?.toFixed(2) || "0.00"}x</p>
                        </div>
                        <div>
                          <span className="text-white/40">LTV Medio</span>
                          <p className="font-mono font-bold text-sky-400">€{crossAnalysis.linkedin.ltv_avg?.toFixed(0) || 0}</p>
                        </div>
                        <div>
                          <span className="text-white/40">Qual. Rate</span>
                          <p className="font-mono font-bold text-green-400">
                            {(crossAnalysis.linkedin.qualification_rate * 100)?.toFixed(0) || 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Metrics Simulator */}
          <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Simulatore Metriche (Test Auto-Pivot)
            </h3>
            
            <div className="grid grid-cols-6 gap-3 mb-4">
              {[
                { key: "spend", label: "Spesa (€)" },
                { key: "leads", label: "Lead" },
                { key: "qualified_leads", label: "Lead Qualificati" },
                { key: "conversions", label: "Conversioni" },
                { key: "revenue", label: "Revenue (€)" },
                { key: "ltv_avg", label: "LTV Medio (€)" }
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] text-white/40">{field.label}</label>
                  <input
                    type="number"
                    value={metricsForm[field.key]}
                    onChange={e => setMetricsForm({ ...metricsForm, [field.key]: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => updateMetrics("meta")}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-600"
              >
                <Facebook className="w-4 h-4" /> Aggiorna Meta
              </button>
              <button
                onClick={() => updateMetrics("linkedin")}
                className="flex-1 flex items-center justify-center gap-2 bg-sky-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-sky-700"
              >
                <Linkedin className="w-4 h-4" /> Aggiorna LinkedIn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UTM Generator (always visible) */}
      {selectedPartner && (
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-green-400" /> Tracking Automatizzato (UTM)
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="URL Destinazione (Systeme.io)"
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30"
            />
            <input
              type="text"
              placeholder="Nome Campagna"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/30"
            />
          </div>
          
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => generateUtmLink("meta")}
              disabled={!destinationUrl}
              className="flex items-center gap-2 bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
            >
              <Facebook className="w-4 h-4" /> UTM Meta
            </button>
            <button
              onClick={() => generateUtmLink("linkedin")}
              disabled={!destinationUrl}
              className="flex items-center gap-2 bg-sky-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-sky-700 disabled:opacity-50"
            >
              <Linkedin className="w-4 h-4" /> UTM LinkedIn
            </button>
          </div>
          
          {generatedUtm && (
            <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedUtm.tracked_url}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
                <button 
                  onClick={() => copyToClipboard(generatedUtm.tracked_url)}
                  className="p-2 bg-green-500 rounded-lg"
                >
                  <Copy className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
