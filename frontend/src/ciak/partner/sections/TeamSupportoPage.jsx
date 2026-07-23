/**
 * Area Partner CIAK — Sezione Team Ibrido (Team Umano & Team AI Operativo).
 *
 * Mostra chiaramente che esiste un TEAM UMANO REALE che supervisiona e valida
 * le attività eseguite dal TEAM AI OPERATIVO 24/7.
 *
 * Utilizza le cartelle/riquadri a tendina stile FAQ (Accordion) con respiro visivo
 * identico alla sezione Materiali per non allungare troppo la pagina.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle, Send, X, ArrowRight, ShieldCheck, Sparkles, UserCheck, Star, Zap,
  ChevronDown, ChevronUp, Bot, User, Clock3, CheckCircle2, Cpu, FileText
} from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

// ─── TEAM UMANO DI SUPERVISIONE (MENTOR & SPECIALISTI REALI) ───────────────
export const HUMAN_SUPERVISION_TEAM = [
  {
    id: "CLAUDIO",
    name: "Claudio Bertogliatti",
    role: "Tutor Strategico Master & Founder Evolution PRO",
    avatar: "/founder/claudio-portrait-640.webp",
    initial: "CB",
    type: "human",
    badge: "🧑 Umano · Direzione Strategica",
    description:
      "Supervisiona la direzione master del tuo progetto lungo le 14 Fasi. Approva il Piano Operativo Strategico, il posizionamento e le metriche di sostenibilità economica.",
    focus: "Supervisione Master · Validazione 14 Fasi · Decisioni di Posizionamento",
  },
  {
    id: "STEFANIA",
    name: "Simona",
    role: "Coordinatrice Operativa Human Mentor",
    avatar: "/agents/stefania.jpg",
    initial: "S",
    type: "human",
    badge: "🧑 Umano · Coordinamento",
    description:
      "È il tuo punto di riferimento quotidiano. Mantiene le scadenze del percorso, risolve i blocchi operativi ed assegna le priorità per sbloccare ogni step.",
    focus: "Orientamento Giornaliero · Gestione Scadenze · Assegnazione Task",
  },
  {
    id: "VALENTINA",
    name: "Valentina",
    role: "Senior Brand & Copywriting Strategist",
    avatar: "/agents/valentina.jpg",
    initial: "V",
    type: "human",
    badge: "🧑 Umano · Brand & Copy",
    description:
      "Revisiona ed approva la tua promessa unica, la nicchia ICP ed il messaggio differenziante per assicurare massima resa di conversione sul tuo target.",
    focus: "Validazione Brand Kit · Revisione Copywriting · Promessa Unica",
  },
  {
    id: "ANDREA",
    name: "Andrea",
    role: "Video Coach & Director Teleprompter",
    avatar: "/agents/andrea.jpg",
    initial: "A",
    type: "human",
    badge: "🧑 Umano · Direzione Video",
    description:
      "Valida gli script della Masterclass e ti guida nella registrazione delle videolezioni, curando la tua postura, il ritmo e la presenza davanti alla telecamera.",
    focus: "Direzione Teleprompter · Script Masterclass · Presenza Kamera",
  },
  {
    id: "GAIA",
    name: "Gaia",
    role: "Tech Lead & Infrastructure Specialist",
    avatar: "/agents/gaia.jpg",
    initial: "G",
    type: "human",
    badge: "🧑 Umano · Tech Lead",
    description:
      "Supervisiona la configurazione tecnica dell'infrastruttura: domini personalizzati, integrazione del funnel web e collegamento della cassa Stripe.",
    focus: "Infrastruttura Web · Collaudo Cassa Stripe · Domini & Automazioni",
  },
];

// ─── TEAM AI OPERATIVO 24/7 (COPILOT DI ESECUZIONE VELOCE) ───────────────────
export const AI_EXECUTION_TEAM = [
  {
    id: "AI_COPY",
    name: "Copilot Posizionamento & Copy AI",
    role: "Generatore Bozze Copywriting 24/7",
    avatar: null,
    initial: "AI",
    type: "ai",
    badge: "🤖 Agent AI 24/7",
    description:
      "Elabora in tempo reale le prime bozze di posizionamento, gli outline delle lezioni e le sequenze e-mail per la successiva revisione ed approvazione del team umano.",
    focus: "Generazione Bozze · Script Masterclass · Sequenze Email",
  },
  {
    id: "AI_FUNNEL",
    name: "Copilot Funnel & Automation AI",
    role: "Pre-Configuratore Funnel & Code AI",
    avatar: null,
    initial: "AI",
    type: "ai",
    badge: "🤖 Agent AI 24/7",
    description:
      "Pre-configura le pagine web del funnel, imposta le strutture di checkout Stripe ed organizza i tag degli studenti nella piattaforma.",
    focus: "Struttura Pagine Web · Form Stripe · Trigger Automazioni",
  },
  {
    id: "AI_METRICS",
    name: "Copilot Blueprint & Metrics AI",
    role: "Simulatore Dati & Projection AI",
    avatar: null,
    initial: "AI",
    type: "ai",
    badge: "🤖 Agent AI 24/7",
    description:
      "Calcola le proiezioni numeriche, il margine operativo del tuo corso ed i tassi di conversione stimati durante la simulazione di lancio.",
    focus: "Simulazione ROI · Calcolo Pricing · Metriche Webinar",
  },
];

// ─── AVATAR CON FALLBACK ──────────────────────────────────────────────────
function Avatar({ agent, size = "w-14 h-14 sm:w-16 sm:h-16" }) {
  const [err, setErr] = useState(false);
  if (agent.type === "ai") {
    return (
      <div
        className={`${size} rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-extrabold text-lg shrink-0 border-2 border-slate-950 shadow-sm`}
      >
        <Bot className="w-8 h-8 text-slate-950" />
      </div>
    );
  }

  if (err || !agent.avatar) {
    return (
      <div
        className={`${size} rounded-full bg-slate-950 text-yellow-400 font-extrabold flex items-center justify-center text-lg shrink-0 border-2 border-yellow-400 shadow-sm`}
      >
        {agent.initial}
      </div>
    );
  }
  return (
    <img
      src={agent.avatar}
      alt={agent.name}
      onError={() => setErr(true)}
      className={`${size} rounded-full object-cover bg-slate-950 shrink-0 border-2 border-yellow-400 shadow-sm`}
    />
  );
}

// ─── DRAWER CHAT INTERATTIVO VERSO UN MEMBRO ──────────────────────────────
function TeamChatDrawer({ agent, partner, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao! Sono ${agent.name}, ${agent.role}. Come posso esserti utile oggi?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const r = await fetch(`${API}/api/stefania/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partner?.id || "demo_partner",
          user_name: partner?.name || "Partner CIAK",
          message: userMsg.content,
          target_agent: agent.id,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const reply = data.reply || "Messaggio ricevuto! Come posso supportarti sul prossimo step?";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `Richiesta inoltrata a ${agent.name}! Ti risponderò al più presto con indicazioni precise.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-[440px] max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif] border-l border-slate-200">
        <header className="border-b border-slate-200 p-5 flex items-center gap-3 bg-slate-950 text-white">
          <Avatar agent={agent} size="w-12 h-12" />
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-white text-base truncate">{agent.name}</div>
            <div className="text-xs text-yellow-400 font-semibold truncate">{agent.role}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="border-b border-slate-200 px-5 py-3 bg-slate-50 text-xs">
          <span className="font-bold text-amber-600 block uppercase tracking-wider">Area di intervento</span>
          <p className="text-slate-700 font-medium mt-0.5">{agent.focus}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-slate-950 text-yellow-400 font-medium shadow-sm"
                    : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
          {sending && (
            <div>
              <span className="inline-block px-4 py-2.5 rounded-2xl text-xs bg-white text-slate-500 border border-slate-200 shadow-sm">
                {agent.name} sta elaborando...
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-200 p-4 bg-white flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Scrivi a ${agent.name}...`}
            disabled={sending}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="bg-yellow-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs hover:bg-yellow-300 transition shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── CARD MEMBRO TEAM COMPATTA ─────────────────────────────────────────────
function MemberCard({ agent, onChat }) {
  const isHuman = agent.type === "human";
  return (
    <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 hover:border-amber-400 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group">
      <div className="space-y-3">
        
        {/* HEADER MEMBER CARD: FOTO + NOME + BADGE */}
        <div className="flex items-start gap-3.5">
          <Avatar agent={agent} />
          <div className="min-w-0 space-y-1">
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-block ${
              isHuman ? "bg-amber-100 text-amber-950 border border-amber-300" : "bg-slate-950 text-yellow-400 font-mono"
            }`}>
              {agent.badge}
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-950 leading-snug group-hover:text-amber-600 transition">
              {agent.name}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {agent.role}
            </p>
          </div>
        </div>

        {/* DESCRIZIONE RUOLO */}
        <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100 font-normal">
          {agent.description}
        </p>

        {/* FOCUS OPERATIVO COMPATTO */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-[11px] font-medium text-slate-700">
          <span className="font-bold text-slate-950 block mb-0.5">Focus Specifico:</span>
          {agent.focus}
        </div>

      </div>

      {/* PULSANTE PARLA IN CHAT */}
      <button
        onClick={() => onChat(agent)}
        className="w-full py-2.5 px-3 bg-slate-950 text-yellow-400 font-extrabold rounded-xl text-xs hover:bg-slate-800 transition shadow-sm inline-flex items-center justify-center gap-2"
      >
        <MessageCircle className="w-3.5 h-3.5 text-yellow-400" />
        <span>Parla con {agent.name}</span>
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE TEAM IBRIDO ─────────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeChatAgent, setActiveChatAgent] = useState(null);

  // Stato espansione menu a tendina per le 2 sezioni (aperti di default)
  const [openSections, setOpenSections] = useState({
    human: true,
    ai: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER PAGINA TEAM CON DISTANZE IDENTICHE A PERCORSO & MATERIALI */}
      <header className="border-b border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="w-full max-w-[1400px] mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
            Ecosistema Ibrido · Evolution PRO
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Team Umano di Supervisione & AI Copilots
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Il tuo percorso non è affidato a meri automatismi: ogni scelta strategica è guidata e validata da <strong>Specialisti Umani Reali</strong>, affiancati da <strong>Copilot AI Operativi 24/7</strong> che accelerano la produzione dei tuoi asset.
          </p>
        </div>
      </header>

      {/* CONTENUTO DIVISO NELLE 2 SEZIONI A TENDINA (ACCORDION PER NON ALLUNGARE LA PAGINA) */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-10 space-y-12 sm:space-y-16">
        
        {/* 🔷 SEZIONE 1: TEAM UMANO DI SUPERVISIONE (MENU A TENDINA) */}
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:border-amber-400/80 transition">
          <button
            onClick={() => toggleSection("human")}
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/80 hover:bg-slate-100/80 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-300 text-amber-950 flex items-center justify-center shrink-0 shadow-sm font-extrabold">
                🧑
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block">
                  SUPERVISIONE & VALIDAZIONE UMANA
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-950 group-hover:text-amber-600 transition">
                  01. Team Umano di Mentor & Specialisti ({HUMAN_SUPERVISION_TEAM.length} Referenti Reali)
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  I mentor umani che approvano il tuo posizionamento, la promessa unica e la qualità video.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-slate-200/80 text-slate-800">
                {HUMAN_SUPERVISION_TEAM.length} Mentori
              </span>
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                {openSections.human ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {openSections.human && (
            <div className="p-5 sm:p-6 border-t border-slate-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {HUMAN_SUPERVISION_TEAM.map((agent) => (
                  <MemberCard key={agent.id} agent={agent} onChat={setActiveChatAgent} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🔶 SEZIONE 2: TEAM AI OPERATIVO 24/7 (MENU A TENDINA) */}
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:border-amber-400/80 transition">
          <button
            onClick={() => toggleSection("ai")}
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/80 hover:bg-slate-100/80 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-slate-950 text-yellow-400 flex items-center justify-center shrink-0 shadow-sm font-extrabold border border-slate-800">
                🤖
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
                  ESECUZIONE VELOCE & ESECUZIONE TASK 24/7
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-950 group-hover:text-amber-600 transition">
                  02. Team AI Operativo ({AI_EXECUTION_TEAM.length} Copilot Specialistici 24/7)
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  Gli agenti AI addestrati sul Metodo EVO che creano le prime bozze ed eseguono le parti tecniche.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-slate-200/80 text-slate-800">
                {AI_EXECUTION_TEAM.length} Copilots
              </span>
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                {openSections.ai ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {openSections.ai && (
            <div className="p-5 sm:p-6 border-t border-slate-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {AI_EXECUTION_TEAM.map((agent) => (
                  <MemberCard key={agent.id} agent={agent} onChat={setActiveChatAgent} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* DRAWER CHAT INTERATTIVO */}
      {activeChatAgent && (
        <TeamChatDrawer
          agent={activeChatAgent}
          partner={partner}
          onClose={() => setActiveChatAgent(null)}
        />
      )}

    </div>
  );
}

export default TeamSupportoPage;
