/**
 * Pagina Lead — regole che trasformano GET /lead-gestione in righe di tabella.
 *
 * Funzioni pure (niente rete, niente React). Le fasi e chi esce dalla pagina le
 * decide il backend (`services/lead_gestione.py`): qui si decide solo come si
 * mostrano — quanto e' urgente un'attesa, in che ordine, cosa significa la cella.
 *
 * Soglie di attesa: le stesse della Home "Oggi" (`oggiModel.SOGLIE`), cosi' lo
 * stesso lead non e' rosso in una pagina e neutro nell'altra.
 */
import { SOGLIE, giorniDa } from "./oggiModel";

export const FASI = [
  { id: "questionario", label: "Questionario", consigliato: "blueprint" },
  { id: "call_fissata", label: "Call fissata", consigliato: "invia" },
  { id: "call_fatta", label: "Call fatta", consigliato: "proposta" },
  { id: "trattativa", label: "Trattativa", consigliato: null },
];

const SOGLIE_FASE = {
  questionario: [SOGLIE.fattaAmbra, SOGLIE.fattaRossa],
  call_fatta: [SOGLIE.fattaAmbra, SOGLIE.fattaRossa],
  trattativa: [SOGLIE.trattativaAmbra, SOGLIE.trattativaRossa],
};

export const indiceFase = (id) => FASI.findIndex((f) => f.id === id);

/** Nome da mostrare: per intero, oppure l'email se manca. */
export function nomeVisibile(r) {
  return String(r?.nome || "").trim() || r?.email || "";
}

/** Cosa scrive la cella della fase in cui si trova il lead. */
export function cella(r, now = new Date()) {
  if (r.fase === "call_fissata") {
    const t = r.call_starts_at ? Date.parse(r.call_starts_at) : NaN;
    if (Number.isNaN(t)) return { tone: "warning", label: "Senza data" };
    return t < now.getTime()
      ? { tone: "critical", label: "Data passata" }
      : { tone: "good", label: "In agenda" };
  }
  const g = r.giorni ?? giorniDa(r.da, now);
  if (g == null) return { tone: "neutral", label: "—" };
  const [ambra, rossa] = SOGLIE_FASE[r.fase] || SOGLIE_FASE.questionario;
  const tone = g >= rossa ? "critical" : g >= ambra ? "warning" : "neutral";
  return { tone, label: g === 0 ? "oggi" : g === 1 ? "da 1 giorno" : `da ${g} giorni` };
}

const URGENZA = { critical: 0, warning: 1, neutral: 2, good: 3 };

/** Righe piatte dal board, in ordine: prima chi e' piu' urgente, poi chi aspetta da piu' tempo. */
export function righe(board, now = new Date()) {
  const tutte = (board?.colonne || []).flatMap((c) => c.lead || []);
  return tutte
    .map((r) => ({ ...r, _cella: cella(r, now) }))
    .sort(
      (a, b) =>
        URGENZA[a._cella.tone] - URGENZA[b._cella.tone] ||
        (b.giorni ?? -1) - (a.giorni ?? -1) ||
        nomeVisibile(a).localeCompare(nomeVisibile(b), "it")
    );
}

export function conteggi(rows) {
  const out = { tutti: rows.length };
  FASI.forEach((f) => { out[f.id] = rows.filter((r) => r.fase === f.id).length; });
  return out;
}

/** Filtra per fase e per testo (nome, cognome o email, senza badare alle maiuscole). */
export function filtra(rows, { fase = "tutti", testo = "" } = {}) {
  const q = testo.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (fase === "tutti" || r.fase === fase) &&
      (!q || `${nomeVisibile(r)} ${r.email || ""}`.toLowerCase().includes(q))
  );
}

/** Le voci del menu Azioni. `vai` = sezione della scheda lead (?vai=); `solo` = chi la vede. */
export const VOCI_AZIONI = [
  {
    gruppo: "Per questo lead",
    voci: [
      { id: "questionario", label: "Questionario e risposte", info: "Cosa ha risposto, e lo stato del questionario", vai: "questionario" },
      { id: "blueprint", label: "Genera il report e il Blueprint", info: "Genera, rigenera o scarica il PDF", vai: "blueprint", noCommerciale: true },
      { id: "fissata", label: "Conferma call fissata", info: "Quando la call è stata prenotata", vai: "fissata" },
      { id: "invia", label: "Ho fatto la call: invia il Blueprint", info: "Il cliente riceve l'email e il link d'accesso", vai: "invia", noCommerciale: true },
      { id: "proposta", label: "Genera la Proposta Partnership", info: "Per chi ha completato la call", vai: "proposta", noCommerciale: true },
      { id: "riporta", label: "Riporta a call fatta", info: "Per correggere uno stato sbagliato", vai: "riporta", noCommerciale: true },
    ],
  },
  {
    gruppo: "Dati",
    voci: [
      { id: "modifica", label: "Modifica nome, cognome, email, telefono", info: "", noCommerciale: true },
      { id: "elimina", label: "Elimina il lead", info: "", pericolo: true, noCommerciale: true },
    ],
  },
];

/** Il menu per chi e' loggato: Mariangela (account commerciale) vede solo cio' che la scheda le lascia fare. */
export function vociPer(adminType) {
  const commerciale = adminType === "mariangela";
  return VOCI_AZIONI.map((g) => ({
    ...g,
    voci: g.voci.filter((v) => !(commerciale && v.noCommerciale)),
  })).filter((g) => g.voci.length);
}

export function indirizzoScheda(email, vai) {
  const base = `/admin/leads/${encodeURIComponent(email)}`;
  return vai ? `${base}?vai=${vai}` : base;
}
