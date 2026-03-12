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
    summary: "Scopri perché la maggior parte dei videocorsi fallisce ancor prima di essere registrata e come evitare questo destino.",
    keyPoints: [
      "Il fallimento non dipende dal contenuto, ma dalla struttura",
      "La differenza tra un corso che vende e uno che no",
      "Come costruire un blueprint che guida lo studente al risultato"
    ],
    fullContent: `La maggior parte dei videocorsi fallisce prima ancora di essere registrata la prima lezione.

Non perché l'autore non sia competente.
Non perché il contenuto non sia valido.

Ma perché il corso nasce senza una strategia.

Molti professionisti partono da questo ragionamento:
• "I clienti mi fanno sempre le stesse domande"
• "Potrei spiegare tutto in un corso"
• "Registro i contenuti e poi lo metto online"

Registrano le lezioni. Caricano il corso sulla piattaforma. Aspettano le vendite.

E le vendite non arrivano.

Il motivo è semplice.

Un corso non vende perché è ben spiegato.
Vende perché risolve un problema specifico in modo chiaro.

**I tre errori fatali**

**1. Registrare prima di validare l'idea**
Registrare è facile. Validare è difficile.
Validare significa capire:
• se il problema è reale
• se le persone sono disposte a pagare per risolverlo
• se è un problema urgente

**2. Non avere un target specifico**
"Il mio corso va bene per tutti." È il modo più veloce per non vendere a nessuno.
Un corso efficace deve essere chiaro su:
• a chi è rivolto
• a chi NON è rivolto
• in quale situazione si trova la persona
• quale risultato può ottenere

**3. Pensare alla vendita solo dopo**
Molti professionisti pensano: "Prima creo il corso. Poi vediamo come venderlo."
È l'ordine sbagliato. Il sistema di vendita deve essere progettato prima dei contenuti.

**Il Blueprint corretto**
L'ordine giusto è questo:
1. Validare l'idea
2. Definire il cliente ideale
3. Costruire l'offerta
4. Strutturare il funnel
5. Registrare il corso

Seguendo questo ordine eviti di investire mesi su un prodotto che nessuno vuole comprare.`
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
    summary: "Perché scegliere meno argomenti è spesso la decisione che fa vendere di più. Il paradosso della semplicità.",
    keyPoints: [
      "Perché più contenuto = meno valore percepito",
      "Il filtro per decidere cosa includere e cosa no",
      "Come tagliare senza perdere profondità"
    ],
    fullContent: `Molti professionisti vogliono creare corsi completi.

È comprensibile.

Ma esiste un paradosso.

**Più un corso è completo, meno vende.**

Perché?

Perché un corso molto ampio appare:
• complesso
• lungo
• impegnativo

Le persone non vogliono sapere tutto.
Vogliono risolvere una cosa precisa.

**L'errore tipico**

Quando costruisci un corso senti il bisogno di:
• aggiungere moduli
• approfondire
• spiegare ogni dettaglio

Ma ogni modulo deve servire al risultato principale.
Se non serve, va eliminato.

**Come scegliere gli argomenti giusti**

1. Identifica un risultato specifico
2. Elimina ciò che non contribuisce a quel risultato
3. Trasforma ogni modulo in un mini risultato

Ogni modulo deve produrre un avanzamento concreto.

**La formula**

Corso che vende =
• 1 problema specifico
• 1 soluzione chiara
• 1 risultato concreto`
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
    summary: "Come ragiona davvero una persona che studia online e quale durata funziona meglio per massimizzare il completamento.",
    keyPoints: [
      "I dati reali sull'attenzione degli studenti online",
      "La durata ideale per ogni tipo di contenuto",
      "Come strutturare lezioni che vengono completate"
    ],
    fullContent: `Molti professionisti pensano che lezioni lunghe e approfondite aumentino il valore percepito.

Online spesso accade il contrario.

Un corso troppo lungo viene percepito come:
• pesante
• impegnativo
• difficile da completare

E quando qualcosa sembra difficile da completare, il cervello rimanda.

**Come ragiona chi studia online**

Chi compra un corso digitale:
• ha poco tempo
• ha molte distrazioni
• vuole risultati veloci
• abbandona se non vede progressi

Per questo la struttura delle lezioni è fondamentale.

**Durata consigliata**

| Tipo | Durata |
|------|--------|
| Video lezioni | 5–15 minuti massimo |
| Moduli | 30–45 minuti complessivi |
| Durata del corso | risultati visibili entro 2–4 settimane |

Questo permette allo studente di percepire progresso rapidamente.

**Struttura ideale della lezione**

1. **Introduzione (1–2 minuti)** — Cosa imparerai e perché è importante.
2. **Contenuto principale (8–10 minuti)** — La parte centrale della spiegazione.
3. **Azione pratica (2–3 minuti)** — Cosa fare subito.

Lezioni brevi aumentano:
• completamento
• soddisfazione
• recensioni positive

E le recensioni generano nuove vendite.`
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
    summary: "Senza questa struttura il corso NON vende. Scopri il minimo indispensabile per convertire visitatori in studenti.",
    keyPoints: [
      "Cos'è veramente un funnel (e cosa non è)",
      "I 4 elementi che non possono mancare",
      "Gli errori che bloccano le vendite"
    ],
    fullContent: `Un buon corso senza un sistema di vendita rimane invisibile.

Un funnel non è marketing aggressivo.

È un percorso che aiuta una persona a:
• capire il problema
• riconoscersi nella situazione
• vedere la soluzione
• prendere una decisione

**Il Funnel minimo efficace**

**1. Lead Magnet**
Un contenuto gratuito che:
• risolve un micro problema
• dimostra competenza
• raccoglie email

**2. Sequenza Email**
5–7 email che:
• costruiscono fiducia
• educano sul problema
• introducono la soluzione

**3. Pagina di vendita**
Deve includere:
• headline chiara
• problema → soluzione → risultato
• testimonianze
• garanzia
• call to action

**4. Checkout**
Deve essere:
• semplice
• veloce
• senza frizioni

Senza questi quattro elementi, le vendite dipendono dal caso.`
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
    summary: "La pubblicità non è una soluzione universale. Scopri quando funziona davvero e quando è meglio aspettare.",
    keyPoints: [
      "Perché le ads non salvano un corso che non vende",
      "I prerequisiti per investire in pubblicità",
      "Come capire se sei pronto per scalare"
    ],
    fullContent: `Molti pensano che la pubblicità sia la soluzione.

La verità è diversa.

**La pubblicità amplifica ciò che già funziona.**

Se il sistema non funziona, amplifica il problema.

**Quando le ads funzionano**
• Hai già venduto senza ads
• Il funnel converte almeno 1–2%
• Conosci il costo di acquisizione cliente
• Hai margini sufficienti

**Quando sono uno spreco**
• Non hai mai venduto il corso
• Non hai un funnel testato
• Non sai chi è il cliente ideale
• Il budget è troppo limitato

**Regola d'oro**

Prima vendi senza ads.
Poi scala con ads.`
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
    summary: "I social non servono a essere creativi. Servono a guidare verso il tuo corso. Ecco la strategia minima che funziona.",
    keyPoints: [
      "Lo scopo vero dei social per un formatore",
      "Contenuti che portano vendite (non like)",
      "La strategia minima che funziona"
    ],
    fullContent: `I social non sono vetrine estetiche.

Sono strumenti di acquisizione.

**L'errore più comune**

Creare contenuti belli senza uno scopo preciso.

Risultato:
• like
• commenti
• ma zero vendite

**La funzione dei social**

1. Attirare il target giusto
2. Educare sul problema
3. Guidare verso il funnel

**Il percorso**

Post → Profilo → Link in bio → Lead magnet → Funnel → Vendita

**Le metriche che contano**

Non follower.

Ma:
• click sul link
• iscritti email
• vendite`
  },
  {
    id: 7,
    title: "Non Fare Tutto da Solo",
    subtitle: "Il Punto che Nessuno Ama Affrontare",
    icon: Users,
    color: "#F97316",
    chapters: [
      { id: "intro", title: "Introduzione", icon: BookOpen },
      { id: "cap1", title: "Il Limite del Fai-da-Te", icon: AlertTriangle },
      { id: "cap2", title: "Cosa Delegare", icon: Target },
      { id: "cap3", title: "Il Sistema", icon: Lightbulb },
      { id: "checklist", title: "Checklist", icon: CheckCircle },
    ],
    summary: "Non è questione di bravura. È questione di sistema e di sapere quando chiedere aiuto. Questo bonus può cambiarti la vita.",
    keyPoints: [
      "Perché il fai-da-te ha un limite matematico",
      "Cosa delegare per primo (e cosa no)",
      "Come Evolution PRO ti aiuta in questo"
    ],
    fullContent: `Molti professionisti cercano di gestire tutto da soli.

Contenuto. Video. Grafica. Tecnica. Marketing.

Questo rallenta tutto.

**Cosa delegare**
• montaggio video
• grafica
• gestione tecnica
• supporto clienti
• ads management

**Cosa non delegare all'inizio**
• contenuto del corso
• strategia
• relazione con i clienti

**Quando delegare**

Quando:
• un'attività ti blocca per settimane
• il tuo tempo vale più del costo del freelancer
• il progetto è validato e devi scalare

**Come iniziare**

1. Identifica il collo di bottiglia
2. Trova 2–3 freelancer
3. Testa con piccoli progetti
4. Costruisci relazioni

**Ricorda**

Il tuo lavoro non è fare tutto.

Il tuo lavoro è:
• creare valore
• definire una trasformazione
• costruire un'offerta
• vendere in modo etico

Tutto il resto è sistema.`
  }
];

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
            {/* Welcome Header */}
            <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <h1 className="text-2xl font-black text-[#1E2128] mb-2">
                ✅ Benvenuto in Evolution PRO
              </h1>
              <p className="text-[#5F6572]">
                Hai fatto il primo passo importante verso la costruzione della tua Accademia Digitale. 
                Ora prepariamo insieme la tua Analisi Strategica.
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

            {/* Urgency Banner (if not completed and already in questionario) */}
            {!questionarioCompletato && showQuestionario && (
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

            {/* PRE-QUESTIONARIO INTRO PAGE */}
            {!questionarioCompletato && !showQuestionario ? (
              <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
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
                  <div className="aspect-video bg-[#1E2128] flex items-center justify-center relative mx-6 mb-6 rounded-xl overflow-hidden">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-[#F5C518]/20 flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-[#F5C518]/30 transition-colors">
                        <Play className="w-10 h-10 text-[#F5C518]" />
                      </div>
                      <p className="text-white font-bold">VIDEO DI BENVENUTO</p>
                    </div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10">
                      <Clock className="w-3 h-3 text-white/60" />
                      <span className="text-xs text-white/60">~3 min</span>
                    </div>
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
                                {modulo.fullContent.split('\n').filter(p => p.trim()).map((paragraph, pIdx) => {
                                  // Handle bullet points
                                  if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-')) {
                                    return (
                                      <p key={pIdx} className="ml-4 text-sm">
                                        {paragraph}
                                      </p>
                                    );
                                  }
                                  
                                  // Handle inline bold
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

                {/* ═══════════════════════════════════════════════════════════════════════
                    MESSAGGIO FINALE
                    ═══════════════════════════════════════════════════════════════════════ */}
                <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
                  <Calendar className="w-5 h-5 text-[#C4990A] flex-shrink-0" />
                  <p className="text-sm text-[#5F6572]">
                    Il team Evolution ti contatterà entro <strong className="text-[#1E2128]">48 ore</strong> per fissare la call strategica.
                  </p>
                </div>

              </div>
            )}

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

                {/* ═══════════════════════════════════════════════════════════════════════
                    MINI CORSO GRATUITO - 7 MODULI
                    ═══════════════════════════════════════════════════════════════════════ */}
                
                {/* Header Mini Corso */}
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #1E2128 0%, #2D3038 100%)', border: '2px solid #F5C518' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5 text-[#F5C518]" />
                    <span className="text-xs font-bold text-[#F5C518] uppercase">Mini Corso Gratuito — 7 moduli</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2">
                    Come Creare un Videocorso che Vende Davvero
                  </h2>
                  <p className="text-white/70 text-sm">
                    La guida strategica per evitare gli errori che fanno fallire il 90% dei corsi online
                  </p>
                </div>

                {/* Introduzione */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h3 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#F5C518]" />
                    Introduzione
                  </h3>
                  <div className="prose prose-sm max-w-none text-[#5F6572] space-y-4">
                    <p>Se stai leggendo questa guida è molto probabile che tu sia una persona competente.</p>
                    <p>Hai esperienza. Hai lavorato con clienti reali. Hai costruito competenze che hanno valore.</p>
                    <p>E forse ti sei già posto questa domanda: <strong className="text-[#1E2128]">"Posso trasformare quello che so in un videocorso?"</strong></p>
                    <p>La risposta è sì.</p>
                    <p>Ma c'è un punto che quasi nessuno dice chiaramente: <strong className="text-[#1E2128]">Creare un corso è facile. Creare un corso che venda è un'altra cosa.</strong></p>
                    <p>Ogni anno migliaia di professionisti registrano videocorsi che:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> non vendono</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> vendono pochissimo</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> vengono abbandonati dagli studenti</li>
                      <li className="flex items-center gap-2"><span className="text-red-500">✗</span> non generano entrate nel tempo</li>
                    </ul>
                    <p>E quasi mai il problema è la qualità del contenuto. <strong className="text-[#1E2128]">Il problema è la mancanza di struttura strategica prima della registrazione.</strong></p>
                    <p>In questo mini corso gratuito vedremo i principi fondamentali per evitare gli errori più comuni e costruire le basi di un progetto digitale sostenibile.</p>
                  </div>
                </div>

                {/* I 7 Moduli */}
                <div className="space-y-4">
                  {BONUS_DATA.map((modulo) => (
                    <div
                      key={modulo.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
                    >
                      {/* Module Header */}
                      <div
                        onClick={() => setExpandedBonus(expandedBonus === modulo.id ? null : modulo.id)}
                        className="p-5 flex items-center gap-4 cursor-pointer hover:bg-[#FAFAF7] transition-colors"
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                          style={{ background: modulo.color }}
                        >
                          {modulo.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#9CA3AF] font-medium mb-1">MODULO {modulo.id}</div>
                          <div className="font-bold text-[#1E2128] text-lg">{modulo.title}</div>
                          <div className="text-sm text-[#5F6572]">{modulo.subtitle}</div>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 text-[#9CA3AF] transition-transform flex-shrink-0 ${expandedBonus === modulo.id ? 'rotate-180' : ''}`} 
                        />
                      </div>
                      
                      {/* Module Content (expanded) */}
                      {expandedBonus === modulo.id && (
                        <div className="border-t border-[#ECEDEF] p-5 bg-[#FAFAF7]">
                          {/* Key Points */}
                          <div className="bg-[#FEF9E7] border border-[#F5C518]/30 rounded-xl p-4 mb-4">
                            <div className="font-bold text-sm text-[#C4990A] mb-2 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4" />
                              Punti Chiave
                            </div>
                            <ul className="space-y-2">
                              {modulo.keyPoints.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-[#5F6572]">
                                  <CheckCircle className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {/* Full Content */}
                          <div className="bg-white rounded-xl p-5 border border-[#ECEDEF]">
                            <div className="prose prose-sm max-w-none text-[#5F6572]">
                              {modulo.fullContent.split('\n\n').map((paragraph, idx) => {
                                // Handle bold headers **text**
                                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                                  return (
                                    <h4 key={idx} className="font-bold text-[#1E2128] mt-4 mb-2">
                                      {paragraph.replace(/\*\*/g, '')}
                                    </h4>
                                  );
                                }
                                
                                // Handle list items starting with • or numbers
                                if (paragraph.includes('\n•') || paragraph.startsWith('•')) {
                                  const lines = paragraph.split('\n');
                                  return (
                                    <ul key={idx} className="my-3 space-y-1">
                                      {lines.map((line, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <span className="text-[#F5C518] mt-1 flex-shrink-0">•</span>
                                          <span>{line.replace(/^•\s*/, '')}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                }
                                
                                // Handle inline bold
                                const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                                const formattedParts = parts.map((part, i) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={i} className="text-[#1E2128]">{part.slice(2, -2)}</strong>;
                                  }
                                  return part;
                                });
                                
                                return (
                                  <p key={idx} className="mb-3 text-sm leading-relaxed">
                                    {formattedParts}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Conclusione */}
                <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                  <h3 className="text-lg font-bold text-[#1E2128] mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-[#F5C518]" />
                    Conclusione: La domanda che conta davvero
                  </h3>
                  <div className="prose prose-sm max-w-none text-[#5F6572] space-y-4">
                    <p>Se hai letto tutti i moduli di questa guida, ormai è chiaro un punto:</p>
                    <p><strong className="text-[#1E2128]">Creare un videocorso non è difficile. Costruire un progetto digitale che venda nel tempo è un'altra cosa.</strong></p>
                    <p>Serve:</p>
                    <ul className="space-y-1 ml-4">
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> una struttura strategica</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> un posizionamento chiaro</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> un problema reale da risolvere</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> un percorso formativo credibile</li>
                      <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#10B981]" /> un sistema di acquisizione clienti</li>
                    </ul>
                    <p>Quando questi elementi sono allineati, un corso può diventare un vero asset digitale.</p>
                    <p>Quando mancano, il rischio è sempre lo stesso: <em>mesi di lavoro, energia e aspettative… per un prodotto che il mercato non compra.</em></p>
                  </div>
                </div>

                {/* CTA - Prossimo Passo */}
                <div className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #F5C518 0%, #E5B517 100%)' }}>
                  <h3 className="text-lg font-bold text-[#1E2128] mb-2">
                    Prima di creare il corso, serve una verifica
                  </h3>
                  <p className="text-sm text-[#1E2128]/80 mb-4">
                    Durante la <strong>Call Strategica di Analisi</strong> lavoriamo insieme su tre aspetti fondamentali:
                  </p>
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="font-bold text-[#1E2128] text-sm mb-1">1. Verifica del problema</div>
                      <div className="text-xs text-[#1E2128]/70">Capire se è reale, urgente e pagato</div>
                    </div>
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="font-bold text-[#1E2128] text-sm mb-1">2. Studio di fattibilità</div>
                      <div className="text-xs text-[#1E2128]/70">Corso, percorso o accademia?</div>
                    </div>
                    <div className="bg-white/30 rounded-xl p-3">
                      <div className="font-bold text-[#1E2128] text-sm mb-1">3. Roadmap strategica</div>
                      <div className="text-xs text-[#1E2128]/70">Target, struttura, vendita</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl">
                    <Calendar className="w-5 h-5 text-[#1E2128]" />
                    <span className="text-sm text-[#1E2128]">
                      <strong>Prossimo step:</strong> Ti contatteremo entro 48h per fissare la call strategica
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
