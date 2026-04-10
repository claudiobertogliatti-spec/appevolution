import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sparkles, Check, Loader2, RefreshCw, Eye, Edit3,
  ChevronDown, ChevronRight, Calendar, Megaphone,
  Target, Video, Mail, Copy, ArrowRight, Download,
  Play, Image, FileText, Zap, Clock, Users, Globe
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   TAB CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "calendario", label: "Calendario 30gg", icon: Calendar },
  { id: "contenuti", label: "Contenuti Pronti", icon: FileText },
  { id: "ads", label: "Piano Ads", icon: Target },
  { id: "webinar", label: "Webinar", icon: Video },
  { id: "promozione", label: "Promozione", icon: Megaphone },
];

const OBJ_COLORS = {
  attenzione: { bg: "#3B82F620", text: "#3B82F6", label: "Attenzione" },
  autorita: { bg: "#8B5CF620", text: "#8B5CF6", label: "Autorità" },
  vendita: { bg: "#EF444420", text: "#EF4444", label: "Vendita" },
  autorità: { bg: "#8B5CF620", text: "#8B5CF6", label: "Autorità" },
};

const TIPO_ICONS = {
  REEL: Video, CAROUSEL: Image, POST: FileText, STORY: Zap,
};

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function CompletedBanner() {
  return (
    <div className="rounded-2xl p-8 text-center" data-testid="lancio-completed-banner"
      style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(255,255,255,0.2)" }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">Piano di Lancio approvato!</h2>
      <p className="text-sm text-white/80 max-w-md mx-auto">
        Hai tutto pronto per lanciare. Segui il calendario, pubblica i contenuti e attiva le ads.
      </p>
    </div>
  );
}

