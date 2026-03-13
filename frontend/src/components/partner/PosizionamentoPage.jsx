import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Check, Sparkles, MessageCircle, RefreshCw, ThumbsUp, Edit3 } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURAZIONE WIZARD
// ═══════════════════════════════════════════════════════════════════════════════

const WIZARD_STEPS = [
  {
    id: 1,
    title: "Studente ideale",
    question: "Chi è il tuo studente ideale?",
    placeholder: "Coach, consulenti o liberi professionisti che vogliono trovare clienti online ma non sanno da dove iniziare.",
    hint: "Descrivi la persona che trarrebbe il massimo beneficio dal tuo percorso."
  },
  {
    id: 2,
    title: "Obiettivo dello studente",
    question: "Qual è il risultato principale che il tuo studente vuole ottenere?",
    placeholder: "Trovare i primi 10 clienti per il proprio business di coaching.",
    hint: "Pensa al risultato concreto e misurabile che il tuo studente desidera."
  },
  {
    id: 3,
    title: "Trasformazione",
    question: "Descrivi la trasformazione prima e dopo il tuo percorso.",
    placeholder: "Prima: Confuso, senza clienti, non sa da dove iniziare.\n\nDopo: Ha un sistema chiaro per generare clienti in modo prevedibile.",
    hint: "Mostra il cambiamento che il tuo percorso produce nella vita dello studente."
  },
  {
    id: 4,
    title: "Metodo",
    question: "Qual è il tuo metodo o framework?",
    placeholder: "Metodo 3C:\n\n• Chiarezza - Definisci la tua offerta\n• Contatti - Costruisci il tuo pubblico\n• Conversione - Trasforma i contatti in clienti",
    hint: "Il tuo metodo rende unico il tuo percorso. Può essere un acronimo, un processo in step, un framework."
  },
  {
    id: 5,
    title: "Obiezioni",
    question: "Quali sono le 3 principali obiezioni dei tuoi potenziali studenti?",
    placeholder: "• Non ho tempo per seguire un corso\n• Non sono abbastanza esperto per insegnare\n• Ho già provato altri corsi e non hanno funzionato",
    hint: "Conoscere le obiezioni ti aiuterà a creare contenuti che le risolvono."
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTI
// ═══════════════════════════════════════════════════════════════════════════════

function TutorIntro() {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Avatar Valentina */}
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
             style={{ background: '#F2C41830', color: '#C4990A' }}>
          V
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold" style={{ color: '#1E2128' }}>Valentina</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#F2C41820', color: '#92700C' }}>
              Strategic Guide
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            Ciao! Ti guiderò passo dopo passo nella definizione del posizionamento del tuo progetto.
            <br /><br />
            Non preoccuparti se alcune risposte non sono perfette. Le raffineremo insieme nelle fasi successive.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: '#5F6572' }}>
          Step {currentStep} di {totalSteps}
        </span>
        <span className="text-sm font-bold" style={{ color: '#F2C418' }}>
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${(currentStep / totalSteps) * 100}%`,
            background: 'linear-gradient(90deg, #F2C418, #FADA5E)'
          }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="flex justify-between mt-3">
        {WIZARD_STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{ 
                background: idx < currentStep ? '#34C77B' : idx === currentStep - 1 ? '#F2C418' : '#ECEDEF',
                color: idx < currentStep ? 'white' : idx === currentStep - 1 ? '#1E2128' : '#9CA3AF'
              }}
            >
              {idx < currentStep - 1 ? <Check className="w-4 h-4" /> : idx + 1}
            </div>
            <span className="text-[10px] mt-1 text-center max-w-[60px]" style={{ color: '#9CA3AF' }}>
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WizardStep({ step, value, onChange, onNext, onPrev, isFirst, isLast }) {
  const isValid = value && value.trim().length >= 20;
  
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6">
      {/* Titolo step */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
             style={{ background: '#F2C418', color: '#1E2128' }}>
          {step.id}
        </div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
          {step.title}
        </span>
      </div>
      
      {/* Domanda */}
      <h2 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
        {step.question}
      </h2>
      <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
        {step.hint}
      </p>
      
      {/* Textarea */}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={step.placeholder}
        rows={6}
        className="w-full p-4 rounded-xl border resize-none text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F2C418] focus:border-transparent"
        style={{ 
          background: '#FAFAF7', 
          borderColor: '#ECEDEF',
          color: '#1E2128'
        }}
      />
      
      {/* Caratteri */}
      <div className="flex justify-between items-center mt-2 mb-6">
        <span className="text-xs" style={{ color: value?.length >= 20 ? '#34C77B' : '#9CA3AF' }}>
          {value?.length || 0} caratteri {value?.length < 20 && '(min. 20)'}
        </span>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isFirst ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FAFAF7]'
          }`}
          style={{ color: '#5F6572' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Indietro
        </button>
        
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isValid ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed'
          }`}
          style={{ 
            background: isValid ? '#F2C418' : '#ECEDEF', 
            color: isValid ? '#1E2128' : '#9CA3AF' 
          }}
        >
          {isLast ? 'Completa' : 'Avanti'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GenerateSection({ onGenerate, isGenerating }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] p-6 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: '#F2C41830' }}>
        <Sparkles className="w-8 h-8" style={{ color: '#F2C418' }} />
      </div>
      
      <h2 className="text-xl font-black mb-2" style={{ color: '#1E2128' }}>
        Genera la struttura del tuo corso
      </h2>
      <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#5F6572' }}>
        Stefania utilizzerà il tuo posizionamento per generare automaticamente 
        la struttura del tuo videocorso.
      </p>
      
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        style={{ background: '#F2C418', color: '#1E2128' }}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Genera Struttura Corso
          </>
        )}
      </button>
    </div>
  );
}

function CourseStructureOutput({ structure, onApprove, onRequestEdit }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ECEDEF] overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center gap-3" style={{ background: '#FAFAF7', borderBottom: '1px solid #ECEDEF' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
             style={{ background: '#8B5CF630', color: '#8B5CF6' }}>
          S
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: '#1E2128' }}>Stefania</div>
          <div className="text-xs" style={{ color: '#9CA3AF' }}>Growth Planner</div>
        </div>
        <div className="ml-auto text-xs px-2 py-1 rounded-full" style={{ background: '#34C77B20', color: '#2D9F6F' }}>
          Struttura generata
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-lg font-black mb-4" style={{ color: '#1E2128' }}>
          Struttura del tuo videocorso
        </h3>
        
        {/* Modules */}
        <div className="space-y-3 mb-6">
          {structure.modules.map((module, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl border"
              style={{ background: '#FAFAF7', borderColor: '#ECEDEF' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                     style={{ background: '#F2C418', color: '#1E2128' }}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm mb-1" style={{ color: '#1E2128' }}>
                    {module.title}
                  </div>
                  <div className="text-xs" style={{ color: '#5F6572' }}>
                    {module.description}
                  </div>
                  {module.lessons && (
                    <div className="mt-2 pl-4 border-l-2" style={{ borderColor: '#ECEDEF' }}>
                      {module.lessons.map((lesson, lIdx) => (
                        <div key={lIdx} className="text-xs py-1" style={{ color: '#9CA3AF' }}>
                          {lIdx + 1}. {lesson}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
            style={{ background: '#34C77B', color: 'white' }}
          >
            <ThumbsUp className="w-5 h-5" />
            Approva struttura
          </button>
          <button
            onClick={onRequestEdit}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:bg-[#FAFAF7]"
            style={{ background: 'white', border: '1px solid #ECEDEF', color: '#5F6572' }}
          >
            <Edit3 className="w-5 h-5" />
            Chiedi modifica
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletedBanner({ onContinue }) {
  return (
    <div className="rounded-2xl p-6 text-center"
         style={{ background: 'linear-gradient(135deg, #34C77B 0%, #2D9F6F 100%)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
           style={{ background: 'rgba(255,255,255,0.2)' }}>
        <Check className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black text-white mb-2">
        Posizionamento completato!
      </h2>
      <p className="text-sm text-white/80 mb-6 max-w-md mx-auto">
        Ottimo lavoro! Ora puoi procedere alla creazione della tua Masterclass.
      </p>
      <button
        onClick={onContinue}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105"
        style={{ background: 'white', color: '#2D9F6F' }}
      >
        Vai alla Masterclass
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PosizionamentoPage({ partner, onNavigate, onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedStructure, setGeneratedStructure] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [wizardCompleted, setWizardCompleted] = useState(false);
  
  const totalSteps = WIZARD_STEPS.length;
  
  const handleAnswerChange = (stepId, value) => {
    setAnswers(prev => ({ ...prev, [stepId]: value }));
  };
  
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      setWizardCompleted(true);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simula chiamata API (in futuro sarà Stefania AI)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Struttura generata basata sulle risposte
    const studenteIdeale = answers[1] || '';
    const obiettivo = answers[2] || '';
    const metodo = answers[4] || '';
    
    setGeneratedStructure({
      modules: [
        {
          title: "Modulo 1 — Fondamenta",
          description: "Definisci le basi del tuo percorso e comprendi il punto di partenza.",
          lessons: ["Introduzione al percorso", "Analisi della situazione attuale", "Definizione degli obiettivi"]
        },
        {
          title: "Modulo 2 — Chiarezza",
          description: "Costruisci una visione chiara di cosa vuoi ottenere.",
          lessons: ["Il mindset vincente", "Identifica i tuoi punti di forza", "Elimina le credenze limitanti"]
        },
        {
          title: "Modulo 3 — Strategia",
          description: "Sviluppa la strategia per raggiungere i tuoi obiettivi.",
          lessons: ["Il piano d'azione", "Le leve strategiche", "Timeline e milestone"]
        },
        {
          title: "Modulo 4 — Azione",
          description: "Implementa le azioni concrete per ottenere risultati.",
          lessons: ["I primi passi", "Gestione degli ostacoli", "Monitoraggio dei progressi"]
        },
        {
          title: "Modulo 5 — Scalabilità",
          description: "Scala i risultati e rendi il sistema sostenibile.",
          lessons: ["Ottimizzazione del processo", "Automazione", "Next level"]
        }
      ]
    });
    
    setIsGenerating(false);
  };
  
  const handleApprove = () => {
    setIsCompleted(true);
    if (onComplete) onComplete(answers, generatedStructure);
  };
  
  const handleRequestEdit = () => {
    // Reset per permettere modifiche
    setGeneratedStructure(null);
    setWizardCompleted(false);
    setCurrentStep(1);
  };
  
  const handleContinue = () => {
    onNavigate('masterclass');
  };
  
  return (
    <div className="min-h-full" style={{ background: '#FAFAF7' }}>
      <div className="max-w-2xl mx-auto p-6">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-2" style={{ color: '#1E2128' }}>
            Posizionamento del tuo progetto
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: '#5F6572' }}>
            In questa fase definiamo con precisione: chi è il tuo studente ideale, 
            quale problema risolve il tuo percorso, e quale trasformazione offrirai.
            <br /><br />
            Queste informazioni serviranno al sistema Evolution PRO per costruire 
            la struttura del tuo videocorso.
          </p>
        </div>
        
        {/* Tutor Intro */}
        <TutorIntro />
        
        {/* Content based on state */}
        {isCompleted ? (
          <CompletedBanner onContinue={handleContinue} />
        ) : generatedStructure ? (
          <CourseStructureOutput 
            structure={generatedStructure}
            onApprove={handleApprove}
            onRequestEdit={handleRequestEdit}
          />
        ) : wizardCompleted ? (
          <GenerateSection 
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        ) : (
          <>
            {/* Progress */}
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
            
            {/* Wizard Step */}
            <WizardStep
              step={WIZARD_STEPS[currentStep - 1]}
              value={answers[currentStep]}
              onChange={(value) => handleAnswerChange(currentStep, value)}
              onNext={handleNext}
              onPrev={handlePrev}
              isFirst={currentStep === 1}
              isLast={currentStep === totalSteps}
            />
          </>
        )}
        
      </div>
    </div>
  );
}

export default PosizionamentoPage;
