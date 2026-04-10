import { useState, useEffect } from "react";
import axios from "axios";
import {
  Zap, CheckCircle2, Loader2, ArrowRight, ExternalLink,
  Globe, Users, FileText, Copy, RefreshCw
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL || "";

/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE SECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { id: "landing", label: "Landing Page Webinar", icon: Globe, color: "#3B82F6",
    desc: "La pagina che raccoglie iscrizioni al tuo webinar gratuito" },
  { id: "form", label: "Form Contatti", icon: Users, color: "#8B5CF6",
    desc: "Il modulo di iscrizione integrato nella landing" },
  { id: "thankyou", label: "Thank You Page", icon: CheckCircle2, color: "#34C77B",
    desc: "La pagina di conferma dopo l'iscrizione" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION PREVIEW
   ═══════════════════════════════════════════════════════════════════════════ */

function SectionPreview({ section, content, isGenerated }) {
  const SIcon = section.icon;

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-3"
      style={{ border: `1px solid ${isGenerated ? section.color : "#ECEDEF"}` }}
      data-testid={`section-${section.id}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${section.color}15` }}>
            <SIcon className="w-4.5 h-4.5" style={{ color: section.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: "#1E2128" }}>{section.label}</p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>{section.desc}</p>
          </div>
          {isGenerated && (
            <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full"
              style={{ background: "#DCFCE7", color: "#166534" }}>
              <CheckCircle2 className="w-3 h-3" /> Pronto
            </span>
          )}
        </div>

        {content && (
          <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line"
            style={{ background: "#FAFAF7", color: "#5F6572" }}>
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export function FunnelLightPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [funnelData, setFunnelData] = useState(null);
  const [published, setPublished] = useState(false);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await axios.get(`${API}/api/partner-journey/funnel-light/${partnerId}`);
        if (res.data.funnel_light) {
          setFunnelData(res.data.funnel_light);
          setPublished(res.data.funnel_light.published || false);
        }
      } catch (e) {
        console.error("Error loading funnel light:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

  const handleGenerate = async () => {
    if (!partnerId) return;
    setIsGenerating(true);
    try {
      const res = await axios.post(`${API}/api/partner-journey/funnel-light/generate`, {
        partner_id: partnerId,
      });
      if (res.data.funnel_light) {
        setFunnelData(res.data.funnel_light);
      }
    } catch (e) {
      console.error("Error generating:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!partnerId) return;
    setIsPublishing(true);
    try {
      await axios.post(`${API}/api/partner-journey/funnel-light/publish`, {
        partner_id: partnerId,
      });
      setPublished(true);
    } catch (e) {
      console.error("Error publishing:", e);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#F2C418" }} />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="funnel-light-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#F2C41820" }}>
              <Zap className="w-6 h-6" style={{ color: "#F2C418" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Attiva il tuo primo funnel
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Landing + Form + Thank You — tutto pre-compilato dal posizionamento
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <Zap className="w-4 h-4" style={{ color: "#FBBF24" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FBBF24" }}>Vista Admin</span>
          </div>
        )}

        {/* NOT GENERATED YET */}
        {!funnelData && (
          <div className="text-center py-8">
            <div className="rounded-2xl p-6 mb-6" style={{ background: "#1E2128" }}>
              <p className="text-sm mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
                <strong className="text-white">Generiamo il tuo funnel in automatico</strong>
                <br />
                Usiamo i dati del tuo posizionamento per creare:
              </p>
              <div className="space-y-2 mb-5">
                {SECTIONS.map((s) => {
                  const SIcon = s.icon;
                  return (
                    <div key={s.id} className="flex items-center gap-3 text-left">
                      <SIcon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                      <span className="text-sm text-white">{s.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                Tutto compilato, tu devi solo confermare e pubblicare.
              </p>
            </div>

            <button
              data-testid="generate-funnel-light"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#F2C418", color: "#1E2128", boxShadow: "0 4px 16px #F2C41840" }}
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Generazione in corso...</>
              ) : (
                <><Zap className="w-5 h-5" /> Genera il mio funnel</>
              )}
            </button>
          </div>
        )}

        {/* GENERATED — PREVIEW */}
        {funnelData && (
          <>
            {/* Status bar */}
            {published ? (
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
                data-testid="funnel-published-banner"
                style={{ background: "#F0FDF4", border: "2px solid #BBF7D0" }}>
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#34C77B" }} />
                <div className="flex-1">
                  <p className="text-sm font-black" style={{ color: "#166534" }}>Funnel pubblicato</p>
                  <p className="text-xs" style={{ color: "#15803D" }}>Il tuo link e attivo e raccoglie contatti.</p>
                </div>
                {funnelData.url && (
                  <a href={funnelData.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg"
                    style={{ background: "#34C77B", color: "white" }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Apri funnel
                  </a>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
                style={{ background: "#FFFBEB", border: "2px solid #FDE68A" }}>
                <FileText className="w-6 h-6 flex-shrink-0" style={{ color: "#F59E0B" }} />
                <div className="flex-1">
                  <p className="text-sm font-black" style={{ color: "#92400E" }}>Funnel pronto — da pubblicare</p>
                  <p className="text-xs" style={{ color: "#B45309" }}>Rivedi i contenuti e pubblica quando sei pronto.</p>
                </div>
              </div>
            )}

            {/* Section previews */}
            <SectionPreview
              section={SECTIONS[0]}
              content={funnelData.landing}
              isGenerated={!!funnelData.landing}
            />
            <SectionPreview
              section={SECTIONS[1]}
              content={funnelData.form}
              isGenerated={!!funnelData.form}
            />
            <SectionPreview
              section={SECTIONS[2]}
              content={funnelData.thankyou}
              isGenerated={!!funnelData.thankyou}
            />

            {/* ACTIONS */}
            <div className="flex gap-3 mt-5">
              {!published && (
                <>
                  <button
                    data-testid="regenerate-funnel-light"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:bg-gray-100 disabled:opacity-50"
                    style={{ background: "white", color: "#5F6572", border: "1px solid #ECEDEF" }}
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} /> Rigenera
                  </button>
                  <button
                    data-testid="publish-funnel-light"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    style={{ background: "#34C77B", color: "white", boxShadow: "0 4px 16px #34C77B40" }}
                  >
                    {isPublishing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Pubblicazione...</>
                    ) : (
                      <><Globe className="w-4 h-4" /> Pubblica il funnel</>
                    )}
                  </button>
                </>
              )}
              {published && (
                <button
                  data-testid="continue-to-masterclass"
                  onClick={() => onComplete ? onComplete() : onNavigate && onNavigate("dashboard")}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "#F2C418", color: "#1E2128", boxShadow: "0 4px 16px #F2C41840" }}
                >
                  Prosegui alla Masterclass <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default FunnelLightPage;
