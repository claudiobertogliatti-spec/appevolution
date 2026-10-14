import { useEffect, useRef, useState } from "react";
import "../partner/sereno/sereno.css";
import { ChatError } from "../insider/chatStream";

/**
 * Chat dell'assistente (Start e partner): stessa interfaccia, cambia solo `streamFn`.
 *
 * Una risposta che non arriva non diventa mai una risposta finta: la bolla vuota sparisce, il testo
 * resta e compare "Riprova" insieme alla mail del team. Gli esempi a un tocco servono a chi e'
 * poco pratico di digitale e non sa come formulare la domanda.
 *
 * `streamFn({ message, history, onText })` deve restituire una promessa `{ passato }` e lanciare
 * `ChatError` (o qualunque errore) se non risponde.
 */
export default function ChatAssistente({ streamFn, nome = "", esempi = [], mailto, ariaEsempi = "Domande di esempio" }) {
  const [messaggi, setMessaggi] = useState([]); // {role: "user"|"assistant", content, in_corso?}
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [fallito, setFallito] = useState(null); // {testo, errore}
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messaggi, fallito]);

  // invia() usa il testo scritto; invia("...") una domanda pronta; invia("...", true) rimanda quella fallita
  const invia = async (pronta, riprova = false) => {
    const domanda = (typeof pronta === "string" ? pronta : testo).trim();
    if (!domanda || invio) return;
    let storia = messaggi.map((m) => ({ role: m.role, content: m.content }));
    // sul "Riprova" l'ultima domanda e' gia' nell'elenco: nella storia va solo il resto
    if (riprova && storia.length && storia[storia.length - 1].role === "user") storia = storia.slice(0, -1);
    setMessaggi((m) => (riprova ? m : [...m, { role: "user", content: domanda }]).concat({ role: "assistant", content: "", in_corso: true }));
    setTesto("");
    setFallito(null);
    setInvio(true);
    try {
      await streamFn({
        message: domanda,
        history: storia,
        onText: (pezzo) =>
          setMessaggi((m) => {
            const copia = m.slice();
            const ultimo = copia[copia.length - 1];
            copia[copia.length - 1] = { ...ultimo, content: ultimo.content + pezzo };
            return copia;
          }),
      });
      setMessaggi((m) => m.map((x, i) => (i === m.length - 1 ? { role: x.role, content: x.content } : x)));
    } catch (e) {
      // niente risposta a meta' o finta: si toglie la bolla vuota e si offre di riprovare
      setMessaggi((m) => m.slice(0, -1));
      setFallito({ testo: domanda, errore: e instanceof ChatError ? e.message : null });
    } finally {
      setInvio(false);
    }
  };

  return (
    <>
      <div className="sereno-chat">
        <div className="sereno-chat-log" ref={logRef} aria-live="polite" style={{ maxHeight: 360 }}>
          <p className="sereno-msg sereno-msg-agent">Ciao{nome ? `, ${nome}` : ""}! Dimmi pure cosa non ti è chiaro.</p>
          {messaggi.map((m, i) => (
            <p key={i} className={`sereno-msg ${m.role === "user" ? "sereno-msg-me" : "sereno-msg-agent"}`}>
              {m.content || (m.in_corso ? "Sto scrivendo…" : "")}
            </p>
          ))}
        </div>
        {fallito && (
          <div className="sereno-chat-alert" role="alert">
            <strong>Messaggio non inviato.</strong> {fallito.errore || "Il tuo testo è al sicuro: riprova."}
            <div className="sereno-actions" style={{ marginTop: 10 }}>
              <button type="button" className="sereno-primary" onClick={() => invia(fallito.testo, true)} disabled={invio}>Riprova</button>
              {mailto && <a className="sereno-secondary" href={mailto}>Scrivi al team</a>}
            </div>
          </div>
        )}
        <form className="sereno-chat-input" onSubmit={(e) => { e.preventDefault(); invia(); }}>
          <input
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi qui la tua domanda…"
            aria-label="La tua domanda"
            maxLength={800}
            disabled={invio}
          />
          <button type="submit" className="sereno-primary" disabled={invio || !testo.trim()}>Invia</button>
        </form>
      </div>

      {messaggi.length === 0 && esempi.length > 0 && (
        <div className="sereno-chips" aria-label={ariaEsempi}>
          {esempi.map((q) => (
            <button key={q} type="button" onClick={() => invia(q)} disabled={invio}>{q}</button>
          ))}
        </div>
      )}
    </>
  );
}
