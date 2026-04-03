import { useState, useEffect } from "react";
import { 
  Video, Calendar, Clock, Users, Sparkles, Copy, Check,
  Play, Target, Lightbulb, Award, ShoppingCart, Megaphone,
  Mail, MessageSquare, RefreshCw, Loader2, ChevronRight,
  Zap, ArrowRight, FileText, Instagram, Send
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE STRUTTURA WEBINAR
// ═══════════════════════════════════════════════════════════════════════════════

const STRUTTURA_WEBINAR = [
  { 
    id: 1, 
    titolo: "Introduzione", 
    descrizione: "Chi sei e perché insegni questo metodo.",
    durata: "5 min",
    icon: Users,
    color: "#3B82F6"
  },
  { 
    id: 2, 
    titolo: "Il Problema", 
    descrizione: "Spiegare il problema principale del tuo target.",
    durata: "8 min",
    icon: Target,
    color: "#EF4444"
  },
  { 
    id: 3, 
    titolo: "Il Metodo", 
    descrizione: "I 3 passi del tuo sistema.",
    durata: "12 min",
    icon: Lightbulb,
    color: "#F2C418"
  },
  { 
    id: 4, 
    titolo: "Caso Studio", 
    descrizione: "Un esempio concreto o una trasformazione reale.",
    durata: "8 min",
    icon: Award,
    color: "#22C55E"
  },
  { 
    id: 5, 
    titolo: "Presentazione Corso", 
    descrizione: "Spiegare il percorso completo.",
    durata: "7 min",
    icon: Play,
    color: "#8B5CF6"
  },
  { 
    id: 6, 
    titolo: "Call To Action", 
    descrizione: "Invitare i partecipanti ad iscriversi.",
    durata: "5 min",
    icon: ShoppingCart,
    color: "#EC4899"
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
      style={{ 
        background: copied ? '#22C55E' : '#F2C41830',
        color: copied ? 'white' : '#C4990A'
      }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiato!' : (label || 'Copia testo')}
    </button>
  );
}

function HeaderSection({ webinarData, isGenerating, onGenerate }) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 14); // Suggerisce 2 settimane da oggi
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
             style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black" style={{ color: '#1E2128' }}>
            Webinar Mensile Evolution
          </h1>
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Ogni mese organizziamo un webinar live per presentare il tuo metodo e vendere il corso
          </p>
        </div>
      </div>
      
      {/* Prossimo Webinar Card */}
      <div className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, #1E2128, #2D3239)' }}>
        <div className="text-xs font-bold mb-3" style={{ color: '#F2C418' }}>
          PROSSIMO WEBINAR
        </div>
        
        {webinarData?.titolo ? (
          <>
            <h2 className="text-lg font-black text-white mb-4">
              {webinarData.titolo}
            </h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <div>
                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>Data suggerita</div>
                  <div className="text-sm font-bold text-white">
                    {nextDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <div>
                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>Durata</div>
                  <div className="text-sm font-bold text-white">45 minuti</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                <div>
                  <div className="text-[10px]" style={{ color: '#9CA3AF' }}>Formato</div>
                  <div className="text-sm font-bold text-white">Zoom Webinar</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: '#F2C418' }} />
            <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
              Genera il tuo primo webinar mensile
            </p>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
              style={{ background: '#F2C418', color: '#1E2128' }}
              data-testid="generate-webinar-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Genera Webinar
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Info box */}
      <div className="mt-4 p-4 rounded-xl" style={{ background: '#FEF9E7', border: '1px solid #F2C41830' }}>
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 flex-shrink-0" style={{ color: '#C4990A' }} />
          <div>
            <div className="text-sm font-bold" style={{ color: '#92400E' }}>
              Tu pensa solo a presentare
            </div>
            <div className="text-xs mt-1" style={{ color: '#A16207' }}>
              Evolution PRO ti fornisce la struttura, i contenuti e la strategia di promozione.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StrutturaSection() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41830', color: '#F2C418' }}>
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Struttura del Webinar</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Scaletta standard Evolution — 45 minuti</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {STRUTTURA_WEBINAR.map((blocco, idx) => {
          const Icon = blocco.icon;
          return (
            <div 
              key={blocco.id}
              className="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-[#FAFAF7]"
              style={{ border: '1px solid #ECEDEF' }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${blocco.color}20`, color: blocco.color }}
              >
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded" 
                        style={{ background: '#FAFAF7', color: '#9CA3AF' }}>
                    {blocco.id}
                  </span>
                  <span className="font-bold text-sm" style={{ color: '#1E2128' }}>
                    {blocco.titolo}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#5F6572' }}>
                  {blocco.descrizione}
                </p>
              </div>
              
              <div className="text-xs font-bold px-3 py-1 rounded-full"
                   style={{ background: '#FAFAF7', color: '#5F6572' }}>
                {blocco.durata}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 rounded-xl text-center" style={{ background: '#FAFAF7' }}>
        <span className="text-xs font-bold" style={{ color: '#5F6572' }}>
          Durata totale: <span style={{ color: '#1E2128' }}>45 minuti</span>
        </span>
      </div>
    </div>
  );
}

function PromozioneSection({ promoData }) {
  if (!promoData) {
    return (
      <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
        <div className="text-center py-8">
          <Megaphone className="w-10 h-10 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
          <p className="text-sm" style={{ color: '#5F6572' }}>
            Genera prima il webinar per ottenere i contenuti promozionali
          </p>
        </div>
      </div>
    );
  }
  
  const { emails, social } = promoData;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#EC489920', color: '#EC4899' }}>
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Strategia Promozione Webinar</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Email e contenuti social pronti all'uso</p>
        </div>
      </div>
      
      {/* Email Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4" style={{ color: '#3B82F6' }} />
          <span className="text-sm font-bold" style={{ color: '#1E2128' }}>EMAIL</span>
        </div>
        
        <div className="space-y-3">
          {emails?.map((email, idx) => (
            <div key={idx} className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#3B82F6' }}>{email.tipo}</span>
                <CopyButton text={`Oggetto: ${email.oggetto}\n\n${email.corpo}`} />
              </div>
              <div className="text-sm font-bold mb-1" style={{ color: '#1E2128' }}>
                {email.oggetto}
              </div>
              <div className="text-xs" style={{ color: '#5F6572' }}>
                {email.corpo?.substring(0, 150)}...
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Social Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Instagram className="w-4 h-4" style={{ color: '#EC4899' }} />
          <span className="text-sm font-bold" style={{ color: '#1E2128' }}>CONTENUTI SOCIAL</span>
        </div>
        
        <div className="space-y-3">
          {social?.map((post, idx) => (
            <div key={idx} className="p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold" style={{ color: '#EC4899' }}>{post.tipo}</span>
                <CopyButton text={post.testo} />
              </div>
              <div className="text-sm" style={{ color: '#5F6572' }}>
                {post.testo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReplaySection() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#22C55E20', color: '#22C55E' }}>
          <Play className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold" style={{ color: '#1E2128' }}>Replay Automatico Webinar</h2>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            Chi si registra ma non partecipa riceverà automaticamente il replay via email
          </p>
        </div>
      </div>
      
      {/* Flusso */}
      <div className="flex items-center justify-between gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { label: "Webinar Live", icon: Video, color: "#8B5CF6" },
          { label: "Registrazione salvata", icon: FileText, color: "#3B82F6" },
          { label: "Replay 48 ore", icon: Play, color: "#F59E0B" },
          { label: "Email follow-up", icon: Send, color: "#22C55E" },
        ].map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="flex flex-col items-center p-3 rounded-xl min-w-[100px]"
                 style={{ background: `${step.color}10`, border: `1px solid ${step.color}30` }}>
              <step.icon className="w-5 h-5 mb-1" style={{ color: step.color }} />
              <span className="text-[10px] font-bold text-center" style={{ color: step.color }}>
                {step.label}
              </span>
            </div>
            {idx < 3 && <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: '#9CA3AF' }} />}
          </div>
        ))}
      </div>
      
      {/* Sequenza Email */}
      <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
        <div className="text-xs font-bold mb-3" style={{ color: '#5F6572' }}>
          SEQUENZA EMAIL FOLLOW-UP
        </div>
        <div className="space-y-2">
          {[
            { num: 1, label: "Email Replay", timing: "Immediata" },
            { num: 2, label: "Email Reminder Replay", timing: "+24 ore" },
            { num: 3, label: "Email Ultima Possibilità", timing: "+48 ore" },
          ].map(email => (
            <div key={email.num} className="flex items-center justify-between p-2 rounded-lg bg-white">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: '#22C55E20', color: '#22C55E' }}>
                  {email.num}
                </span>
                <span className="text-xs font-medium" style={{ color: '#1E2128' }}>{email.label}</span>
              </div>
              <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{email.timing}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function WebinarPage({ partner, onNavigate }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [webinarData, setWebinarData] = useState(null);
  const [promoData, setPromoData] = useState(null);
  
  const partnerId = partner?.id;
  
  // Carica dati esistenti
  useEffect(() => {
    const loadWebinar = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/webinar/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.webinar) {
            setWebinarData(data.webinar);
            setPromoData(data.promozione);
          }
        }
      } catch (e) {
        console.error("Error loading webinar:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWebinar();
  }, [partnerId]);
  
  const handleGenerate = async () => {
    if (!partnerId) return;
    
    setIsGenerating(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/webinar/genera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        const data = await res.json();
        setWebinarData(data.webinar);
        setPromoData(data.promozione);
      }
    } catch (e) {
      console.error("Error generating webinar:", e);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: '#FAFAF7' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#F2C418' }} />
      </div>
    );
  }
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-3xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => onNavigate('ottimizzazione')}
            className="text-xs font-medium mb-3 flex items-center gap-1"
            style={{ color: '#9CA3AF' }}
          >
            ← Torna all'Ottimizzazione
          </button>
          
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-full text-xs font-bold"
                 style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
              FASE 6
            </div>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Ottimizzazione</span>
          </div>
        </div>
        
        {/* 1️⃣ Header Section */}
        <HeaderSection 
          webinarData={webinarData}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
        
        {/* 2️⃣ Struttura Webinar */}
        <StrutturaSection />
        
        {/* 3️⃣ Promozione */}
        <PromozioneSection promoData={promoData} />
        
        {/* 4️⃣ Replay e Follow-up */}
        <ReplaySection />
        
        {/* Rigenera */}
        {webinarData && (
          <div className="mt-6 text-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="text-sm font-medium flex items-center gap-2 mx-auto transition-all hover:opacity-70"
              style={{ color: '#5F6572' }}
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Rigenera contenuti webinar
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default WebinarPage;
