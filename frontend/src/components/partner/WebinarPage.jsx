import { useState, useEffect } from "react";
import {
  Video, Calendar, Clock, Users, Check, Play, Target,
  Lightbulb, Award, ShoppingCart, Link, ArrowRight,
  Loader2, FileText, Zap, ExternalLink, Sparkles, User
} from "lucide-react";
import { DoneForYouWrapper } from "./DoneForYouWrapper";

const API = process.env.REACT_APP_BACKEND_URL || "";

const STRUTTURA_WEBINAR = [
  { id: 1, titolo: "Hook / Apertura", desc: "Cattura l'attenzione e presenta il tema.",
    durata: "3 min", icon: Zap, color: "#F2C418" },
  { id: 2, titolo: "Il Problema", desc: "Spiega il problema principale del tuo target.",
    durata: "8 min", icon: Target, color: "#EF4444" },
  { id: 3, titolo: "Gli errori comuni", desc: "Mostra i 3 errori che il tuo pubblico commette.",
    durata: "7 min", icon: Lightbulb, color: "#F59E0B" },
  { id: 4, titolo: "Il Metodo", desc: "Presenta i 3 passi del tuo sistema.",
    durata: "12 min", icon: Award, color: "#22C55E" },
  { id: 5, titolo: "L'Offerta", desc: "Presenta il tuo corso e i bonus.",
    durata: "10 min", icon: ShoppingCart, color: "#8B5CF6" },
  { id: 6, titolo: "Call to Action", desc: "Invita i partecipanti ad iscriversi subito.",
    durata: "5 min", icon: Play, color: "#EC4899" },
];

function WebinarContent({ webinarData }) {
  if (!webinarData) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "#9CA3AF" }}>
        Il team sta preparando il tuo webinar personalizzato.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="webinar-content">
      {/* Titolo e promessa */}
      <div className="rounded-2xl p-5" style={{ background: "#1E2128" }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "#F2C418" }}>
          Il tuo Webinar
        </div>
        <h2 className="text-lg font-black text-white mb-2">
          {webinarData.titolo || "Titolo in preparazione"}
        </h2>
        {webinarData.promessa && (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
            {webinarData.promessa}
          </p>
        )}
      </div>

      {/* Struttura */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#ECEDEF" }}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5" style={{ color: "#F2C418" }} />
          <span className="font-bold text-sm" style={{ color: "#1E2128" }}>Struttura del Webinar</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#FAFAF7", color: "#9CA3AF" }}>45 min</span>
        </div>
        <div className="space-y-3">
          {STRUTTURA_WEBINAR.map((blocco) => {
            const Icon = blocco.icon;
            const content = webinarData.scaletta?.find(s => s.id === blocco.id);
            return (
              <div key={blocco.id}
                className="flex items-start gap-4 p-4 rounded-xl transition-all"
                style={{ border: "1px solid #ECEDEF" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${blocco.color}20`, color: blocco.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: "#FAFAF7", color: "#9CA3AF" }}>{blocco.id}</span>
                    <span className="font-bold text-sm" style={{ color: "#1E2128" }}>{blocco.titolo}</span>
                    <span className="text-xs ml-auto" style={{ color: "#9CA3AF" }}>{blocco.durata}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "#5F6572" }}>
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
        <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: "#ECEDEF" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "#3B82F620" }}>
            <Video className="w-6 h-6" style={{ color: "#3B82F6" }} />
          </div>
          <p className="text-sm font-bold mb-1" style={{ color: "#1E2128" }}>Registra il video</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Il team ti guida nella registrazione del webinar
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: "#3B82F610", color: "#3B82F6" }}>
            {webinarData.video_status === "registrato" ? "Video registrato" : "Da registrare"}
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-5 text-center" style={{ borderColor: "#ECEDEF" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "#8B5CF620" }}>
            <User className="w-6 h-6" style={{ color: "#8B5CF6" }} />
          </div>
          <p className="text-sm font-bold mb-1" style={{ color: "#1E2128" }}>Usa Avatar AI</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            In alternativa, possiamo creare il video con il tuo avatar
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg text-xs font-bold"
            style={{ background: "#8B5CF610", color: "#8B5CF6" }}>
            {webinarData.avatar_enabled ? "Avatar attivo" : "Opzione disponibile"}
          </div>
        </div>
      </div>

      {/* Pianificazione */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#ECEDEF" }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" style={{ color: "#F2C418" }} />
          <span className="font-bold text-sm" style={{ color: "#1E2128" }}>Pianificazione</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: "#FAFAF7" }}>
            <div className="text-xs font-bold mb-1" style={{ color: "#9CA3AF" }}>Data</div>
            <div className="text-sm font-bold" style={{ color: "#1E2128" }}>
              {webinarData.data_webinar || "Da definire dal team"}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "#FAFAF7" }}>
            <div className="text-xs font-bold mb-1" style={{ color: "#9CA3AF" }}>Orario</div>
            <div className="text-sm font-bold" style={{ color: "#1E2128" }}>
              {webinarData.ora_webinar || "Da definire dal team"}
            </div>
          </div>
        </div>
      </div>

      {/* Link */}
      <div className="bg-white rounded-2xl border p-5" style={{ borderColor: "#ECEDEF" }}>
        <div className="flex items-center gap-2 mb-4">
          <Link className="w-5 h-5" style={{ color: "#F2C418" }} />
          <span className="font-bold text-sm" style={{ color: "#1E2128" }}>I tuoi link</span>
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
      <div className="rounded-xl p-4" style={{ background: "#FEF9E7", border: "1px solid #F2C41830" }}>
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: "#C4990A" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "#92400E" }}>
              Tutto gestito dal team
            </div>
            <div className="text-xs mt-1" style={{ color: "#A16207" }}>
              Evolution PRO ti fornisce la struttura, i contenuti e la strategia di promozione.
              Tu devi solo presentare (o usare l'avatar AI).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({ label, url, placeholder }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (e) { /* ignore */ }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#FAFAF7" }}>
      <div className="flex-1">
        <div className="text-xs font-bold mb-0.5" style={{ color: "#9CA3AF" }}>{label}</div>
        {url ? (
          <div className="flex items-center gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-bold truncate" style={{ color: "#3B82F6" }}>
              {url}
            </a>
            <button onClick={handleCopy}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white transition-all">
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#34C77B" }} />
                : <ExternalLink className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />}
            </button>
          </div>
        ) : (
          <span className="text-sm" style={{ color: "#9CA3AF" }}>{placeholder}</span>
        )}
      </div>
    </div>
  );
}

export function WebinarPage({ partner, onNavigate, isAdmin }) {
  const [webinarData, setWebinarData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const partnerId = partner?.id;

  useEffect(() => {
    const load = async () => {
      if (!partnerId) { setIsLoading(false); return; }
      try {
        const res = await fetch(`${API}/api/partner-journey/webinar/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          setWebinarData(data.webinar);
        }
      } catch (e) {
        console.error("Error loading webinar:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [partnerId]);

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
        <div className="mb-6" data-testid="webinar-hero">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "#8B5CF620" }}>
              <Video className="w-6 h-6" style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>
                Il tuo Webinar
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Il centro della tua strategia di vendita — preparato dal team per te
              </p>
            </div>
          </div>
        </div>

        <DoneForYouWrapper
          partnerId={partnerId}
          stepId="webinar"
          stepTitle="Webinar"
          stepIcon={Video}
          nextStepLabel={null}
          onContinue={null}
          isAdmin={isAdmin}
        >
          <WebinarContent webinarData={webinarData} />
        </DoneForYouWrapper>
      </div>
    </div>
  );
}

export default WebinarPage;
