/**
 * Home "Oggi" — regole che trasformano i dati grezzi in liste di cose da fare.
 *
 * Funzioni pure (niente rete, niente React): le regole stanno qui perche' sono
 * quelle che decidono cosa si vede per prime, e vanno provate su dati sporchi.
 *
 * Fonti (stesse delle pagine esistenti, nessuna nuova):
 *   pipeline = GET /api/admin/ciak/pipeline-blueprint  { columns:[{id,items}] }
 *   audit    = GET /api/admin/ciak/delivery-audit      { items:[partner] }
 *
 * Regole concordate il 4/10/2026:
 *  - gli account di prova (indirizzo +ciaktest, nomi in NOMI_PROVA) NON entrano nei
 *    numeri, ma si dichiarano ("N esclusi") e non si cancellano mai;
 *  - chi e' gia' partner non si conta anche tra le trattative (es. un cliente Start
 *    rimasto "call fatta" in pipeline mentre ha gia' iniziato il percorso).
 */

/** Giorni di attesa oltre cui un contatto passa da neutro ad ambra / rosso. */
// Tarate sui dati veri del 4/10: con rosso a 7 giorni tutte e 6 le "call fatte"
// diventavano rosse e il rosso non distingueva piu' niente (19, 13, 13, 11, 11, 7).
export const SOGLIE = {
  fattaAmbra: 5,
  fattaRossa: 14,
  trattativaAmbra: 7,
  trattativaRossa: 14,
};

const NOMI_PROVA = ["mario rossi", "test ciak"];

const norm = (s) => String(s || "").trim().toLowerCase();

/** True se il record e' un account di prova/finto e non va contato nei numeri. */
export function isProva({ email, nome } = {}) {
  if (norm(email).includes("+ciaktest")) return true;
  return NOMI_PROVA.includes(norm(nome));
}


/**
 * Nome leggibile: i dati arrivano sporchi ("elena rizzo", "ROSA MARIA VERDI").
 * Si corregge SOLO se e' tutto minuscolo o tutto maiuscolo; un nome gia' scritto
 * con le maiuscole giuste ("Chiara Ferri", "De Luca") non si tocca.
 */
export function pulisciNome(nome) {
  const s = String(nome || "").trim();
  if (!s) return s;
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

/** Giorni interi trascorsi da una data ISO; null se la data manca o e' illeggibile. */
export function giorniDa(iso, now = new Date()) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / 86400000));
}

function toneAttesa(giorni, ambra, rossa) {
  if (giorni == null) return "neutral";
  if (giorni >= rossa) return "critical";
  if (giorni >= ambra) return "warning";
  return "neutral";
}

const itemsOf = (pipeline, stage) =>
  (pipeline?.columns || []).find((c) => c.id === stage)?.items || [];

// Piu' giorni di attesa prima; chi non ha la data in fondo.
const byGiorniDesc = (a, b) => (b.giorni ?? -1) - (a.giorni ?? -1);

const isTeam = (owner) => /^(team|claudio)/i.test(String(owner || "").trim());

/**
 * Costruisce i blocchi della home. Una fonte assente (null/undefined) restituisce
 * `null` per i suoi blocchi: l'interfaccia dice "dato non disponibile", non "0".
 */
