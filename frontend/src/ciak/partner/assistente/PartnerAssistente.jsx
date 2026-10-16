import ChatAssistente from "../../components/ChatAssistente";
import { streamPartnerAssistente } from "./partnerAssistenteStream";

const EMAIL = "assistenza@evolution-pro.it";

// Domande tipiche sul servizio, a un tocco.
const ESEMPI = [
  "Cosa devo fare adesso?",
  "Come funziona il montaggio del mio video?",
  "Cosa fate voi per me e cosa no?",
  "Chi mi segue sul sistema di vendita?",
];

/**
 * Assistente dell'area partner: risponde SUBITO alle domande sul percorso, sui tempi e su cosa fa
 * Evolution PRO, con ciò che sappiamo di sicuro. Sui temi delicati (prezzi, rate, royalty, contratto,
 * fatture, accesso) e quando non sa, lo dice e gira la domanda al team: non inventa.
 *
 * Non sostituisce Stefania e gli specialisti, che guidano passo passo ogni step: qui si chiede "come
 * funziona" e "cosa succede adesso".
 */
export default function PartnerAssistente({ partner }) {
  if (!partner?.id) return null; // senza partner non si sa per chi rispondere: meglio nessuna chat
  const nome = String(partner.name || "").trim().split(" ")[0];
  const oggetto = encodeURIComponent("Mi serve una mano con il percorso Evolution PRO");
  const corpo = encodeURIComponent(`Ciao, sono ${partner.name || ""}.\n\nMi serve una mano con: `);
  return (
    <section
      aria-labelledby="partner-assistente-titolo"
      style={{ width: "100%", maxWidth: 1400, margin: "0 auto", padding: "24px 16px" }}
    >
      <h2 id="partner-assistente-titolo" style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0 }}>
        Chiedi all'assistente
      </h2>
      <p style={{ fontSize: 14, color: "#475569", margin: "6px 0 0", maxWidth: 720 }}>
        Risponde un assistente AI, subito, su percorso, tempi e servizi. Se non sa, o se riguarda soldi, contratto
        o accesso, lo gira al team e ti risponde una persona.
      </p>
      <ChatAssistente
        streamFn={streamPartnerAssistente(partner.id)}
        nome={nome}
        esempi={ESEMPI}
        mailto={`mailto:${EMAIL}?subject=${oggetto}&body=${corpo}`}
      />
    </section>
  );
}
