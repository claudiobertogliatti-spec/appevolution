import { useState, useEffect } from "react";
import { ArrowLeft, Check, Clock, MessageCircle, Send, ChevronDown, ChevronUp, Rocket, Mail, CreditCard, PartyPopper, FileText, Play } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Funnel sections data
const FUNNEL_SECTIONS = [
  {
    id: 1,
    icon: "📝",
    title: "Opt-in Page · Cattura Lead",
    subtitle: "Modulo iscrizione + promessa masterclass gratuita",
    content: {
      headline: "Masterclass Gratuita: Come trovare i tuoi primi 10 clienti di coaching",
      sottotitolo: "Scopri il metodo in 3 passi che ha funzionato per oltre 50 coach — senza social, senza ads.",
      promessa: "Iscriviti e ricevi accesso immediato alla masterclass gratuita di 45 minuti",
      quote: "Ti sei formato come coach, hai le competenze, ma i clienti non arrivano? In questa masterclass gratuita ti mostro il sistema esatto che uso per generare contatti qualificati ogni settimana — partendo da zero.",
      campi: "Nome + Email + WhatsApp",
      cta: "🎓 Voglio la Masterclass Gratuita!",
      dopoInvio: "Redirect → Landing Page Masterclass"
    }
  },
  {
    id: 2,
    icon: "🎓",
    title: "Landing Page Masterclass",
    subtitle: "Pagina con la masterclass video gratuita",
    content: {
      titolo: "Ecco la tua Masterclass! 🎓",
      video: "Il video della tua masterclass (dalla sezione Produzione Video)",
      sottoVideo: "Riepilogo dei 3 punti chiave + CTA per l'offerta",
      struttura: [
        "Messaggio di benvenuto personalizzato con nome del lead",
        "Player video masterclass (dalla tua Produzione Video)",
        "3 takeaway chiave sotto al video",
        "Sezione \"Vuoi andare oltre?\" con CTA verso il modulo d'ordine",
        "Countdown timer: \"Offerta speciale valida 48 ore\"",
        "Testimonial / social proof"
      ],
      ctaText: "Sì, voglio accelerare i risultati →"
    }
  },
  {
    id: 3,
    icon: "💰",
    title: "Modulo d'Ordine + 6 Email Automatiche",
    subtitle: "Pagina di vendita + sequenza email post-masterclass",
    content: {
      offerta: "Programma Acceleratore · 90 giorni per i tuoi primi 10 clienti",
      prezzo: "297€",
      prezzoOriginale: "497€",
      sconto: "-40%",
      scadenza: "48 ore dall'accesso alla masterclass",
      include: [
        "8 sessioni di coaching 1:1",
        "Template pronti per landing e email",
        "Accesso community privata",
        "Workbook \"I miei primi 10 clienti\"",
        "Bonus: 2 sessioni follow-up post 90 giorni"
      ],
      pagamento: "Stripe · Carta di credito / PayPal",
      garanzia: "Soddisfatto o rimborsato entro 14 giorni",
      emails: [
        { timing: "+1 ora", subject: "🎓 Hai visto la masterclass? Ecco il prossimo passo", desc: "Recap valore + introduzione offerta esclusiva" },
        { timing: "+6 ore", subject: "📋 Cosa include il Programma Acceleratore", desc: "Dettaglio benefici + confronto prima/dopo" },
        { timing: "+24 ore", subject: "💬 \"Come ho trovato i miei primi clienti\" — La storia di Laura", desc: "Testimonial + social proof + CTA" },
        { timing: "+36 ore", subject: "❓ Le 3 domande che mi fanno tutti", desc: "FAQ + obiezioni risolte + urgenza" },
        { timing: "+44 ore", subject: "⏰ Ultime 4 ore: l'offerta sta per scadere", desc: "Scarsità + riepilogo bonus + CTA urgente" },
        { timing: "+48 ore", subject: "🚪 Ultima possibilità — poi torna a 497€", desc: "Ultimo reminder + link diretto + chiusura" }
      ]
    }
  },
  {
    id: 4,
    icon: "🎉",
    title: "Thank You Page",
    subtitle: "Conferma acquisto + prossimi passi per il cliente",
    content: {
      headline: "🎉 Benvenuto nel Programma Acceleratore!",
      messaggio: "Conferma acquisto + messaggio di benvenuto personalizzato",
      prossimiPassi: [
        { step: 1, text: "Controlla l'email con le credenziali di accesso" },
        { step: 2, text: "Entra nella community privata (link nel messaggio WhatsApp)" },
        { step: 3, text: "Prenota la tua prima sessione 1:1 dal calendario" }
      ],
      video: "Video di benvenuto tuo personale (30 sec)",
      cta: "Prenota la tua prima sessione →",
      whatsapp: "Messaggio automatico di benvenuto al cliente"
    }
  }
];

