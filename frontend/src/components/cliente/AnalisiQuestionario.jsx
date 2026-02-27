import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Briefcase, TrendingUp, Target, Lightbulb, Zap, CreditCard, Loader2 } from "lucide-react";

const QUESTIONS = [
  { id: "attivita", question: "Raccontaci brevemente la tua attività, il tuo ruolo e da quanto tempo lavori in questo ambito.", type: "textarea", placeholder: "Descrivi la tua attività, il tuo ruolo e la tua esperienza...", icon: Briefcase },
  { id: "guadagno", question: "Come guadagni principalmente oggi?", type: "radio", options: ["Consulenze / sessioni 1:1", "Servizi a progetto", "Corsi o formazione in presenza", "Corsi online / prodotti digitali"], icon: TrendingUp },
  { id: "difficolta", question: "Qual è la difficoltà principale che stai vivendo in questo momento?", type: "radio", options: ["Guadagno limitato dal mio tempo", "Agenda piena ma entrate instabili", "Difficoltà ad acquisire nuovi clienti", "Scarsa presenza online", "Confusione su come crescere"], icon: Target },
  { id: "prodotto_digitale", question: "Hai mai pensato di trasformare le tue competenze in un prodotto digitale?", type: "radio", options: ["Sì, ma non so da dove iniziare", "Sì, ci ho provato senza risultati", "Ci sto pensando ora seriamente", "No, ma sono curioso di capire se ha senso"], icon: Lightbulb },
  { id: "tipo_prodotto", question: "Che tipo di prodotto ti incuriosisce di più (anche solo come idea)?", type: "radio", options: ["Videocorso", "eBook / guida pratica", "Percorso misto (video + supporto)", "Non lo so ancora"], icon: Zap },
  { id: "tecnologia", question: "Quanto ti senti a tuo agio con strumenti digitali e tecnologia?", type: "scale", options: ["Per niente", "Poco", "Abbastanza", "Molto"], icon: Zap },
  { id: "investimento", question: "Se trovassi un progetto sensato e guidato, saresti disposto a investire per costruirlo?", type: "radio", options: ["Sì, se vedo chiarezza e senso", "Sì, ma con cautela", "Dipende dall'investimento", "Al momento no"], icon: CreditCard },
  { id: "aspettative", question: "Cosa ti aspetti davvero da questa Valutazione Strategica?", type: "textarea", placeholder: "Scrivilo liberamente: chiarezza, conferme, una direzione, capire se fermarti o andare avanti…", icon: Target }
];

export function AnalisiQuestionario({ userData, onComplete, onBack, isProcessingPayment }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const currentAnswer = answers[question.id] || "";
  const canProceed = currentAnswer.length > 0;

  const handleNext = () => {
    if (!canProceed) return;
    if (isLastStep) { onComplete(answers); } else { setCurrentStep(currentStep + 1); }
  };

  const handlePrev = () => {
    if (currentStep > 0) { setCurrentStep(currentStep - 1); } else { onBack(); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAFAF7' }}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-[#9CA3AF] mb-2">
            <span>Domanda {currentStep + 1} di {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div className="h-full bg-[#F5C518] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: '#FEF9E7' }}>
            <question.icon className="w-7 h-7 text-[#F5C518]" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] mb-6">{question.question}</h2>

          <div className="mb-8">
            {question.type === "textarea" && (
              <textarea value={currentAnswer} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                placeholder={question.placeholder} rows={5}
                className="w-full p-4 rounded-xl text-sm focus:outline-none resize-none"
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid={`question-${question.id}`} />
            )}

            {question.type === "radio" && (
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <button key={i} onClick={() => setAnswers({ ...answers, [question.id]: option })}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3`}
                    style={{ 
                      background: currentAnswer === option ? '#FEF9E7' : '#FAFAF7',
                      border: currentAnswer === option ? '2px solid #F5C518' : '1px solid #ECEDEF'
                    }} data-testid={`option-${i}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                      style={{ borderColor: currentAnswer === option ? '#F5C518' : '#9CA3AF', background: currentAnswer === option ? '#F5C518' : 'transparent' }}>
                      {currentAnswer === option && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-sm text-[#1E2128]">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {question.type === "scale" && (
              <div className="grid grid-cols-4 gap-2">
                {question.options.map((option, i) => (
                  <button key={i} onClick={() => setAnswers({ ...answers, [question.id]: option })}
                    className="p-4 rounded-xl text-center transition-all"
                    style={{ 
                      background: currentAnswer === option ? '#FEF9E7' : '#FAFAF7',
                      border: currentAnswer === option ? '2px solid #F5C518' : '1px solid #ECEDEF'
                    }} data-testid={`scale-${i}`}>
                    <div className="text-2xl mb-1">{["😕", "🤔", "🙂", "😃"][i]}</div>
                    <span className="text-xs text-[#5F6572]">{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={handlePrev} className="px-6 py-3 rounded-xl font-semibold text-[#5F6572] hover:text-[#1E2128] transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />Indietro
            </button>

            <button onClick={handleNext} disabled={!canProceed || isProcessingPayment}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canProceed && !isProcessingPayment ? 'bg-[#F5C518] text-black hover:bg-[#e0b115]' : 'bg-[#ECEDEF] text-[#9CA3AF] cursor-not-allowed'}`}
              data-testid="btn-next">
              {isProcessingPayment ? <><Loader2 className="w-4 h-4 animate-spin" />Elaborazione...</> : 
               isLastStep ? <>Procedi al Pagamento<CreditCard className="w-4 h-4" /></> : <>Continua<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {userData && <div className="mt-4 text-center text-sm text-[#9CA3AF]">Registrato come: {userData.email}</div>}
      </div>
    </div>
  );
}

export default AnalisiQuestionario;
