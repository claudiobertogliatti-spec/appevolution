/**
 * Ciak Partner — Webinar.
 *
 * Porting di components/partner/WebinarPage.jsx.
 * Re-skin palette Ciak (slate/yellow/emerald). Flusso funzionale identico,
 * endpoint backend invariati:
 *  GET /api/partner-journey/webinar/:partnerId
 *  (+ endpoint usati da DoneForYouWrapper: step-status/:partnerId, step-status/approve)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Video, Calendar, Check, Play, Target,
  Lightbulb, Award, ShoppingCart, Link as LinkIcon,
  Loader2, FileText, Zap, ExternalLink, Sparkles, User,
} from "lucide-react";
import { DoneForYouWrapper } from "../components/DoneForYouWrapper";

const STRUTTURA_WEBINAR = [
  { id: 1, titolo: "Hook / Apertura", desc: "Cattura l'attenzione e presenta il tema.",
    durata: "3 min", icon: Zap, iconCls: "bg-yellow-100 text-yellow-600" },
  { id: 2, titolo: "Il Problema", desc: "Spiega il problema principale del tuo target.",
    durata: "8 min", icon: Target, iconCls: "bg-red-100 text-red-500" },
  { id: 3, titolo: "Gli errori comuni", desc: "Mostra i 3 errori che il tuo pubblico commette.",
    durata: "7 min", icon: Lightbulb, iconCls: "bg-yellow-100 text-yellow-600" },
  { id: 4, titolo: "Il Metodo", desc: "Presenta i 3 passi del tuo sistema.",
    durata: "12 min", icon: Award, iconCls: "bg-emerald-100 text-emerald-500" },
  { id: 5, titolo: "L'Offerta", desc: "Presenta il tuo corso e i bonus.",
    durata: "10 min", icon: ShoppingCart, iconCls: "bg-slate-100 text-slate-500" },
  { id: 6, titolo: "Call to Action", desc: "Invita i partecipanti ad iscriversi subito.",
    durata: "5 min", icon: Play, iconCls: "bg-blue-100 text-blue-500" },
];

function LinkRow({ label, url, placeholder }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard best-effort
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold mb-0.5 text-slate-400">{label}</div>
        {url ? (
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold truncate text-blue-500"
            >
              {url}
            </a>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white transition"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-sm text-slate-400">{placeholder}</span>
        )}
      </div>
    </div>
  );
}

function WebinarContent({ webinarData }) {
  if (!webinarData) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        Il team sta preparando il tuo webinar personalizzato.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Titolo e promessa */}
      <div className="rounded-2xl p-5 bg-slate-900">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-yellow-400">
          Il tuo Webinar
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          {webinarData.titolo || "Titolo in preparazione"}
        </h2>
        {webinarData.promessa && (
          <p className="text-sm text-slate-400">{webinarData.promessa}</p>
        )}
      </div>

      {/* Struttura */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-sm text-slate-900">Struttura del Webinar</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-slate-400">45 min</span>
        </div>
        <div className="space-y-3">
          {STRUTTURA_WEBINAR.map((blocco) => {
            const Icon = blocco.icon;
            const content = webinarData.scaletta?.find((s) => s.id === blocco.id);
            return (
              <div
                key={blocco.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-200"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${blocco.iconCls}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-50 text-slate-400">
                      {blocco.id}
                    </span>
                    <span className="font-semibold text-sm text-slate-900">{blocco.titolo}</span>
                    <span className="text-xs ml-auto text-slate-400">{blocco.durata}</span>
                  </div>
                  <p className="text-xs mt-1 text-slate-600">
                    {content?.contenuto || blocco.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Azioni: Registra video / Usa Avatar AI */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-blue-100">
            <Video className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-sm font-semibold mb-1 text-slate-900">Registra il video</p>
          <p className="text-xs text-slate-400">
            Il team ti guida nella registrazione del webinar
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-50 text-blue-500">
            {webinarData.video_status === "registrato" ? "Video registrato" : "Da registrare"}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-slate-100">
            <User className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-sm font-semibold mb-1 text-slate-900">Usa Avatar AI</p>
          <p className="text-xs text-slate-400">
            In alternativa, possiamo creare il video con il tuo avatar
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500">
            {webinarData.avatar_enabled ? "Avatar attivo" : "Opzione disponibile"}
          </div>
        </div>
      </div>

      {/* Pianificazione */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-sm text-slate-900">Pianificazione</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 bg-gray-50">
            <div className="text-xs font-semibold mb-1 text-slate-400">Data</div>
            <div className="text-sm font-semibold text-slate-900">
              {webinarData.data_webinar || "Da definire dal team"}
            </div>
          </div>
          <div className="rounded-xl p-4 bg-gray-50">
            <div className="text-xs font-semibold mb-1 text-slate-400">Orario</div>
            <div className="text-sm font-semibold text-slate-900">
              {webinarData.ora_webinar || "Da definire dal team"}
            </div>
          </div>
        </div>
      </div>

      {/* Link */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-sm text-slate-900">I tuoi link</span>
        </div>
        <div className="space-y-3">
          <LinkRow
            label="Landing Webinar"
            url={webinarData.landing_url}
            placeholder="Il team sta configurando la landing"
          />
          <LinkRow
            label="Pagina Iscrizione"
            url={webinarData.iscrizione_url}
            placeholder="Il team sta configurando la pagina di iscrizione"
          />
        </div>
      </div>

      {/* Info Done-for-You */}
      <div className="rounded-xl p-4 bg-yellow-50 border border-yellow-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0 text-yellow-600" />
          <div>
            <div className="text-sm font-semibold text-yellow-800">
              Tutto gestito dal team
            </div>
            <div className="text-xs mt-1 text-yellow-700">
              Evolution PRO ti fornisce la struttura, i contenuti e la strategia di promozione.
              Tu devi solo presentare (o usare l'avatar AI).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebinarPage({ partnerId }) {
  const navigate = useNavigate();
  const [webinarData, setWebinarData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/partner-journey/webinar/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setWebinarData(data.webinar);
        }
      } catch (e) {
        // load best-effort
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
        {/* HERO */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100">
              <Video className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Il tuo Webinar</h1>
              <p className="text-sm text-slate-400">
                Il centro della tua strategia di vendita — preparato dal team per te
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="webinar"
          stepTitle="Webinar"
          nextStepLabel={null}
          onContinue={null}
        >
          <WebinarContent webinarData={webinarData} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default WebinarPage;