function AndreaIntro({ message }) {
  return (
    <div className="flex gap-4 p-5 rounded-2xl mb-6" style={{ background: '#FFF8DC', border: '1px solid #F2C41850' }}>
      <div className="relative">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: '#F2C418' }}>
          🧑‍💻
        </div>
        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white" style={{ background: '#34C77B' }} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-sm mb-1" style={{ color: '#1E2128' }}>Andrea · Il tuo tutor AI</div>
        <div className="text-sm leading-relaxed" style={{ color: '#5F6572' }} dangerouslySetInnerHTML={{ __html: message }} />
      </div>
    </div>
  );
}

function StatusBar({ sections, approvedIds }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-xl mb-6" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
      {sections.map((s, i) => {
        const isApproved = approvedIds.includes(s.id);
        const isCurrent = !isApproved && (i === 0 || approvedIds.includes(sections[i-1]?.id));
        
        return (
          <div key={s.id} className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ 
                background: isApproved ? '#EAFAF1' : isCurrent ? '#FFF3C4' : '#FAFAF7',
                color: isApproved ? '#34C77B' : isCurrent ? '#C4990A' : '#9CA3AF',
                border: isCurrent ? '2px solid #F2C418' : '2px solid transparent'
              }}
            >
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.title.split('·')[0].trim()}</span>
            </div>
            {i < sections.length - 1 && <span style={{ color: '#ECEDEF' }}>→</span>}
          </div>
        );
      })}
      <div className="ml-auto text-sm font-bold" style={{ color: '#1E2128' }}>
        <span style={{ color: '#34C77B' }}>{approvedIds.length}</span> di {sections.length} approvati
      </div>
    </div>
  );
}

