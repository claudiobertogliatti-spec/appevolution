import { useState, useEffect } from "react";
import { 
  Check, Sparkles, Upload, ExternalLink, Mail, FileText, 
  ShoppingCart, Play, ChevronDown, ChevronRight, Eye,
  RefreshCw, Rocket, Copy, CheckCircle2, Zap, Loader2
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════════════════════════════════════════
// STRUTTURA FUNNEL GENERATO
// ═══════════════════════════════════════════════════════════════════════════════

const FUNNEL_ELEMENTS = [
  {
    id: "optin",
    title: "Opt-in Page",
    icon: FileText,
    description: "Pagina cattura lead per la masterclass gratuita",
    color: "#3B82F6"
  },
  {
    id: "masterclass",
    title: "Pagina Masterclass",
    icon: Play,
    description: "Pagina video con timer e call-to-action",
    color: "#8B5CF6"
  },
  {
    id: "sales",
    title: "Pagina Vendita",
    icon: ShoppingCart,
    description: "Sales page completa con offerta e bonus",
    color: "#F2C418"
  },
  {
    id: "checkout",
    title: "Checkout",
    icon: ShoppingCart,
    description: "Pagina pagamento Stripe integrato",
    color: "#22C55E"
  },
  {
    id: "emails",
    title: "Email Automatiche",
    icon: Mail,
    description: "Sequenza email di nurturing e vendita",
    color: "#EF4444"
  }
];

const EMAIL_SEQUENCE = [
  { id: 1, subject: "Accesso alla Masterclass", type: "access", delay: "Immediata" },
  { id: 2, subject: "L'errore che blocca il 90% delle persone", type: "value", delay: "+24 ore" },
  { id: 3, subject: "Come [Nome] ha ottenuto [Risultato]", type: "case_study", delay: "+48 ore" },
  { id: 4, subject: "Ti presento il mio metodo completo", type: "offer", delay: "+72 ore" },
  { id: 5, subject: "Ultima possibilità: offerta in scadenza", type: "urgency", delay: "+96 ore" },
  { id: 6, subject: "Ci sei? La porta sta per chiudersi", type: "closing", delay: "+120 ore" }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function TutorMessage() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Avatar Stefania */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
             style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
          S
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold" style={{ color: '#1E2128' }}>Stefania</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#8B5CF620', color: '#6D28D9' }}>
              Funnel Architect
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Ho analizzato tutti i dati che hai inserito nelle fasi precedenti.
            <br /><br />
            Posso generare automaticamente l'intero sistema di vendita: 
            pagine, copy e email. Tu non devi scrivere nulla.
          </p>
        </div>
      </div>
    </div>
  );
}

function FunnelElementCard({ element, isGenerated, generatedContent, onPreview, isExpanded, onToggle }) {
  return (
    <div className="bg-white rounded-xl border border-[#ECEDEF] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left transition-all hover:bg-[#FAFAF7]"
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${element.color}20`, color: element.color }}
        >
          <element.icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{element.title}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{element.description}</div>
        </div>
        
        {isGenerated ? (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#DCFCE7', color: '#22C55E' }}>
            ✓ Generato
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>
            In attesa
          </span>
        )}
        
        {isExpanded ? (
          <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        ) : (
          <ChevronRight className="w-5 h-5" style={{ color: '#9CA3AF' }} />
        )}
      </button>
      
      {isExpanded && generatedContent && (
        <div className="px-4 pb-4 border-t border-[#ECEDEF]">
          <div className="mt-4 p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
            {element.id === "emails" ? (
              <div className="space-y-2">
                {EMAIL_SEQUENCE.map(email => (
                  <div key={email.id} className="flex items-center gap-3 p-2 rounded-lg bg-white">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ background: '#EF444420', color: '#EF4444' }}>
                      {email.id}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: '#1E2128' }}>{email.subject}</div>
                      <div className="text-xs" style={{ color: '#9CA3AF' }}>{email.delay}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {generatedContent.headline && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#9CA3AF' }}>Headline</div>
                    <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{generatedContent.headline}</div>
                  </div>
                )}
                {generatedContent.subheadline && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#9CA3AF' }}>Sottotitolo</div>
                    <div className="text-sm" style={{ color: '#5F6572' }}>{generatedContent.subheadline}</div>
                  </div>
                )}
                {generatedContent.bullets && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#9CA3AF' }}>Bullet Points</div>
                    <ul className="space-y-1">
                      {generatedContent.bullets.map((bullet, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                          <span style={{ color: '#F2C418' }}>✓</span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {generatedContent.cta && (
                  <div>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: '#9CA3AF' }}>Call to Action</div>
                    <div className="inline-block px-4 py-2 rounded-lg text-sm font-bold"
                         style={{ background: '#F2C418', color: '#1E2128' }}>
                      {generatedContent.cta}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => onPreview(element)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[#ECEDEF]"
              style={{ background: '#F3F4F6', color: '#5F6572' }}
            >
              <Eye className="w-3.5 h-3.5" />
              Anteprima
            </button>
            <button 
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[#ECEDEF]"
              style={{ background: '#F3F4F6', color: '#5F6572' }}
            >
              <Copy className="w-3.5 h-3.5" />
              Copia
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerationProgress({ isGenerating, progress, currentElement }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
             style={{ background: '#F2C41830' }}>
          <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-pulse' : ''}`} style={{ color: '#F2C418' }} />
        </div>
        <div className="flex-1">
          <div className="font-bold" style={{ color: '#1E2128' }}>
            {isGenerating ? 'Generazione in corso...' : 'Pronto per generare'}
          </div>
          <div className="text-sm" style={{ color: '#5F6572' }}>
            {isGenerating ? `Sto creando: ${currentElement}` : 'Clicca "Genera Funnel" per iniziare'}
          </div>
        </div>
      </div>
      
      {isGenerating && (
        <div className="space-y-2">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #F2C418, #FADA5E)' }}
            />
          </div>
          <div className="text-xs text-right" style={{ color: '#9CA3AF' }}>{progress}%</div>
        </div>
      )}
    </div>
  );
}

