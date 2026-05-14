/**
 * Ciak Partner — Fase 2: Funnel Light.
 * Porting di components/partner/FunnelLightPage.jsx (Fase 2c).
 * Usa DoneForYouWrapper. Endpoint: GET /api/partner-journey/funnel-light/:partnerId
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, ExternalLink, Globe, Users } from "lucide-react";
import { DoneForYouWrapper } from "../components/DoneForYouWrapper";

const SECTIONS = [
  { id: "landing", label: "Landing Page Webinar", icon: Globe, desc: "La pagina che raccoglie iscrizioni al tuo webinar gratuito" },
  { id: "form", label: "Form Contatti", icon: Users, desc: "Il modulo di iscrizione integrato nella landing" },
  { id: "thankyou", label: "Thank You Page", icon: CheckCircle2, desc: "La pagina di conferma dopo l'iscrizione" },
];

function SectionPreview({ section, content }) {
  const SIcon = section.icon;
  const ready = !!content;
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden mb-3 border ${
        ready ? "border-emerald-300" : "border-gray-200"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
            <SIcon className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">{section.label}</p>
            <p className="text-xs text-slate-400">{section.desc}</p>
          </div>
          {ready && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> Pronto
            </span>
          )}
        </div>
        {content && (
          <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-line bg-gray-50 text-slate-600">
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
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">Funnel pubblicato</p>
            <p className="text-xs text-emerald-700">Il tuo link è attivo e raccoglie contatti.</p>
          </div>
          <a
            href={funnelData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-500 text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Apri funnel
          </a>
        </div>
      )}
      {published && !funnelData.url && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3 bg-yellow-50 border-2 border-yellow-200">
          <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-yellow-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-yellow-800">Funnel in preparazione</p>
            <p className="text-xs text-yellow-700">
              Il team sta configurando il tuo spazio. Il link sarà disponibile a breve.
            </p>
          </div>
        </div>
      )}
      <SectionPreview section={SECTIONS[0]} content={funnelData.landing} />
      <SectionPreview section={SECTIONS[1]} content={funnelData.form} />
      <SectionPreview section={SECTIONS[2]} content={funnelData.thankyou} />
    </div>
  );
}

export function F2FunnelLight({ partnerId }) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [funnelData, setFunnelData] = useState(null);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/funnel-light/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.funnel_light) {
            setFunnelData(data.funnel_light);
            setPublished(data.funnel_light.published || false);
          }
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
          <h1 className="text-2xl font-semibold text-slate-900">Il tuo primo funnel</h1>
          <p className="text-sm text-slate-400">
            Landing + Form + Thank You — costruiti dal team per te.
          </p>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="funnel-light"
          stepTitle="Funnel Light"
          nextStepLabel="Prosegui alla Masterclass"
          onContinue={() => navigate("/partner/masterclass")}
        >
          <FunnelLightContent funnelData={funnelData} published={published} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}
