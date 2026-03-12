import React, { useState } from 'react';
import { CheckCircle, ArrowRight, FileText, LogOut, CreditCard, Clock, Calendar, PlayCircle, ChevronDown, ChevronRight, BookOpen, Sparkles } from 'lucide-react';

const MINI_CORSO_MODULI = [
  {
    id: 1,
    titolo: "Cos'è un'Accademia Digitale",
    descrizione: "Scopri cosa significa creare un business basato sulla formazione online e perché è diverso da un semplice corso.",
    durata: "8 min"
  },
  {
    id: 2,
    titolo: "Il Posizionamento Strategico",
    descrizione: "Come trovare la tua unicità nel mercato e differenziarti dai competitor in modo autentico.",
    durata: "12 min"
  },
  {
    id: 3,
    titolo: "Il Cliente Ideale",
    descrizione: "Come identificare con precisione le persone che hanno bisogno del tuo aiuto e sono pronte a investire.",
    durata: "10 min"
  },
  {
    id: 4,
    titolo: "La Struttura del Percorso",
    descrizione: "Come organizzare le tue conoscenze in un percorso trasformativo che porta risultati concreti.",
    durata: "15 min"
  },
  {
    id: 5,
    titolo: "Il Modello di Business",
    descrizione: "Le diverse opzioni per monetizzare la tua competenza: corsi, membership, coaching, consulenze.",
    durata: "11 min"
  },
  {
    id: 6,
    titolo: "Gli Strumenti Tecnici",
    descrizione: "Panoramica delle piattaforme e degli strumenti necessari per lanciare la tua accademia.",
    durata: "9 min"
  },
  {
    id: 7,
    titolo: "I Primi Passi Concreti",
    descrizione: "Un piano d'azione chiaro per iniziare a costruire la tua accademia digitale partendo da zero.",
    durata: "14 min"
  }
];