function PublishSection({ isPublishing, isPublished, onPublish }) {
  return (
    <div className="rounded-2xl p-6 mt-6"
         style={{ background: isPublished ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#1E2128' }}>
      
      {isPublished ? (
        <div className="text-center text-white">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
          <h3 className="text-lg font-black mb-2">Funnel pubblicato!</h3>
          <p className="text-sm text-white/80 mb-4">
            Il tuo sistema di vendita è ora attivo su Systeme.io
          </p>
          <a 
            href="https://systeme.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
          >
            <ExternalLink className="w-4 h-4" />
            Apri su Systeme.io
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-black text-white mb-1">
              Pubblica su Systeme.io
            </h3>
            <p className="text-sm text-white/60">
              OpenClaw creerà automaticamente il funnel duplicando il template standard
            </p>
          </div>
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            {isPublishing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Pubblicazione...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Pubblica su Systeme
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-6 text-center mt-6"
         style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: 'rgba(255,255,255,0.2)' }}>
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">
        Sistema di vendita completato!
      </h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Il tuo funnel è pronto e pubblicato. Ora passiamo alla fase di lancio!
      </p>
      <button
        onClick={onContinue}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: 'white', color: '#16A34A' }}
      >
        Vai alla fase Lancio
        <Zap className="w-5 h-5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function FunnelPage({ partner, onNavigate, onComplete }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingElement, setCurrentGeneratingElement] = useState("");
  const [generatedElements, setGeneratedElements] = useState({});
  const [expandedElement, setExpandedElement] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const partnerId = partner?.id;
  const allGenerated = FUNNEL_ELEMENTS.every(el => generatedElements[el.id]);
  
  // Carica dati esistenti
  useEffect(() => {
    const loadFunnel = async () => {
      if (!partnerId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`${API}/api/partner-journey/funnel/${partnerId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.funnel?.content) {
            setGeneratedElements(data.funnel.content);
            setExpandedElement("optin");
          }
          if (data.is_published) {
            setIsPublished(true);
          }
        }
      } catch (e) {
        console.error("Error loading funnel:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFunnel();
  }, [partnerId]);
  
  const handleGenerate = async () => {
    if (!partnerId) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    
    try {
      // Simula progresso
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      setCurrentGeneratingElement("Analisi dati...");
      
      const res = await fetch(`${API}/api/partner-journey/funnel/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      clearInterval(progressInterval);
      
      if (!res.ok) {
        throw new Error('Errore nella generazione');
      }
      
      const data = await res.json();
      setGeneratedElements(data.funnel_content);
      setGenerationProgress(100);
      setExpandedElement("optin");
      
    } catch (e) {
      console.error("Error generating funnel:", e);
      setError("Errore nella generazione. Riprova.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handlePublish = async () => {
    if (!partnerId) return;
    
    setIsPublishing(true);
    
    try {
      const res = await fetch(`${API}/api/partner-journey/funnel/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_id: partnerId })
      });
      
      if (res.ok) {
        setIsPublished(true);
      }
    } catch (e) {
      console.error("Error publishing:", e);
    } finally {
      setIsPublishing(false);
    }
  };
  
  const handleContinue = () => {
    if (onComplete) onComplete();
    onNavigate('lancio');
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
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
            Sistema di vendita
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Il sistema Evolution PRO genera automaticamente il tuo sistema di vendita completo.
            <br />
            Le pagine e le email sono create sulla base delle informazioni inserite nelle fasi precedenti.
          </p>
        </div>
        
        {/* Tutor */}
        <TutorMessage />
        
        {/* Generation Progress */}
        {(isGenerating || !allGenerated) && (
          <GenerationProgress 
            isGenerating={isGenerating}
            progress={generationProgress}
            currentElement={currentGeneratingElement}
          />
        )}
        
        {/* Generate Button */}
        {!allGenerated && !isGenerating && (
          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 mb-6"
            style={{ background: '#F2C418', color: '#1E2128' }}
          >
            <Sparkles className="w-6 h-6" />
            Genera Funnel
          </button>
        )}
        
        {/* Funnel Elements */}
        <div className="space-y-3">
          {FUNNEL_ELEMENTS.map(element => (
            <FunnelElementCard
              key={element.id}
              element={element}
              isGenerated={!!generatedElements[element.id]}
              generatedContent={generatedElements[element.id]}
              isExpanded={expandedElement === element.id}
              onToggle={() => setExpandedElement(expandedElement === element.id ? null : element.id)}
              onPreview={(el) => console.log("Preview:", el)}
            />
          ))}
        </div>
        
        {/* Publish Section */}
        {allGenerated && !isPublished && (
          <PublishSection 
            isPublishing={isPublishing}
            isPublished={isPublished}
            onPublish={handlePublish}
          />
        )}
        
        {/* Completed */}
        {isPublished && (
          <CompletedBanner onContinue={handleContinue} />
        )}
        
      </div>
    </div>
  );
}

export default FunnelPage;
