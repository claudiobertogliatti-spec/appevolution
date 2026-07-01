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
import { MessageCircle, Send, X } from "lucide-react";
import { AGENTS, TEAM_ORDER } from "../operativo/agents";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

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
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Mi dispiace, c'è stato un errore. Riprova tra qualche secondo." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose}></div>
      <aside className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif]">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm ${
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
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <Avatar agent={agent} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight">{agent.name}</h3>
          <p className="text-sm text-yellow-600 font-medium">{agent.role}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed mt-4 flex-1">
        {agent.description}
      </p>
      <button
        onClick={() => onChat(agent)}
        className="mt-5 inline-flex items-center justify-center gap-2 bg-slate-900 text-yellow-400 font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition"
      >
        <MessageCircle className="w-4 h-4" />
        Chatta con {agent.name}
      </button>
    </div>
  );
}

// ─── Pagina ───────────────────────────────────────────────────────────────
export function TeamSupportoPage({ partner }) {
  const [activeAgent, setActiveAgent] = useState(null);
  const team = TEAM_ORDER.filter((id) => id !== "MATTEO").map((id) => AGENTS[id]).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600 mb-2">
          Presenza continua
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Il team Ciak.io</h1>
        <p className="text-slate-500 max-w-2xl">
          Ogni fase ha un riferimento chiaro. Scrivi all'agente giusto e mantieni ordinato
          il lavoro dentro Ciak; per il supporto umano resta attivo il tuo gruppo Telegram personale.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {team.map((agent) => (
          <TeamCard key={agent.id} agent={agent} onChat={setActiveAgent} />
        ))}
      </div>

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
