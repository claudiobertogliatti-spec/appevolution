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

  // Routing condizionale per la CTA questionario.
  // Non tutti gli utenti devono vedere l'intro:
  //   - questionario già compilato → vai direttamente all'attivazione
  //   - intro già vista (localStorage) → vai direttamente al questionario
  //   - primo accesso → mostra prima l'intro
  const handleQuestionarioCta = () => {
    if (questionarioCompilato) {
      window.location.href = "/analisi-attivazione";
      return;
    }
    const introSeen = localStorage.getItem("intro_questionario_seen") === "true";
    if (introSeen) {
      window.location.href = "/questionario";
    } else {
      window.location.href = "/intro-questionario";
    }
  };
  // NOTA: Quando analisi_generata=true, il cliente vede "Analisi pronta" 
  // ma NON vede il contenuto dell'analisi (sarà presentata durante la call)

  // Determina lo step corrente per la progress bar
  const steps = [
    { id: 1, label: 'Registrazione', completed: true },
    { id: 2, label: 'Questionario', completed: questionarioCompilato },
    { id: 3, label: 'Pagamento', completed: pagamentoAnalisi },
    { id: 4, label: 'Call con Claudio', completed: false }
  ];

  const currentStep = steps.findIndex(s => !s.completed) + 1 || steps.length;

  // Header comune
  const Header = () => (
    <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FFD24D' }}>
            <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
          </div>
          <div>
            <span className="font-black text-lg" style={{ color: '#1E2128' }}>
              EVOLUTION <span style={{ color: '#FFD24D' }}>PRO</span>
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
            background: '#FFD24D', 
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
                      ? 'border-[#FFD24D]' 
                      : 'border-[#ECEDEF]'
                }`}
                style={{ 
                  background: step.completed ? '#FFD24D' : '#FFFFFF',
                }}
              >
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" style={{ color: '#1E2128' }} />
                ) : (
                  <span 
                    className="text-sm font-bold" 
                    style={{ color: index === currentStep - 1 ? '#FFD24D' : '#9CA3AF' }}
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
  // STATO 1: questionario_compilato = false - INTRODUZIONE AL QUESTIONARIO
  // ═══════════════════════════════════════════════════════════════════════════
  if (!questionarioCompilato) {
    const processSteps = [
      { id: 1, label: 'Questionario', active: true },
      { id: 2, label: 'Analisi Strategica', active: false },
      { id: 3, label: 'Call con Claudio', active: false }
    ];

    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12">
          
          {/* SEZIONE 1 — PROGRESSO PROCESSO */}
          <div className="mb-12">
            <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
              Il processo per valutare il tuo progetto
            </p>
            
            <div className="flex items-center justify-center gap-4">
              {processSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        step.active ? '' : 'opacity-40'
                      }`}
                      style={{ 
                        background: step.active ? '#FFD24D' : '#ECEDEF',
                        color: step.active ? '#1E2128' : '#9CA3AF'
                      }}
                    >
                      {step.id}
                    </div>
                    <span 
                      className={`mt-2 text-sm font-medium ${step.active ? '' : 'opacity-40'}`}
                      style={{ color: step.active ? '#1E2128' : '#9CA3AF' }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div 
                      className="w-16 h-0.5 mt-[-20px]" 
                      style={{ background: '#ECEDEF' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SEZIONE 2 — MESSAGGIO DI BENVENUTO */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black mb-6" style={{ color: '#1E2128' }}>
              Benvenuto in Evolution PRO
            </h1>
            <div className="text-lg leading-relaxed" style={{ color: '#5F6572' }}>
              <p className="mb-4">
                Hai attivato la fase di <strong style={{ color: '#1E2128' }}>Analisi Strategica</strong>.
              </p>
              <p className="mb-4">
                Il primo passo è raccontarci il tuo progetto.
              </p>
              <p>
                Ti faremo alcune domande semplici che ci aiuteranno a capire se la tua competenza può diventare una <strong style={{ color: '#1E2128' }}>Accademia Digitale sostenibile</strong>.
              </p>
            </div>
          </div>

          {/* SEZIONE 3 — SPIEGAZIONE QUESTIONARIO */}
          <div 
            className="rounded-2xl p-6 mb-10 text-center"
            style={{ background: '#FFF8DC', border: '1px solid #FFD24D40' }}
          >
            <p className="font-bold mb-2" style={{ color: '#92700C' }}>
              Tempo richiesto: circa 5 minuti
            </p>
            <p style={{ color: '#78590A' }}>
              Non esistono risposte giuste o sbagliate.<br />
              Più sarai concreto nelle risposte, più l'analisi sarà precisa e utile.
            </p>
          </div>

          {/* SEZIONE 4 — PERCHÉ FACCIAMO QUESTE DOMANDE */}
          <div className="mb-10">
            <h2 className="text-lg font-bold mb-4 text-center" style={{ color: '#1E2128' }}>
              Perché ti chiediamo queste informazioni?
            </h2>
            <div className="flex flex-col items-center gap-3">
              {[
                'capire il tuo posizionamento',
                'analizzare il potenziale del mercato',
                'valutare la fattibilità del progetto',
                'preparare la tua Analisi Strategica'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5" style={{ color: '#FFD24D' }} />
                  <span style={{ color: '#5F6572' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SEZIONE 5 — CTA */}
          <div className="text-center">
            <button
              onClick={handleQuestionarioCta}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:bg-[#D0D0D0] hover:scale-105"
              style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              data-testid="start-questionario-btn"
            >
              Inizia il Questionario
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 2: questionario_compilato = true, pagamento_analisi = false
  // PAGINA ATTIVAZIONE ANALISI STRATEGICA
  // ═══════════════════════════════════════════════════════════════════════════
  if (questionarioCompilato && !pagamentoAnalisi) {
    const processSteps = [
      { id: 1, label: 'Questionario', status: 'completed' },
      { id: 2, label: 'Analisi Strategica', status: 'active' },
      { id: 3, label: 'Call con Claudio', status: 'pending' }
    ];

    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12">
          
          {/* SEZIONE 1 — PROGRESSO PROCESSO */}
          <div className="mb-12">
            <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
              Il percorso della tua Accademia Digitale
            </p>
            
            <div className="flex items-center justify-center gap-4">
              {processSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                        step.status === 'pending' ? 'opacity-40' : ''
                      }`}
                      style={{ 
                        background: step.status === 'completed' ? '#22C55E' : step.status === 'active' ? '#FFD24D' : '#ECEDEF',
                        color: step.status === 'pending' ? '#9CA3AF' : '#1E2128'
                      }}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span 
                      className={`mt-2 text-sm font-medium ${step.status === 'pending' ? 'opacity-40' : ''}`}
                      style={{ color: step.status === 'pending' ? '#9CA3AF' : '#1E2128' }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div 
                      className="w-16 h-0.5 mt-[-20px]" 
                      style={{ background: step.status === 'completed' ? '#22C55E' : '#ECEDEF' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* SEZIONE 2 — CONFERMA QUESTIONARIO */}
          <div className="text-center mb-10">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <CheckCircle className="w-4 h-4" />
              Questionario completato
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              Questionario completato
            </h1>
            <div className="text-lg" style={{ color: '#5F6572' }}>
              <p className="mb-2">Abbiamo ricevuto tutte le informazioni sul tuo progetto.</p>
              <p>Ora possiamo preparare la tua <strong style={{ color: '#1E2128' }}>Analisi Strategica personalizzata</strong>.</p>
            </div>
          </div>

          {/* SEZIONE 3 — COSA RICEVERAI */}
          <div className="rounded-2xl p-6 mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#1E2128' }}>
              Cosa include la tua Analisi Strategica
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                'Analisi del tuo posizionamento professionale',
                'Valutazione reale del mercato',
                'Diagnosi della fattibilità del progetto',
                'Struttura consigliata per la tua Accademia Digitale',
                'Strategie di monetizzazione possibili',
                'Preparazione della call strategica'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FFD24D' }} />
                  <span className="text-sm" style={{ color: '#5F6572' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SEZIONE 4 — MESSAGGIO IMPORTANTE */}
          <div 
            className="rounded-2xl p-6 mb-8"
            style={{ background: '#FFF8DC', border: '1px solid #FFD24D40' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#78590A' }}>
              L'Analisi Strategica è il passaggio che ci permette di capire se il tuo progetto è realmente adatto alla partnership Evolution PRO.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#78590A' }}>
              Se il progetto risulta idoneo potremo valutare insieme la costruzione della tua Accademia Digitale.
            </p>
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#78590A' }}>
              Se invece non è ancora pronto riceverai indicazioni precise su come prepararlo.
            </p>
          </div>

          {/* SEZIONE 5 — INVESTIMENTO */}
          <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#1E2128' }}>
            <div className="p-6 text-center">
              <h2 className="text-lg font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Attiva la tua Analisi Strategica
              </h2>
              <div className="mb-3">
                <span className="text-sm" style={{ color: '#9CA3AF' }}>Una tantum</span>
                <div className="text-4xl font-black" style={{ color: '#FFD24D' }}>€67</div>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                L'analisi verrà preparata dal team Evolution PRO e discussa insieme durante la call strategica.
              </p>
            </div>
          </div>

          {/* SEZIONE 6 — CTA PRINCIPALE */}
          <div className="text-center">
            <button
              onClick={() => onNavigate('analisi-attivazione')}
              className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-all hover:bg-[#D0D0D0] hover:scale-105"
              style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
              data-testid="attiva-analisi-btn"
            >
              Attiva la tua Analisi Strategica
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 3A: pagamento_analisi = true, analisi_generata = true
  // LA TUA ANALISI STRATEGICA È PRONTA
  // ═══════════════════════════════════════════════════════════════════════════
  if (pagamentoAnalisi && analisiGenerata) {
    const processSteps = [
      { id: 1, label: 'Questionario', status: 'completed' },
      { id: 2, label: 'Analisi Strategica', status: 'completed' },
      { id: 3, label: 'Call con Claudio', status: 'active' }
    ];

    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12">
          
          {/* Progress bar */}
          <div className="mb-12">
            <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
              Il percorso della tua Accademia Digitale
            </p>
            
            <div className="flex items-center justify-center gap-4">
              {processSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ 
                        background: step.status === 'completed' ? '#22C55E' : '#FFD24D',
                        color: '#1E2128'
                      }}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="mt-2 text-sm font-medium" style={{ color: '#1E2128' }}>
                      {step.label}
                    </span>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div 
                      className="w-16 h-0.5 mt-[-20px]" 
                      style={{ background: '#22C55E' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Titolo - ANALISI PRONTA */}
          <div className="text-center mb-10">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <Sparkles className="w-4 h-4" />
              Analisi completata
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }} data-testid="analisi-pronta-title">
              La tua Analisi Strategica è pronta
            </h1>
            <p className="text-lg" style={{ color: '#5F6572' }}>
              Abbiamo completato lo studio del tuo progetto.
            </p>
            <p className="text-lg mt-2" style={{ color: '#5F6572' }}>
              Ora possiamo analizzarlo insieme durante la <strong style={{ color: '#1E2128' }}>call strategica</strong>.
            </p>
          </div>

          {/* CTA Prenota Call - PROMINENTE */}
          <div className="rounded-2xl p-8 mb-8" style={{ background: '#1E2128' }}>
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#FFD24D' }}
              >
                <Calendar className="w-8 h-8" style={{ color: '#1E2128' }} />
              </div>
              <h3 className="text-2xl font-black mb-3" style={{ color: '#FFFFFF' }}>
                Prenota la call strategica
              </h3>
              <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#9CA3AF' }}>
                Durante la videocall presenteremo la tua Analisi Strategica personalizzata e valuteremo insieme se il tuo progetto è adatto per la partnership Evolution PRO.
              </p>
              <button
                onClick={() => {
                  window.open('https://calendar.app.google/ip1MfDcfcrju1WFh6', '_blank');
                }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg transition-all hover:bg-[#D0D0D0] hover:scale-105"
                style={{ background: '#E8E8E8', color: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
                data-testid="prenota-call-btn"
              >
                Prenota la tua call strategica
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-xl p-6" style={{ background: '#FFF8DC', border: '1px solid #FFD24D40' }}>
            <div className="flex items-start gap-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#FFD24D30' }}
              >
                <FileText className="w-5 h-5" style={{ color: '#92700C' }} />
              </div>
              <div>
                <h4 className="font-bold mb-1" style={{ color: '#78590A' }}>
                  Cosa succede durante la call?
                </h4>
                <ul className="text-sm space-y-1" style={{ color: '#92700C' }}>
                  <li>• Presenteremo la tua Analisi Strategica personalizzata</li>
                  <li>• Analizzeremo insieme i punti di forza e le aree di miglioramento</li>
                  <li>• Valuteremo se il tuo progetto è adatto per la partnership</li>
                  <li>• Risponderemo a tutte le tue domande</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Hai domande? Scrivi a{' '}
              <a href="mailto:supporto@evolution-pro.it" className="font-medium" style={{ color: '#FFD24D' }}>
                supporto@evolution-pro.it
              </a>
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATO 3B: pagamento_analisi = true, analisi_generata = false
  // PAGINA ANALISI IN PREPARAZIONE
  // ═══════════════════════════════════════════════════════════════════════════
  if (pagamentoAnalisi && !analisiGenerata) {
    const processSteps = [
      { id: 1, label: 'Questionario', status: 'completed' },
      { id: 2, label: 'Analisi Strategica', status: 'completed' },
      { id: 3, label: 'Call con Claudio', status: 'active' }
    ];

    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <Header />
        <div className="max-w-3xl mx-auto px-6 py-12">
          
          {/* Progress bar */}
          <div className="mb-12">
            <p className="text-sm font-medium text-center mb-6" style={{ color: '#9CA3AF' }}>
              Il percorso della tua Accademia Digitale
            </p>
            
            <div className="flex items-center justify-center gap-4">
              {processSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ 
                        background: step.status === 'completed' ? '#22C55E' : '#FFD24D',
                        color: '#1E2128'
                      }}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <span className="mt-2 text-sm font-medium" style={{ color: '#1E2128' }}>
                      {step.label}
                    </span>
                  </div>
                  {index < processSteps.length - 1 && (
                    <div 
                      className="w-16 h-0.5 mt-[-20px]" 
                      style={{ background: '#22C55E' }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Titolo */}
          <div className="text-center mb-10">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
              style={{ background: '#F0FDF4', color: '#166534' }}
            >
              <CheckCircle className="w-4 h-4" />
              Pagamento completato
            </div>
            <h1 className="text-3xl font-black mb-4" style={{ color: '#1E2128' }}>
              La tua Analisi Strategica è in preparazione
            </h1>
            <p className="text-lg" style={{ color: '#5F6572' }}>
              Il team Evolution PRO sta analizzando le informazioni che hai fornito.
            </p>
            <p className="text-lg mt-2" style={{ color: '#5F6572' }}>
              A breve riceverai la tua Analisi Strategica e il link per prenotare la call con Claudio.
            </p>
          </div>

          {/* Video */}
          <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#1E2128' }}>
            <div className="p-4" style={{ borderBottom: '1px solid #333' }}>
              <h2 className="font-bold" style={{ color: '#FFFFFF' }}>
                Video di Benvenuto
              </h2>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Un messaggio da Claudio
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
                      style={{ background: '#FFD24D' }}
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

          {/* Messaggio finale */}
          <div 
            className="rounded-2xl p-6 text-center"
            style={{ background: '#FFF8DC', border: '1px solid #FFD24D40' }}
          >
            <Clock className="w-8 h-8 mx-auto mb-3" style={{ color: '#C4990A' }} />
            <p className="font-bold" style={{ color: '#92700C' }}>
              Ti contatteremo entro 48 ore.
            </p>
            <p className="text-sm mt-2" style={{ color: '#78590A' }}>
              Controlla la tua email per aggiornamenti sul tuo progetto.
            </p>
          </div>

          {/* Contact */}
          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              Hai domande? Scrivi a{' '}
              <a href="mailto:supporto@evolution-pro.it" className="font-medium" style={{ color: '#FFD24D' }}>
                supporto@evolution-pro.it
              </a>
            </p>
          </div>

          {/* CTA Prenota Call */}
          <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '2px solid #FFD24D' }}>
            <div className="flex items-start gap-6">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" 
                style={{ background: '#FFD24D15' }}
              >
                <Calendar className="w-7 h-7" style={{ color: '#C4990A' }} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2" style={{ color: '#1E2128' }}>
                  Prenota la tua call strategica
                </h3>
                <p className="mb-4" style={{ color: '#5F6572' }}>
                  Durante la videocall presenteremo l'Analisi Strategica del tuo progetto e valuteremo insieme i prossimi passi.
                </p>
                <button
                  onClick={() => {
                    window.open('https://calendar.app.google/ip1MfDcfcrju1WFh6', '_blank');
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
                  style={{ background: '#FFD24D', color: '#1E2128' }}
                  data-testid="prenota-call-btn"
                >
                  Prenota la tua call strategica
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

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
