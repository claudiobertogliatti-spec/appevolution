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
    description: "Descrivi la tua competenza principale.",
    examples: [
      "coach di comunicazione per manager",
      "nutrizionista specializzata in donne over 40",
      "consulente fiscale per freelance",
      "formatore sulla gestione dello stress"
    ],
    important: false
  },
  {
    id: "cliente_ideale",
    question: "Chi è il tuo cliente ideale?",
    description: "Descrivi la persona che vorresti aiutare con la tua accademia.",
    bullets: [
      "età o fase della vita",
      "professione",
      "problema principale",
      "situazione attuale"
    ],
    bulletPrefix: "Se puoi, indica:",
    important: false
  },
  {
    id: "risultato_concreto",
    question: "Quale risultato concreto vorresti aiutarlo a ottenere?",
    description: "In altre parole: dopo il tuo percorso, cosa cambia per questa persona? Quale trasformazione prometti?",
    examples: [
      "superare l'ansia nel parlare in pubblico",
      "migliorare la gestione del tempo",
      "imparare a gestire la propria alimentazione"
    ],
    important: false
  },
  {
    id: "pubblico_esistente",
    question: "Hai già un pubblico o persone che ti seguono?",
    description: "Social, community, newsletter, clienti.",
    examples: [
      "2.000 follower Instagram",
      "newsletter da 500 iscritti",
      "gruppo Facebook da 300 persone"
    ],
    note: "Se non hai ancora un pubblico, scrivi \"No\".",
    important: false
  },
  {
    id: "esperienze_passate",
    question: "Hai già venduto qualcosa online o lavori già con clienti su questo tema?",
    description: "Consulenze, corsi, workshop, percorsi 1:1. Raccontaci cosa hai già proposto e com'è andata.",
    note: "Se è la prima volta, puoi scrivere: \"No, è la mia prima esperienza online\".",
    important: false
  },
  {
    id: "ostacolo_principale",
    question: "Qual è il principale ostacolo che finora ti ha bloccato dal digitalizzare la tua competenza?",
    description: "Ad esempio:",
    bullets: [
      "mancanza di tempo",
      "difficoltà tecniche",
      "non sapere da dove iniziare",
      "paura che non funzioni",
      "mancanza di pubblico",
      "difficoltà a strutturare il percorso"
    ],
    important: false
  },
  {
    id: "perche_adesso",
    question: "Perché proprio adesso?",
    description: "Cosa è cambiato rispetto ai mesi scorsi? Perché senti che questo è il momento giusto per costruire la tua Accademia Digitale?",
    important: true
  }
];

