/**
 * Menu di sezione — regole pure: dato il percorso, a quale reparto appartiene la
 * pagina e quali sono le pagine sorelle.
 *
 * Perche' esiste: ogni reparto aveva DUE elenchi di pagine che non coincidevano —
 * quello del menu (NAV, le card) e un sotto-menu scritto a mano, montato solo su
 * alcune pagine (Vendite 2 su 8, Delivery 1 su ~12). Per passare da una pagina
 * sorella all'altra si tornava alla panoramica e si rientrava. Ora l'elenco e' uno
 * solo (NAV) e il menu di sezione compare su OGNI pagina del reparto.
 */

/** Una pagina "possiede" un percorso se e' quello esatto o un suo sotto-percorso:
 *  `/admin/pipeline` non deve catturare `/admin/pipeline-blueprint`. */
export function pageOwns(pathname, page) {
  if (page.end) return pathname === page.to;
  return pathname === page.to || pathname.startsWith(`${page.to}/`);
}

const pagineDi = (macro) =>
  macro.groups
    ? macro.groups.flatMap((g) => g.pages.map((p) => ({ ...p, gruppo: g.title })))
    : macro.pages || [];

/**
 * Sezione (reparto) a cui appartiene `pathname`, o null.
 *
 * `nav` e' il menu GIA' ristretto per ruolo; `adminType` toglie anche le singole
 * pagine non consentite (`hideFor` sulla pagina): chi ha un accesso limitato non
 * vede nel menu di sezione pagine che non sono sue.
 *
 * Restituisce { id, label, attiva, voci:[{to,label,gruppo}] }. La prima voce e'
 * sempre la "Panoramica" del reparto; `attiva` e' la voce piu' specifica che
 * possiede il percorso.
 */
export function trovaSezione(pathname, nav, adminType = "claudio") {
  for (const macro of nav || []) {
    if (!macro.landing) continue;
    const panoramica = `/admin/reparto/${macro.id}`;
    const pagine = pagineDi(macro).filter((p) => !(p.hideFor || []).includes(adminType));
    const suPanoramica = pathname === panoramica;
    const possessori = pagine.filter((p) => pageOwns(pathname, p));
    if (!suPanoramica && possessori.length === 0) continue;
    const attiva = suPanoramica
      ? panoramica
      : [...possessori].sort((a, b) => b.to.length - a.to.length)[0].to;
    return {
      id: macro.id,
      label: macro.label,
      attiva,
      voci: [
        { to: panoramica, label: "Panoramica", gruppo: null },
        ...pagine.map((p) => ({ to: p.to, label: p.label, gruppo: p.gruppo || null })),
      ],
    };
  }
  return null;
}
