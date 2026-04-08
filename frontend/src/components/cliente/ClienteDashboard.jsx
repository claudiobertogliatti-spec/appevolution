import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle, Clock, FileText, Video, ArrowRight,
  Sparkles, User, TrendingUp, Loader2, BookOpen,
  LogOut, Play, Star, Rocket, Target, ChevronRight
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// ── 5-step progress ──────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Acquisto",      icon: CheckCircle },
  { id: 2, label: "Questionario",  icon: FileText },
  { id: 3, label: "Analisi",       icon: Sparkles },
  { id: 4, label: "Proposta",      icon: Target },
  { id: 5, label: "Partnership",   icon: Rocket },
];

// ── Brand colors ─────────────────────────────────────────────────
const C = {
  yellow:     "#FFD24D",
  yellowDark: "#D4A017",
  dark:       "#1A1F24",
  bg:         "#FAFAF7",
  border:     "#E8E4DC",
  muted:      "#8B8680",
  green:      "#10B981",
  red:        "#EF4444",
};

// ── Questions for pre-call questionnaire ─────────────────────────
const QUESTIONS = [
  { id: "expertise", question: "In cosa sei riconosciuto/a come esperto/a?", description: "Descrivi la tua competenza principale." },
  { id: "cliente_ideale", question: "Chi è il tuo cliente ideale?", description: "Descrivi la persona che vorresti aiutare." },
  { id: "risultato_concreto", question: "Quale risultato concreto vorresti aiutarlo a ottenere?", description: "Quale trasformazione prometti?" },
  { id: "pubblico_esistente", question: "Hai già un pubblico o persone che ti seguono?", description: "Social, community, newsletter, clienti." },
  { id: "esperienze_passate", question: "Hai già venduto corsi, consulenze o servizi simili?", description: "Se sì, a che livello?" },
  { id: "ostacolo_principale", question: "Qual è il blocco più grande per te oggi?", description: "Cosa ti impedisce di partire?" },
  { id: "perche_adesso", question: "Perché vuoi farlo adesso?", description: "Cosa è cambiato nella tua situazione?" },
];

// ── Team members ─────────────────────────────────────────────────
const TEAM = [
  { name: "VALENTINA", role: "Strategia e Onboarding" },
  { name: "ANDREA", role: "Produzione Contenuti" },
  { name: "MARCO", role: "Accountability Settimanale" },
  { name: "GAIA", role: "Supporto Tecnico" },
  { name: "STEFANIA", role: "Coordinatrice" },
  { name: "Claudio", role: "Supervisione e Call Strategiche", human: true },
  { name: "Antonella", role: "Comunicazione e Social", human: true },
];

