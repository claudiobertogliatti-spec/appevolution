/**
 * Chat con un agente di Ciak (Andrea, Carlo, Marco, Valentina). Legge e consiglia: non pubblica,
 * non invia, non modifica niente. Storico per utente sul server; «Cancella» lo svuota (con
 * conferma). Una risposta che non arriva si dice (errore), non si inventa.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, Trash2 } from "lucide-react";
import { apiGet, apiPost, adminFetch } from "../api";
import { messaggioErrore } from "./SollecitoPannello";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export const AGENTI_CHAT = {
  andrea: {
    nome: "Andrea", base: "/andrea",
    chips: ["Quale caso studio posso usare?", "Idee di post per questa settimana", "Che prove mancano per vendere meglio?"],
    benvenuto: "Ciao Claudio, sono Andrea. Ti aiuto con post, email, SEO e con i casi studio dei partner. Dimmi cosa ti serve.",
    nota: "Andrea è un assistente AI di Ciak. Scrive bozze e consiglia: non pubblica e non invia. Controlla prima di usare un testo.",
  },
  carlo: {
    nome: "Carlo", base: "/agenti/carlo",
    chips: ["Chi devo recuperare oggi?", "Chi ha il report ma non ha prenotato la call?", "Dove stiamo perdendo contatti?"],
    benvenuto: "Ciao Claudio, sono Carlo. Guardo lead, questionari e chi si è fermato nel percorso gratuito. Dimmi cosa ti serve.",
    nota: "Carlo è un assistente AI di Ciak. Legge i dati e consiglia: non invia email e non modifica nulla. Le email di recupero le approvi tu dalla home.",
  },
  marco: {
    nome: "Marco", base: "/agenti/marco",
    chips: ["Quali trattative sono ferme?", "Chi devo sollecitare per primo?", "Quali prossimi passi sono scaduti?"],
    benvenuto: "Ciao Claudio, sono Marco. Guardo proposte, trattative ferme e prossimi passi. Dimmi cosa ti serve.",
    nota: "Marco è un assistente AI di Ciak. Legge i dati e consiglia: non invia solleciti e non modifica nulla. I solleciti li approvi tu dal pannello.",
  },
  valentina: {
    nome: "Valentina", base: "/agenti/valentina",
    chips: ["Chi ha completato un passo di recente?", "Quali compiti sono aperti sui partner?", "Cosa può bloccare un partner?"],
    benvenuto: "Ciao Claudio, sono Valentina. Guardo il percorso dei partner e i compiti aperti. Dimmi cosa ti serve.",
    nota: "Valentina è un assistente AI di Ciak. Legge i dati e consiglia: non scrive ai partner e non modifica nulla.",
  },
};

function Testo({ text }) {
  return text.split("\n").map((riga, i) => (
    <p key={i} className="mb-1 last:mb-0">
      {riga.split(/\*\*(.*?)\*\*/g).map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p))}
    </p>
  ));
}

export function AgenteChat({ agente = "andrea", onAuthExpired }) {
  const cfg = AGENTI_CHAT[agente];
  const { nome, base, chips, benvenuto, nota } = cfg;
  const a = /^a/i.test(nome) ? "ad" : "a"; // «ad Andrea», «a Carlo»
  const [messaggi, setMessaggi] = useState(undefined); // undefined = carico
  const [input, setInput] = useState("");
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState(null);
  const [chiedi, setChiedi] = useState(false);
  const fondo = useRef(null);

  useEffect(() => {
    apiGet(`${base}/history`)
      .then((r) => setMessaggi(Array.isArray(r?.messages) ? r.messages : []))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        setMessaggi([]);
      });
  }, [onAuthExpired, base]);

  useEffect(() => { fondo.current?.scrollIntoView?.({ block: "nearest" }); }, [messaggi, invio]);

  const manda = useCallback(async (testo) => {
    const t = (testo ?? input).trim();
    if (!t || invio) return;
    setInput("");
    setErrore(null);
    setInvio(true);
    setMessaggi((m) => [...(m || []), { role: "user", content: t }]);
    try {
      const r = await apiPost(`${base}/chat`, { message: t });
      setMessaggi((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
      setErrore(messaggioErrore(e));
    } finally {
      setInvio(false);
    }
  }, [input, invio, onAuthExpired]);

  const cancella = async () => {
    setChiedi(false);
    try {
      await adminFetch(`/api/admin/ciak${base}/history`, { method: "DELETE" });
      setMessaggi([]);
      setErrore(null);
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setErrore("Non sono riuscito a cancellare la cronologia.");
    }
  };

  const vuota = Array.isArray(messaggi) && messaggi.length === 0;

  return (
    <section aria-labelledby={`${agente}-chat-t`} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${agente}-chat-t`} className="text-2xl font-semibold text-slate-900">Parla con {nome}</h2>
        {Array.isArray(messaggi) && messaggi.length > 0 && (
          <button type="button" onClick={() => setChiedi(true)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <Trash2 className="h-4 w-4" aria-hidden /> Cancella
          </button>
        )}
      </div>

      <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto" aria-live="polite">
        {messaggi === undefined && <p className="text-sm text-slate-500">Carico la conversazione…</p>}
        {vuota && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{benvenuto}</p>}
        {Array.isArray(messaggi) && messaggi.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-800"}`}>
              <Testo text={m.content} />
            </div>
          </div>
        ))}
        {invio && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {nome} sta scrivendo…</p>}
        <div ref={fondo} />
      </div>

      {errore && <p className="mt-3 text-sm text-red-700" role="alert">{errore}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c} type="button" disabled={invio} onClick={() => manda(c)}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm text-slate-700 hover:border-slate-900 disabled:opacity-50">
            {c}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); manda(); }} className="mt-3 flex items-center gap-3 rounded-full border border-slate-200 py-2 pl-5 pr-2">
        <label htmlFor={`${agente}-input`} className="sr-only">{`Scrivi ${a} ${nome}`}</label>
        <input id={`${agente}-input`} value={input} onChange={(e) => setInput(e.target.value)} maxLength={3000}
          placeholder={`Scrivi ${a} ${nome}…`}
          className="min-w-0 flex-1 bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none" />
        <button type="submit" disabled={invio || !input.trim()} aria-label={`Invia ${a} ${nome}`}
          className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-yellow-400 disabled:bg-slate-300">
          <Send className="h-5 w-5" aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-500">{nota}</p>

      <ConfirmDialog
        open={chiedi}
        title={`Cancella la cronologia della chat con ${nome}`}
        body="I messaggi scambiati vengono rimossi. Operazione irreversibile."
        confirmLabel="Cancella"
        cancelLabel="Annulla"
        destructive
        onConfirm={cancella}
        onCancel={() => setChiedi(false)}
      />
    </section>
  );
}

export default AgenteChat;
