import React, { useState } from "react";
import { 
  ArrowLeft, ArrowRight, Check, User, Mail, Lock, 
  Briefcase, TrendingUp, Target, Lightbulb, Zap, 
  CreditCard, Loader2, CheckCircle
} from "lucide-react";

// Questionnaire questions
const QUESTIONS = [
  {
    id: "attivita",
    question: "Raccontaci brevemente la tua attività, il tuo ruolo e da quanto tempo lavori in questo ambito.",
    type: "textarea",
    placeholder: "Descrivi la tua attività, il tuo ruolo e la tua esperienza...",
    icon: Briefcase
  },
  {
    id: "guadagno",
    question: "Come guadagni principalmente oggi?",
    type: "radio",
    options: [
      "Consulenze / sessioni 1:1",
      "Servizi a progetto",
      "Corsi o formazione in presenza",
      "Corsi online / prodotti digitali"
    ],
    icon: TrendingUp
  },
  {
    id: "difficolta",
    question: "Qual è la difficoltà principale che stai vivendo in questo momento?",
    type: "radio",
    options: [
      "Guadagno limitato dal mio tempo",
      "Agenda piena ma entrate instabili",
      "Difficoltà ad acquisire nuovi clienti",
      "Scarsa presenza online",
      "Confusione su come crescere"
    ],
    icon: Target
  },
  {
    id: "prodotto_digitale",
    question: "Hai mai pensato di trasformare le tue competenze in un prodotto digitale?",
    type: "radio",
    options: [
      "Sì, ma non so da dove iniziare",
      "Sì, ci ho provato senza risultati",
      "Ci sto pensando ora seriamente",
      "No, ma sono curioso di capire se ha senso"
    ],
    icon: Lightbulb
  },
  {
    id: "tipo_prodotto",
    question: "Che tipo di prodotto ti incuriosisce di più (anche solo come idea)?",
    type: "radio",
    options: [
      "Videocorso",
      "eBook / guida pratica",
      "Percorso misto (video + supporto)",
      "Non lo so ancora"
    ],
    icon: Zap
  },
  {
    id: "tecnologia",
    question: "Quanto ti senti a tuo agio con strumenti digitali e tecnologia?",
    type: "scale",
    options: ["Per niente", "Poco", "Abbastanza", "Molto"],
    icon: Zap
  },
  {
    id: "investimento",
    question: "Se trovassi un progetto sensato e guidato, saresti disposto a investire per costruirlo?",
    type: "radio",
    options: [
      "Sì, se vedo chiarezza e senso",
      "Sì, ma con cautela",
      "Dipende dall'investimento",
      "Al momento no"
    ],
    icon: CreditCard
  },
  {
    id: "aspettative",
    question: "Cosa ti aspetti davvero da questa Valutazione Strategica?",
    type: "textarea",
    placeholder: "Scrivilo liberamente: chiarezza, conferme, una direzione, capire se fermarti o andare avanti…",
    hint: "Es: Vorrei capire se il mio progetto ha senso e quali passi concreti fare...",
    icon: Target
  }
];

export function AnalisiQuestionario({ 
  userData, 
  onComplete, 
  onBack,
  isProcessingPayment 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [question.id]: value });
  };

  const handleNext = () => {
    if (!answers[question.id]) return;
    
    if (isLastStep) {
      onComplete(answers);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const currentAnswer = answers[question.id] || "";
  const canProceed = currentAnswer.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Domanda {currentStep + 1} di {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#F5C518] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-[#F5C518]/20 flex items-center justify-center mb-6">
            <question.icon className="w-7 h-7 text-[#F5C518]" />
          </div>

          {/* Question */}
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
            {question.question}
          </h2>

          {/* Answer Input */}
          <div className="mb-8">
            {question.type === "textarea" && (
              <div>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={question.placeholder}
                  rows={5}
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518] resize-none"
                  data-testid={`question-${question.id}`}
                />
                {question.hint && (
                  <p className="text-xs text-gray-500 mt-2">{question.hint}</p>
                )}
              </div>
            )}

            {question.type === "radio" && (
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                      currentAnswer === option
                        ? "bg-[#F5C518]/20 border-2 border-[#F5C518] text-white"
                        : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/30"
                    }`}
                    data-testid={`option-${i}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      currentAnswer === option ? "border-[#F5C518] bg-[#F5C518]" : "border-gray-500"
                    }`}>
                      {currentAnswer === option && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            )}

            {question.type === "scale" && (
              <div className="grid grid-cols-4 gap-2">
                {question.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(option)}
                    className={`p-4 rounded-xl text-center transition-all ${
                      currentAnswer === option
                        ? "bg-[#F5C518]/20 border-2 border-[#F5C518] text-white"
                        : "bg-white/5 border border-white/10 text-gray-300 hover:border-white/30"
                    }`}
                    data-testid={`scale-${i}`}
                  >
                    <div className="text-2xl mb-1">{["😕", "🤔", "🙂", "😃"][i]}</div>
                    <span className="text-xs">{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrev}
              className="px-6 py-3 rounded-xl font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed || isProcessingPayment}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                canProceed && !isProcessingPayment
                  ? "bg-[#F5C518] text-black hover:bg-[#e0b115]"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              data-testid="btn-next"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Elaborazione...
                </>
              ) : isLastStep ? (
                <>
                  Procedi al Pagamento
                  <CreditCard className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continua
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* User Info */}
        {userData && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Registrato come: {userData.email}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalisiQuestionario;