// I 7 Bonus Formativi (contenuti completi come nella sezione Partner)
const BONUS_DATA = [
  {
    id: 1,
    title: "Il Blueprint che Evita il Fallimento del 90% dei Corsi",
    content: `La maggior parte dei corsi fallisce prima ancora di essere registrata.

Il motivo è semplice: si parte dai contenuti invece che dal problema.

Molti professionisti pensano:

"Ho tante cose da insegnare, faccio un corso."

Il mercato però non compra contenuti.

**Compra soluzioni.**

La prima domanda da farsi non è:

Cosa posso insegnare?

Ma:

**Quale problema urgente posso aiutare a risolvere?**

**Punto chiave:**

Un corso nasce da un problema chiaro, non da una lista di argomenti.`
  },
  {
    id: 2,
    title: "Argomenti che Vendono",
    content: `Un errore molto comune è voler insegnare tutto.

Si creano corsi lunghi, pieni di moduli, che cercano di coprire ogni possibile aspetto.

Il risultato?

Un percorso dispersivo che confonde lo studente e riduce le vendite.

I corsi che funzionano fanno l'opposto:

**selezionano pochi passaggi essenziali e costruiscono un percorso chiaro.**

**Punto chiave:**

Un buon corso elimina il superfluo prima ancora di registrare le lezioni.`
  },
  {
    id: 3,
    title: "La Durata delle Lezioni",
    content: `Molti corsi online hanno lezioni troppo lunghe.

Video da 30 o 40 minuti sembrano completi… ma spesso vengono abbandonati.

Nel digitale la regola è semplice:

**lezioni brevi, chiare e focalizzate.**

Quando ogni lezione risolve un micro problema specifico, lo studente resta coinvolto e completa il percorso.

**Punto chiave:**

La struttura delle lezioni influenza direttamente l'esperienza dello studente.`
  },
  {
    id: 4,
    title: "Il Funnel di Vendita",
    content: `Un corso non si vende da solo.

Molti professionisti pensano che basti pubblicarlo su una piattaforma.

In realtà ogni corso ha bisogno di una struttura minima di vendita:

• una pagina che spiega il problema
• una presentazione che mostra la soluzione
• un percorso che accompagna il cliente alla decisione.

Questo sistema è chiamato **funnel di vendita**.

**Punto chiave:**

Il corso è il prodotto. Il funnel è il sistema che lo vende.`
  },
  {
    id: 5,
    title: "Le ADV",
    content: `Le campagne pubblicitarie possono accelerare molto la crescita di un corso.

Ma funzionano solo quando la struttura strategica è già chiara.

Se il posizionamento è confuso o il messaggio non è forte, le ADV amplificano il problema invece di risolverlo.

Per questo le campagne funzionano solo quando il progetto è già solido.

**Punto chiave:**

Le ADV accelerano ciò che funziona già.`
  },
  {
    id: 6,
    title: "I Social",
    content: `Molti professionisti pensano che i social servano per pubblicare contenuti ogni giorno.

In realtà la funzione principale dei social è molto più semplice:

**costruire fiducia.**

I social non vendono direttamente il corso.

Aiutano le persone a capire chi sei, cosa fai e perché dovrebbero fidarsi di te.

**Punto chiave:**

I social costruiscono relazione prima della vendita.`
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    content: `Il più grande ostacolo alla riuscita di un corso online non è la competenza.

È cercare di fare tutto da soli.

Strategia, contenuti, video, marketing, piattaforma, vendite.

Quando una persona prova a gestire tutto insieme, il progetto rallenta o si blocca.

I progetti che funzionano di solito hanno una struttura chiara e un sistema che guida ogni fase.

**Punto chiave:**

Un sistema riduce l'incertezza e accelera i risultati.`
  }
];

// Introduzione del Mini Corso
const INTRO_MINI_CORSO = `Se stai leggendo questa guida è molto probabile che tu sia una persona competente.

Hai esperienza. Hai lavorato con clienti reali. Hai costruito competenze che hanno valore.

Ed è naturale che prima o poi arrivi questa domanda:

**"Posso trasformare quello che so fare in un videocorso?"**

La risposta è sì.

Ma c'è una cosa che quasi nessuno dice chiaramente:

**Creare un videocorso è facile.
Creare un progetto digitale che venda nel tempo è tutta un'altra cosa.**

Ogni anno migliaia di professionisti registrano videocorsi che:

✗ non vendono
✗ vendono pochissimo
✗ vengono abbandonati dagli studenti
✗ non generano entrate nel tempo

E quasi mai il problema è la qualità del contenuto.

**Il problema è che manca una struttura strategica prima di iniziare.**

In questa breve guida vedremo i principi fondamentali che permettono di evitare gli errori più comuni e costruire le basi di un progetto digitale sostenibile.`;

// Conclusione del Mini Corso
const CONCLUSIONE_MINI_CORSO = `Se hai letto tutti i moduli di questa guida, ormai è chiaro un punto.

**Creare un videocorso non è difficile.**

**Costruire un progetto digitale che venda nel tempo è un'altra cosa.**

Serve:

• un problema reale da risolvere
• un posizionamento chiaro
• un percorso formativo credibile
• una struttura di vendita
• un sistema che coordini tutto

Quando questi elementi sono allineati, un corso può diventare un vero asset digitale.

Quando mancano, il rischio è sempre lo stesso: mesi di lavoro per un prodotto che il mercato non compra.

**Per questo la call strategica di analisi serve prima di tutto a verificare la fattibilità del progetto.**`;

