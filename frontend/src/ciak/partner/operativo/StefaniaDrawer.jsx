import React, { useState, useRef, useEffect } from "react";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

/**
 * Drawer chat che si apre da destra al click "Chiedi" della voce narrante.
 * Riusa endpoint backend esistente /api/stefania/chat — Stefania ha già
 * il contesto journey iniettato in build_partner_context() (Task 8).
 */
export default function StefaniaDrawer({ open, onClose, partnerId, currentStep }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0 && currentStep) {
      setMessages([{
        role: "assistant",
        content: `Siamo allo step ${currentStep.step_number}: ${currentStep.label}. Cosa ti serve?`,
      }]);
    }
  }, [open, currentStep, messages.length]);

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
          <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold">
            S
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-900">Stefania</div>
            <div className="text-xs text-slate-500">
              {currentStep ? `Step ${currentStep.step_number}/13` : "Operativo"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-xl leading-none"
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
                Stefania sta scrivendo...
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
            placeholder="Scrivi a Stefania..."
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