export function DashboardCliente({ user, onNavigate, onLogout }) {
  const [expandedModule, setExpandedModule] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  // Determina lo stato dell'utente
  const questionarioCompilato = user?.questionario_compilato || false;
  const pagamentoAnalisi = user?.pagamento_analisi || false;
  const analisiGenerata = user?.analisi_generata || false;

  // Determina lo step corrente per la progress bar
  const steps = [
    { id: 1, label: 'Registrazione', completed: true },
    { id: 2, label: 'Questionario', completed: questionarioCompilato },
    { id: 3, label: 'Analisi Strategica', completed: pagamentoAnalisi },
    { id: 4, label: 'Call con Claudio', completed: analisiGenerata }
  ];

  const currentStep = steps.findIndex(s => !s.completed) + 1 || steps.length;

  // Header comune
  const Header = () => (
    <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
            <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
          </div>
          <div>
            <span className="font-black text-lg" style={{ color: '#1E2128' }}>
              EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
            </span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
          style={{ color: '#5F6572' }}
        >
          <LogOut className="w-4 h-4" />
          Esci
        </button>
      </div>
    </header>
  );

  // Progress Bar comune
  const ProgressBar = () => (
    <div className="rounded-2xl p-8 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
      <h2 className="text-sm font-bold uppercase tracking-wider mb-6" style={{ color: '#9CA3AF' }}>
        Il tuo percorso
      </h2>
      
      <div className="relative">
        <div className="absolute top-5 left-0 right-0 h-0.5" style={{ background: '#ECEDEF' }} />
        <div 
          className="absolute top-5 left-0 h-0.5 transition-all duration-500" 
          style={{ 
            background: '#F5C518', 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
          }} 
        />
        
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.completed 
                    ? 'border-transparent' 
                    : index === currentStep - 1 
                      ? 'border-[#F5C518]' 
                      : 'border-[#ECEDEF]'
                }`}
                style={{ 
                  background: step.completed ? '#F5C518' : '#FFFFFF',
                }}
              >
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#1E2128' }} />
                ) : (
                  <span 
                    className="text-sm font-bold" 
                    style={{ color: index === currentStep - 1 ? '#F5C518' : '#9CA3AF' }}
                  >
                    {step.id}
                  </span>
                )}
              </div>
              <span 
                className="mt-3 text-sm font-medium text-center max-w-[100px]" 
                style={{ color: step.completed ? '#1E2128' : '#9CA3AF' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 1: questionario_compilato = false
  // ═══════════════════════════════════════════════════════════════════════════
  if (!questionarioCompilato) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              Benvenuto in Evolution PRO
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
              Il primo passo è raccontarci il tuo progetto.<br />
              Compila il questionario strategico per permetterci di valutare se la tua competenza può diventare una Accademia Digitale sostenibile.
            </p>
          </div>

          <ProgressBar />

          {/* CTA Card */}
          <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
            <div className="flex items-start gap-6">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ background: '#FFF8DC' }}
              >
                <FileText className="w-7 h-7" style={{ color: '#C4990A' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Prossimo passo: Questionario Strategico
                </h3>
                <p className="mb-6" style={{ color: '#5F6572' }}>
                  Rispondi a 7 domande per aiutarci a capire la tua competenza, il tuo pubblico ideale e i tuoi obiettivi.
                </p>
                <button
                  onClick={() => onNavigate('questionario')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all hover:opacity-90"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="start-questionario-btn"
                >
                  Compila il Questionario Strategico
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
              <div>
                <p className="font-medium" style={{ color: '#166534' }}>
                  Tempo richiesto: circa 5 minuti
                </p>
                <p className="text-sm mt-1" style={{ color: '#15803D' }}>
                  Prenditi il tempo necessario per rispondere con attenzione. Le tue risposte ci aiuteranno a valutare il potenziale del tuo progetto.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 2: questionario_compilato = true, pagamento_analisi = false
  // ═══════════════════════════════════════════════════════════════════════════
  if (questionarioCompilato && !pagamentoAnalisi) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <CheckCircle className="w-4 h-4" />
              Questionario completato!
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              Il tuo progetto è stato ricevuto
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
              Abbiamo ricevuto le tue risposte.<br />
              Il prossimo passo è sbloccare la tua Analisi Strategica Personalizzata.
            </p>
          </div>

          <ProgressBar />

          {/* CTA Card */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
            <div className="p-8">
              <div className="flex items-start gap-6">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" 
                  style={{ background: '#FFF8DC' }}
                >
                  <CreditCard className="w-7 h-7" style={{ color: '#C4990A' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-4" style={{ color: '#1E2128' }}>
                    Il nostro team analizzerà:
                  </h3>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2" style={{ color: '#5F6572' }}>
                      <CheckCircle className="w-4 h-4" style={{ color: '#F5C518' }} />
                      Posizionamento
                    </li>
                    <li className="flex items-center gap-2" style={{ color: '#5F6572' }}>
                      <CheckCircle className="w-4 h-4" style={{ color: '#F5C518' }} />
                      Mercato
                    </li>
                    <li className="flex items-center gap-2" style={{ color: '#5F6572' }}>
                      <CheckCircle className="w-4 h-4" style={{ color: '#F5C518' }} />
                      Fattibilità dell'accademia digitale
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Price & CTA */}
            <div className="p-6" style={{ background: '#1E2128' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm" style={{ color: '#9CA3AF' }}>Investimento</span>
                  <div>
                    <span className="text-3xl font-black" style={{ color: '#F5C518' }}>€67</span>
                    <span className="text-sm ml-2" style={{ color: '#9CA3AF' }}>una tantum</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('sblocca-analisi')}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="sblocca-analisi-btn"
                >
                  Sblocca la tua Analisi Strategica
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 3: pagamento_analisi = true, analisi_generata = false
  // ═══════════════════════════════════════════════════════════════════════════
  if (pagamentoAnalisi && !analisiGenerata) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <CheckCircle className="w-4 h-4" />
              Pagamento completato!
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              La tua Analisi Strategica è in preparazione
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
              Il nostro team sta analizzando il tuo progetto.<br />
              Riceverai un contatto entro <strong>48 ore</strong> per la videocall strategica.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Video */}
            <div>
              <div className="rounded-2xl overflow-hidden" style={{ background: '#1E2128' }}>
                <div className="p-4" style={{ borderBottom: '1px solid #333' }}>
                  <h2 className="font-bold" style={{ color: '#FFFFFF' }}>
                    Video di Benvenuto
                  </h2>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Claudio ti spiega cosa aspettarti
                  </p>
                </div>
                
                <div className="relative" style={{ aspectRatio: '16/9' }}>
                  {!videoPlaying ? (
                    <div 
                      className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                      onClick={() => setVideoPlaying(true)}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="relative z-10 text-center">
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
                          style={{ background: '#F5C518' }}
                        >
                          <PlayCircle className="w-8 h-8" style={{ color: '#1E2128' }} />
                        </div>
                        <span className="text-white font-medium">Guarda il video</span>
                      </div>
                    </div>
                  ) : (
                    <video 
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      playsInline
                    >
                      <source src="/api/static/uploads/Quick_Avatar_Video.mp4" type="video/mp4" />
                    </video>
                  )}
                </div>
              </div>

              {/* What happens next */}
              <div className="mt-6 p-6 rounded-xl" style={{ background: '#FFF8DC', border: '1px solid #F5C51830' }}>
                <h3 className="font-bold mb-3" style={{ color: '#92700C' }}>
                  Cosa succede ora?
                </h3>
                <ol className="space-y-2 text-sm" style={{ color: '#78590A' }}>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Il nostro team analizza le tue risposte al questionario</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Prepariamo un documento di analisi personalizzato</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Ti contattiamo entro 48h per fissare la videocall</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">4.</span>
                    <span>Nella call discutiamo insieme i risultati dell'analisi</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Right: Mini Corso */}
            <div>
              <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <div className="p-6" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: '#F5C518' }}
                    >
                      <BookOpen className="w-6 h-6" style={{ color: '#1E2128' }} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg" style={{ color: '#1E2128' }}>
                        Mini Corso Gratuito
                      </h2>
                      <p className="text-sm" style={{ color: '#5F6572' }}>
                        7 moduli per iniziare a prepararti
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y" style={{ borderColor: '#ECEDEF' }}>
                  {MINI_CORSO_MODULI.map((modulo) => (
                    <div key={modulo.id}>
                      <button
                        onClick={() => setExpandedModule(expandedModule === modulo.id ? null : modulo.id)}
                        className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ background: '#FFF8DC', color: '#C4990A' }}
                        >
                          {modulo.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" style={{ color: '#1E2128' }}>
                            {modulo.titolo}
                          </h3>
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            {modulo.durata}
                          </span>
                        </div>
                        {expandedModule === modulo.id ? (
                          <ChevronDown className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                        ) : (
                          <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                        )}
                      </button>
                      
                      {expandedModule === modulo.id && (
                        <div className="px-4 pb-4 pl-16">
                          <p className="text-sm" style={{ color: '#5F6572' }}>
                            {modulo.descrizione}
                          </p>
                          <button 
                            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                            style={{ background: '#F5C518', color: '#1E2128' }}
                          >
                            <PlayCircle className="w-4 h-4" />
                            Guarda il modulo
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="mt-12 text-center p-6 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <p style={{ color: '#5F6572' }}>
              Hai domande? Scrivi a{' '}
              <a href="mailto:supporto@evolution-pro.it" className="font-medium" style={{ color: '#F5C518' }}>
                supporto@evolution-pro.it
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 4: analisi_generata = true
  // ═══════════════════════════════════════════════════════════════════════════
  if (analisiGenerata) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <Sparkles className="w-4 h-4" />
              Analisi completata!
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              La tua Analisi Strategica è pronta
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5F6572' }}>
              Abbiamo completato l'analisi del tuo progetto.
            </p>
          </div>

          <ProgressBar />

          {/* CTA Card */}
          <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
            <div className="flex items-start gap-6">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ background: '#F0FDF4' }}
              >
                <Calendar className="w-7 h-7" style={{ color: '#22C55E' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Prenota la tua call strategica
                </h3>
                <p className="mb-6" style={{ color: '#5F6572' }}>
                  Durante la videocall analizzeremo insieme i risultati e definiremo i prossimi passi per la tua Accademia Digitale.
                </p>
                <button
                  onClick={() => {
                    // Link al calendario Calendly o simile
                    window.open('https://calendly.com/evolution-pro/call-strategica', '_blank');
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all hover:opacity-90"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="prenota-call-btn"
                >
                  Prenota la tua call strategica
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Download Analisi */}
          {user?.analisi_url && (
            <div className="mt-8 p-6 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: '#F5C518' }} />
                  <span className="font-medium" style={{ color: '#1E2128' }}>Scarica la tua Analisi Strategica</span>
                </div>
                <a
                  href={user.analisi_url}
                  download
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback (non dovrebbe mai accadere)
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF7' }}>
      <div className="text-center">
        <p style={{ color: '#5F6572' }}>Caricamento...</p>
      </div>
    </div>
  );
}

export default DashboardCliente;