export function ClienteDashboard({ cliente, onLogout }) {
  const [questionarioCompletato, setQuestionarioCompletato] = useState(
    cliente?.questionario?.completato || false
  );
  const [risposte, setRisposte] = useState({
    expertise: "",
    cliente_ideale: "",
    risultato_concreto: "",
    pubblico_esistente: "",
    esperienze_passate: "",
    ostacolo_principale: "",
    perche_adesso: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBonus, setSelectedBonus] = useState(null);
  const [expandedBonus, setExpandedBonus] = useState(null);
  const [showQuestionario, setShowQuestionario] = useState(false); // Pre-questionario intro

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

            {/* PRE-QUESTIONARIO INTRO PAGE */}
            {!questionarioCompletato && !showQuestionario ? (
              <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                
                {/* PROGRESS BAR - PRE QUESTIONARIO */}
                <div className="mb-8">
                  <p className="text-sm text-[#5F6572] mb-4">
                    ✅ Sei nella fase <strong>1/3</strong> del processo che porta alla costruzione della tua Accademia Digitale.
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Step 1 - Acquisto (Completato) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#10B981]">Acquisto</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#ECEDEF] rounded mx-2">
                      <div className="h-full w-0 bg-[#10B981] rounded"></div>
                    </div>
                    {/* Step 2 - Questionario (Da fare) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ECEDEF] flex items-center justify-center">
                        <span className="text-sm font-bold text-[#9CA3AF]">2</span>
                      </div>
                      <span className="text-sm font-medium text-[#9CA3AF]">Questionario</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#ECEDEF] rounded mx-2"></div>
                    {/* Step 3 - Call (Da fare) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ECEDEF] flex items-center justify-center">
                        <span className="text-sm font-bold text-[#9CA3AF]">3</span>
                      </div>
                      <span className="text-sm font-medium text-[#9CA3AF]">Call con Claudio</span>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-black text-[#1E2128] mb-4">
                  ✅ Benvenuto in Evolution PRO
                </h2>
                
                <p className="text-[#5F6572] mb-6 leading-relaxed">
                  Hai completato correttamente l'accesso alla fase di Analisi Strategica.
                </p>

                <p className="text-[#5F6572] mb-4 leading-relaxed">
                  Il prossimo passo è <strong>raccontarci il tuo progetto</strong>.<br />
                  Ti faremo alcune domande semplici che ci aiuteranno a capire se la tua competenza può diventare una Accademia Digitale sostenibile nel tempo.
                </p>

                <div className="flex items-center gap-2 mb-6 text-[#5F6572]">
                  <Clock className="w-5 h-5 text-[#F5C518]" />
                  <span><strong>Tempo richiesto:</strong> circa 5 minuti.</span>
                </div>

                <div className="rounded-xl p-4 mb-6" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                  <p className="text-[#5F6572] leading-relaxed">
                    Non esistono risposte giuste o sbagliate.<br />
                    <strong>Più sarai concreto e dettagliato, più la nostra analisi sarà precisa e utile.</strong>
                  </p>
                </div>

                {/* Sezione "Perché ti chiediamo queste informazioni" */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#F5C518]" />
                    Perché ti chiediamo queste informazioni?
                  </h3>
                  <p className="text-[#5F6572] mb-3">Le tue risposte ci permettono di:</p>
                  <ul className="space-y-2 text-[#5F6572]">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-1" />
                      <span>capire il tuo posizionamento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-1" />
                      <span>analizzare il potenziale del mercato</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-1" />
                      <span>valutare la fattibilità del progetto</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-1" />
                      <span>preparare la call strategica</span>
                    </li>
                  </ul>
                </div>

                <p className="text-[#5F6572] mb-8 leading-relaxed">
                  Una volta completato il questionario, il team Evolution analizzerà il tuo progetto e preparerà la tua <strong>Analisi Strategica</strong>.
                </p>

                <p className="text-[#5F6572] mb-6 font-medium">
                  Quando sei pronto puoi iniziare.
                </p>

                <button
                  onClick={() => setShowQuestionario(true)}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all hover:opacity-90"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="inizia-questionario-btn"
                >
                  INIZIA IL QUESTIONARIO
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : !questionarioCompletato && showQuestionario ? (
              /* QUESTIONARIO FORM - 4 BLOCCHI */
              <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                
                {/* PROGRESS BAR - QUESTIONARIO */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    {/* Step 1 - Acquisto (Completato) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#10B981]">Acquisto</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#10B981] rounded mx-2"></div>
                    {/* Step 2 - Questionario (In corso) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center">
                        <span className="text-sm font-bold text-[#1E2128]">2</span>
                      </div>
                      <span className="text-sm font-medium text-[#1E2128]">Questionario</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#ECEDEF] rounded mx-2"></div>
                    {/* Step 3 - Call (Da fare) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#ECEDEF] flex items-center justify-center">
                        <span className="text-sm font-bold text-[#9CA3AF]">3</span>
                      </div>
                      <span className="text-sm font-medium text-[#9CA3AF]">Call con Claudio</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#10B981] font-medium">
                    ✅ Ottimo... ci sei quasi
                  </p>
                </div>

                {/* BLOCCO 1 — Titolo */}
                <div className="mb-8">
                  <h2 className="text-2xl font-black text-[#1E2128] mb-4">Raccontaci il tuo progetto</h2>
                  <p className="text-[#5F6572] mb-2">
                    <strong>7 domande — circa 5 minuti</strong>
                  </p>
                  <p className="text-[#5F6572]">
                    Non ci sono risposte giuste o sbagliate.<br />
                    Più sarai concreto nelle risposte, più l'analisi strategica sarà utile e precisa.
                  </p>
                </div>

                {/* BLOCCO 2 — Spiegazione */}
                <div className="rounded-xl p-5 mb-8" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                  <p className="text-[#5F6572] mb-3">
                    Le informazioni che inserirai ci aiuteranno a capire se la tua competenza può essere trasformata in una <strong>Accademia Digitale</strong> sostenibile nel tempo.
                  </p>
                  <p className="text-[#5F6572] mb-3">
                    Il nostro obiettivo non è creare semplicemente un videocorso, ma verificare se esistono le basi per costruire un <strong>vero asset digitale</strong>.
                  </p>
                  <p className="text-[#5F6572] font-medium">
                    Rispondi nel modo più concreto possibile.
                  </p>
                </div>

                {/* BLOCCO 3 — Il questionario */}
                <div className="space-y-8">
                  {QUESTIONS.map((q, idx) => (
                    <div 
                      key={q.id} 
                      className={`space-y-3 ${q.important ? 'p-5 rounded-xl' : ''}`}
                      style={q.important ? { border: '2px solid #F5C518', background: '#FEF9E7' } : {}}
                    >
                      {q.important && (
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 text-[#F5C518]" fill="#F5C518" />
                          <span className="text-xs font-bold text-[#C4990A] uppercase">La più importante</span>
                        </div>
                      )}
                      
                      {/* Titolo domanda */}
                      <label className="block text-base font-bold text-[#1E2128]">
                        {idx + 1}. {q.question}
                      </label>
                      
                      {/* Spiegazione */}
                      <div className="text-sm text-[#5F6572]">
                        {q.description && <p className="mb-2">{q.description}</p>}
                        
                        {/* Bullet prefix (es: "Se puoi, indica:") */}
                        {q.bulletPrefix && <p className="mb-1">{q.bulletPrefix}</p>}
                        
                        {/* Bullets list */}
                        {q.bullets && (
                          <ul className="mb-2 space-y-0.5">
                            {q.bullets.map((b, i) => (
                              <li key={i}>• {b}</li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Examples */}
                        {q.examples && (
                          <div className="mb-2">
                            <span className="text-[#9CA3AF]">Esempi: </span>
                            {q.examples.map((ex, i) => (
                              <span key={i} className="text-[#5F6572]">
                                {ex}{i < q.examples.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Note */}
                        {q.note && <p className="text-[#9CA3AF] italic">{q.note}</p>}
                      </div>
                      
                      {/* Campo risposta */}
                      <textarea
                        value={risposte[q.id]}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        rows={4}
                        className="w-full p-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
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
                  <div className="mt-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* BLOCCO 4 — Pulsante finale */}
                <div className="mt-10 pt-6" style={{ borderTop: '1px solid #ECEDEF' }}>
                  <p className="text-[#5F6572] mb-2">
                    Una volta inviato il questionario il team Evolution analizzerà il tuo progetto e preparerà la tua <strong>Analisi Strategica</strong>.
                  </p>
                  <p className="text-[#5F6572] mb-6">
                    Riceverai presto una comunicazione per la call di analisi.
                  </p>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || loading}
                    className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ background: '#F5C518', color: '#1E2128' }}
                    data-testid="submit-questionario"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        INVIA IL QUESTIONARIO
                      </>
                    )}
                  </button>
                  {!isFormValid && (
                    <p className="text-xs text-center mt-3 text-[#9CA3AF]">
                      Completa tutte le domande (minimo 10 caratteri ciascuna)
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* POST-QUESTIONARIO - Nuova struttura */
              <div className="space-y-6">
                
                {/* ═══════════════════════════════════════════════════════════════════════
                    PROGRESS BAR - POST QUESTIONARIO
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="flex items-center gap-2 mb-4">
                    {/* Step 1 - Acquisto (Completato) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#10B981]">Acquisto</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#10B981] rounded mx-2"></div>
                    {/* Step 2 - Questionario (Completato) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#10B981]">Questionario</span>
                    </div>
                    <div className="flex-1 h-1 bg-[#10B981] rounded mx-2"></div>
                    {/* Step 3 - Call (Completato) */}
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-[#10B981]">Call con Claudio</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#10B981] font-medium">
                    ✅ Complimenti... hai terminato questo processo
                  </p>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    CONFERMA COMPLETAMENTO
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h2 className="text-2xl font-black text-[#1E2128] mb-4">
                    ✅ Questionario completato!
                  </h2>
                  <p className="text-[#5F6572] mb-4">
                    Grazie per aver condiviso le informazioni sul tuo progetto.
                  </p>
                  <p className="text-[#5F6572]">
                    Il team Evolution inizierà ora l'analisi strategica delle tue risposte.
                  </p>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    COSA SUCCEDE ADESSO - 3 STEP
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h3 className="text-lg font-bold text-[#1E2128] mb-6 flex items-center gap-2">
                    📍 Cosa succede adesso
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-[#1E2128] text-sm">1</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1E2128] mb-1">Analizziamo il tuo progetto</h4>
                        <p className="text-sm text-[#5F6572]">Studieremo le informazioni che hai inserito nel questionario.</p>
                      </div>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-[#1E2128] text-sm">2</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1E2128] mb-1">Prepariamo la tua Analisi Strategica</h4>
                        <p className="text-sm text-[#5F6572]">Valuteremo il potenziale del progetto e la possibile struttura della tua Accademia Digitale.</p>
                      </div>
                    </div>
                    
                    {/* Step 3 */}
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-[#1E2128] text-sm">3</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1E2128] mb-1">Ti contatteremo per la Call Strategica</h4>
                        <p className="text-sm text-[#5F6572]">Entro 48 ore riceverai una email per fissare una videocall di analisi con Claudio.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    I 3 ASPETTI DELLA CALL
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl p-6" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                  <p className="text-[#5F6572] mb-5">
                    Durante la call lavoreremo insieme su <strong className="text-[#1E2128]">tre aspetti fondamentali</strong>:
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#1E2128]">Verifica del problema</span>
                        <p className="text-sm text-[#5F6572]">Capire se il problema che vuoi risolvere è reale, urgente e pagato dal mercato.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#1E2128]">Studio di fattibilità</span>
                        <p className="text-sm text-[#5F6572]">Valutare se il progetto è più adatto a diventare un corso, un percorso o una accademia.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Map className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#1E2128]">Roadmap strategica</span>
                        <p className="text-sm text-[#5F6572]">Definire target, struttura e possibili modelli di vendita.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    VIDEO DI BENVENUTO
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="p-6 pb-4">
                    <h3 className="text-lg font-bold text-[#1E2128] mb-2 flex items-center gap-2">
                      🎥 Messaggio di benvenuto
                    </h3>
                    <p className="text-sm text-[#5F6572]">
                      Prima della call puoi guardare questo breve video di Claudio.
                    </p>
                    <p className="text-sm text-[#9CA3AF] mt-1">Durata: circa 3 minuti.</p>
                  </div>
                  <div className="mx-6 mb-6 rounded-xl overflow-hidden">
                    <video 
                      controls 
                      className="w-full rounded-xl"
                      poster=""
                      data-testid="video-benvenuto"
                    >
                      <source src="https://customer-assets.emergentagent.com/job_valentina-agent/artifacts/ij5wirqf_Quick_Avatar_Video.mp4" type="video/mp4" />
                      Il tuo browser non supporta il tag video.
                    </video>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════════════
                    MINI CORSO GRATUITO - 7 MODULI
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)', border: '2px solid #F5C518' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-[#F5C518]" />
                    <span className="text-xs font-bold text-[#F5C518] uppercase">Mini Corso Gratuito</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">
                    Come Creare un Videocorso che Vende Davvero
                  </h2>
                  <p className="text-white/70 text-sm">
                    Per prepararti al meglio alla call strategica abbiamo preparato una breve guida in 7 moduli che spiega i principi fondamentali per costruire un progetto digitale sostenibile.
                  </p>
                </div>

                {/* Introduzione Mini Corso */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="text-[#5F6572] space-y-3">
                    {INTRO_MINI_CORSO.split('\n').filter(p => p.trim()).map((paragraph, pIdx) => {
                      if (paragraph.trim().startsWith('✗')) {
                        return (
                          <p key={pIdx} className="ml-4 text-sm text-red-500">
                            {paragraph}
                          </p>
                        );
                      }
                      const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                      const formattedParts = parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i} className="text-[#1E2128]">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                      return (
                        <p key={pIdx} className="text-sm leading-relaxed">
                          {formattedParts}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Lista 7 Moduli */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <div className="space-y-4">
                    {BONUS_DATA.map((modulo, idx) => (
                      <div 
                        key={modulo.id}
                        className="flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#FAFAF7]"
                        style={{ border: expandedBonus === modulo.id ? '2px solid #F5C518' : '1px solid #ECEDEF', background: expandedBonus === modulo.id ? '#FEF9E7' : 'transparent' }}
                        onClick={() => setExpandedBonus(expandedBonus === modulo.id ? null : modulo.id)}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#F5C518] flex items-center justify-center flex-shrink-0">
                          <span className="font-bold text-[#1E2128] text-sm">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[#1E2128]">{modulo.title}</h4>
                            <ChevronDown className={`w-5 h-5 text-[#9CA3AF] transition-transform ${expandedBonus === modulo.id ? 'rotate-180' : ''}`} />
                          </div>
                          {expandedBonus === modulo.id && (
                            <div className="mt-3 pt-3 border-t border-[#ECEDEF]">
                              <div className="text-sm text-[#5F6572] space-y-2">
                                {modulo.content.split('\n').filter(p => p.trim()).map((paragraph, pIdx) => {
                                  if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-')) {
                                    return (
                                      <p key={pIdx} className="ml-4 text-sm">
                                        {paragraph}
                                      </p>
                                    );
                                  }
                                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                                  const formattedParts = parts.map((part, i) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={i} className="text-[#1E2128]">{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                  });
                                  return (
                                    <p key={pIdx} className="text-sm leading-relaxed">
                                      {formattedParts}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conclusione Mini Corso */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h3 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#F5C518]" />
                    Conclusione
                  </h3>
                  <div className="text-[#5F6572] space-y-3">
                    {CONCLUSIONE_MINI_CORSO.split('\n').filter(p => p.trim()).map((paragraph, pIdx) => {
                      if (paragraph.trim().startsWith('•')) {
                        return (
                          <p key={pIdx} className="ml-4 text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                            {paragraph.replace('•', '').trim()}
                          </p>
                        );
                      }
                      const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                      const formattedParts = parts.map((part, i) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i} className="text-[#1E2128]">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      });
                      return (
                        <p key={pIdx} className="text-sm leading-relaxed">
                          {formattedParts}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Call to Action finale */}
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #F5C518 0%, #E5B517 100%)' }}>
                  <p className="text-[#1E2128] mb-4">
                    Durante la call lavoreremo insieme su <strong>tre aspetti fondamentali</strong>:
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                        <span className="font-bold text-[#1E2128]">1</span>
                      </div>
                      <span className="font-medium text-[#1E2128]">Verifica del problema</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                        <span className="font-bold text-[#1E2128]">2</span>
                      </div>
                      <span className="font-medium text-[#1E2128]">Studio di fattibilità</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center">
                        <span className="font-bold text-[#1E2128]">3</span>
                      </div>
                      <span className="font-medium text-[#1E2128]">Roadmap strategica</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl">
                    <Calendar className="w-5 h-5 text-[#1E2128]" />
                    <span className="text-sm text-[#1E2128]">
                      <strong>Il team Evolution ti contatterà presto per fissare la videocall.</strong>
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Sidebar - sticky */}
          <div className="lg:sticky lg:top-24 space-y-6 self-start">
            {/* Team Info Box */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
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
