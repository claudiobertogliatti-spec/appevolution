import React, { useState, useEffect } from "react";
import { 
  CheckCircle, Clock, Gift, Play, Lock, Send,
  Target, Lightbulb, Rocket, Megaphone, Users, Shield,
  ChevronRight, Calendar, Video, FileText, ArrowRight,
  Map, Sparkles, User, GraduationCap, TrendingUp, Award,
  AlertTriangle, Star, Loader2, BookOpen, ChevronDown, Download
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

// Progress Steps
const PROGRESS_STEPS = [
  { id: 1, label: "Acquisto", icon: CheckCircle, status: "completed" },
  { id: 2, label: "Questionario", icon: FileText, status: "current" },
  { id: 3, label: "Call con Claudio", icon: Video, status: "pending" }
];

// Team members for info box (aggiunto Stefania)
const TEAM_MEMBERS = [
  { name: "VALENTINA", role: "strategia e onboarding", color: "#F5C518" },
  { name: "ANDREA", role: "produzione contenuti", color: "#F5C518" },
  { name: "MARCO", role: "accountability settimanale", color: "#F5C518" },
  { name: "GAIA", role: "supporto tecnico", color: "#F5C518" },
  { name: "STEFANIA", role: "coordinatrice", color: "#F5C518" },
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

// I 7 Bonus Formativi (stessi della sezione Partner)
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint",
    subtitle: "Che Evita il Fallimento del 90% dei Corsi",
    icon: Target,
    color: "#F5C518",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Vero Nemico", icon: AlertTriangle },
      { id: "cap2", title: "Corso vs Percorso", icon: Target },
      { id: "cap3", title: "L'Errore Comune", icon: Lightbulb },
      { id: "cap4", title: "Dal Punto A al B", icon: ChevronRight },
      { id: "cap5", title: "I Moduli", icon: BookOpen },
      { id: "cap6", title: "Il Blueprint", icon: CheckCircle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata."
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    subtitle: "Ed Eliminare il Superfluo",
    icon: Lightbulb,
    color: "#10B981",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Meno è Meglio", icon: Target },
      { id: "cap2", title: "Il Filtro", icon: Lightbulb },
      { id: "cap3", title: "Cosa Tagliare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più."
  },
  {
    id: 3,
    title: "Durata delle Lezioni",
    subtitle: "La Scelta che Influenza le Vendite",
    icon: Clock,
    color: "#3B82F6",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Come Studia Online", icon: Users },
      { id: "cap2", title: "La Durata Ideale", icon: Clock },
      { id: "cap3", title: "Struttura Efficace", icon: Target },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Come ragiona davvero una persona che studia online e quale durata funziona meglio."
  },
  {
    id: 4,
    title: "Funnel di Vendita",
    subtitle: "La Struttura Minima Indispensabile",
    icon: Rocket,
    color: "#8B5CF6",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Cos'è un Funnel", icon: Rocket },
      { id: "cap2", title: "Gli Elementi Base", icon: Target },
      { id: "cap3", title: "La Sequenza", icon: ChevronRight },
      { id: "cap4", title: "Errori da Evitare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Senza questa struttura il corso NON vende. Scopri il minimo indispensabile."
  },
  {
    id: 5,
    title: "ADV: Quando Funzionano",
    subtitle: "E Quando Sono Solo Spreco",
    icon: Megaphone,
    color: "#EF4444",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Mito della Pubblicità", icon: Megaphone },
      { id: "cap2", title: "Quando Investire", icon: Target },
      { id: "cap3", title: "Quando Evitare", icon: AlertTriangle },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "La pubblicità non è una soluzione universale. Scopri quando funziona davvero."
  },
  {
    id: 6,
    title: "Profili Social",
    subtitle: "La Funzione Reale (Non Estetica)",
    icon: Users,
    color: "#EC4899",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Lo Scopo Vero", icon: Target },
      { id: "cap2", title: "Contenuti che Convertono", icon: Lightbulb },
      { id: "cap3", title: "La Strategia Minima", icon: ChevronRight },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "I social non servono a essere creativi. Servono a guidare verso il tuo corso."
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Shield,
    color: "#F97316",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Limite del Fai-da-Te", icon: AlertTriangle },
      { id: "cap2", title: "Cosa Delegare", icon: Target },
      { id: "cap3", title: "Il Sistema", icon: Lightbulb },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Non è questione di bravura. È questione di sistema e di sapere quando chiedere aiuto."
  }
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
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [expandedBonus, setExpandedBonus] = useState(null);

  // Aggiorna stato quando cambiano le props del cliente
  useEffect(() => {
    setQuestionarioCompletato(cliente?.questionario?.completato || false);
  }, [cliente?.questionario?.completato]);

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
      // 1. Salva le risposte del questionario
      await axios.post(`${API}/clienti/${cliente.id}/questionario`, risposte);
      
      // 2. Avvia automaticamente il workflow di generazione analisi
      try {
        await axios.post(`${API}/clienti/${cliente.id}/avvia-analisi`);
        console.log("Workflow analisi avviato in background");
      } catch (workflowErr) {
        console.warn("Errore avvio workflow (non bloccante):", workflowErr);
      }
      
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
                  {QUESTIONS.map((q, idx) => (
                    <div 
                      key={q.id} 
                      className={`space-y-2 ${q.important ? 'p-4 rounded-xl' : ''}`}
                      style={q.important ? { border: '2px solid #F5C518', background: '#FEF9E7' } : {}}
                    >
                      {q.important && (
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-[#F5C518]" fill="#F5C518" />
                          <span className="text-xs font-bold text-[#C4990A] uppercase">La più importante</span>
                        </div>
                      )}
                      <label className="block text-sm font-bold text-[#1E2128]">
                        {idx + 1}. {q.question}
                      </label>
                      <textarea
                        value={risposte[q.id]}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        placeholder={q.placeholder}
                        rows={q.important ? 4 : 3}
                        className="w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                        style={{ background: q.important ? '#FFFFFF' : '#FAFAF7', border: '1px solid #ECEDEF' }}
                        data-testid={`question-${q.id}`}
                      />
                      {risposte[q.id].length > 0 && risposte[q.id].length < 10 && (
                        <p className="text-xs text-red-500">Minimo 10 caratteri ({10 - risposte[q.id].length} rimanenti)</p>
                      )}
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
              /* Post-submission - Area con bonus, video e servizi */
              <div className="space-y-6">
                {/* Conferma invio */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1E2128] mb-1">✅ Questionario completato!</h2>
                      <p className="text-[#5F6572]">
                        Il Team Evolution ti contatterà entro 48 ore all'email <strong>{clienteEmail}</strong> per 
                        fissare la videocall strategica di 60 minuti.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Analisi Strategica - Download DOCX */}
                {cliente?.docx_analisi_url ? (
                  <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #8B5CF620 0%, #F5C51820 100%)', border: '2px solid #8B5CF6' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-[#1E2128] mb-1">📄 La tua Analisi Strategica è pronta!</h2>
                        <p className="text-[#5F6572] mb-4">
                          Abbiamo preparato un documento personalizzato basato sulle tue risposte. 
                          Scaricalo e portalo con te alla videocall.
                        </p>
                        <button
                          onClick={() => window.open(`${API}/clienti/${cliente.id}/scarica-docx`, '_blank')}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all hover:opacity-90"
                          style={{ background: '#8B5CF6', color: 'white' }}
                          data-testid="download-analisi-docx"
                        >
                          <Download className="w-5 h-5" />
                          Scarica Analisi Strategica (DOCX)
                        </button>
                      </div>
                    </div>
                  </div>
                ) : cliente?.workflow_status === 'generazione_ai' || cliente?.workflow_status === 'generazione_docx' ? (
                  <div className="rounded-2xl p-6" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                    <div className="flex items-center gap-4">
                      <Loader2 className="w-8 h-8 text-[#F5C518] animate-spin" />
                      <div>
                        <h3 className="font-bold text-[#1E2128]">Stiamo preparando la tua Analisi Strategica...</h3>
                        <p className="text-sm text-[#5F6572]">Sarà disponibile tra pochi secondi</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Video di Benvenuto */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="aspect-video bg-[#1E2128] flex items-center justify-center relative">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[#F5C518]/20 flex items-center justify-center mx-auto mb-4">
                        <Play className="w-10 h-10 text-[#F5C518]" />
                      </div>
                      <p className="text-white/60 text-sm">Video in arrivo</p>
                      <p className="text-white font-bold mt-2">Messaggio di benvenuto da Claudio</p>
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                      <Clock className="w-3 h-3 text-white/60" />
                      <span className="text-xs text-white/60">~3 min</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-[#1E2128]">Video di Benvenuto</h3>
                    <p className="text-sm text-[#5F6572]">Un messaggio personale per iniziare il tuo percorso</p>
                  </div>
                </div>

                {/* 3 Risorse Preparatorie */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h3 className="font-bold text-[#1E2128] mb-4">Materiali preparatori</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    {[
                      { title: "Come funziona la tua Accademia Digitale", desc: "Guida rapida", icon: GraduationCap, color: "#F5C518" },
                      { title: "I 3 errori più comuni dei formatori online", desc: "Evita le trappole", icon: AlertTriangle, color: "#EF4444" },
                      { title: "Cosa succede dopo la call", desc: "Il percorso completo", icon: Map, color: "#3B82F6" }
                    ].map((risorsa, i) => (
                      <div 
                        key={i}
                        className="p-4 rounded-xl flex flex-col items-center text-center hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                        style={{ border: '1px solid #ECEDEF' }}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: `${risorsa.color}20` }}>
                          <risorsa.icon className="w-6 h-6" style={{ color: risorsa.color }} />
                        </div>
                        <div className="font-bold text-[#1E2128] text-sm mb-1">{risorsa.title}</div>
                        <div className="text-xs text-[#9CA3AF]">{risorsa.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* I 7 Bonus Formativi */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <Gift className="w-6 h-6 text-[#F5C518]" />
                    <h3 className="text-lg font-bold text-[#1E2128]">I tuoi 7 Bonus Formativi</h3>
                  </div>
                  <p className="text-sm text-[#5F6572] mb-4">
                    Accedi subito ai bonus promessi. Ti preparano a capire cosa serve per creare un videocorso che vende.
                  </p>
                  <div className="space-y-3">
                    {BONUS_DATA.map((bonus) => (
                      <div
                        key={bonus.id}
                        className="rounded-xl overflow-hidden"
                        style={{ border: '1px solid #ECEDEF' }}
                      >
                        {/* Bonus Header */}
                        <div
                          onClick={() => setExpandedBonus(expandedBonus === bonus.id ? null : bonus.id)}
                          className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#FAFAF7] transition-colors"
                        >
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                            style={{ background: bonus.color }}
                          >
                            {bonus.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#1E2128]">{bonus.title}</div>
                            <div className="text-xs text-[#9CA3AF]">{bonus.subtitle}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#9CA3AF]">{bonus.chapters.length} capitoli</span>
                            <ChevronDown 
                              className={`w-4 h-4 text-[#9CA3AF] transition-transform ${expandedBonus === bonus.id ? 'rotate-180' : ''}`} 
                            />
                          </div>
                        </div>
                        
                        {/* Chapters (expanded) */}
                        {expandedBonus === bonus.id && (
                          <div className="border-t border-[#ECEDEF] p-4 bg-[#FAFAF7]">
                            <p className="text-sm text-[#5F6572] mb-3">{bonus.summary}</p>
                            <div className="grid grid-cols-2 gap-2">
                              {bonus.chapters.map((chapter, i) => {
                                const ChapterIcon = chapter.icon;
                                return (
                                  <div 
                                    key={i}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-white hover:bg-[#FEF9E7] cursor-pointer transition-colors"
                                  >
                                    <ChapterIcon className="w-4 h-4" style={{ color: bonus.color }} />
                                    <span className="text-xs text-[#1E2128]">{chapter.title}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Servizio Avatar AI */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #7B68AE 0%, #9B8BC4 100%)' }}>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-white" />
                      <span className="text-xs font-bold text-white/80 uppercase">Servizio Extra</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Crea il Corso con l'Avatar AI</h3>
                    <p className="text-white/80 text-sm mb-4">
                      Non vuoi metterti davanti alla telecamera? Nessun problema. 
                      Puoi creare il tuo intero videocorso usando un avatar digitale che parla con la tua voce.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { step: "1", title: "Carica foto" },
                        { step: "2", title: "Registra voce" },
                        { step: "3", title: "Ricevi video" }
                      ].map((item, i) => (
                        <div key={i} className="text-center p-3 rounded-xl bg-white/10">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1">
                            <span className="text-sm font-bold text-white">{item.step}</span>
                          </div>
                          <div className="text-xs text-white/80">{item.title}</div>
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-3 rounded-xl font-bold text-sm bg-white text-[#7B68AE] hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                      Scopri di più <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Roadmap Partnership Preview */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <Map className="w-6 h-6 text-[#F5C518]" />
                    <h3 className="text-lg font-bold text-[#1E2128]">Il Percorso Partnership</h3>
                  </div>
                  <p className="text-sm text-[#5F6572] mb-4">
                    Dopo la call strategica, se il progetto è idoneo, questo sarà il tuo percorso:
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {[
                      { phase: "F1", label: "Posizionamento" },
                      { phase: "F2", label: "Struttura" },
                      { phase: "F3", label: "Masterclass" },
                      { phase: "F5", label: "Video" },
                      { phase: "F8", label: "Lancio" },
                      { phase: "F10+", label: "Scala" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 flex-shrink-0">
                        <div className="px-3 py-2 rounded-lg text-center" style={{ background: '#FEF9E7' }}>
                          <div className="text-xs font-bold text-[#C4990A]">{item.phase}</div>
                          <div className="text-[10px] text-[#5F6572]">{item.label}</div>
                        </div>
                        {i < 5 && <ArrowRight className="w-3 h-3 text-[#ECEDEF]" />}
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
