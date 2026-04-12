import { useState, useEffect } from "react";
import axios from "axios";
import {
  Zap, CheckCircle2, Loader2, ArrowRight, ExternalLink,
  Globe, Users, FileText, Copy
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const SECTIONS = [
  { id: "landing", label: "Landing Page Webinar", icon: Globe, color: "#3B82F6",
    desc: "La pagina che raccoglie iscrizioni al tuo webinar gratuito" },
  { id: "form", label: "Form Contatti", icon: Users, color: "#8B5CF6",
    desc: "Il modulo di iscrizione integrato nella landing" },
  { id: "thankyou", label: "Thank You Page", icon: CheckCircle2, color: "#34C77B",
    desc: "La pagina di conferma dopo l'iscrizione" },
];

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

function FunnelLightContent({ funnelData, published }) {
  if (!funnelData) return null;
  return (
    <div>
      {published && funnelData.url && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
          data-testid="funnel-published-banner"
          style={{ background: "#F0FDF4", border: "2px solid #BBF7D0" }}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#34C77B" }} />
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: "#166534" }}>Funnel pubblicato</p>
            <p className="text-xs" style={{ color: "#15803D" }}>Il tuo link e attivo e raccoglie contatti.</p>
          </div>
          <a href={funnelData.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg"
            style={{ background: "#34C77B", color: "white" }}>
            <ExternalLink className="w-3.5 h-3.5" /> Apri funnel
          </a>
        </div>
      )}
      {published && !funnelData.url && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3"
          data-testid="funnel-pending-banner"
          style={{ background: "#FFFBEB", border: "2px solid #FDE68A" }}>
          <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: "#D97706" }} />
          <div className="flex-1">
            <p className="text-sm font-black" style={{ color: "#92400E" }}>Funnel in preparazione</p>
            <p className="text-xs" style={{ color: "#B45309" }}>Il team sta configurando il tuo spazio su Systeme. Il link sarà disponibile a breve.</p>
          </div>
        </div>
      )}
      <SectionPreview section={SECTIONS[0]} content={funnelData.landing} isGenerated={!!funnelData.landing} />
      <SectionPreview section={SECTIONS[1]} content={funnelData.form} isGenerated={!!funnelData.form} />
      <SectionPreview section={SECTIONS[2]} content={funnelData.thankyou} isGenerated={!!funnelData.thankyou} />
    </div>
  );
}

export function FunnelLightPage({ partner, onNavigate, onComplete, isAdmin }) {
  const [isLoading, setIsLoading] = useState(true);
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

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#FFD24D" }} />
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
              style={{ background: "#FFD24D20" }}>
              <Zap className="w-6 h-6" style={{ color: "#FFD24D" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Il tuo primo funnel
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Landing + Form + Thank You — costruiti dal team per te
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="funnel-light"
          stepTitle="Funnel Light"
          stepIcon={Zap}
          nextStepLabel="Prosegui alla Masterclass"
          onContinue={() => onComplete ? onComplete() : onNavigate && onNavigate("dashboard")}
          isAdmin={isAdmin}
        >
          <FunnelLightContent funnelData={funnelData} published={published} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default FunnelLightPage;
