/**
 * Ciak Partner — Team di supporto.
 *
 * Layout ad ampia visibilità (Full Width max-w-[1400px]) per riempire al meglio
 * l'intera pagina a disposizione nell'app.
 */
import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, Send, X, ShieldCheck } from "lucide-react";
import { AGENTS, TEAM_ORDER } from "../operativo/agents";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

const SUPPORT_META = {
  STEFANIA: {
    need: "Non so qual è la prossima mossa",
    focus: "Orientamento, priorità e blocchi generali",
    tone: "Tiene insieme l'intero percorso e ti guida sulla prossima azione esatta.",
  },
  VALENTINA: {
    need: "Devo chiarire brand o posizionamento",
    focus: "Identità, promessa, nicchia e messaggio",
    tone: "Ti aiuta a definire il tuo messaggio differenziante e la promessa unica.",
  },
  ANDREA: {
    need: "Mi serve aiuto con video e contenuti",
    focus: "Script, scaletta, registrazione e presenza camera",
    tone: "Ti guida nella scrittura degli script e ti rende sicuro davanti alla telecamera.",
  },
  GAIA: {
    need: "Ho un problema tecnico",
    focus: "Funnel, pagine, automazioni e collegamenti Stripe",
    tone: "Traduce la complessità tecnica ed i collegamenti web in soluzioni immediate.",
  },
  MARCO: {
    need: "Sto preparando lancio o vendita",
    focus: "Calendario, prezzo, webinar e ritmo operativo",
    tone: "Pianifica il calendario di lancio a 30 giorni e tiene alta la trazione fino al go-live.",
  },
  MATTEO: {
    need: "Voglio leggere numeri e risultati",
    focus: "Analisi, KPI, priorità di ottimizzazione",
    tone: "Analizza i dati del tuo posizionamento per darti decisioni numeriche concrete.",
  },
};

const RESPONSE_NOTES = [
  "Scegli il referente più vicino al tuo blocco: la chat si apre già contestualizzata.",
  "Per dubbi generali parti da Simona; per problemi tecnici vai diretto su Gaia.",
  "Le risposte sono pensate per darti una prossima azione chiara e da eseguire subito.",
];

// ─── Avatar con fallback all'iniziale se la foto non carica ───────────────
function Avatar({ agent, size = "w-16 h-16 sm:w-20 sm:h-20" }) {
  const [err, setErr] = useState(false);
  if (err || !agent.avatar) {
    return (
      <div
        className={`${size} rounded-full bg-slate-950 text-yellow-400 flex items-center justify-center font-extrabold text-xl shrink-0 border-2 border-yellow-400 shadow-sm`}
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

// ─── Drawer chat verso un singolo membro del team ─────────────────────────
function TeamChatDrawer({ agent, partner, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao! Sono ${agent.name}, ${agent.role}. Come posso aiutarti oggi sul tuo percorso?`,
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
          partner_niche: partner?.niche,
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
          content: `Grazie per il messaggio! Ho preso in carico la tua richiesta. Ti risponderò a breve!`,
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
          <span className="font-bold text-amber-600 block uppercase tracking-wider">Focus della chat</span>
          <p className="text-slate-700 font-medium mt-0.5">{SUPPORT_META[agent.id]?.focus || agent.description}</p>
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
                {agent.name} sta scrivendo...
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

// ─── Card singolo membro ──────────────────────────────────────────────────
function TeamCard({ agent, onChat }) {
  const meta = SUPPORT_META[agent.id] || {};
  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/80 p-6 sm:p-7 flex flex-col justify-between hover:border-amber-400 transition shadow-sm hover:shadow-md group space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Avatar agent={agent} />
          <div className="min-w-0 space-y-1">
            <h3 className="text-xl font-extrabold text-slate-950 leading-snug group-hover:text-amber-600 transition">{agent.name}</h3>
            <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 inline-block">{agent.role}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Quando Scrivergli:
          </p>
          <p className="text-xs font-extrabold text-slate-900 leading-snug">{meta.need}</p>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {meta.tone || agent.description}
        </p>
      </div>

      <button
        onClick={() => onChat(agent)}
        className="w-full py-3 px-4 bg-slate-950 text-yellow-400 font-extrabold text-xs rounded-2xl inline-flex items-center justify-between hover:bg-slate-800 transition shadow-sm group-hover:scale-[1.01]"
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

function SupportRouter({ team, onChat }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {team.map((agent) => {
        const meta = SUPPORT_META[agent.id] || {};
        return (
          <button
            key={agent.id}
            onClick={() => onChat(agent)}
            className="text-left bg-white border-2 border-slate-200/80 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition space-y-1 group"
          >
            <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 group-hover:text-slate-950 transition">
              {agent.name} · {agent.role}
            </span>
            <span className="block text-sm font-extrabold text-slate-950 leading-snug">
              {meta.need}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Pagina ad Ampia Visibilità ──────────────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const team = TEAM_ORDER.map((id) => AGENTS[id]).filter(Boolean);

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 space-y-10 font-[Poppins,system-ui,sans-serif]">
      
      {/* HEADER AMPIO & INFORMATIVO */}
      <header className="border-b border-slate-200 pb-8">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 block mb-1">
          Supporto Evolution PRO · Area Partner
        </span>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 leading-tight">
              Trova subito la persona giusta
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              Ogni membro del team segue una parte precisa del tuo percorso lungo le 14 Fasi. Parti dal bisogno operativo, apri la chat 1-on-1 dedicata e ricevi una prossima azione chiara senza perdere tempo.
            </p>
          </div>

          <div className="bg-slate-950 text-white rounded-3xl p-6 shadow-sm border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-yellow-400 font-extrabold text-sm">
              <Clock3 className="w-4 h-4 text-yellow-400" />
              Prima di scrivere al team
            </div>
            <div className="space-y-2 pt-1">
              {RESPONSE_NOTES.map((note) => (
                <div key={note} className="flex gap-2.5 text-xs leading-relaxed text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* SEZIONE 1: ROUTER RAPIDO DAI BISOGNI */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-base font-extrabold text-slate-950">
            Parti dal tuo blocco o bisogno attuale:
          </h2>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Clicca per aprire subito la chat dedicata
          </span>
        </div>
        <SupportRouter team={team} onChat={setActiveAgent} />
      </section>

      {/* SEZIONE 2: GRIGLIA MEMBRI TEAM DEDICATO */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-base font-extrabold text-slate-950">
            Il Tuo Team di Supporto Dedicato:
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {team.length} Referenti Specializzati
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {team.map((agent) => (
            <TeamCard key={agent.id} agent={agent} onChat={setActiveAgent} />
          ))}
        </div>
      </section>

      {/* DRAWER CHAT */}
      {activeAgent && (
        <TeamChatDrawer
          agent={activeAgent}
          partner={partner}
          onClose={() => setActiveAgent(null)}
        />
      )}
    </div>
  );
}

export default TeamSupportoPage;
