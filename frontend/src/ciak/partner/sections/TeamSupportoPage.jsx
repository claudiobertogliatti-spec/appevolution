/**
 * Area Partner CIAK — Sezione Team di Supporto.
 * Divisa in 2 Team Separati:
 * 1) Team Strategico & Tutor Dedicati (Claudio, Simona, Carlo)
 * 2) Team di Produzione & Specialisti Tecnici CIAK (Valentina, Andrea, Gaia, Marco)
 *
 * Ogni membro include: Foto Avatar HD, Nome, Ruolo, Descrizione Estesa del Ruolo,
 * Focus operativo e tasto "Parla in Chat".
 */
import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, ArrowRight, ShieldCheck, Sparkles, UserCheck, Star, Zap } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

// ─── DEFINIZIONE DEI 2 TEAM SEPARATI ──────────────────────────────────────
export const TEAM_STRATEGICO = [
  {
    id: "CLAUDIO",
    name: "Claudio Bertogliatti",
    role: "Tutor Strategico Master & Founder",
    avatar: "/agents/claudio.jpg",
    initial: "CB",
    badge: "👑 Tutor Master",
    description:
      "Supervisiona l'intera architettura del tuo progetto lungo le 14 Fasi del Metodo EVO. Valida il Piano Operativo Strategico, approva i passaggi chiave e ti guida nella direzione della tua Accademia Digitale.",
    focus: "Validazione 14 Fasi · Piano Operativo Master · Decisioni Strategiche",
    tone: "Direzione d'orchestra e validazione ufficiale del tuo modello.",
  },
  {
    id: "STEFANIA",
    name: "Simona",
    role: "Coordinatrice Operativa del Percorso",
    avatar: "/agents/stefania.jpg",
    initial: "S",
    badge: "⭐ Coordinamento",
    description:
      "È il tuo punto di riferimento quotidiano. Tiene insieme le scadenze del percorso, risolve i dubbi operativi e ti assegna la prossima mossa esatta quando desideri sbloccare uno step.",
    focus: "Orientamento Giornaliero · Gestione Scadenze · Prossima Azione",
    tone: "Ti organizza il percorso e mantiene alta la chiarezza operativa.",
  },
  {
    id: "MATTEO",
    name: "Carlo",
    role: "Analista Ciak Blueprint & Metrics",
    avatar: "/agents/matteo.jpg",
    initial: "C",
    badge: "📊 Analisi Dati",
    description:
      "Analizza i dati del tuo mercato e le metriche della tua Accademia. Dati alla mano, calcola la sostenibilità economica, la strategia di pricing del corso ed la proiezione del tuo ROI.",
    focus: "Analisi Metriche · Pricing & Sostenibilità · Calcolo ROI",
    tone: "Traduce i dati in decisioni numeriche concrete e sostenibili.",
  },
];

export const TEAM_PRODUZIONE = [
  {
    id: "VALENTINA",
    name: "Valentina",
    role: "Brand & Copywriting Specialist",
    avatar: "/agents/valentina.jpg",
    initial: "V",
    badge: "🎨 Brand & Copy",
    description:
      "Definisce l'identità visiva e la promessa unica della tua Accademia. Redige il posizionamento differenziante, il Brand Kit ed il copywriting persuasivo per attirare i tuoi clienti ideali.",
    focus: "Brand Kit · Copywriting Persuasivo · Messaggio Differenziante",
    tone: "Ti aiuta a esprimere il tuo valore unico con parole d'impatto.",
  },
  {
    id: "ANDREA",
    name: "Andrea",
    role: "Coach Video & Directing Teleprompter",
    avatar: "/agents/andrea.jpg",
    initial: "A",
    badge: "🎬 Video & Script",
    description:
      "Ti guida nella scrittura degli script per la Masterclass e nella registrazione delle videolezioni. Cura il ritmo narrativo, l'uso del teleprompter e la tua presenza sicura davanti alla telecamera.",
    focus: "Script Masterclass · Teleprompter · Presenza Video HD",
    tone: "Ti rende naturale e sicuro prima di premere il tasto rec.",
  },
  {
    id: "GAIA",
    name: "Gaia",
    role: "Tech Lead, Funnel & Automazioni Stripe",
    avatar: "/agents/gaia.jpg",
    initial: "G",
    badge: "⚡ Tech & Funnel",
    description:
      "Configura l'infrastruttura tecnologica: integrazione del dominio personalizzato, creazione delle pagine del funnel, collegamento della cassa Stripe ed automatizzazione delle e-mail.",
    focus: "Infrastruttura Funnel · Cassa Stripe · Pagine Web & Automazioni",
    tone: "Risolve la complessità tecnica per darti un sistema funzionante.",
  },
  {
    id: "MARCO",
    name: "Marco",
    role: "Launch Manager & Traffic Strategist",
    avatar: "/agents/marco.jpg",
    initial: "M",
    badge: "🚀 Strategia Lancio",
    description:
      "Pianifica il calendario di lancio a 30 giorni e coordina la strategia di acquisizione clienti. Gestisce il ritmo delle campagne e tiene alta la trazione fino al go-live ufficiale.",
    focus: "Calendario 30 giorni · Strategia di Lancio · Conversione Clienti",
    tone: "Mantiene la massima trazione fino al giorno del tuo lancio ufficiale.",
  },
];

