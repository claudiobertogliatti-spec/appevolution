import { MessagesSquare } from "lucide-react";
import "../../partner/sereno/sereno.css";

const EMAIL = "assistenza@evolution-pro.it";

/** "Assistenza": per ora si scrive al team via email (nessuna chat dentro l'area cliente). */
export default function StartAssistenza({ client }) {
  const oggetto = encodeURIComponent("Mi serve una mano con Ciak Start");
  const corpo = encodeURIComponent(`Ciao, sono ${client?.name || ""}.\n\nMi serve una mano con: `);
  return (
    <>
      <header className="sereno-intro">
        <h1>Un aiuto, quando serve.</h1>
        <p>Se qualcosa non è chiaro, scrivici. Non c'è nessuna domanda sbagliata.</p>
      </header>
      <section className="sereno-up">
        <h2>Scrivici una email</h2>
        <p>Racconta in due righe dove ti sei fermato, anche se non sai come si chiama il passaggio. Ti rispondiamo noi.</p>
        <a className="sereno-primary" href={`mailto:${EMAIL}?subject=${oggetto}&body=${corpo}`}>
          <MessagesSquare aria-hidden="true" />Scrivi al team
        </a>
        <p className="sereno-up-note" style={{ marginTop: 16 }}>Se il tuo programma di posta non si apre, scrivi a <strong>{EMAIL}</strong>.</p>
      </section>
    </>
  );
}
