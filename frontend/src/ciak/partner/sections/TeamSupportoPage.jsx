/**
 * Area Partner CIAK — Sezione Team.
 *
 * 🤖 01. PRIMO GRUPPO (IN ALTO): TEAM AGENTICO AI
 *    - Simona, Valentina, Andrea, Gaia, Marco, Carlo (ciascuno con Chat Singola 1-on-1)
 *
 * 🧑‍💼 02. SECONDO GRUPPO (SOTTO): TEAM EVOLUTION PRO
 *    - Claudio B., Stefania R., Antonella R., Matteo P., Debora B. (SENZA bottoni chat nei riquadri)
 *    - Unico banner in alto per aprire il Canale Telegram Dedicato.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle, Send, X, ArrowRight, ChevronDown, ChevronUp, SendHorizontal, ExternalLink
} from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

// 🤖 PRIMO GRUPPO: TEAM AGENTICO AI (CON CHAT SINGOLA 1-ON-1)
export const AGENTIC_TEAM = [
  {
    id: "STEFANIA",
    name: "Simona",
    role: "Coordinatrice del tuo percorso",
    avatar: "/agents/stefania.jpg",
    initial: "S",
    badge: "🤖 Agent AI",
    description: "Tiene insieme tutto il percorso e ti dà sempre la prossima mossa quando non sai da dove ripartire. È il tuo primo punto di contatto in chat.",
    focus: "Orientamento, priorità e blocchi generali",
  },
  {
    id: "VALENTINA",
    name: "Valentina",
    role: "Brand & Posizionamento",
    avatar: "/agents/valentina.jpg",
    initial: "V",
    badge: "🤖 Agent AI",
    description: "Ti aiuta a definire chi sei, a chi parli e perché scelgono te. Posizionamento, brand kit e messaggio differenziante.",
    focus: "Identità, promessa, nicchia e messaggio",
  },
  {
    id: "ANDREA",
    name: "Andrea",
    role: "Coach video e contenuti",
    avatar: "/agents/andrea.jpg",
    initial: "A",
    badge: "🤖 Agent AI",
    description: "Ti segue nella registrazione di masterclass e videocorso: struttura degli script, ritmo, teleprompter e presenza davanti alla camera.",
    focus: "Script, scaletta, registrazione e teleprompter",
  },
  {
    id: "GAIA",
    name: "Gaia",
    role: "Supporto tecnico funnel",
    avatar: "/agents/gaia.jpg",
    initial: "G",
    badge: "🤖 Agent AI",
    description: "Si occupa della parte tecnologica: funnel, pagine web, automazioni ed integrazione del checkout Stripe.",
    focus: "Funnel, pagine, automazioni e collegamenti",
  },
  {
    id: "MARCO",
    name: "Marco",
    role: "Strategia lancio",
    avatar: "/agents/marco.jpg",
    initial: "M",
    badge: "🤖 Agent AI",
    description: "Prepara il lancio e tiene il ritmo: calendario 30 giorni, prezzo, webinar ed accountability fino al go-live ufficiale.",
    focus: "Calendario, prezzo, webinar e ritmo di vendita",
  },
  {
    id: "MATTEO",
    name: "Carlo",
    role: "Analista Ciak Blueprint",
    avatar: "/agents/matteo.jpg",
    initial: "C",
    badge: "🤖 Agent AI",
    description: "Analizza i tuoi dati ed il tuo posizionamento per dirti, numeri alla mano, dove spingere e cosa correggere.",
    focus: "Analisi dati, KPI e sostenibilità economica",
  },
];

// 🧑‍💼 SECONDO GRUPPO: TEAM EVOLUTION PRO (SENZA BOTTONI NAI RIQUADRI)
export const HUMAN_TEAM = [
  {
    id: "CLAUDIO",
    name: "Claudio B.",
    role: "CEO & Founder Evolution PRO",
    avatar: "/team/claudio.webp",
    initial: "CB",
    badge: "🧑 Team Evolution Pro",
    description: "Direzione strategica dei progetti, supervisione master delle 14 Fasi ed analisi dei KPI dell'Accademia.",
  },
  {
    id: "STEFANIA_HUMAN",
    name: "Stefania R.",
    role: "Back Office",
    avatar: "/team/stefania.webp",
    initial: "SR",
    badge: "🧑 Team Evolution Pro",
    description: "Gestione attività post-vendita, coordinamento pratiche operative ed affiancamento continuo sul canale Telegram.",
  },
  {
    id: "ANTONELLA",
    name: "Antonella R.",
    role: "Media Strategist",
    avatar: "/team/antonella.webp",
    initial: "AR",
    badge: "🧑 Team Evolution Pro",
    description: "Gestione contenuti, strategie di comunicazione e supervisione dell'impatto visivo delle inserzioni.",
  },
  {
    id: "MATTEO_HUMAN",
    name: "Matteo P.",
    role: "Video Maker",
    avatar: "/team/matteo.webp",
    initial: "MP",
    badge: "🧑 Team Evolution Pro",
    description: "Creazione e produzione contenuti video, montaggio lezioni HD ed il collaudo tecnico delle registrazioni.",
  },
  {
    id: "DEBORA",
    name: "Debora B.",
    role: "Amministrazione",
    avatar: "/team/debora.webp",
    initial: "DB",
    badge: "🧑 Team Evolution Pro",
    description: "Gestione contratti di collaborazione, contabilizzazione, pagamenti e procedure amministrative sul canale riservato.",
  },
];

// ─── AVATAR CON FALLBACK ──────────────────────────────────────────────────
function Avatar({ agent, size = "w-16 h-16" }) {
  const [err, setErr] = useState(false);
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

// ─── DRAWER CHAT INTERATTIVO PER IL TEAM AGENTICO ─────────────────────────
function AgentChatDrawer({ agent, partner, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao! Sono ${agent.name}, ${agent.role}. Come posso aiutarti oggi?`,
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
          content: `Ho preso in carico la tua richiesta per ${agent.focus}. Ti do subito le indicazioni!`,
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
          <span className="font-bold text-amber-600 block uppercase tracking-wider">Focus operativo</span>
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

// ─── CARD AGENTICO (CON CHAT SINGOLA) ─────────────────────────────────────
function AgenticCard({ agent, onChat }) {
  return (
    <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 hover:border-amber-400 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-5 group">
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <Avatar agent={agent} />
          <div className="min-w-0 space-y-1">
            <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[10px] bg-yellow-100 text-slate-950 border border-yellow-300 inline-block">
              {agent.badge}
            </span>
            <h3 className="text-lg font-extrabold text-slate-950 leading-snug group-hover:text-amber-600 transition">
              {agent.name}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {agent.role}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Quando Scrivergli:
          </span>
          <p className="text-xs font-extrabold text-slate-950 leading-snug">{agent.focus}</p>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal">
          {agent.description}
        </p>
      </div>

      {/* PULSANTE CHAT SINGOLA 1-ON-1 */}
      <button
        onClick={() => onChat(agent)}
        className="w-full py-3 px-4 bg-slate-950 text-yellow-400 font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition shadow-sm inline-flex items-center justify-between group-hover:scale-[1.01]"
      >
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-400" />
          Chatta con {agent.name}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
      </button>
    </div>
  );
}