// ─── AVATAR CON FALLBACK ROBUSTO ──────────────────────────────────────────
function Avatar({ agent, size = "w-16 h-16" }) {
  const [err, setErr] = useState(false);
  if (err || !agent.avatar) {
    return (
      <div
        className={`${size} rounded-full bg-slate-900 text-yellow-400 font-extrabold flex items-center justify-center text-xl shrink-0 border-2 border-yellow-400 shadow-sm`}
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
      className={`${size} rounded-full object-cover bg-slate-900 shrink-0 border-2 border-yellow-400 shadow-sm`}
    />
  );
}

// ─── DRAWER CHAT INTERATTIVO VERSO UN MEMBRO ──────────────────────────────
function TeamChatDrawer({ agent, partner, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao! Sono ${agent.name}, ${agent.role}. Come posso aiutarti oggi per il tuo progetto?`,
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
          content: `Grazie per il messaggio! Ho preso in carico la tua richiesta relativa a ${agent.focus}. Ti risponderò a breve!`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif] border-l border-slate-200">
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
          <span className="font-bold text-amber-600 block uppercase tracking-wider">Area di Competenza</span>
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
                {agent.name} sta elaborando la risposta...
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
            placeholder={`Scrivi un messaggio a ${agent.name}...`}
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

// ─── CARD MEMBRO TEAM (CON FOTO, RUOLO & DESCIZIONE ESTESA) ───────────────
function MemberCard({ agent, onChat }) {
  return (
    <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 sm:p-7 hover:border-amber-400 transition shadow-sm hover:shadow-md flex flex-col justify-between space-y-6 group">
      <div className="space-y-4">
        
        {/* HEADER MEMBER CARD: FOTO + NOME + BADGE */}
        <div className="flex items-start gap-4">
          <Avatar agent={agent} size="w-16 h-16 sm:w-20 sm:h-20" />
          <div className="min-w-0 space-y-1">
            <span className="px-3 py-1 bg-yellow-100 border border-yellow-300 text-slate-950 rounded-full font-extrabold text-[11px] inline-block">
              {agent.badge}
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 leading-snug group-hover:text-amber-600 transition">
              {agent.name}
            </h3>
            <p className="text-xs font-bold text-slate-500">
              {agent.role}
            </p>
          </div>
        </div>

        {/* DESCRIZIONE RUOLO ESTESA ED ESPLICATIVA */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-600 block">
            Descrizione Ruolo & Impatto:
          </span>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            {agent.description}
          </p>
        </div>

        {/* FOCUS OPERATIVO */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Focus Specifico:
          </span>
          <p className="text-xs font-bold text-slate-800 leading-snug">
            {agent.focus}
          </p>
        </div>

      </div>

      {/* PULSANTE PARLA IN CHAT */}
      <button
        onClick={() => onChat(agent)}
        className="w-full py-3 px-4 bg-slate-950 text-yellow-400 font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition shadow-sm inline-flex items-center justify-center gap-2 group-hover:scale-[1.01]"
      >
        <MessageCircle className="w-4 h-4 text-yellow-400" />
        <span>Parla con {agent.name}</span>
        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
      </button>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE TEAM DI SUPPORTO ────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeChatAgent, setActiveChatAgent] = useState(null);

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER PAGINA TEAM */}
      <header className="border-b border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
            Ecosistema CIAK · Il Tuo Team Dedicato
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Il Tuo Team di Supporto Strategico & Operativo
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Non sei mai solo lungo il percorso: ogni fase del Metodo EVO è affiancata da un referente specializzato con cui puoi interagire direttamente in chat 1-on-1.
          </p>
        </div>
      </header>

      {/* CONTENUTO DIVISO IN 2 TEAM SEPARATI CON AMPIO RESPIRO VISIVO */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-16 sm:space-y-20">
        
        {/* 🌟 SEZIONE TEAM 1: TUTOR STRATEGICI & COORDINAMENTO */}
        <section className="space-y-8">
          <div className="bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-transparent border-l-4 border-amber-400 p-6 rounded-2xl space-y-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700 block">
              TEAM 01 · DIREZIONE & COORDINAMENTO
            </span>
            <h2 className="text-2xl font-extrabold text-slate-950">
              Team Strategico & Tutor Dedicati
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Le figure guida che validano la tua strategia master, definiscono il Piano Operativo e ti orientano giorno per giorno.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM_STRATEGICO.map((agent) => (
              <MemberCard key={agent.id} agent={agent} onChat={setActiveChatAgent} />
            ))}
          </div>
        </section>

        {/* 🚀 SEZIONE TEAM 2: SPECIALISTI TECNICI & PRODUZIONE ASSET */}
        <section className="space-y-8 pt-6 border-t border-slate-200">
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-400/5 to-transparent border-l-4 border-blue-500 p-6 rounded-2xl space-y-1.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 block">
              TEAM 02 · ESECUZIONE & PRODUZIONE ASSET
            </span>
            <h2 className="text-2xl font-extrabold text-slate-950">
              Team di Produzione & Specialisti Tecnici CIAK
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Gli specialisti verticali che costruiscono i tuoi asset: dal brand al teleprompter, dalle pagine web alla cassa Stripe ed al lancio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEAM_PRODUZIONE.map((agent) => (
              <MemberCard key={agent.id} agent={agent} onChat={setActiveChatAgent} />
            ))}
          </div>
        </section>

      </div>

      {/* DRAWER CHAT INTERATTIVO SE UN MEMBRO VIENE SELEZIONATO */}
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
