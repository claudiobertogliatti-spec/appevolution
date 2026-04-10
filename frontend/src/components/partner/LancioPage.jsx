import { useState, useEffect } from "react";
import axios from "axios";
import {
  Sparkles, Check, Loader2, RefreshCw, Eye,
  ChevronDown, ChevronRight, Calendar, Megaphone,
  Target, Video, Mail, ArrowRight,
  Play, Image, FileText, Zap, Clock, Users,
  Globe, Gift, Shield, AlertTriangle, DollarSign
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   FUNNEL MODEL TABS
   ═══════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "landing", label: "Landing Page", icon: Globe },
  { id: "webinar", label: "Webinar", icon: Video },
  { id: "offerta", label: "Offerta", icon: DollarSign },
  { id: "followup", label: "Follow-up", icon: Mail },
  { id: "calendario", label: "Calendario", icon: Calendar },
  { id: "contenuti", label: "Contenuti", icon: FileText },
  { id: "ads", label: "Ads", icon: Target },
];

const OBJ_COLORS = {
  attenzione: { bg: "#3B82F620", text: "#3B82F6", label: "Attenzione" },
  autorita: { bg: "#8B5CF620", text: "#8B5CF6", label: "Autorità" },
  autorità: { bg: "#8B5CF620", text: "#8B5CF6", label: "Autorità" },
  vendita: { bg: "#EF444420", text: "#EF4444", label: "Vendita" },
};
const TIPO_ICONS = { REEL: Video, CAROUSEL: Image, POST: FileText, STORY: Zap };

/* ═══════════════════════════════════════════════════════════════════════════
   FUNNEL STEP INDICATOR
   ═══════════════════════════════════════════════════════════════════════════ */