// ─── CARD TEAM EVOLUTION PRO (SENZA PULSANTI SOTTO) ────────────────────────
function HumanCard({ agent }) {
  return (
    <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 hover:border-blue-400 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 group">
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <Avatar agent={agent} />
          <div className="min-w-0 space-y-1">
            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-blue-50 text-blue-900 border border-blue-200 inline-block">
              {agent.badge}
            </span>
            <h3 className="text-lg font-extrabold text-slate-950 leading-snug group-hover:text-blue-600 transition">
              {agent.name}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {agent.role}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-normal pt-2 border-t border-slate-100">
          {agent.description}
        </p>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE TEAM ───────────────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeAgentChat, setActiveAgentChat] = useState(null);

  // Stato espansione menu a tendina per i 2 gruppi (aperti di default)
  const [openSections, setOpenSections] = useState({
    agentic: true,
    human: true,
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenTelegram = () => {
    const telegramUrl = partner?.telegram_group_url || "https://t.me/ciak_partner_support";
    window.open(telegramUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER PAGINA TEAM CON DISTANZE IDENTICHE A PERCORSO & MATERIALI */}
      <header className="border-b border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="w-full max-w-[1400px] mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
            Ecosistema CIAK · Team Agentico AI & Team Evolution Pro
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Team Agentico AI & Team Evolution Pro
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Interagisci con il <strong>Team Agentico AI</strong> in chat singola 1-on-1 per risposte immediate 24/7. Per la supervisione ed il supporto diretto del <strong>Team Evolution Pro</strong>, utilizza il tuo canale Telegram dedicato.
          </p>
        </div>
      </header>

      {/* CONTENUTO DIVISO IN 2 GRUPPI A TENDINA (ACCORDION STILE MATERIALI) */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-10 space-y-12 sm:space-y-16">
        
        {/* 🤖 01. PRIMO GRUPPO: TEAM AGENTICO AI */}
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:border-amber-400/80 transition">
          <button
            onClick={() => toggleSection("agentic")}
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/80 hover:bg-slate-100/80 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-yellow-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-extrabold">
                🤖
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block">
                  SUPPORTI SPECIALISTICI IN CHAT SINGOLA
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-950 group-hover:text-amber-600 transition">
                  Team Agentico AI
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  Simona, Valentina, Andrea, Gaia, Marco e Carlo per guidare ciascuno step in chat 1-on-1.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-800">
                {AGENTIC_TEAM.length} Agent AI
              </span>
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-amber-400 group-hover:text-slate-950 transition">
                {openSections.agentic ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {openSections.agentic && (
            <div className="p-5 sm:p-6 border-t border-slate-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AGENTIC_TEAM.map((agent) => (
                  <AgenticCard key={agent.id} agent={agent} onChat={setActiveAgentChat} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🧑‍💼 02. SECONDO GRUPPO: TEAM EVOLUTION PRO */}
        <div className="bg-white border-2 border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:border-blue-400/80 transition">
          <button
            onClick={() => toggleSection("human")}
            className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-slate-50/80 hover:bg-slate-100/80 transition group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm font-extrabold">
                🧑
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
                  SUPERVISIONE UMANA REALE & AFFIANCAMENTO
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-950 group-hover:text-blue-600 transition">
                  Team Evolution Pro
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                  Claudio B., Stefania R., Antonella R., Matteo P. e Debora B. sul tuo canale Telegram dedicato.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-blue-100 text-blue-900">
                {HUMAN_TEAM.length} Referenti Umani
              </span>
              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition">
                {openSections.human ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {openSections.human && (
            <div className="p-5 sm:p-6 border-t border-slate-200 bg-white space-y-6">
              
              {/* UNICO BANNER IN ALTO PER APRIRE IL CANALE TELEGRAM DEDICATO */}
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-l-4 border-blue-600 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">
                    Canale Telegram Dedicato per il Supporto Umano 1-on-1
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    L'intero Team Evolution Pro (Claudio B., Stefania R., Antonella R., Matteo P. e Debora B.) è presente nel tuo gruppo Telegram riservato per darti supporto diretto.
                  </p>
                </div>
                <button
                  onClick={handleOpenTelegram}
                  className="px-5 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl text-xs hover:bg-blue-700 transition shadow-sm inline-flex items-center justify-center gap-2 shrink-0"
                >
                  <SendHorizontal className="w-4 h-4 text-white" />
                  <span>Apri Canale Telegram Dedicato</span>
                </button>
              </div>

              {/* GRIGLIA MEMBRI TEAM EVOLUTION PRO (SENZA PULSANTI SOTTO I RIQUADRI) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HUMAN_TEAM.map((agent) => (
                  <HumanCard key={agent.id} agent={agent} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* DRAWER CHAT INTERATTIVO PER TEAM AGENTICO */}
      {activeAgentChat && (
        <AgentChatDrawer
          agent={activeAgentChat}
          partner={partner}
          onClose={() => setActiveAgentChat(null)}
        />
      )}

    </div>
  );
}

export default TeamSupportoPage;
