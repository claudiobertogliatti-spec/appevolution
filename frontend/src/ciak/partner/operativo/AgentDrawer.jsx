import React, { useState, useRef, useEffect } from "react";
import { getAgentForStep } from "./agents";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

/**
 * Drawer chat dinamico — l'agente attivo dipende dallo step corrente.
 * Passa target_agent al backend, che swappa il system prompt
 * (STEFANIA / ANDREA / MARCO / GAIA / VALENTINA).
 */
export default function AgentDrawer({ open, onClose, partnerId, currentStep }) {
  const agent = getAgentForStep(currentStep?.step_id);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Re-init quando l'agente cambia (passi tra step con agenti diversi)
  useEffect(() => {
    if (open && currentStep) {
      setMessages([{
        role: "assistant",
        content: `Ciao, sono ${agent.name}. ${agent.role}. Siamo allo step ${currentStep.step_number}: ${currentStep.label}. Cosa ti serve?`,
      }]);
    }
  }, [open, agent.id, currentStep?.step_id]);

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
          partner_id: partnerId,
          message: userMsg.content,
          partner_phase: currentStep?.fase_legacy || "F1",
          target_agent: agent.id,
        }),
      });
      const data = await r.json();
      const reply = data.response || data.message || data.assistant_message || "...";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Errore: ${String(e)}` }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose}></div>
      <aside className="fixed right-0 top-0 bottom-0 w-96 max-w-full bg-white shadow-2xl z-50 flex flex-col font-[Poppins,system-ui,sans-serif]">
        <header className="border-b border-gray-200 p-4 flex items-center gap-3">
          <img
            src={agent.avatar}
            alt={agent.name}
            className="w-11 h-11 rounded-full bg-slate-900 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900 truncate">{agent.name}</div>
            <div className="text-xs text-slate-500 truncate">{agent.role}</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none px-2"
            aria-label="Chiudi"
          >
            ✕
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
            className="bg-yellow-400 text-slate-900 font-semibold px-4 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Invia
          </button>
        </div>
      </aside>
    </>
  );
}
