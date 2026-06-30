/**
 * Ciak Partner — Team di supporto.
 *
 * Pagina (sotto Workspace) che presenta il team che segue il partner lungo il
 * percorso. Una card per ogni membro: foto, nome, ruolo, descrizione del ruolo
 * e pulsante "Chat" per domande specifiche a quel membro.
 *
 * La chat riusa l'endpoint esistente POST /api/stefania/chat passando
 * `target_agent` (il backend swappa il system prompt del membro scelto).
 */
import { useState, useRef, useEffect } from "react";
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, Send, X } from "lucide-react";
import { AGENTS, TEAM_ORDER } from "../operativo/agents";

const API = process.env.REACT_APP_BACKEND_URL || "";

const SUPPORT_META = {
  STEFANIA: {
    need: "Non so qual è la prossima mossa",
    focus: "Orientamento, priorità e blocchi generali",
    tone: "Ti rimette in ordine il percorso.",
  },
  VALENTINA: {
    need: "Devo chiarire brand o posizionamento",
    focus: "Identità, promessa, nicchia e messaggio",
    tone: "Ti aiuta a dire la cosa giusta alle persone giuste.",
  },
  ANDREA: {
    need: "Mi serve aiuto con video e contenuti",
    focus: "Script, scaletta, registrazione e presenza camera",
    tone: "Ti rende più sicuro prima di premere rec.",
  },
  GAIA: {
    need: "Ho un problema tecnico",
    focus: "Funnel, pagine, automazioni e collegamenti",
    tone: "Traduce il caos tecnico in prossima azione.",
  },
  MARCO: {
    need: "Sto preparando lancio o vendita",
    focus: "Calendario, prezzo, webinar e ritmo operativo",
    tone: "Tiene alta la trazione fino al go-live.",
  },
  MATTEO: {
    need: "Voglio leggere numeri e risultati",
    focus: "Analisi, KPI, priorità di ottimizzazione",
    tone: "Porta i dati dentro decisioni concrete.",
  },
};

const RESPONSE_NOTES = [
  "Scegli il referente più vicino al blocco: la chat arriva già contestualizzata.",
  "Per dubbi generali parti da Stefania; per problemi tecnici vai diretto su Gaia.",
  "Le risposte sono pensate per darti una prossima azione, non teoria da archiviare.",
];

// ─── Avatar con fallback all'iniziale se la foto non carica ───────────────
function Avatar({ agent, size = "w-16 h-16" }) {
  const [err, setErr] = useState(false);
  if (err || !agent.avatar) {
    return (
      <div
        className={`${size} rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold text-xl flex-shrink-0`}
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
      className={`${size} rounded-full object-cover bg-slate-900 flex-shrink-0`}
    />
  );
}

// ─── Drawer chat verso un singolo membro del team ─────────────────────────
function TeamChatDrawer({ agent, partner, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Ciao, sono ${agent.name}. ${agent.role}. Come posso aiutarti?`,
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
          partner_id: partner?.id,
          user_name: partner?.name,
          partner_niche: partner?.niche,
          message: userMsg.content,
          target_agent: agent.id,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const reply =
        data.reply || "Non sono riuscito a rispondere, riprova tra un attimo.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Non riesco a inviare il messaggio adesso. Riprova tra qualche secondo o scegli Stefania se il dubbio è urgente.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose}></div>
      <aside className="fixed right-0 top-0 bottom-0 w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif]">
        <header className="border-b border-gray-200 p-4 flex items-center gap-3">
          <Avatar agent={agent} size="w-11 h-11" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">{agent.name}</div>
            <div className="text-xs text-slate-500 truncate">{agent.role}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 px-2"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="border-b border-gray-100 px-4 py-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Focus della chat
          </p>
          <p className="text-sm text-slate-700 mt-1">
            {SUPPORT_META[agent.id]?.focus || agent.description}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-yellow-400 text-slate-900"
                    : "bg-slate-50 text-slate-900 border border-gray-200"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
          {sending && (
            <div>
              <span className="inline-block px-3 py-2 rounded-lg text-sm bg-slate-50 text-slate-500 border border-gray-200">
                {agent.name} sta scrivendo...
              </span>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        <div className="border-t border-gray-200 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Scrivi a ${agent.name}...`}
            disabled={sending}
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="bg-yellow-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            aria-label="Invia messaggio"
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
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col hover:border-slate-300 hover:shadow-sm transition">
      <div className="flex items-center gap-4">
        <Avatar agent={agent} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight">{agent.name}</h3>
          <p className="text-sm text-yellow-600 font-medium">{agent.role}</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Quando scrivergli
        </p>
        <p className="text-sm font-semibold text-slate-900 mt-1">{meta.need}</p>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed mt-4">
        {meta.tone || agent.description}
      </p>
      <button
        onClick={() => onChat(agent)}
        className="mt-5 inline-flex items-center justify-between gap-3 bg-slate-900 text-yellow-400 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-800 transition"
      >
        <span className="inline-flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Chatta con {agent.name}
        </span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function SupportRouter({ team, onChat }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {team.map((agent) => {
        const meta = SUPPORT_META[agent.id] || {};
        return (
          <button
            key={agent.id}
            onClick={() => onChat(agent)}
            className="text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-yellow-400 hover:shadow-sm transition"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {agent.name}
            </span>
            <span className="block text-sm font-semibold text-slate-900 mt-0.5">
              {meta.need}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Pagina ───────────────────────────────────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const team = TEAM_ORDER.map((id) => AGENTS[id]).filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-2">
          Supporto Evolution PRO
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Trova subito la persona giusta</h1>
            <p className="text-slate-500 max-w-2xl">
              Ogni membro del team segue una parte precisa del percorso. Parti dal bisogno,
              apri la chat corretta e ricevi una prossima azione chiara.
            </p>
          </div>
          <div className="bg-slate-900 text-white rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
              <Clock3 className="w-4 h-4" />
              Prima di scrivere
            </div>
            <div className="mt-3 space-y-2">
              {RESPONSE_NOTES.map((note) => (
                <div key={note} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="mb-7">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Parti dal tuo blocco</h2>
        <SupportRouter team={team} onChat={setActiveAgent} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Team dedicato</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((agent) => (
            <TeamCard key={agent.id} agent={agent} onChat={setActiveAgent} />
          ))}
        </div>
      </section>

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