function FunnelFlowPreview({ sections, approvedIds, currentSection }) {
  return (
    <div className="rounded-xl p-5 mb-6" style={{ background: 'white', border: '1px solid #ECEDEF' }}>
      <div className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: '#1E2128' }}>
        👁️ Il tuo Funnel · Struttura Stefania
      </div>
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {sections.map((s, i) => {
          const isApproved = approvedIds.includes(s.id);
          const isCurrent = currentSection === s.id;
          
          return (
            <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
              <div 
                className="p-4 rounded-xl text-center min-w-[120px] transition-all"
                style={{ 
                  background: isApproved ? '#EAFAF1' : isCurrent ? '#FFF3C4' : '#FAFAF7',
                  border: isCurrent ? '2px solid #F2C418' : '2px solid #ECEDEF'
                }}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-bold" style={{ color: '#1E2128' }}>{s.title.split('·')[0].trim()}</div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{s.subtitle.split('·')[0]?.trim() || ''}</div>
                <div className="text-[10px] font-bold mt-1" style={{ color: isApproved ? '#34C77B' : '#C4990A' }}>
                  {isApproved ? '✓ Approvato' : 'Da approvare'}
                </div>
              </div>
              {i < sections.length - 1 && (
                <span className="text-lg" style={{ color: isApproved ? '#34C77B' : '#ECEDEF' }}>→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({ section, isApproved, isOpen, onToggle, onApprove, onRequestChange, chatMessage, setChatMessage, onSendChat }) {
  const content = section.content;
  
  return (
    <div 
      className="rounded-xl mb-4 overflow-hidden transition-all"
      style={{ 
        background: 'white', 
        border: isApproved ? '2px solid #34C77B' : isOpen ? '2px solid #F2C418' : '2px solid #ECEDEF'
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggle}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ 
            background: isApproved ? '#34C77B' : '#F2C418',
            color: isApproved ? 'white' : '#1E2128'
          }}
        >
          {isApproved ? '✓' : section.id}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>{section.title}</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>{section.subtitle}</div>
        </div>
        <button className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#FFF8DC', color: '#C4990A' }}>
          🎬 Come funziona?
        </button>
        <span 
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ 
            background: isApproved ? '#EAFAF1' : '#FFF3C4',
            color: isApproved ? '#34C77B' : '#C4990A'
          }}
        >
          {isApproved ? '✓ Approvato' : 'Da approvare'}
        </span>
        {isOpen ? <ChevronUp className="w-5 h-5" style={{ color: '#9CA3AF' }} /> : <ChevronDown className="w-5 h-5" style={{ color: '#9CA3AF' }} />}
      </div>
      
      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4">
          <div className="p-4 rounded-xl" style={{ background: '#FAFAF7' }}>
            <div className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#5F6572' }}>
              🧑‍💻 Ecco cosa ha preparato Andrea
            </div>
            
            {/* Section 1: Opt-in */}
            {section.id === 1 && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Headline</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.headline}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Sottotitolo</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.sottotitolo}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Promessa</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.promessa}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl mb-4 italic text-sm" style={{ background: '#E8F4FD', color: '#3B82F6', borderLeft: '4px solid #3B82F6' }}>
                  "{content.quote}"
                </div>
                
                {/* Form Preview */}
                <div className="p-4 rounded-xl mb-4" style={{ background: 'white', border: '2px dashed #ECEDEF' }}>
                  <div className="text-xs font-bold mb-3" style={{ color: '#9CA3AF' }}>Anteprima modulo cattura lead</div>
                  <div className="space-y-2">
                    <input className="w-full p-3 rounded-lg text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} placeholder="Il tuo nome" disabled />
                    <input className="w-full p-3 rounded-lg text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} placeholder="La tua email" disabled />
                    <input className="w-full p-3 rounded-lg text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} placeholder="Il tuo numero WhatsApp" disabled />
                    <button className="w-full p-3 rounded-lg text-sm font-bold" style={{ background: '#F2C418', color: '#1E2128' }} disabled>
                      {content.cta}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Campi form</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.campi}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>CTA button</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.cta}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Dopo invio</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.dopoInvio}</span>
                  </div>
                </div>
              </>
            )}
            
            {/* Section 2: Masterclass Landing */}
            {section.id === 2 && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Titolo</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.titolo}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Video</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.video}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg mb-4" style={{ background: 'white' }}>
                  <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Struttura</span>
                  <ul className="mt-2 space-y-1">
                    {content.struttura.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                        <span style={{ color: '#34C77B' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-4 rounded-xl italic text-sm" style={{ background: '#E8F4FD', color: '#3B82F6', borderLeft: '4px solid #3B82F6' }}>
                  La CTA principale sarà: <strong>"{content.ctaText}"</strong> con link diretto al modulo d'ordine. Il timer crea urgenza senza essere aggressivo.
                </div>
              </>
            )}
            
            {/* Section 3: Order + Emails */}
            {section.id === 3 && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Offerta</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.offerta}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg items-center" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Prezzo</span>
                    <span className="text-lg font-black" style={{ color: '#1E2128' }}>{content.prezzo}</span>
                    <span className="text-sm line-through" style={{ color: '#9CA3AF' }}>{content.prezzoOriginale}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#EAFAF1', color: '#34C77B' }}>{content.sconto}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Include</span>
                    <ul className="space-y-1">
                      {content.include.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                          <span style={{ color: '#34C77B' }}>✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Garanzia</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.garanzia}</span>
                  </div>
                </div>
                
                <div className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: '#5F6572' }}>
                  📧 Sequenza 6 email automatiche
                </div>
                <div className="space-y-2">
                  {content.emails.map((email, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'white' }}>
                      <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: '#FFF8DC', color: '#C4990A' }}>{email.timing}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold" style={{ color: '#1E2128' }}>{email.subject}</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>{email.desc}</div>
                      </div>
                      <span className="text-xs font-bold" style={{ color: '#34C77B' }}>✓ Pronta</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Section 4: Thank You */}
            {section.id === 4 && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Headline</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.headline}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Messaggio</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.messaggio}</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg mb-4" style={{ background: 'white' }}>
                  <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>Prossimi passi</span>
                  <ul className="mt-2 space-y-2">
                    {content.prossimiPassi.map((item) => (
                      <li key={item.step} className="text-sm flex items-start gap-2" style={{ color: '#5F6572' }}>
                        <span className="font-bold" style={{ color: '#F2C418' }}>Passo {item.step}:</span> {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>Video</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.video}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>CTA</span>
                    <span className="text-sm font-bold" style={{ color: '#1E2128' }}>{content.cta}</span>
                  </div>
                  <div className="flex gap-2 p-3 rounded-lg" style={{ background: 'white' }}>
                    <span className="text-xs font-bold min-w-[80px]" style={{ color: '#9CA3AF' }}>WhatsApp</span>
                    <span className="text-sm" style={{ color: '#5F6572' }}>{content.whatsapp}</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Actions */}
          {!isApproved && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-3">
                <button 
                  onClick={onApprove}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{ background: '#34C77B', color: 'white' }}
                >
                  <Check className="w-4 h-4" /> Approva
                </button>
                <button 
                  onClick={onRequestChange}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{ background: '#FFF8DC', color: '#C4990A', border: '1px solid #F2C41850' }}
                >
                  <MessageCircle className="w-4 h-4" /> Chiedi modifica ad Andrea
                </button>
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-2">
                <textarea 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="flex-1 p-3 rounded-xl text-sm resize-none"
                  style={{ background: 'white', border: '1px solid #ECEDEF', color: '#1E2128' }}
                  placeholder="Es: 'Togli il campo WhatsApp' oppure 'Cambia il titolo con...'"
                  rows={2}
                />
                <button 
                  onClick={onSendChat}
                  className="px-4 rounded-xl font-bold text-sm"
                  style={{ background: '#1E2128', color: '#F2C418' }}
                >
                  Invia →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FunnelReviewBuilder({ partner, onBack }) {
  const [approvedIds, setApprovedIds] = useState([]);
  const [openSection, setOpenSection] = useState(1);
  const [chatMessages, setChatMessages] = useState({});
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  
  const partnerName = partner?.name?.split(" ")[0] || "Partner";
  const allApproved = approvedIds.length === FUNNEL_SECTIONS.length;
  
  const handleApprove = (sectionId) => {
    if (!approvedIds.includes(sectionId)) {
      setApprovedIds([...approvedIds, sectionId]);
      // Auto-open next section
      const nextSection = FUNNEL_SECTIONS.find(s => s.id === sectionId + 1);
      if (nextSection && !approvedIds.includes(nextSection.id)) {
        setOpenSection(nextSection.id);
      }
    }
  };
  
  const handleLaunch = () => {
    setShowLaunchModal(true);
  };

  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition-all" style={{ color: '#5F6572' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold flex items-center gap-2" style={{ color: '#1E2128' }}>
              🚀 Il tuo Funnel
            </h1>
          </div>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>💾 Aggiornato 5 min fa</span>
        </div>
        
        {/* Andrea Intro */}
        <AndreaIntro message={`Ciao ${partnerName}! 👋 Ho costruito il tuo <strong>funnel completo</strong> partendo dal posizionamento e dalla masterclass che hai già creato. La struttura segue il metodo di Stefania: <strong>Opt-in → Masterclass → Modulo d'Ordine → Thank You</strong>. Controlla ogni sezione e approvala, oppure chiedimi cosa cambiare!`} />
        
        {/* Status Bar */}
        <StatusBar sections={FUNNEL_SECTIONS} approvedIds={approvedIds} />
        
        {/* Funnel Flow Preview */}
        <FunnelFlowPreview sections={FUNNEL_SECTIONS} approvedIds={approvedIds} currentSection={openSection} />
        
        {/* Sections */}
        {FUNNEL_SECTIONS.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            isApproved={approvedIds.includes(section.id)}
            isOpen={openSection === section.id}
            onToggle={() => setOpenSection(openSection === section.id ? null : section.id)}
            onApprove={() => handleApprove(section.id)}
            onRequestChange={() => {}}
            chatMessage={chatMessages[section.id] || ""}
            setChatMessage={(msg) => setChatMessages({ ...chatMessages, [section.id]: msg })}
            onSendChat={() => {}}
          />
        ))}
        
        {/* Launch Bar */}
        <div 
          className={`flex items-center gap-4 p-5 rounded-2xl mt-6 transition-all ${allApproved ? 'cursor-pointer hover:scale-[1.01]' : 'opacity-60'}`}
          style={{ 
            background: allApproved ? 'linear-gradient(135deg, #F2C418, #FADA5E)' : '#ECEDEF',
            boxShadow: allApproved ? '0 8px 30px rgba(242, 196, 24, 0.3)' : 'none'
          }}
          onClick={allApproved ? handleLaunch : undefined}
        >
          <span className="text-3xl">🚀</span>
          <div className="flex-1">
            <div className="font-bold" style={{ color: '#1E2128' }}>Lancia il tuo Funnel</div>
            <div className="text-sm" style={{ color: allApproved ? '#1E2128' : '#9CA3AF' }}>
              {allApproved ? 'Tutto pronto! Clicca per lanciare' : 'Approva tutte le sezioni per lanciare'}
            </div>
          </div>
          <button 
            disabled={!allApproved}
            className="px-6 py-3 rounded-xl font-bold text-sm transition-all"
            style={{ 
              background: allApproved ? '#1E2128' : '#9CA3AF',
              color: allApproved ? '#F2C418' : 'white'
            }}
          >
            Lancia! 🚀
          </button>
        </div>
      </div>
      
      {/* Launch Modal */}
      {showLaunchModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-8 text-center max-w-md w-full" style={{ background: 'white' }}>
            <span className="text-6xl block mb-4">🎉</span>
            <h2 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>Funnel Lanciato!</h2>
            <p className="mb-6" style={{ color: '#5F6572' }}>
              Il tuo funnel è ora attivo e pronto a raccogliere lead. Riceverai una notifica per ogni nuova iscrizione!
            </p>
            <button 
              onClick={() => { setShowLaunchModal(false); onBack?.(); }}
              className="px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
              style={{ background: '#F2C418', color: '#1E2128' }}
            >
              Fantastico! →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FunnelReviewBuilder;