function CalendarioView({ data }) {
  const [weekFilter, setWeekFilter] = useState(0);
  if (!data || !data.length) return null;

  const weeks = [
    { label: "Settimana 1", range: [1, 7] },
    { label: "Settimana 2", range: [8, 14] },
    { label: "Settimana 3", range: [15, 21] },
    { label: "Settimana 4", range: [22, 30] },
  ];

  const filtered = data.filter(
    (d) => d.giorno >= weeks[weekFilter].range[0] && d.giorno <= weeks[weekFilter].range[1]
  );

  return (
    <div className="space-y-3" data-testid="calendario-view">
      {/* Week filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weeks.map((w, i) => (
          <button key={i} onClick={() => setWeekFilter(i)} data-testid={`week-filter-${i}`}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{
              background: weekFilter === i ? "#1E2128" : "white",
              color: weekFilter === i ? "#F2C418" : "#5F6572",
              border: weekFilter === i ? "none" : "1px solid #ECEDEF",
            }}>
            {w.label}
          </button>
        ))}
      </div>
      {/* Day cards */}
      <div className="space-y-2">
        {filtered.map((day) => {
          const obj = OBJ_COLORS[day.obiettivo?.toLowerCase()] || OBJ_COLORS.attenzione;
          const TipoIcon = TIPO_ICONS[day.tipo] || FileText;
          return (
            <div key={day.giorno} className="bg-white rounded-xl border p-4 flex items-start gap-4"
              style={{ borderColor: "#ECEDEF" }} data-testid={`cal-day-${day.giorno}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#F2C41820" }}>
                <span className="text-sm font-black" style={{ color: "#C4990A" }}>{day.giorno}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: "#1E212810", color: "#1E2128" }}>
                    <TipoIcon className="w-3 h-3" /> {day.tipo}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: obj.bg, color: obj.text }}>
                    {obj.label}
                  </span>
                </div>
                <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{day.titolo}</p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>{day.cta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContenutiView({ data }) {
  const [subTab, setSubTab] = useState("reel");
  const [expanded, setExpanded] = useState([0]);
  if (!data) return null;

  const toggle = (i) => setExpanded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const items = data[subTab] || [];

  const subTabs = [
    { id: "reel", label: "Reel", icon: Video, count: (data.reel || []).length },
    { id: "carousel", label: "Carousel", icon: Image, count: (data.carousel || []).length },
    { id: "post", label: "Post", icon: FileText, count: (data.post || []).length },
  ];

  return (
    <div className="space-y-3" data-testid="contenuti-view">
      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setExpanded([0]); }}
            data-testid={`content-tab-${t.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{
              background: subTab === t.id ? "#1E2128" : "white",
              color: subTab === t.id ? "#F2C418" : "#5F6572",
              border: subTab === t.id ? "none" : "1px solid #ECEDEF",
            }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </button>
        ))}
      </div>
      {/* Content items */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
            <button onClick={() => toggle(idx)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: "#F2C41830", color: "#C4990A" }}>{idx + 1}</span>
              <span className="flex-1 text-sm font-bold" style={{ color: "#1E2128" }}>{item.titolo}</span>
              {expanded.includes(idx) ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
                : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
            </button>
            {expanded.includes(idx) && (
              <div className="px-4 pb-4 space-y-3">
                {item.hook && (
                  <div className="rounded-xl p-3" style={{ background: "#FEF3C7" }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#92400E" }}>Hook</div>
                    <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{item.hook}</p>
                  </div>
                )}
                {item.script && (
                  <div className="rounded-xl p-3" style={{ background: "#F5F3EE" }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#8B8680" }}>Script</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{item.script}</p>
                  </div>
                )}
                {item.slide && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase mb-2" style={{ color: "#8B8680" }}>Slide</div>
                    {item.slide.map((s, si) => (
                      <div key={si} className="flex items-start gap-2 rounded-lg p-2" style={{ background: "#F5F3EE" }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5"
                          style={{ background: "#1E212815", color: "#5F6572" }}>{si + 1}</span>
                        <p className="text-sm" style={{ color: "#374151" }}>{s}</p>
                      </div>
                    ))}
                  </div>
                )}
                {item.testo && (
                  <div className="rounded-xl p-3" style={{ background: "#F5F3EE" }}>
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#8B8680" }}>Testo</div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{item.testo}</p>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Zap className="w-3.5 h-3.5" style={{ color: "#F2C418" }} />
                  <span className="text-xs font-bold" style={{ color: "#C4990A" }}>{item.cta}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdsView({ data }) {
  const [section, setSection] = useState("overview");
  if (!data) return null;

  return (
    <div className="space-y-3" data-testid="ads-view">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Panoramica" },
          { id: "creativita", label: `Creatività (${(data.creativita || []).length})` },
          { id: "copy", label: `Copy Ads (${(data.copy_ads || []).length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{
              background: section === t.id ? "#1E2128" : "white",
              color: section === t.id ? "#F2C418" : "#5F6572",
              border: section === t.id ? "none" : "1px solid #ECEDEF",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: "#ECEDEF" }}>
          {[
            { label: "Obiettivo", value: data.obiettivo_campagna, icon: Target },
            { label: "Pubblico Target", value: data.pubblico_target, icon: Users },
            { label: "Budget Consigliato", value: data.budget_consigliato, icon: Zap },
          ].map((row, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <row.icon className="w-3.5 h-3.5" style={{ color: "#F2C418" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9CA3AF" }}>{row.label}</span>
              </div>
              <p className="text-sm" style={{ color: "#1E2128" }}>{row.value}</p>
            </div>
          ))}
        </div>
      )}

      {section === "creativita" && (
        <div className="space-y-2">
          {(data.creativita || []).map((c, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: "#F2C41830", color: "#C4990A" }}>{i + 1}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#1E212810", color: "#5F6572" }}>
                  {c.tipo}
                </span>
              </div>
              <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{c.headline}</p>
              <p className="text-xs" style={{ color: "#5F6572" }}>{c.descrizione}</p>
              <div className="rounded-lg p-3" style={{ background: "#F5F3EE" }}>
                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#8B8680" }}>Testo Primario</div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{c.testo_primario}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "copy" && (
        <div className="space-y-2">
          {(data.copy_ads || []).map((c, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#8B5CF620", color: "#8B5CF6" }}>
                {c.angolo}
              </span>
              <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{c.headline}</p>
              <div className="rounded-lg p-3" style={{ background: "#F5F3EE" }}>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{c.testo_primario}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#F2C418", color: "#1E2128" }}>
                  {c.cta_button}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WebinarView({ data }) {
  const [showScaletta, setShowScaletta] = useState(true);
  if (!data) return null;

  return (
    <div className="space-y-3" data-testid="webinar-view">
      {/* Titolo e promessa */}
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Titolo Webinar</div>
        <h3 className="text-lg font-black mb-3" style={{ color: "#1E2128" }}>{data.titolo}</h3>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#9CA3AF" }}>Promessa</div>
        <p className="text-sm" style={{ color: "#5F6572" }}>{data.promessa}</p>
      </div>

      {/* Scaletta */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
        <button onClick={() => setShowScaletta(!showScaletta)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4" style={{ color: "#F2C418" }} />
            <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
              Scaletta Completa ({(data.scaletta || []).length} momenti)
            </span>
          </div>
          {showScaletta ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
            : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
        </button>
        {showScaletta && (
          <div className="px-4 pb-4 space-y-2">
            {(data.scaletta || []).map((s, i) => (
              <div key={i} className="flex gap-3 rounded-lg p-3" style={{ background: "#F5F3EE" }}>
                <div className="flex-shrink-0">
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={{ background: "#1E212810", color: "#5F6572" }}>
                    <Clock className="w-3 h-3" /> {s.momento}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: "#374151" }}>{s.contenuto}</p>
                  <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>{s.obiettivo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA vendita */}
      <div className="rounded-xl p-4" style={{ background: "#F2C41820", border: "1px solid #F2C41840" }}>
        <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#92400E" }}>CTA Vendita</div>
        <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{data.cta_vendita}</p>
      </div>
    </div>
  );
}

function PromozioneView({ data }) {
  const [section, setSection] = useState("social");
  if (!data) return null;

  return (
    <div className="space-y-3" data-testid="promozione-view">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "social", label: `Social (${(data.contenuti_social || []).length})` },
          { id: "ads", label: `Ads (${(data.ads_webinar || []).length})` },
          { id: "email", label: `Email (${(data.email_sequence || []).length})` },
        ].map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{
              background: section === t.id ? "#1E2128" : "white",
              color: section === t.id ? "#F2C418" : "#5F6572",
              border: section === t.id ? "none" : "1px solid #ECEDEF",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {section === "social" && (data.contenuti_social || []).map((c, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#3B82F620", color: "#3B82F6" }}>
            {c.tipo}
          </span>
          <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{c.titolo}</p>
          <div className="rounded-lg p-3" style={{ background: "#F5F3EE" }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{c.testo}</p>
          </div>
        </div>
      ))}

      {section === "ads" && (data.ads_webinar || []).map((a, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
          <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{a.headline}</p>
          <div className="rounded-lg p-3" style={{ background: "#F5F3EE" }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{a.testo}</p>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" style={{ color: "#F2C418" }} />
            <span className="text-xs font-bold" style={{ color: "#C4990A" }}>{a.cta}</span>
          </div>
        </div>
      ))}

      {section === "email" && (data.email_sequence || []).map((e, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
            <span className="text-xs font-bold" style={{ color: "#3B82F6" }}>{e.timing}</span>
          </div>
          <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{e.subject}</p>
          <div className="rounded-lg p-3" style={{ background: "#F5F3EE" }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{e.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function LancioPage({ partner, onNavigate, onLaunchComplete, isAdmin }) {
  const [planData, setPlanData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("calendario");

  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/lancio/${partnerId}`);
        const data = res.data;
        if (data.plan_data) setPlanData(data.plan_data);
        if (data.plan_approved) setIsApproved(true);
      } catch (e) {
        console.error("Error loading lancio:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/api/partner-journey/lancio/generate-plan`, {
        partner_id: partnerId,
      });
      if (res.data.plan_data) {
        setPlanData(res.data.plan_data);
        setIsApproved(false);
      }
    } catch (e) {
      console.error("Error generating plan:", e);
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!partnerId) return;
    setIsSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/lancio/approve-plan?partner_id=${partnerId}`);
      setIsApproved(true);
      if (onLaunchComplete) onLaunchComplete();
    } catch (e) {
      console.error("Error approving plan:", e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  const renderTabContent = () => {
    if (!planData) return null;
    switch (activeTab) {
      case "calendario": return <CalendarioView data={planData.calendario_30g} />;
      case "contenuti": return <ContenutiView data={planData.contenuti_pronti} />;
      case "ads": return <AdsView data={planData.piano_ads} />;
      case "webinar": return <WebinarView data={planData.webinar} />;
      case "promozione": return <PromozioneView data={planData.promozione_webinar} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* ═══ HERO ═══ */}
        <div className="mb-8" data-testid="lancio-hero">
          <h1 className="text-3xl font-black mb-3" style={{ color: "#1E2128" }}>
            Attiviamo il tuo lancio
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il sistema ha creato per te un piano completo per acquisire clienti e vendere il tuo corso.
            <br />
            <strong>Devi solo seguire i passaggi.</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}

        {/* ═══ ADMIN VIEW ═══ */}
        {isAdmin && (
          <div className="space-y-4" data-testid="admin-panoramic-lancio">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Eye className="w-4 h-4" style={{ color: "#FBBF24" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>
                Vista Admin — Piano Lancio Partner
              </span>
            </div>
            {planData ? (
              <>
                {/* Tab bar */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                      style={{
                        background: activeTab === tab.id ? "#1E2128" : "white",
                        color: activeTab === tab.id ? "#F2C418" : "#5F6572",
                        border: activeTab === tab.id ? "none" : "1px solid #ECEDEF",
                      }}>
                      <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>
                {renderTabContent()}
                {isApproved && <CompletedBanner />}
              </>
            ) : (
              <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: "#ECEDEF" }}>
                <p className="text-sm" style={{ color: "#9CA3AF" }}>Piano non ancora generato</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ PARTNER VIEW ═══ */}
        {!isAdmin && (
          <>
            {isApproved && planData ? (
              <>
                <CompletedBanner />
                <div className="mt-6 space-y-4">
                  {/* Tab bar */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        data-testid={`lancio-tab-${tab.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                        style={{
                          background: activeTab === tab.id ? "#1E2128" : "white",
                          color: activeTab === tab.id ? "#F2C418" : "#5F6572",
                          border: activeTab === tab.id ? "none" : "1px solid #ECEDEF",
                        }}>
                        <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                      </button>
                    ))}
                  </div>
                  {renderTabContent()}
                </div>
              </>
            ) : planData ? (
              /* ═══ OUTPUT ═══ */
              <div data-testid="lancio-output" className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#34C77B20" }}>
                    <Check className="w-5 h-5" style={{ color: "#34C77B" }} />
                  </div>
                  <h2 className="text-xl font-black" style={{ color: "#1E2128" }}>Il tuo piano di lancio è pronto</h2>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {TABS.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      data-testid={`lancio-tab-${tab.id}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
                      style={{
                        background: activeTab === tab.id ? "#1E2128" : "white",
                        color: activeTab === tab.id ? "#F2C418" : "#5F6572",
                        border: activeTab === tab.id ? "none" : "1px solid #ECEDEF",
                      }}>
                      <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                    </button>
                  ))}
                </div>

                {renderTabContent()}

                {/* ACTIONS */}
                <div className="flex gap-3 mt-6">
                  <button onClick={handleApprove} disabled={isSaving} data-testid="approve-lancio-btn"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#34C77B", color: "white" }}>
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    {isSaving ? "Salvataggio..." : "APPROVA PIANO DI LANCIO"}
                  </button>
                  <button onClick={handleGenerate} disabled={isGenerating} data-testid="regenerate-lancio-btn"
                    className="flex items-center justify-center gap-2 px-5 py-4 rounded-xl font-bold transition-all hover:bg-gray-50"
                    style={{ background: "white", border: "1px solid #ECEDEF", color: "#5F6572" }}>
                    <RefreshCw className="w-5 h-5" /> Rigenera
                  </button>
                </div>
              </div>
            ) : (
              /* ═══ INPUT — genera piano ═══ */
              <div data-testid="lancio-input" className="space-y-4">
                <div className="rounded-2xl p-6" style={{ background: "#1E2128" }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F2C41830" }}>
                      <Sparkles className="w-5 h-5" style={{ color: "#F2C418" }} />
                    </div>
                    <div>
                      <h3 className="font-black text-white">Genera il tuo Piano di Lancio</h3>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                        L'AI creerà tutto in automatico basandosi sul tuo posizionamento
                      </p>
                    </div>
                  </div>
                  <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Il sistema genererà: calendario 30 giorni, contenuti pronti (reel, carousel, post),
                    piano ads Meta, scaletta webinar e strategia di promozione completa.
                  </p>
                  <button onClick={handleGenerate} disabled={isGenerating} data-testid="generate-lancio-btn"
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                    style={{ background: "#F2C418", color: "#1E2128" }}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generazione in corso... (circa 30 sec)
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        GENERA PIANO DI LANCIO
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default LancioPage;
