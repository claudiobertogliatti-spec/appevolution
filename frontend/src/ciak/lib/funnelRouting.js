export const BLUEPRINT_SOURCES = Object.freeze({
  DIRECT: "direct",
  MASTERCLASS_OPTIN: "masterclass_optin",
  RETARGETING: "retargeting",
});

const ALLOWED_ATTRIBUTION_SOURCES = new Set(Object.values(BLUEPRINT_SOURCES));

export function blueprintBridgeUrl() {
  return `/blueprint?source=${BLUEPRINT_SOURCES.MASTERCLASS_OPTIN}`;
}

export function isMasterclassOptinBridge(sourceOrSearch = "") {
  const safeSource = sourceOrSearch || "";
  const source = safeSource.startsWith("?")
    ? new URLSearchParams(safeSource).get("source")
    : safeSource;
  return source === BLUEPRINT_SOURCES.MASTERCLASS_OPTIN;
}

export function masterclassSkipUrl() {
  return "/masterclass/guarda";
}

export function masterclassOptinDestination() {
  return masterclassSkipUrl();
}

/**
 * Chi arriva sulla home da un annuncio Meta va portato all'opt-in.
 *
 * Perche' esiste (31/8/2026): l'inserzione attiva punta a `https://www.ciak.io/`,
 * ma dopo il redesign la home e' istituzionale e NON ha piu' il form: il post
 * promette la masterclass e consegna una brochure. In 30 giorni: 2.244 clic, 3
 * opt-in. Il link non si puo' correggere nell'annuncio perche' sta dentro un
 * post gia' pubblicato della Pagina, e i creative Meta sono immutabili.
 *
 * `fbclid` lo aggiunge Facebook a OGNI clic dai suoi annunci e dai suoi link:
 * e' il segnale piu' affidabile che abbiamo senza dipendere dagli UTM, che su
 * quella campagna non sono impostati.
 *
 * I parametri si portano dietro tutti: `fbclid` serve all'attribuzione del
 * Pixel, e buttarlo via qui vorrebbe dire perdere la conversione proprio nel
 * momento in cui inizia a funzionare.
 *
 * ⛔ Da rimuovere quando l'annuncio puntera' davvero a /masterclass: e' un
 * cerotto su un link sbagliato, non un pezzo di architettura del funnel.
 */
export function metaAdLandingRedirect(search = "") {
  const params = new URLSearchParams(search || "");
  if (!params.get("fbclid")) return null;
  return `${masterclassSkipUrlBase()}${search || ""}`;
}

function masterclassSkipUrlBase() {
  return "/masterclass";
}

export function normalizeAttributionSource(source) {
  return ALLOWED_ATTRIBUTION_SOURCES.has(source)
    ? source
    : BLUEPRINT_SOURCES.DIRECT;
}
