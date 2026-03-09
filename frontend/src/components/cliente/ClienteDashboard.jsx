import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, Gift, Play, Lock, Send,
  Target, Lightbulb, Rocket, Megaphone, Users, Shield,
  ChevronRight, Calendar, Video, FileText, ArrowRight,
  Map, Sparkles, User, GraduationCap, TrendingUp, Award,
  AlertTriangle, Star, Loader2
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Progress Steps
const PROGRESS_STEPS = [
  { id: 1, label: "Acquisto", icon: CheckCircle, status: "completed" },
  { id: 2, label: "Questionario", icon: FileText, status: "current" },
  { id: 3, label: "Call con Claudio", icon: Video, status: "pending" }
];

// Team members for info box
const TEAM_MEMBERS = [
  { name: "VALENTINA", role: "strategia e onboarding", color: "#F5C518" },
  { name: "ANDREA", role: "produzione contenuti", color: "#F5C518" },
  { name: "MARCO", role: "accountability settimanale", color: "#F5C518" },
  { name: "GAIA", role: "supporto tecnico", color: "#F5C518" },
  { name: "Claudio", role: "supervisione e call strategiche", isHuman: true },
  { name: "Antonella", role: "comunicazione e social", isHuman: true }
];

// Questions for pre-call questionnaire
const QUESTIONS = [
  {
    id: "expertise",
    question: "In cosa sei riconosciuto/a come esperto/a?",
    placeholder: "Es. coach di comunicazione per manager, nutrizionista specializzata in donne over 40, consulente fiscale per freelance...",
    important: false
  },
  {
    id: "cliente_ideale",
    question: "Chi è il tuo cliente ideale?",
    placeholder: "Chi vorresti aiutare con la tua accademia? Età, professione, problema principale...",
    important: false
  },
  {
    id: "pubblico_esistente",
    question: "Hai già un pubblico? (community, email list, social)",
    placeholder: "Es. 2.000 follower Instagram, newsletter da 500 iscritti, gruppo Facebook da 300 persone. Se no, scrivi 'No'.",
    important: false
  },
  {
    id: "esperienze_passate",
    question: "Hai già provato a vendere qualcosa online?",
    placeholder: "Corsi, consulenze, infoprodotti... Come è andata? Se non hai mai provato, scrivi 'No, prima volta'.",
    important: false
  },
  {
    id: "ostacolo_principale",
    question: "Qual è il principale ostacolo che finora ti ha bloccato/a dal digitalizzare la tua competenza?",
    placeholder: "Tempo, tecnica, non sapere da dove iniziare, paura che non funzioni, altro...",
    important: false
  },
  {
    id: "obiettivo_12_mesi",
    question: "Cosa vorresti ottenere nei prossimi 12 mesi?",
    placeholder: "Un obiettivo concreto: un numero di studenti, un fatturato extra, liberarti da X ore di lavoro...",
    important: false
  },
  {
    id: "perche_adesso",
    question: "Perché proprio adesso? Cosa è cambiato?",
    placeholder: "Questa è la domanda più importante. Cosa ti ha spinto/a ad agire oggi, in questo momento?",
    important: true
  }
];

// Resources after completion
const RISORSE_POST_INVIO = [
  { title: "Come funziona la tua Accademia Digitale", desc: "Guida rapida al percorso" },
  { title: "I 3 errori più comuni dei formatori online", desc: "Evita le trappole classiche" },
  { title: "Cosa succede dopo la call", desc: "Il percorso completo spiegato" }
];

