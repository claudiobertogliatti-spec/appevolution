import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Target, Sparkles } from "lucide-react";
import { POSITIONING_QUESTIONS, S } from "../../data/constants";
import axios from "axios";

import { API } from "../../utils/api-config"; // API configured

export function WizardPosizionamento({ partner, onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState(null);

  const question = POSITIONING_QUESTIONS[currentStep];
  const totalSteps = POSITIONING_QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerate();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Call API to generate positioning canvas
      const res = await axios.post(`${API}/api/positioning/generate`, {
        partner_id: partner?.id,
        partner_name: partner?.name,
        partner_niche: partner?.niche,
        answers: answers
      });
      setOutput(res.data.canvas);
    } catch (e) {
      // Fallback to local generation
      const canvas = generateCanvasLocally(answers, partner);
      setOutput(canvas);
    } finally {
      setGenerating(false);
    }
  };

  const generateCanvasLocally = (answers, partner) => {
    return `
═══════════════════════════════════════════════════════════════
        CANVAS POSIZIONAMENTO — ${partner?.name || "Partner"}
═══════════════════════════════════════════════════════════════

🎯 OBIETTIVO PRINCIPALE
${answers.obiettivo || "Non definito"}

👤 STUDENTE IDEALE
${answers.target || "Non definito"}

🔄 TRASFORMAZIONE PROMESSA
${answers.trasformazione || "Non definito"}

⭐ DIFFERENZIAZIONE
${answers.differenziazione || "Non definito"}

🧩 METODO/FRAMEWORK
${answers.metodo || "Non definito"}

❓ OBIEZIONI PRINCIPALI
${answers.obiezioni || "Non definito"}

✅ PROVE & TESTIMONIANZE
${answers.prova || "Non definito"}

⏰ URGENZA
${answers.urgenza || "Non definito"}

🎁 BONUS INCLUSI
${answers.bonus || "Non definito"}

═══════════════════════════════════════════════════════════════
        Generato da Evolution PRO OS — ${new Date().toLocaleDateString("it-IT")}
═══════════════════════════════════════════════════════════════
    `;
  };

  if (generating) {
    return (
      <div className="max-w-2xl mx-auto animate-slide-in" data-testid="wizard-generating">
        <div className="bg-white border border-[#ECEDEF] rounded-xl p-12 text-center">
          <div className="text-6xl mb-4 animate-pulse">🎯</div>
          <div className="text-lg font-extrabold text-[#1E2128] mb-2">
            Generazione Canvas Posizionamento...
          </div>
          <div className="text-sm text-[#5F6572]">
            Stiamo elaborando le tue risposte per creare il Canvas
          </div>
        </div>
      </div>
    );
  }

  if (output) {
    return (
      <div className="max-w-2xl mx-auto animate-slide-in" data-testid="wizard-output">
        <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-[#ECEDEF] bg-gradient-to-r from-[#FFD24D]/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FFD24D] flex items-center justify-center">
                <Target className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#1E2128]">Canvas Posizionamento Completato</div>
                <div className="text-xs text-[#5F6572]">Pronto per essere utilizzato nel tuo corso</div>
              </div>
            </div>
          </div>

          {/* Canvas Output */}
          <div className="p-5 max-h-[500px] overflow-y-auto">
            <pre className="text-xs font-mono text-[#5F6572] whitespace-pre-wrap leading-relaxed">
              {output}
            </pre>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-[#ECEDEF] flex gap-3">
            <button
              onClick={() => { setOutput(null); setCurrentStep(0); }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 text-sm font-bold text-[#5F6572] hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Modifica risposte
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(output);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 text-sm font-bold text-[#5F6572] hover:bg-white/10 transition-colors"
            >
              📋 Copia Canvas
            </button>
            <button
              onClick={async () => {
                // Save positioning data to database
                try {
                  await axios.post(`${API}/api/positioning/save`, {
                    partner_id: partner?.id,
                    partner_name: partner?.name,
                    answers: answers,
                    canvas: output
                  });
                } catch (e) {
                  console.error("Failed to save positioning:", e);
                }
                onComplete && onComplete(output);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-[#FFD24D] text-black rounded-xl px-4 py-3 text-sm font-extrabold hover:bg-[#e0a800] transition-colors"
            >
              <Check className="w-4 h-4" /> Salva e Continua
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-in" data-testid="wizard-posizionamento">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#9CA3AF]">
            Domanda {currentStep + 1} di {totalSteps}
          </span>
          <span className="text-xs font-bold text-[#FFD24D]">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FFD24D] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {POSITIONING_QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`w-3 h-3 rounded-full transition-all
              ${i < currentStep ? 'bg-[#16a34a]' : i === currentStep ? 'bg-[#FFD24D] ring-2 ring-[#FFD24D]/30' : 'bg-white/10'}`}
          />
        ))}
      </div>

      {/* Question Card */}
      <div className="bg-white border border-[#ECEDEF] rounded-xl overflow-hidden">
        {/* Question Header */}
        <div className="p-6 border-b border-[#ECEDEF]">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFD24D] flex items-center justify-center font-mono text-sm font-bold text-black flex-shrink-0">
              {currentStep + 1}
            </div>
            <div className="text-lg font-extrabold text-[#1E2128] leading-snug">
              {question.question}
            </div>
          </div>

          {/* Hint */}
          <div className="bg-[#FFFBEA]/10 border border-[#FFD24D]/30 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD24D] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-[#FFD24D]/80 leading-relaxed">
                {question.hint}
              </div>
            </div>
          </div>
        </div>

        {/* Answer Input */}
        <div className="p-6">
          <textarea
            value={answers[question.id] || ""}
            onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
            placeholder={question.placeholder}
            className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-4 text-sm font-semibold text-[#1E2128] placeholder:text-[#9CA3AF] outline-none transition-colors focus:border-[#FFD24D] resize-none min-h-[160px] leading-relaxed"
          />
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-[#ECEDEF] flex gap-3">
          <button
            onClick={onBack || handlePrev}
            disabled={currentStep === 0 && !onBack}
            className={`flex items-center justify-center gap-2 bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-6 py-3 text-sm font-bold transition-colors
              ${currentStep === 0 && !onBack ? 'opacity-30 cursor-not-allowed' : 'text-[#5F6572] hover:bg-white/10'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Indietro
          </button>
          
          <button
            onClick={handleNext}
            disabled={!answers[question.id]?.trim()}
            className={`flex-1 flex items-center justify-center gap-2 bg-[#FFD24D] text-black rounded-xl px-6 py-3 text-sm font-extrabold transition-colors
              ${!answers[question.id]?.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e0a800]'}`}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Sparkles className="w-4 h-4" /> Genera Canvas
              </>
            ) : (
              <>
                Continua <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
