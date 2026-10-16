/**
 * Script dentro la scheda lead — regole pure (nessun React, nessuna rete).
 *
 * I testi sono quelli approvati da Claudio il 5/10/2026 (risveglioAsset.js): qui si
 * scelgono, si compilano con i dati del lead e si controlla che non restino segnaposto.
 * I valori di `key` sono quelli accettati dal backend (TOCCHI_MESSAGGI in ciak_admin.py).
 */
import { RISVEGLIO_ASSET } from "./risveglioAsset";

export const CANALI = [
  { key: "linkedin", label: "LinkedIn", hint: "LinkedIn: si incolla a mano nel messaggio del profilo. Pochi al giorno." },
  { key: "social", label: "Instagram / Facebook", hint: "Instagram / Facebook: si scrive a mano, mai in automatico. Meglio la versione breve." },
  { key: "whatsapp", label: "WhatsApp", hint: "WhatsApp: solo per chi è in rubrica, dal numero personale. Meglio la versione breve." },
];

// `blocco` = posizione in RISVEGLIO_ASSET.blocks; `origine` = da dove arriva il contatto.
export const MESSAGGI = [
  { key: "risveglio_ex", label: "1 · Ex cliente con analisi già consegnata", blocco: 0, origine: "ex_cliente" },
  { key: "risveglio_setter", label: "2 · Interessato in passato (vecchi setter)", blocco: 1, origine: "setter" },
  { key: "risveglio_rete", label: "3 · Rete e rubrica (conosce Claudio)", blocco: 2, origine: "rete" },
  { key: "breve", label: "Versione breve (Instagram, Facebook, LinkedIn)", blocco: 3, origine: null },
  { key: "seguito", label: "Messaggio di seguito (dopo circa 5 giorni)", blocco: 4, origine: null },
];

export const ORIGINI = [
  { key: "ex_cliente", label: "Ex cliente con analisi" },
  { key: "setter", label: "Interessato in passato (setter)" },
  { key: "rete", label: "Rete / rubrica" },
];

export const MITTENTI = ["Mariangela", "Claudio"];
const FIRME = { Mariangela: "Mariangela", Claudio: "Claudio Bertogliatti" };

/** Chi scrive di default: chi è collegato (Mariangela → Mariangela, tutti gli altri → Claudio). */
export function mittenteDefault(adminType) {
  return adminType === "mariangela" ? "Mariangela" : "Claudio";
}

/**
 * Messaggio da proporre: se il lead ha già ricevuto un risveglio, il seguito; fuori da
 * LinkedIn la versione breve (i testi lunghi non vanno in chat); altrimenti quello
 * dell'origine. Senza origine: la versione breve, che non ha ipotesi sul rapporto.
 */
export function messaggioConsigliato({ origine, canale, touches }) {
  const fatti = (touches || []).map((t) => t.message);
  if (fatti.some((m) => ["risveglio_ex", "risveglio_setter", "risveglio_rete", "breve"].includes(m)) && !fatti.includes("seguito")) {
    return "seguito";
  }
  if (canale && canale !== "linkedin") return "breve";
  return MESSAGGI.find((m) => m.origine && m.origine === origine)?.key || "breve";
}

/** Testo con nome, settore, mittente e firma già sostituiti; ciò che manca resta tra [parentesi]. */
export function compila({ key, mittente, lead }) {
  const m = MESSAGGI.find((x) => x.key === key);
  if (!m) return "";
  const nome = ((lead && lead.display_name) || "").trim().split(/\s+/)[0];
  const settore = ((lead && lead.niche_detected) || "").trim();
  let t = RISVEGLIO_ASSET.blocks[m.blocco].s;
  t = t.split("[Nome mittente]").join(mittente).split("[Nome e cognome]").join(FIRME[mittente] || mittente);
  if (nome) t = t.split("[Nome]").join(nome);
  if (settore) t = t.split("[settore]").join(settore);
  return t;
}

/** Segnaposto rimasti da completare (senza doppioni). */
export function segnapostoMancanti(testo) {
  const trovati = String(testo || "").match(/\[[^\]]+\]/g) || [];
  return trovati.filter((v, i) => trovati.indexOf(v) === i);
}

export function etichettaMessaggio(key) {
  if (key === "profilo_trovato") return "Profilo trovato";
  const m = MESSAGGI.find((x) => x.key === key);
  return m ? m.label.replace(/^\d · /, "") : key;
}

export function etichettaCanale(key) {
  if (key === "email") return "Email";
  return CANALI.find((c) => c.key === key)?.label || key;
}

/** Cronologia: dal più recente; i tocchi senza data vanno in fondo. */
export function cronologia(touches) {
  return [...(touches || [])].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
}

/** Tappe dell'avvicinamento, in base a ciò che è già stato registrato. */
export const TAPPE = ["Profilo trovato", "Risveglio inviato", "Seguito", "Risposta", "Call fissata"];
export function tappeFatte(lead) {
  const fatti = new Set((lead.touches || []).map((t) => t.message));
  const status = lead.status;
  const risposto = ["responded_positive", "qualified", "converted"].includes(status);
  const risveglio = ["risveglio_ex", "risveglio_setter", "risveglio_rete", "breve"].some((k) => fatti.has(k));
  // Chi ha già risposto ha superato le tappe precedenti, anche se non risultano registrate
  // (lead nati prima di questa funzione, o contattati fuori da Ciak): niente "seguito in attesa".
  const flags = [
    fatti.has("profilo_trovato") || risveglio || risposto,
    risveglio || risposto,
    fatti.has("seguito") || risposto,
    risposto,
    ["qualified", "converted"].includes(status),
  ];
  const prossima = flags.findIndex((f) => !f);
  return { flags, prossima: prossima === -1 ? null : prossima };
}
