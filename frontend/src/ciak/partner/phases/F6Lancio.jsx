/**
 * Ciak Partner — Fase 6: Lancio.
 * Porting di components/partner/LancioPage.jsx (Fase 2e).
 * Usa DoneForYouWrapper. Endpoint: GET /api/partner-journey/lancio/:partnerId
 * 7 tab: Landing / Webinar / Offerta / Follow-up / Calendario / Contenuti / Ads.
 * Re-skin palette Ciak.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check, Loader2, ChevronDown, ChevronRight, Calendar, Megaphone,
  Target, Video, Mail, ArrowRight, Play, Image, FileText, Zap, Clock,
  Users, Globe, Gift, Shield, AlertTriangle, DollarSign,
} from "lucide-react";
import { DoneForYouWrapper } from "../components/DoneForYouWrapper";

const TABS = [
  { id: "landing", label: "Landing Page", icon: Globe },
  { id: "webinar", label: "Webinar", icon: Video },
  { id: "offerta", label: "Offerta", icon: DollarSign },
  { id: "followup", label: "Follow-up", icon: Mail },
  { id: "calendario", label: "Calendario", icon: Calendar },
  { id: "contenuti", label: "Contenuti", icon: FileText },
  { id: "ads", label: "Ads", icon: Target },
];
const TIPO_ICONS = { REEL: Video, CAROUSEL: Image, POST: FileText, STORY: Zap };

function Section({ label, box, children }) {
  return (
    <div className={box ? "rounded-xl p-4 bg-gray-50 border border-gray-200" : ""}>
      <div className="text-[10px] font-semibold uppercase tracking-widest mb-1 text-slate-400">
        {label}
      </div>
      <p className="text-sm leading-relaxed text-slate-900">{children}</p>
    </div>
  );
}
function MiniSection({ label, children }) {
  return (
    <div className="rounded-lg p-3 bg-gray-50">
      <div className="text-[10px] font-semibold uppercase mb-1 text-slate-400">{label}</div>
      <p className="text-sm whitespace-pre-wrap text-slate-700">{children}</p>
    </div>
  );
}
function Tag({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-gray-100 text-slate-600">
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition border ${
        active ? "bg-slate-900 text-yellow-400 border-slate-900" : "bg-white text-slate-600 border-gray-200"
      }`}
    >
      {children}
    </button>
  );
}

function LandingView({ data }) {
  if (!data) return null;
  return (
    <div className="rounded-2xl overflow-hidden border-2 border-gray-200">
      <div className="p-6 text-center bg-slate-900">
        <h2 className="text-lg font-semibold text-white mb-1">{data.headline}</h2>
        <p className="text-sm text-slate-400">{data.sub_headline}</p>
      </div>
      <div className="bg-white p-5 space-y-4">
        <Section label="Promessa">{data.promessa}</Section>
        <Section label="Il problema del target">{data.problema}</Section>
        <Section label="Anticipazione soluzione">{data.soluzione_preview}</Section>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-slate-400">
            Benefici
          </div>
          <div className="space-y-1.5">
            {(data.benefici || []).map((b, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-500" />
                <span className="text-sm text-slate-900">{b}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-yellow-400 text-slate-900">
            {data.cta_iscrizione}
          </div>
        </div>
        {data.social_proof && (
          <p className="text-xs text-center italic text-slate-400">{data.social_proof}</p>
        )}
      </div>
    </div>
  );
}

function WebinarView({ data }) {
  const [showObiezioni, setShowObiezioni] = useState(false);
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2 text-slate-400">
          Titolo Webinar
        </div>
        <h3 className="text-lg font-semibold mb-3 text-slate-900">{data.titolo}</h3>
        <div className="flex gap-3 flex-wrap">
          <Tag icon={Clock} label={data.durata || "60-90 min"} />
          <Tag icon={Target} label="Vendita corso" />
        </div>
      </div>
      <Section label="Promessa" box>{data.promessa}</Section>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 flex items-center gap-2 border-b border-gray-200">
          <Play className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold text-slate-900">
            Scaletta ({(data.scaletta || []).length} fasi)
          </span>
        </div>
        <div className="divide-y divide-gray-100">
          {(data.scaletta || []).map((s, i) => (
            <div key={i} className="flex gap-3 p-4">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-yellow-100 text-yellow-700">
                {i + 1}
              </span>
              <div className="flex-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-slate-600">
                  {s.momento}
                </span>
                <p className="text-sm mt-1 text-slate-700">{s.contenuto}</p>
                <p className="text-xs mt-1 italic text-slate-400">{s.obiettivo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl p-4 bg-yellow-50 border border-yellow-200">
        <div className="text-[10px] font-semibold uppercase mb-1 text-yellow-700">CTA Vendita</div>
        <p className="text-sm font-medium text-slate-900">{data.cta_vendita}</p>
      </div>
      {(data.obiezioni_comuni || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowObiezioni(!showObiezioni)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-semibold text-slate-900">
                Obiezioni e risposte ({(data.obiezioni_comuni || []).length})
              </span>
            </div>
            {showObiezioni ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showObiezioni && (
            <div className="px-4 pb-4 space-y-3">
              {(data.obiezioni_comuni || []).map((o, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-gray-200">
                  <div className="p-3 bg-yellow-50">
                    <span className="text-[10px] font-semibold uppercase text-yellow-700">
                      Obiezione
                    </span>
                    <p className="text-sm text-slate-900">{o.obiezione}</p>
                  </div>
                  <div className="p-3 bg-emerald-50">
                    <span className="text-[10px] font-semibold uppercase text-emerald-700">
                      Risposta
                    </span>
                    <p className="text-sm text-slate-900">{o.risposta}</p>
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

function OffertaView({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border-2 border-yellow-300">
        <div className="p-5 text-center bg-slate-900">
          <h3 className="text-lg font-semibold text-white mb-1">{data.nome_prodotto}</h3>
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm line-through text-slate-500">{data.prezzo_pieno}</span>
            <span className="text-2xl font-semibold text-yellow-400">{data.prezzo_lancio}</span>
            {data.sconto_percentuale && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                -{data.sconto_percentuale}
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-5">
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-slate-400">
            Bonus inclusi
          </div>
          <div className="space-y-2 mb-4">
            {(data.bonus || []).map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-yellow-50">
                <Gift className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{b.nome}</span>
                    <span className="text-xs font-medium text-yellow-700">{b.valore}</span>
                  </div>
                  <p className="text-xs mt-0.5 text-slate-600">{b.descrizione}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl mb-3 bg-emerald-50">
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <div>
              <span className="text-xs font-semibold text-emerald-700">Garanzia</span>
              <p className="text-sm text-emerald-900">{data.garanzia}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <div>
              <span className="text-xs font-semibold text-red-700">Urgenza</span>
              <p className="text-sm text-red-900">{data.urgenza}</p>
            </div>
          </div>
        </div>
      </div>
      {data.riepilogo_valore && (
        <p className="text-center text-sm font-medium text-yellow-700">{data.riepilogo_valore}</p>
      )}
    </div>
  );
}

function FollowUpView({ data }) {
  const [expanded, setExpanded] = useState([0]);
  if (!data || !data.length) return null;
  const toggle = (i) =>
    setExpanded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  return (
    <div className="space-y-2">
      <p className="text-xs mb-2 px-1 text-slate-400">
        Sequenza di email post-webinar per convertire chi non ha ancora acquistato.
      </p>
      {data.map((email, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
          >
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-gray-100 text-slate-600">
              {email.numero || i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-slate-500">
                  {email.timing}
                </span>
                <span className="text-[10px] font-medium uppercase text-slate-400">
                  {email.tipo?.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm font-medium truncate text-slate-900">{email.subject}</p>
            </div>
            {expanded.includes(i) ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-400" />
            )}
          </button>
          {expanded.includes(i) && (
            <div className="px-4 pb-4">
              <div className="rounded-lg p-4 bg-gray-50">
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">
                  {email.body}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CalendarioView({ data }) {
  const [weekFilter, setWeekFilter] = useState(0);
  if (!data || !data.length) return null;
  const weeks = [
    { label: "Sett. 1", range: [1, 7] },
    { label: "Sett. 2", range: [8, 14] },
    { label: "Sett. 3", range: [15, 21] },
    { label: "Sett. 4", range: [22, 30] },
  ];
  const filtered = data.filter(
    (d) => d.giorno >= weeks[weekFilter].range[0] && d.giorno <= weeks[weekFilter].range[1]
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {weeks.map((w, i) => (
          <TabBtn key={i} active={weekFilter === i} onClick={() => setWeekFilter(i)}>
            {w.label}
          </TabBtn>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((day) => {
          const TipoIcon = TIPO_ICONS[day.tipo] || FileText;
          return (
            <div
              key={day.giorno}
              className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-yellow-100">
                <span className="text-xs font-semibold text-yellow-700">{day.giorno}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-slate-600">
                    <TipoIcon className="w-3 h-3" /> {day.tipo}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                    {day.obiettivo}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900">{day.titolo}</p>
                <p className="text-xs mt-0.5 text-slate-400">{day.cta}</p>
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
  const toggle = (i) =>
    setExpanded((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const items = data[subTab] || [];
  const subTabs = [
    { id: "reel", label: "Reel", count: (data.reel || []).length },
    { id: "carousel", label: "Carousel", count: (data.carousel || []).length },
    { id: "post", label: "Post", count: (data.post || []).length },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs px-1 text-slate-400">
        Tutti i contenuti portano traffico alla landing del webinar.
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {subTabs.map((t) => (
          <TabBtn
            key={t.id}
            active={subTab === t.id}
            onClick={() => {
              setSubTab(t.id);
              setExpanded([0]);
            }}
          >
            {t.label} ({t.count})
          </TabBtn>
        ))}
      </div>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition"
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-yellow-100 text-yellow-700">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-900">{item.titolo}</span>
              {expanded.includes(idx) ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {expanded.includes(idx) && (
              <div className="px-3 pb-3 space-y-2">
                {item.hook && <MiniSection label="Hook">{item.hook}</MiniSection>}
                {item.script && <MiniSection label="Script">{item.script}</MiniSection>}
                {item.slide && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase mb-1 text-slate-400">
                      Slide
                    </div>
                    {item.slide.map((s, si) => (
                      <div key={si} className="flex items-start gap-2 rounded-lg p-2 bg-gray-50">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 mt-0.5 bg-gray-200 text-slate-600">
                          {si + 1}
                        </span>
                        <p className="text-sm text-slate-700">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
                {item.testo && <MiniSection label="Testo">{item.testo}</MiniSection>}
                <div className="flex items-center gap-1.5 pt-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-700">{item.cta}</span>
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
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "overview", label: "Panoramica" },
          { id: "creativita", label: `Creatività (${(data.creativita || []).length})` },
          { id: "copy", label: `Copy (${(data.copy_ads || []).length})` },
        ].map((t) => (
          <TabBtn key={t.id} active={section === t.id} onClick={() => setSection(t.id)}>
            {t.label}
          </TabBtn>
        ))}
      </div>
      {section === "overview" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          {[
            { label: "Obiettivo", value: data.obiettivo_campagna, icon: Target },
            { label: "Pubblico Target", value: data.pubblico_target, icon: Users },
            { label: "Budget", value: data.budget_consigliato, icon: Zap },
          ].map((row, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1">
                <row.icon className="w-3.5 h-3.5 text-yellow-500" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {row.label}
                </span>
              </div>
              <p className="text-sm text-slate-900">{row.value}</p>
            </div>
          ))}
        </div>
      )}
      {section === "creativita" &&
        (data.creativita || []).map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-yellow-100 text-yellow-700">
                {i + 1}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-slate-600">
                {c.tipo}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900">{c.headline}</p>
            <MiniSection label="Testo primario">{c.testo_primario}</MiniSection>
          </div>
        ))}
      {section === "copy" &&
        (data.copy_ads || []).map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {c.angolo}
            </span>
            <p className="text-sm font-medium text-slate-900">{c.headline}</p>
            <MiniSection label="Testo">{c.testo_primario}</MiniSection>
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-slate-900">
              {c.cta_button}
            </span>
          </div>
        ))}
    </div>
  );
}

function LancioContent({ planData }) {
  const [activeTab, setActiveTab] = useState("landing");
  if (!planData) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
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
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <TabBtn key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </TabBtn>
        ))}
      </div>
      {renderTab()}
    </div>
  );
}

export function F6Lancio({ partnerId }) {
  const navigate = useNavigate();
  const [planData, setPlanData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/lancio/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.plan_data) setPlanData(data.plan_data);
        }
      } catch (e) {
        // best-effort
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={() => navigate("/partner")}
          className="text-sm text-slate-400 hover:text-slate-700 mb-4"
        >
          ← Dashboard
        </button>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2 text-slate-900">Il tuo Lancio</h1>
          <p className="text-base leading-relaxed text-slate-600">
            Il team prepara il piano di vendita completo per te.
            <br />
            <strong className="text-slate-900">Non devi costruire nulla. Rivedi e approva.</strong>
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="lancio"
          stepTitle="Piano di Lancio"
          nextStepLabel="Vai ai Risultati"
          onContinue={() => navigate("/partner/ottimizzazione")}
        >
          <LancioContent planData={planData} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}