export function ClienteDashboard({ cliente, onLogout }) {
  const [questionarioCompletato, setQuestionarioCompletato] = useState(
    cliente?.questionario?.completato || false
  );
  const [risposte, setRisposte] = useState({
    expertise: "",
    cliente_ideale: "",
    pubblico_esistente: "",
    esperienze_passate: "",
    ostacolo_principale: "",
    obiettivo_12_mesi: "",
    perche_adesso: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clienteName = cliente?.nome || "Benvenuto";
  const clienteEmail = cliente?.email || "";

  // Check if all fields have at least 10 characters
  const isFormValid = Object.values(risposte).every(v => v.trim().length >= 10);

  const handleChange = (id, value) => {
    setRisposte(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await axios.post(`${API}/clienti/${cliente.id}/questionario`, risposte);
      setQuestionarioCompletato(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Errore durante l'invio");
    } finally {
      setLoading(false);
    }
  };

  // Get progress status
  const getStepStatus = (stepId) => {
    if (stepId === 1) return "completed";
    if (stepId === 2) return questionarioCompletato ? "completed" : "current";
    if (stepId === 3) return questionarioCompletato ? "current" : "pending";
    return "pending";
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }} data-testid="cliente-dashboard">
      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <span className="font-black text-black">E</span>
            </div>
            <span className="font-bold text-[#1E2128]">Evolution<span className="text-[#F5C518]">PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9CA3AF]">
              Ciao, <span className="text-[#1E2128] font-semibold">{clienteName}</span>
            </span>
            <button 
              onClick={onLogout}
              className="text-sm text-[#9CA3AF] hover:text-[#1E2128] transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Welcome Header */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h1 className="text-2xl font-black text-[#1E2128] mb-2">
                Benvenuto/a {clienteName}! 🎉
              </h1>
              <p className="text-[#5F6572]">
                Hai fatto il primo passo. Ora prepariamo insieme la tua analisi — 
                Claudio ti contatterà entro 48 ore per fissare la call.
              </p>

              {/* Progress Bar */}
              <div className="mt-6 flex items-center gap-4">
                {PROGRESS_STEPS.map((step, i) => {
                  const status = getStepStatus(step.id);
                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            status === "completed" 
                              ? "bg-green-500 text-white"
                              : status === "current"
                              ? "bg-[#F5C518] text-[#1E2128]"
                              : "bg-[#ECEDEF] text-[#9CA3AF]"
                          }`}
                        >
                          {status === "completed" ? <CheckCircle className="w-4 h-4" /> : step.id}
                        </div>
                        <span className={`text-sm font-medium ${
                          status === "completed" ? "text-green-600" :
                          status === "current" ? "text-[#1E2128]" : "text-[#9CA3AF]"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {i < PROGRESS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 ${
                          getStepStatus(PROGRESS_STEPS[i + 1].id) !== "pending" 
                            ? "bg-green-500" : "bg-[#ECEDEF]"
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Urgency Banner (if not completed) */}
            {!questionarioCompletato && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
                <Clock className="w-5 h-5 text-[#C4990A] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#1E2128]">⏱ Completa il questionario prima della call</div>
                  <p className="text-sm text-[#5F6572]">
                    Claudio legge le tue risposte prima di incontrarsi con te. 
                    Più sei specifico/a, più la call sarà utile per te.
                  </p>
                </div>
              </div>
            )}

            {/* Questionnaire OR Confirmation */}
            {!questionarioCompletato ? (
              <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <h2 className="text-xl font-bold text-[#1E2128] mb-1">Raccontaci il tuo progetto</h2>
                <p className="text-sm text-[#5F6572] mb-6">
                  7 domande — circa 5 minuti. Non ci sono risposte giuste o sbagliate: sii diretto/a.
                </p>

                <div className="space-y-6">
                  {QUESTIONS.map((q, i) => (
                    <div 
                      key={q.id} 
                      className={`${q.important ? 'p-4 rounded-xl border-2 border-[#F5C518] bg-[#FEF9E7]/30' : ''}`}
                    >
                      {q.important && (
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 text-[#F5C518]" fill="#F5C518" />
                          <span className="text-xs font-bold text-[#C4990A]">LA PIÙ IMPORTANTE</span>
                        </div>
                      )}
                      <label className="block text-sm font-bold text-[#1E2128] mb-2">
                        {i + 1}. {q.question}
                      </label>
                      <textarea
                        value={risposte[q.id]}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        rows={3}
                        className="w-full p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                        style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                        data-testid={`question-${q.id}`}
                      />
                      <div className="text-xs text-right mt-1" style={{ color: risposte[q.id].length >= 10 ? '#10B981' : '#9CA3AF' }}>
                        {risposte[q.id].length}/10+ caratteri
                      </div>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || loading}
                  className="w-full mt-6 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="submit-questionario"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Invia le mie risposte <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {!isFormValid && (
                  <p className="text-xs text-center mt-2 text-[#9CA3AF]">
                    Completa tutte le domande (minimo 10 caratteri ciascuna)
                  </p>
                )}
              </div>
            ) : (
              /* Post-submission confirmation */
              <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E2128] mb-2">✅ Risposte inviate!</h2>
                  <p className="text-[#5F6572]">
                    Claudio leggerà le tue risposte prima della call.
                    <br />
                    Ti contatterà entro 48 ore all'email <strong>{clienteEmail}</strong> per fissare 
                    il giorno e l'ora che preferisci.
                  </p>
                </div>

                <div className="border-t pt-6" style={{ borderColor: '#ECEDEF' }}>
                  <h3 className="font-bold text-[#1E2128] mb-4">Nel frattempo puoi guardare questi materiali preparatori:</h3>
                  <div className="grid gap-3">
                    {RISORSE_POST_INVIO.map((risorsa, i) => (
                      <div 
                        key={i}
                        className="p-4 rounded-xl flex items-center gap-4 hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                        style={{ border: '1px solid #ECEDEF' }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#F5C518]/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#F5C518]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-[#1E2128] text-sm">{risorsa.title}</div>
                          <div className="text-xs text-[#9CA3AF]">{risorsa.desc}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Info Box */}
            <div className="rounded-2xl p-6 sticky top-24" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h3 className="font-bold text-[#1E2128] mb-1">Il tuo team ti aspetta</h3>
              <p className="text-xs text-[#5F6572] mb-4">
                Dopo la call, se il progetto è adatto, avrai accesso a:
              </p>
              
              <div className="space-y-3">
                {TEAM_MEMBERS.map((member, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ 
                        background: member.isHuman ? '#FAFAF7' : '#FEF9E7',
                        color: member.isHuman ? '#5F6572' : '#C4990A'
                      }}
                    >
                      {member.isHuman ? '👤' : '🟡'}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#1E2128]">{member.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact Box */}
            <div className="rounded-2xl p-6" style={{ background: '#1E2128' }}>
              <h3 className="font-bold text-white mb-2">Hai domande?</h3>
              <p className="text-xs text-white/60 mb-4">
                Contattaci per qualsiasi informazione.
              </p>
              <a 
                href="mailto:assistenza@evolution-pro.it"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-[#F5C518] text-[#1E2128]"
              >
                Scrivici <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClienteDashboard;
