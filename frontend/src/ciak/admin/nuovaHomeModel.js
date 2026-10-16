/**
 * Nuova home «Oggi» — regole pure (niente rete, niente React).
 *
 * Fonti: le stesse della home di oggi, via `buildOggi` (oggiModel.js). Nessuna fonte nuova.
 *
 * ⚠ «giorni» di una trattativa = da quanto e' in quella fase (stage_since o updated_at),
 * NON giorni senza risposta: il dato "ultima risposta del contatto" non e' in questa fonte.
 * Per questo l'interfaccia scrive «in trattativa da N giorni» e mai «senza risposta».
 */

/** Giorni in trattativa oltre i quali compare tra le trattative «da sollecitare».
 *  Deciso da Claudio il 12/10/2026 («5 giorni»). */
export const SOLLECITO_GIORNI = 5;

/**
 * Trattative da sollecitare, dalla piu' vecchia. `trattative` = model.trattative di buildOggi:
 *   null  -> fonte non disponibile (si ritorna null, non 0)
 *   array -> { email, nome, giorni, tone }
 * Chi non ha la data (giorni null) non si puo' giudicare: non entra nella lista ma si
 * conta in `senzaData`, cosi' l'interfaccia puo' dirlo.
 */
export function daSollecitare(trattative, soglia = SOLLECITO_GIORNI) {
  if (!Array.isArray(trattative)) return null;
  const lista = trattative
    .filter((t) => t.giorni != null && t.giorni >= soglia)
    .sort((a, b) => b.giorni - a.giorni);
  return {
    lista,
    senzaData: trattative.filter((t) => t.giorni == null).length,
    totale: trattative.length,
  };
}

const plurale = (n, uno, molti) => (n === 1 ? uno : molti);
const elenco = (v) => (v.length <= 1 ? v.join("") : `${v.slice(0, -1).join(", ")} e ${v[v.length - 1]}`);
const maiuscola = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;

/**
 * La frase sotto il saluto. Una fonte non disponibile (null) lo dice, non conta zero.
 *   call, solleciti, tocca: numero | null
 */
export function frasePrincipale({ call, solleciti, tocca }) {
  const pezzi = [];
  const zero = [];
  const mancanti = [];
  if (call == null) mancanti.push("le call");
  else if (call > 0) pezzi.push(`${call} ${plurale(call, "call", "call")} oggi`);
  else zero.push("nessuna call oggi");
  if (solleciti == null) mancanti.push("le trattative");
  else if (solleciti > 0) {
    pezzi.push(`${solleciti} ${plurale(solleciti, "trattativa da sollecitare", "trattative da sollecitare")}`);
  } else zero.push("nessuna trattativa da sollecitare");
  if (tocca == null) mancanti.push("i partner");
  else if (tocca > 0) {
    pezzi.push(`${tocca} ${plurale(tocca, "partner che aspetta", "partner che aspettano")} te`);
  } else zero.push("nessun partner che aspetta te");

  const parti = [];
  if (pezzi.length) parti.push(`Hai ${elenco(pezzi)}.`);
  else if (zero.length) parti.push(`${maiuscola(elenco(zero))}.`);
  if (mancanti.length) parti.push(`Non riesco a leggere ${elenco(mancanti)}.`);
  return parti.join(" ");
}
