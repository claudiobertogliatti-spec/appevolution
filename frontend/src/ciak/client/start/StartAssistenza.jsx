import { useEffect, useRef, useState } from "react";
import { MessagesSquare } from "lucide-react";
import "../../partner/sereno/sereno.css";
import { ChatError, streamAssistente } from "./assistenteStream";

const EMAIL = "assistenza@evolution-pro.it";

// Domande tipiche, a un tocco: chi è poco pratico di digitale non deve inventare come chiedere.
const ESEMPI = [
  "Cosa devo fare adesso?",
  "Quando arriva la mia pagina web?",
  "Come scelgo i colori del marchio?",
  "Devo rispondere a tutte le domande?",
];

/**
 * "Assistenza": un assistente AI risponde alle domande sul servizio (cosa fare, tempi, strumenti) con
 * ciò che sappiamo di sicuro. Sui temi delicati (soldi, contratto, fatture, accesso) e quando non sa,
 * lo dice e gira la domanda al team: non inventa. Resta sempre la mail, per scrivere a una persona.
 *
 * Una risposta che non arriva non diventa mai una risposta finta: il testo resta, con "Riprova".
 */
export default function StartAssistenza({ client }) {
  const [messaggi, setMessaggi] = useState([]); // {role: "user"|"assistant", content}
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [fallito, setFallito] = useState(null); // {testo, errore}
  const logRef = useRef(null);
  const nome = String(client?.name || "").trim().split(" ")[0];

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
      await streamAssistente({
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
      // niente risposta a metà o finta: si toglie la bolla vuota e si offre di riprovare
      setMessaggi((m) => m.slice(0, -1));
      setFallito({ testo: domanda, errore: e instanceof ChatError ? e.message : null });
    } finally {
      setInvio(false);
    }
  };

  const oggetto = encodeURIComponent("Mi serve una mano con Ciak Start");
  const corpo = encodeURIComponent(`Ciao, sono ${client?.name || ""}.\n\nMi serve una mano con: `);
  return (
    <>
      <header className="sereno-intro">
        <h1>Un aiuto, quando serve.</h1>
        <p>Scrivi la tua domanda come la diresti a voce. Non esiste una domanda sbagliata.</p>
      </header>

      <section className="sereno-up">
        <h2>Chiedi all'assistente</h2>
        <p className="sereno-up-note">Risponde un assistente AI, subito. Se non sa o se riguarda soldi, contratto o accesso, lo gira al team e ti risponde una persona.</p>

        <div className="sereno-chat">
          <div className="sereno-chat-log" ref={logRef} aria-live="polite" style={{ maxHeight: 360 }}>
            <p className="sereno-msg sereno-msg-agent">
              Ciao{nome ? `, ${nome}` : ""}! Dimmi pure cosa non ti è chiaro.
            </p>
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
                <a className="sereno-secondary" href={`mailto:${EMAIL}?subject=${oggetto}&body=${corpo}`}>Scrivi al team</a>
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

        {messaggi.length === 0 && (
          <div className="sereno-chips" aria-label="Domande di esempio">
            {ESEMPI.map((q) => (
              <button key={q} type="button" onClick={() => invia(q)} disabled={invio}>{q}</button>
            ))}
          </div>
        )}
      </section>

      <section className="sereno-up">
        <h2>Preferisci scrivere a una persona?</h2>
        <p>Racconta in due righe dove ti sei fermato, anche se non sai come si chiama il passaggio. Ti rispondiamo noi.</p>
        <a className="sereno-primary" href={`mailto:${EMAIL}?subject=${oggetto}&body=${corpo}`}>
          <MessagesSquare aria-hidden="true" />Scrivi al team
        </a>
        <p className="sereno-up-note" style={{ marginTop: 16 }}>Se il tuo programma di posta non si apre, scrivi a <strong>{EMAIL}</strong>.</p>
      </section>
    </>
  );
}
