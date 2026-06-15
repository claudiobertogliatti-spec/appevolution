/**
 * metaPixel.js — gestione centralizzata Meta Pixel per Ciak.
 *
 * Due pixel ("affiancati", scelta 2026-06-15):
 *   - 1382427760577453  pixel storico — attivo su TUTTI gli host del bundle
 *   - 1662308485029469  pixel Ciak.io — attivo SOLO su ciak.io / www.ciak.io
 *
 * GDPR: entrambi si inizializzano e tracciano SOLO dopo che l'utente ha
 * accettato i cookie di marketing (toggle "Marketing" nel CookieBanner →
 * localStorage ep_cookie_consent.marketing === true). Prima del consenso NON
 * viene caricato fbevents.js (nessuna connessione/cookie verso Facebook a freddo).
 *
 * Il vecchio snippet cold-fire in public/index.html è stato rimosso: tutta
 * l'inizializzazione passa ora da qui.
 */

const PIXELS_ALL_HOSTS = ["1382427760577453"];
const PIXELS_CIAK_ONLY = ["1662308485029469"];

let initialized = false;

function isCiakHost() {
  try {
    const host = window.location.hostname.toLowerCase();
    const force =
      new URLSearchParams(window.location.search).get("ciak") === "1";
    return (
      host === "ciak.io" ||
      host === "www.ciak.io" ||
      host.endsWith(".ciak.io") ||
      force
    );
  } catch {
    return false;
  }
}

function eligiblePixelIds() {
  return isCiakHost()
    ? [...PIXELS_ALL_HOSTS, ...PIXELS_CIAK_ONLY]
    : [...PIXELS_ALL_HOSTS];
}

export function hasMarketingConsent() {
  try {
    const c = JSON.parse(localStorage.getItem("ep_cookie_consent"));
    return !!(c && c.marketing);
  } catch {
    return false;
  }
}

function loadFbevents() {
  if (window.fbq) return;
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  /* eslint-enable */
}

/**
 * Inizializza i pixel idonei (host + consenso) e invia la PageView iniziale.
 * Idempotente.
 */
export function initPixels() {
  if (initialized) return;
  if (!hasMarketingConsent()) return;
  const ids = eligiblePixelIds();
  if (!ids.length) return;
  loadFbevents();
  ids.forEach((id) => window.fbq("init", id));
  window.fbq("track", "PageView");
  initialized = true;
}

export function isReady() {
  return initialized && typeof window.fbq === "function";
}

export function trackPageView() {
  if (!isReady()) return;
  window.fbq("track", "PageView");
}

export function trackInitiateCheckout(value = 67, currency = "EUR") {
  if (!isReady()) return;
  window.fbq("track", "InitiateCheckout", { value, currency });
}

export function trackPurchase(value = 67, currency = "EUR", eventId) {
  if (!isReady()) return;
  const opts = eventId ? { eventID: eventId } : undefined;
  window.fbq("track", "Purchase", { value, currency }, opts);
}

/**
 * Chiamato dal CookieBanner quando l'utente concede il consenso marketing.
 * Esposto come globale perché il banner gira in scope globale (script statico
 * iniettato via new Function).
 */
export function enableMarketing() {
  initPixels();
}

if (typeof window !== "undefined") {
  window.ciakEnableMarketing = enableMarketing;
  // Utente di ritorno con consenso marketing già salvato: auto-init
  // (il banner potrebbe non richiamare il hook se il consenso è precedente).
  try {
    if (hasMarketingConsent()) initPixels();
  } catch {
    /* no-op */
  }
  // Robustezza: ascolta anche l'evento custom emesso dal banner.
  window.addEventListener("ep-marketing-enabled", () => initPixels());
}