function FunnelSteps({ activeTab }) {
  const steps = [
    { id: "landing", label: "Landing", icon: Globe },
    { id: "webinar", label: "Webinar", icon: Video },
    { id: "offerta", label: "Offerta", icon: DollarSign },
    { id: "followup", label: "Follow-up", icon: Mail },
  ];
  const activeIdx = steps.findIndex((s) => s.id === activeTab);

  return (
    <div className="flex items-center gap-1 mb-5 p-3 rounded-xl overflow-x-auto" style={{ background: "#1E2128" }} data-testid="funnel-steps">
      {steps.map((step, i) => {
        const active = step.id === activeTab;
        const StepIcon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            {i > 0 && <ArrowRight className="w-3 h-3 mx-1" style={{ color: i <= activeIdx ? "#F2C418" : "#3D4451" }} />}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              style={{ background: active ? "#F2C41820" : "transparent" }}>
              <StepIcon className="w-3.5 h-3.5" style={{ color: active ? "#F2C418" : i <= activeIdx ? "#F2C41880" : "#3D4451" }} />
              <span className="text-[11px] font-bold" style={{ color: active ? "#F2C418" : i <= activeIdx ? "#F2C41880" : "#3D4451" }}>
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING PAGE VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function LandingView({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3" data-testid="landing-view">
      {/* Preview card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #ECEDEF" }}>
        <div className="p-6 text-center" style={{ background: "#1E2128" }}>
          <h2 className="text-lg font-black text-white mb-1">{data.headline}</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{data.sub_headline}</p>
        </div>
        <div className="bg-white p-5 space-y-4">
          <Section label="Promessa" color="#F2C418">{data.promessa}</Section>
          <Section label="Il problema del target" color="#EF4444">{data.problema}</Section>
          <Section label="Anticipazione soluzione" color="#8B5CF6">{data.soluzione_preview}</Section>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "#9CA3AF" }}>Benefici</div>
            <div className="space-y-1.5">
              {(data.benefici || []).map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#34C77B" }} />
                  <span className="text-sm" style={{ color: "#1E2128" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm"
              style={{ background: "#F2C418", color: "#1E2128" }}>
              {data.cta_iscrizione}
            </div>
          </div>
          {data.social_proof && (
            <p className="text-xs text-center italic" style={{ color: "#9CA3AF" }}>{data.social_proof}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WEBINAR VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function WebinarView({ data }) {
  const [showObiezioni, setShowObiezioni] = useState(false);
  if (!data) return null;
  return (
    <div className="space-y-3" data-testid="webinar-view">
      <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#ECEDEF" }}>
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Titolo Webinar</div>
        <h3 className="text-lg font-black mb-3" style={{ color: "#1E2128" }}>{data.titolo}</h3>
        <div className="flex gap-3 flex-wrap">
          <Tag icon={Clock} label={data.durata || "60-90 min"} />
          <Tag icon={Target} label="Vendita corso" />
        </div>
      </div>
      <Section label="Promessa" color="#34C77B" box>{data.promessa}</Section>

      {/* Scaletta */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
        <div className="p-4 flex items-center gap-2" style={{ borderBottom: "1px solid #ECEDEF" }}>
          <Play className="w-4 h-4" style={{ color: "#F2C418" }} />
          <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Scaletta ({(data.scaletta || []).length} fasi)</span>
        </div>
        <div className="divide-y" style={{ borderColor: "#F5F3EE" }}>
          {(data.scaletta || []).map((s, i) => (
            <div key={i} className="flex gap-3 p-4">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: "#F2C41830", color: "#C4990A" }}>{i + 1}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#1E212810", color: "#5F6572" }}>
                    {s.momento}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#374151" }}>{s.contenuto}</p>
                <p className="text-xs mt-1 italic" style={{ color: "#9CA3AF" }}>{s.obiettivo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA vendita */}
      <div className="rounded-xl p-4" style={{ background: "#F2C41820", border: "1px solid #F2C41840" }}>
        <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#92400E" }}>CTA Vendita</div>
        <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{data.cta_vendita}</p>
      </div>

      {/* Obiezioni */}
      {(data.obiezioni_comuni || []).length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
          <button onClick={() => setShowObiezioni(!showObiezioni)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-all">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: "#F59E0B" }} />
              <span className="text-sm font-bold" style={{ color: "#1E2128" }}>
                Obiezioni e risposte ({(data.obiezioni_comuni || []).length})
              </span>
            </div>
            {showObiezioni ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
              : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
          </button>
          {showObiezioni && (
            <div className="px-4 pb-4 space-y-3">
              {(data.obiezioni_comuni || []).map((o, i) => (
                <div key={i} className="rounded-lg overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
                  <div className="p-3" style={{ background: "#FEF3C7" }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: "#92400E" }}>Obiezione</span>
                    <p className="text-sm" style={{ color: "#1E2128" }}>{o.obiezione}</p>
                  </div>
                  <div className="p-3" style={{ background: "#DCFCE7" }}>
                    <span className="text-[10px] font-bold uppercase" style={{ color: "#166534" }}>Risposta</span>
                    <p className="text-sm" style={{ color: "#1E2128" }}>{o.risposta}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OFFERTA VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function OffertaView({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3" data-testid="offerta-view">
      {/* Pricing card */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #F2C418" }}>
        <div className="p-5 text-center" style={{ background: "#1E2128" }}>
          <h3 className="text-lg font-black text-white mb-1">{data.nome_prodotto}</h3>
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm line-through" style={{ color: "rgba(255,255,255,0.4)" }}>{data.prezzo_pieno}</span>
            <span className="text-2xl font-black" style={{ color: "#F2C418" }}>{data.prezzo_lancio}</span>
            {data.sconto_percentuale && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#EF444420", color: "#EF4444" }}>
                -{data.sconto_percentuale}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-5">
          {/* Bonus */}
          <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF" }}>Bonus inclusi</div>
          <div className="space-y-2 mb-4">
            {(data.bonus || []).map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#F2C41810" }}>
                <Gift className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F2C418" }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: "#1E2128" }}>{b.nome}</span>
                    <span className="text-xs font-bold" style={{ color: "#C4990A" }}>{b.valore}</span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#5F6572" }}>{b.descrizione}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Garanzia */}
          <div className="flex items-start gap-3 p-3 rounded-xl mb-3" style={{ background: "#DCFCE7" }}>
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#34C77B" }} />
            <div>
              <span className="text-xs font-bold" style={{ color: "#166534" }}>Garanzia</span>
              <p className="text-sm" style={{ color: "#14532D" }}>{data.garanzia}</p>
            </div>
          </div>
          {/* Urgenza */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "#FEE2E2" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#EF4444" }} />
            <div>
              <span className="text-xs font-bold" style={{ color: "#991B1B" }}>Urgenza</span>
              <p className="text-sm" style={{ color: "#7F1D1D" }}>{data.urgenza}</p>
            </div>
          </div>
        </div>
      </div>
      {data.riepilogo_valore && (
        <p className="text-center text-sm font-bold" style={{ color: "#C4990A" }}>{data.riepilogo_valore}</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FOLLOW-UP EMAIL VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function FollowUpView({ data }) {
  const [expanded, setExpanded] = useState([0]);
  if (!data || !data.length) return null;
  const toggle = (i) => setExpanded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const TIPO_COLORS = {
    replay: "#3B82F6", valore: "#34C77B", caso_studio: "#8B5CF6",
    obiezioni: "#F59E0B", bonus: "#F2C418", urgenza: "#EF4444",
  };

  return (
    <div className="space-y-2" data-testid="followup-view">
      <p className="text-xs mb-2 px-1" style={{ color: "#9CA3AF" }}>
        Sequenza di 6 email post-webinar per convertire chi non ha ancora acquistato
      </p>
      {data.map((email, i) => {
        const color = TIPO_COLORS[email.tipo] || "#5F6572";
        return (
          <div key={i} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
            <button onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-all">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                style={{ background: `${color}20`, color }}>{email.numero || i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                    {email.timing}
                  </span>
                  <span className="text-[10px] font-bold uppercase" style={{ color: "#9CA3AF" }}>{email.tipo?.replace("_", " ")}</span>
                </div>
                <p className="text-sm font-bold truncate" style={{ color: "#1E2128" }}>{email.subject}</p>
              </div>
              {expanded.includes(i) ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
                : <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />}
            </button>
            {expanded.includes(i) && (
              <div className="px-4 pb-4">
                <div className="rounded-lg p-4" style={{ background: "#F5F3EE" }}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "#374151" }}>{email.body}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CALENDARIO VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function CalendarioView({ data }) {
  const [weekFilter, setWeekFilter] = useState(0);
  if (!data || !data.length) return null;
  const weeks = [
    { label: "Sett. 1", range: [1, 7] }, { label: "Sett. 2", range: [8, 14] },
    { label: "Sett. 3", range: [15, 21] }, { label: "Sett. 4", range: [22, 30] },
  ];
  const filtered = data.filter((d) => d.giorno >= weeks[weekFilter].range[0] && d.giorno <= weeks[weekFilter].range[1]);

  return (
    <div className="space-y-3" data-testid="calendario-view">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {weeks.map((w, i) => (
          <button key={i} onClick={() => setWeekFilter(i)} data-testid={`week-filter-${i}`}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{ background: weekFilter === i ? "#1E2128" : "white", color: weekFilter === i ? "#F2C418" : "#5F6572", border: weekFilter === i ? "none" : "1px solid #ECEDEF" }}>
            {w.label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((day) => {
          const obj = OBJ_COLORS[day.obiettivo?.toLowerCase()] || OBJ_COLORS.attenzione;
          const TipoIcon = TIPO_ICONS[day.tipo] || FileText;
          return (
            <div key={day.giorno} className="bg-white rounded-xl border p-3 flex items-start gap-3" style={{ borderColor: "#ECEDEF" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#F2C41820" }}>
                <span className="text-xs font-black" style={{ color: "#C4990A" }}>{day.giorno}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: "#1E212810", color: "#1E2128" }}>
                    <TipoIcon className="w-3 h-3" /> {day.tipo}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: obj.bg, color: obj.text }}>{obj.label}</span>
                </div>
                <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{day.titolo}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{day.cta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENUTI VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
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
      <p className="text-xs px-1" style={{ color: "#9CA3AF" }}>
        Tutti i contenuti portano traffico alla landing del webinar
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setExpanded([0]); }} data-testid={`content-tab-${t.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{ background: subTab === t.id ? "#1E2128" : "white", color: subTab === t.id ? "#F2C418" : "#5F6572", border: subTab === t.id ? "none" : "1px solid #ECEDEF" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#ECEDEF" }}>
            <button onClick={() => toggle(idx)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-all">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: "#F2C41830", color: "#C4990A" }}>{idx + 1}</span>
              <span className="flex-1 text-sm font-bold" style={{ color: "#1E2128" }}>{item.titolo}</span>
              {expanded.includes(idx) ? <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#9CA3AF" }} />}
            </button>
            {expanded.includes(idx) && (
              <div className="px-3 pb-3 space-y-2">
                {item.hook && <MiniSection label="Hook" bg="#FEF3C7" color="#92400E">{item.hook}</MiniSection>}
                {item.script && <MiniSection label="Script" bg="#F5F3EE" color="#8B8680">{item.script}</MiniSection>}
                {item.slide && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#8B8680" }}>Slide</div>
                    {item.slide.map((s, si) => (
                      <div key={si} className="flex items-start gap-2 rounded-lg p-2" style={{ background: "#F5F3EE" }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5" style={{ background: "#1E212815", color: "#5F6572" }}>{si + 1}</span>
                        <p className="text-sm" style={{ color: "#374151" }}>{s}</p>
                      </div>
                    ))}
                  </div>
                )}
                {item.testo && <MiniSection label="Testo" bg="#F5F3EE" color="#8B8680">{item.testo}</MiniSection>}
                <div className="flex items-center gap-1.5 pt-1">
                  <Zap className="w-3 h-3" style={{ color: "#F2C418" }} />
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

/* ═══════════════════════════════════════════════════════════════════════════
   ADS VIEW
   ═══════════════════════════════════════════════════════════════════════════ */
function AdsView({ data }) {
  const [section, setSection] = useState("overview");
  if (!data) return null;
  return (
    <div className="space-y-3" data-testid="ads-view">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[{ id: "overview", label: "Panoramica" }, { id: "creativita", label: `Creatività (${(data.creativita || []).length})` }, { id: "copy", label: `Copy (${(data.copy_ads || []).length})` }].map((t) => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all"
            style={{ background: section === t.id ? "#1E2128" : "white", color: section === t.id ? "#F2C418" : "#5F6572", border: section === t.id ? "none" : "1px solid #ECEDEF" }}>
            {t.label}
          </button>
        ))}
      </div>
      {section === "overview" && (
        <div className="bg-white rounded-xl border p-5 space-y-4" style={{ borderColor: "#ECEDEF" }}>
          {[{ label: "Obiettivo", value: data.obiettivo_campagna, icon: Target },
            { label: "Pubblico Target", value: data.pubblico_target, icon: Users },
            { label: "Budget", value: data.budget_consigliato, icon: Zap }].map((row, i) => (
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
      {section === "creativita" && (data.creativita || []).map((c, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "#F2C41830", color: "#C4990A" }}>{i + 1}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#1E212810", color: "#5F6572" }}>{c.tipo}</span>
          </div>
          <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{c.headline}</p>
          <MiniSection label="Testo primario" bg="#F5F3EE" color="#8B8680">{c.testo_primario}</MiniSection>
        </div>
      ))}
      {section === "copy" && (data.copy_ads || []).map((c, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2" style={{ borderColor: "#ECEDEF" }}>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#8B5CF620", color: "#8B5CF6" }}>{c.angolo}</span>
          <p className="text-sm font-bold" style={{ color: "#1E2128" }}>{c.headline}</p>
          <MiniSection label="Testo" bg="#F5F3EE" color="#8B8680">{c.testo_primario}</MiniSection>
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ background: "#F2C418", color: "#1E2128" }}>{c.cta_button}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
function Section({ label, color, box, children }) {
  return (
    <div className={box ? "rounded-xl p-4" : ""} style={box ? { background: `${color}10`, border: `1px solid ${color}25` } : {}}>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color }}>{label}</div>
      <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>{children}</p>
    </div>
  );
}
function MiniSection({ label, bg, color, children }) {
  return (
    <div className="rounded-lg p-3" style={{ background: bg }}>
      <div className="text-[10px] font-bold uppercase mb-1" style={{ color }}>{label}</div>
      <p className="text-sm whitespace-pre-wrap" style={{ color: "#374151" }}>{children}</p>
    </div>
  );
}
function Tag({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: "#1E212810", color: "#5F6572" }}>
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}
function CompletedBanner() {
  return (
    <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)" }} data-testid="lancio-completed-banner">
      <Check className="w-10 h-10 text-white mx-auto mb-2" style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", padding: 8 }} />
      <h2 className="text-lg font-black text-white mb-1">Piano di Lancio approvato!</h2>
      <p className="text-xs text-white/70">Segui il funnel: Landing → Webinar → Offerta → Follow-up</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Done-for-You
   ═══════════════════════════════════════════════════════════════════════════ */

function LancioContent({ planData, activeTab, setActiveTab }) {
  if (!planData) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando il tuo piano di lancio completo.
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "landing": return <LandingView data={planData.landing_page} />;
      case "webinar": return <WebinarView data={planData.webinar} />;
      case "offerta": return <OffertaView data={planData.offerta} />;
      case "followup": return <FollowUpView data={planData.email_followup} />;
      case "calendario": return <CalendarioView data={planData.calendario_30g} />;
      case "contenuti": return <ContenutiView data={planData.contenuti_pronti} />;
      case "ads": return <AdsView data={planData.piano_ads} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4" data-testid="lancio-output">
      <FunnelSteps activeTab={activeTab} />
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} data-testid={`lancio-tab-${tab.id}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all"
            style={{ background: activeTab === tab.id ? "#1E2128" : "white", color: activeTab === tab.id ? "#F2C418" : "#5F6572", border: activeTab === tab.id ? "none" : "1px solid #ECEDEF" }}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>
      {renderTab()}
    </div>
  );
}

export function LancioPage({ partner, onNavigate, onLaunchComplete, isAdmin }) {
  const [planData, setPlanData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("landing");
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/lancio/${partnerId}`);
        if (res.data.plan_data) setPlanData(res.data.plan_data);
      } catch (e) { console.error("Error loading lancio:", e); }
      finally { setIsLoading(false); }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
    </div>;
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6" data-testid="lancio-hero">
          <h1 className="text-3xl font-black mb-2" style={{ color: "#1E2128" }}>Il tuo Lancio</h1>
          <p className="text-base leading-relaxed" style={{ color: "#5F6572" }}>
            Il team prepara il piano di vendita completo per te.
            <br /><strong>Non devi costruire nulla. Rivedi e approva.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="lancio"
          stepTitle="Piano di Lancio"
          stepIcon={Megaphone}
          nextStepLabel={null}
          onContinue={onLaunchComplete}
          isAdmin={isAdmin}
        >
          <LancioContent planData={planData} activeTab={activeTab} setActiveTab={setActiveTab} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default LancioPage;