export function buildOggi({ pipeline, audit, now = new Date() } = {}) {
  const esclusi = [];
  const conta = (nome, email) => {
    if (isProva({ email, nome })) {
      esclusi.push(nome || email);
      return false;
    }
    return true;
  };

  // ── Partner (Audit Delivery) ────────────────────────────────────────────
  let partner = null;
  const partnerEmail = new Set();
  const partnerNome = new Set();
  let auditHaEmail = false;
  if (audit) {
    const tutti = audit.items || [];
    tutti.forEach((i) => {
      if (i.email) { partnerEmail.add(norm(i.email)); auditHaEmail = true; }
      if (i.name) partnerNome.add(norm(i.name));
    });
    const rows = tutti
      .filter((i) => conta(i.name, i.email))
      .map((i) => ({
        id: i.id,
        nome: pulisciNome(i.name) || i.id,
        owner: i.owner,
        team: isTeam(i.owner),
        fermo: Boolean(i.blocked || i.stale),
        bloccato: Boolean(i.blocked),
        giorni: giorniDa(i.step_updated_at, now),
        fase: i.macro_label || i.current_step || null,
        azione: i.next_action || null,
        motivo: i.stato_reale || null,
      }));
    // Prima chi e' BLOCCATO (aspetta un'approvazione), poi chi e' fermo, poi chi
    // aspetta da piu' giorni: un blocco e' piu' urgente di un semplice fermo.
    const ordina = (a, b) =>
      (Number(b.bloccato) - Number(a.bloccato)) ||
      (Number(b.fermo) - Number(a.fermo)) ||
      byGiorniDesc(a, b);
    const perFase = {};
    rows.forEach((r) => {
      const k = r.fase || "Senza fase";
      perFase[k] = perFase[k] || { fase: k, totale: 0, fermi: 0 };
      perFase[k].totale += 1;
      if (r.fermo) perFase[k].fermi += 1;
    });
    partner = {
      totale: rows.length,
      fermi: rows.filter((r) => r.fermo).length,
      tocca: rows.filter((r) => r.team).sort(ordina),
      aspettiamo: rows.filter((r) => !r.team).sort(ordina),
      perFase: Object.values(perFase),
    };
  }

  // Un contatto della pipeline e' "gia' partner" se compare nell'Audit: per email;
  // se l'Audit non porta ancora le email (backend vecchio) ripiega sul nome.
  let doppi = 0;
  const giaPartner = (i) => {
    if (!audit) return false;
    const hit = auditHaEmail
      ? partnerEmail.has(norm(i.email))
      : partnerNome.has(norm(i.nome));
    if (hit) doppi += 1;
    return hit;
  };

  // ── Call e trattative (Pipeline Vendite) ────────────────────────────────
  let call = null;
  let trattative = null;
  if (pipeline) {
    const vivi = (stage) =>
      itemsOf(pipeline, stage).filter((i) => conta(i.nome, i.email) && !giaPartner(i));

    const prenotate = vivi("call_prenotata")
      .map((i) => {
        const ts = i.call_starts_at ? Date.parse(i.call_starts_at) : NaN;
        const haData = !Number.isNaN(ts);
        const passata = haData && ts < now.getTime();
        return {
          email: i.email,
          nome: pulisciNome(i.nome) || i.email,
          quando: haData ? i.call_starts_at : null,
          passata,
          giorni: giorniDa(i.stage_since || i.updated_at, now),
          tone: passata ? "critical" : haData ? "info" : "warning",
          nota: passata
            ? "Data passata: aggiorna lo stato"
            : haData ? null : "Data non registrata",
        };
      })
      .sort((a, b) => {
        if (a.passata !== b.passata) return a.passata ? -1 : 1;
        if (a.quando && b.quando) return Date.parse(a.quando) - Date.parse(b.quando);
        if (a.quando || b.quando) return a.quando ? -1 : 1;
        return byGiorniDesc(a, b);
      });

    const fatte = vivi("call_fatta")
      .map((i) => {
        const giorni = giorniDa(i.stage_since || i.updated_at, now);
        return {
          email: i.email,
          nome: pulisciNome(i.nome) || i.email,
          giorni,
          tone: toneAttesa(giorni, SOGLIE.fattaAmbra, SOGLIE.fattaRossa),
        };
      })
      .sort(byGiorniDesc);

    call = { prenotate, fatte };

    trattative = vivi("in_trattativa")
      .map((i) => {
        const giorni = giorniDa(i.stage_since || i.updated_at, now);
        return {
          email: i.email,
          nome: pulisciNome(i.nome) || i.email,
          giorni,
          tone: toneAttesa(giorni, SOGLIE.trattativaAmbra, SOGLIE.trattativaRossa),
        };
      })
      .sort(byGiorniDesc);
  }

  return { call, trattative, partner, esclusi: [...new Set(esclusi)], doppi };
}