export default function ClienteDashboard({ cliente, onLogout, onDecisione, onPartnerAttivato }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // Questionnaire state
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submittingQ, setSubmittingQ] = useState(false);

  const userId = cliente?.id;

  // ── Fetch status & determine step ──────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!userId || userId === "demo-cliente") { setLoading(false); return; }
    try {
      const r = await axios.get(`${API}/api/cliente-analisi/status/${userId}`);
      const d = r.data;
      setStatus(d);

      if (d.analisi_generata && d.decisione_attivata) {
        setCurrentStep(5); // partnership/decisione
      } else if (d.analisi_generata) {
        setCurrentStep(4); // proposta pronta
      } else if (d.questionario_completed || d.questionario_completato) {
        setCurrentStep(3); // analisi in preparazione
      } else if (d.pagamento_effettuato || d.pagamento_analisi) {
        setCurrentStep(2); // deve compilare questionario
      } else {
        setCurrentStep(1); // acquisto
      }
    } catch (e) {
      console.error("Status fetch error:", e);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Polling every 30s for step 3 (analisi in preparazione) ─────
  useEffect(() => {
    if (currentStep !== 3) return;
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [currentStep, fetchStatus]);

  // ── Submit questionnaire ──────────────────────────────────────
  const submitQuestionnaire = async () => {
    setSubmittingQ(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.post(`${API}/api/cliente-analisi/questionario`, { risposte: answers }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowQuestionnaire(false);
      setCurrentStep(3);
      fetchStatus();
    } catch (e) {
      console.error("Questionnaire submit error:", e);
    }
    setSubmittingQ(false);
  };

  // ── Progress bar ──────────────────────────────────────────────
  const ProgressBar = () => (
    <div data-testid="progress-bar" className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5"
                style={{
                  background: done ? C.green : active ? C.yellow : "#E8E4DC",
                  color: done ? "white" : active ? C.dark : C.muted,
                  transition: "all 0.3s ease",
                }}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className="text-xs font-bold text-center"
                style={{ color: done || active ? C.dark : C.muted }}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mt-[-16px]"
                style={{ background: step.id < currentStep ? C.green : "#E8E4DC" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellow }} />
      </div>
    );
  }

  // ── STEP 2: Questionario ──────────────────────────────────────
  const renderQuestionario = () => {
    if (showQuestionnaire) {
      const q = QUESTIONS[currentQ];
      const allAnswered = QUESTIONS.every(q => answers[q.id]?.trim());
      return (
        <div data-testid="questionario-inline" className="space-y-6">
          <div className="rounded-xl p-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold" style={{ color: C.muted }}>
                Domanda {currentQ + 1} di {QUESTIONS.length}
              </span>
              <div className="flex gap-1">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="w-6 h-1.5 rounded-full" style={{ background: i <= currentQ ? C.yellow : "#E8E4DC" }} />
                ))}
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1" style={{ color: C.dark }}>{q.question}</h3>
            <p className="text-sm mb-4" style={{ color: C.muted }}>{q.description}</p>
            <textarea
              data-testid={`question-${q.id}`}
              value={answers[q.id] || ""}
              onChange={(e) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Scrivi qui la tua risposta..."
              className="w-full rounded-xl p-4 text-sm resize-none focus:outline-none"
              style={{ border: `1px solid ${C.border}`, minHeight: 120, background: C.bg }}
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
                className="px-4 py-2 rounded-lg text-sm font-bold"
                style={{ color: currentQ === 0 ? "#ccc" : C.dark }}
              >
                Indietro
              </button>
              {currentQ < QUESTIONS.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(currentQ + 1)}
                  disabled={!answers[q.id]?.trim()}
                  className="px-6 py-2 rounded-lg text-sm font-bold"
                  style={{
                    background: answers[q.id]?.trim() ? C.yellow : "#E8E4DC",
                    color: C.dark,
                  }}
                >
                  Avanti <ChevronRight className="w-4 h-4 inline" />
                </button>
              ) : (
                <button
                  data-testid="submit-questionnaire"
                  onClick={submitQuestionnaire}
                  disabled={!allAnswered || submittingQ}
                  className="px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                  style={{ background: allAnswered ? C.yellow : "#E8E4DC", color: C.dark }}
                >
                  {submittingQ ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Invia Questionario
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "white", border: `1px solid ${C.border}` }}>
        <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: C.yellow }} />
        <h3 className="text-xl font-bold mb-2" style={{ color: C.dark }}>Compila il Questionario Pre-Call</h3>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: C.muted }}>
          7 domande per permetterci di preparare un'analisi strategica personalizzata per il tuo progetto.
        </p>
        <button
          data-testid="start-questionnaire"
          onClick={() => setShowQuestionnaire(true)}
          className="px-8 py-3 rounded-xl text-sm font-bold"
          style={{ background: C.yellow, color: C.dark }}
        >
          Inizia il Questionario <ArrowRight className="w-4 h-4 inline ml-1" />
        </button>
      </div>
    );
  };

  // ── STEP 3: Analisi in preparazione ───────────────────────────
  const renderAnalisiInPreparazione = () => (
    <div className="space-y-5">
      <div className="rounded-xl p-8 text-center" style={{ background: "white", border: `1px solid ${C.border}` }}>
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: `${C.yellow}20` }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellowDark }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: C.dark }}>La tua Analisi Strategica è in preparazione</h3>
        <p className="text-sm max-w-lg mx-auto" style={{ color: C.muted }}>
          Claudio e il team stanno analizzando le tue risposte per creare un piano personalizzato.
          Riceverai una notifica quando sarà pronta.
        </p>
      </div>

      {/* Mini corso / contenuto utile */}
      <div className="rounded-xl p-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
        <h4 className="font-bold mb-4 flex items-center gap-2" style={{ color: C.dark }}>
          <BookOpen className="w-5 h-5" style={{ color: C.yellowDark }} />
          Intanto, preparati al meglio
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Come funziona Evolution PRO", desc: "Il metodo in 7 fasi per la tua accademia digitale", icon: Play },
            { title: "Il Team che ti seguirà", desc: "5 agenti AI + Claudio e Antonella al tuo fianco", icon: User },
            { title: "Risultati dei nostri Partner", desc: "Storie reali di chi ha già lanciato", icon: TrendingUp },
            { title: "FAQ — Domande frequenti", desc: "Tutto quello che devi sapere prima della call", icon: Star },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-4 rounded-lg" style={{ background: C.bg }}>
              <item.icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: C.yellowDark }} />
              <div>
                <div className="text-sm font-bold" style={{ color: C.dark }}>{item.title}</div>
                <div className="text-xs mt-0.5" style={{ color: C.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Evolution */}
      <div className="rounded-xl p-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
        <h4 className="font-bold mb-4" style={{ color: C.dark }}>Il Team Evolution PRO</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEAM.map(m => (
            <div key={m.name} className="p-3 rounded-lg text-center" style={{ background: C.bg }}>
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
                style={{ background: m.human ? "#E8E4DC" : C.yellow, color: C.dark }}
              >
                {m.name[0]}
              </div>
              <div className="text-xs font-bold" style={{ color: C.dark }}>{m.name}</div>
              <div className="text-[10px]" style={{ color: C.muted }}>{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── STEP 4: Analisi pronta — hero card ────────────────────────
  const renderAnalisiPronta = () => (
    <div className="space-y-5">
      <div
        data-testid="analisi-pronta-card"
        className="rounded-2xl p-10 text-center"
        style={{ background: `linear-gradient(135deg, ${C.yellow} 0%, #FFBE0B 100%)`, border: "none" }}
      >
        <Sparkles className="w-14 h-14 mx-auto mb-4" style={{ color: C.dark }} />
        <h2 className="text-2xl font-black mb-2" style={{ color: C.dark }}>
          La tua Analisi Strategica è pronta!
        </h2>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#5F5020" }}>
          Abbiamo analizzato il tuo profilo e preparato una roadmap personalizzata per la tua accademia digitale.
        </p>
        <button
          data-testid="view-analisi-btn"
          onClick={() => onDecisione && onDecisione()}
          className="px-10 py-4 rounded-xl text-base font-black"
          style={{ background: C.dark, color: "white", transition: "all 0.15s ease" }}
        >
          VISUALIZZA LA TUA ANALISI <ArrowRight className="w-5 h-5 inline ml-2" />
        </button>
      </div>

      {/* Cosa troverai */}
      <div className="rounded-xl p-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
        <h4 className="font-bold mb-4" style={{ color: C.dark }}>Cosa troverai nell'analisi:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Analisi del tuo Profilo", desc: "Punti di forza, potenziale e aree di miglioramento" },
            { title: "Check di Fattibilità", desc: "Punteggio e valutazione del tuo progetto" },
            { title: "Roadmap Personalizzata", desc: "Le fasi esatte del tuo percorso su misura" },
          ].map(i => (
            <div key={i.title} className="p-4 rounded-lg" style={{ background: C.bg }}>
              <div className="text-sm font-bold mb-1" style={{ color: C.dark }}>{i.title}</div>
              <div className="text-xs" style={{ color: C.muted }}>{i.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────
  return (
    <div data-testid="cliente-dashboard" className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.dark }}>
            Ciao, {cliente?.nome || "Cliente"}
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>Il tuo percorso verso Evolution PRO</p>
        </div>
        <div className="flex items-center gap-3">
          {onLogout && (
            <button
              data-testid="cliente-logout"
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
              style={{ border: `1px solid ${C.border}`, color: C.muted, transition: "all 0.15s ease" }}
            >
              <LogOut className="w-4 h-4" />Esci
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      <ProgressBar />

      {/* Content based on step */}
      {currentStep === 1 && (
        <div className="rounded-xl p-8 text-center" style={{ background: "white", border: `1px solid ${C.border}` }}>
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: C.green }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: C.dark }}>Acquisto Completato</h3>
          <p className="text-sm" style={{ color: C.muted }}>Il tuo pagamento è stato confermato. Procedi con il questionario.</p>
        </div>
      )}

      {currentStep === 2 && renderQuestionario()}
      {currentStep === 3 && renderAnalisiInPreparazione()}
      {currentStep === 4 && renderAnalisiPronta()}
      {currentStep === 5 && renderAnalisiPronta()}
    </div>
  );
}
