import { MessagesSquare } from "lucide-react";
import "../../partner/sereno/sereno.css";
import ChatAssistente from "../../components/ChatAssistente";
import { streamAssistente } from "./assistenteStream";

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
 */
export default function StartAssistenza({ client }) {
  const nome = String(client?.name || "").trim().split(" ")[0];
  const oggetto = encodeURIComponent("Mi serve una mano con Ciak Start");
  const corpo = encodeURIComponent(`Ciao, sono ${client?.name || ""}.\n\nMi serve una mano con: `);
  const mailto = `mailto:${EMAIL}?subject=${oggetto}&body=${corpo}`;
  return (
    <>
      <header className="sereno-intro">
        <h1>Un aiuto, quando serve.</h1>
        <p>Scrivi la tua domanda come la diresti a voce. Non esiste una domanda sbagliata.</p>
      </header>

      <section className="sereno-up">
        <h2>Chiedi all'assistente</h2>
        <p className="sereno-up-note">Risponde un assistente AI, subito. Se non sa o se riguarda soldi, contratto o accesso, lo gira al team e ti risponde una persona.</p>
        <ChatAssistente streamFn={streamAssistente} nome={nome} esempi={ESEMPI} mailto={mailto} />
      </section>

      <section className="sereno-up">
        <h2>Preferisci scrivere a una persona?</h2>
        <p>Racconta in due righe dove ti sei fermato, anche se non sai come si chiama il passaggio. Ti rispondiamo noi.</p>
        <a className="sereno-primary" href={mailto}>
          <MessagesSquare aria-hidden="true" />Scrivi al team
        </a>
        <p className="sereno-up-note" style={{ marginTop: 16 }}>Se il tuo programma di posta non si apre, scrivi a <strong>{EMAIL}</strong>.</p>
      </section>
    </>
  );
}
