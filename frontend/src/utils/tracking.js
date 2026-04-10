/**
 * KPI Tracking — GA4 + Meta Pixel
 * Gestione centralizzata degli eventi di tracciamento.
 * I tracking IDs vengono caricati dal backend (configurabili dall'admin).
 */

const API = process.env.REACT_APP_BACKEND_URL || "";

let ga4Loaded = false;
let metaLoaded = false;

// ─── GA4 ─────────────────────────────────────────────────────────────────────

function loadGA4(measurementId) {
  if (ga4Loaded || !measurementId) return;
  ga4Loaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: true });
}

function trackGA4Event(eventName, params = {}) {
  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// ─── META PIXEL ──────────────────────────────────────────────────────────────

function loadMetaPixel(pixelId) {
  if (metaLoaded || !pixelId) return;
  metaLoaded = true;

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function trackMetaEvent(eventName, params = {}) {
  if (window.fbq) {
    window.fbq("track", eventName, params);
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────

let trackingInitialized = false;

export async function initTracking() {
  if (trackingInitialized) return;
  trackingInitialized = true;

  try {
    const res = await fetch(`${API}/api/tracking/config`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.ga4_id) loadGA4(data.ga4_id);
    if (data.meta_pixel_id) loadMetaPixel(data.meta_pixel_id);
  } catch {
    // Tracking non bloccante — silenzioso se il backend non risponde
  }
}

// ─── EVENTI BUSINESS ─────────────────────────────────────────────────────────

export function trackPageView(pageName) {
  trackGA4Event("page_view", { page_title: pageName });
  // Meta Pixel traccia PageView automaticamente
}

export function trackQuestionarioStarted(userId) {
  trackGA4Event("questionario_started", { user_id: userId });
  trackMetaEvent("InitiateCheckout", { content_name: "questionario" });
}

export function trackQuestionarioCompleted(userId) {
  trackGA4Event("questionario_completed", { user_id: userId });
  trackMetaEvent("CompleteRegistration", { content_name: "questionario" });
}

export function trackPaymentInitiated(amount, userId) {
  trackGA4Event("begin_checkout", { value: amount, currency: "EUR", user_id: userId });
  trackMetaEvent("InitiateCheckout", { value: amount, currency: "EUR" });
}

export function trackPaymentCompleted(amount, userId) {
  trackGA4Event("purchase", { value: amount, currency: "EUR", transaction_id: userId });
  trackMetaEvent("Purchase", { value: amount, currency: "EUR" });
}

export function trackPartnerSignup(partnerId) {
  trackGA4Event("sign_up", { method: "partner", partner_id: partnerId });
  trackMetaEvent("Lead", { content_name: "partner_signup" });
}

export function trackContractSigned(partnerId) {
  trackGA4Event("contract_signed", { partner_id: partnerId });
  trackMetaEvent("Subscribe", { content_name: "contract" });
}

export function trackGrowthLevelChosen(partnerId, level) {
  trackGA4Event("growth_level_chosen", { partner_id: partnerId, level });
  trackMetaEvent("CustomizeProduct", { content_name: level });
}
