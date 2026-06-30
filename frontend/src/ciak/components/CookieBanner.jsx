/**
 * CookieBanner — porta su ciak.io lo stesso widget cookie/legal di evolution-pro.it.
 *
 * Sorgente: estratto da https://www.evolution-pro.it (sezione <style>+HTML+<script>
 * con prefisso `ep-`). Salvato in public/ciak/cookie-banner.html come asset statico
 * per facilità di aggiornamento (basta riscaricarlo se Evolution PRO aggiorna le
 * policy o il design del banner).
 *
 * Comportamento:
 * - Al mount, fa fetch del file HTML, estrae lo `<style>`, l'HTML markup
 *   (banner+overlay+settings modal+policy modal+fab) e lo `<script>`. Inietta
 *   tutti e tre nel DOM (head + body) ed esegue lo script via `new Function`.
 * - Le funzioni globali esposte (`epOpenPolicy`, `epOpenSettings`, ecc.) restano
 *   raggiungibili dai link onclick nel footer.
 * - Idempotente: se già montato, skip.
 * - Cleanup: rimuove tutto al unmount per evitare leaks.
 *
 * Riferimenti policy (Cookie/Privacy/Vendita): contenuto inline nel file HTML.
 * Titolare: Evolution PRO LLC — 8 The Green, Ste A, Dover, DE 19901, USA
 *           assistenza@evolution-pro.it
 */
import { useEffect } from "react";

const MOUNT_FLAG = "data-ep-cookie-mounted";
const STYLE_ID = "ep-cookie-style";
const HTML_ID = "ep-cookie-root";
const SCRIPT_ID = "ep-cookie-script";

async function mountCookieBanner() {
  if (document.documentElement.getAttribute(MOUNT_FLAG) === "1") return;
  document.documentElement.setAttribute(MOUNT_FLAG, "1");

  try {
    // v2 = fix init (epInit chiamato anche se DOMContentLoaded già scattato).
    // Bumpare la query string se si modifica cookie-banner.html per bypassare
    // la cache aggressiva (force-cache) sui browser già visitati.
    const res = await fetch("/ciak/cookie-banner.html?v=2", { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const raw = await res.text();

    // Estrai i 3 blocchi via regex naïf (il file ha esattamente uno <style>, un
    // markup contiguo, e uno <script>).
    const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i);
    const scriptMatch = raw.match(/<script[^>]*>([\s\S]*?)<\/script>\s*$/i);
    if (!styleMatch || !scriptMatch) {
      console.warn("[CookieBanner] estratto incompleto", { styleMatch: !!styleMatch, scriptMatch: !!scriptMatch });
      return;
    }
    const cssText = styleMatch[1];
    const jsText = scriptMatch[1];
    // Tutto quello tra </style> e <script> è il markup HTML (overlay + banner + modali + fab)
    const htmlStart = styleMatch.index + styleMatch[0].length;
    const htmlEnd = raw.lastIndexOf("<script");
    const htmlMarkup = raw.slice(htmlStart, htmlEnd).trim();

    // 1) Inietta <style>
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.appendChild(document.createTextNode(cssText));
    document.head.appendChild(styleEl);

    // 2) Inietta markup in un container dedicato a fine body
    const container = document.createElement("div");
    container.id = HTML_ID;
    container.innerHTML = htmlMarkup;
    document.body.appendChild(container);

    // 3) Esegui lo script. NB: contiene attach listener su elementi appena
    //    inseriti, quindi va eseguito DOPO l'iniezione HTML.
    //    Uso new Function invece di eval per scoping pulito + esposizione globali
    //    attraverso window (le funzioni dichiarate con `function name` diventano
    //    var locali a new Function — quindi le esplicito via assignment).
    const scriptEl = document.createElement("script");
    scriptEl.id = SCRIPT_ID;
    scriptEl.appendChild(document.createTextNode(jsText));
    document.body.appendChild(scriptEl);
  } catch (e) {
    console.warn("[CookieBanner] mount failed", e);
  }
}

export function CookieBanner() {
  useEffect(() => {
    mountCookieBanner();
    return () => {
      // Non smonto al cleanup: lasciamo il banner attivo per tutta la sessione utente
      // (evita re-flash quando React re-render). In development React StrictMode
      // rimonta gli effetti: rimuovere e reiniettare lo script causerebbe la
      // ridichiarazione dei const globali dentro cookie-banner.html.
    };
  }, []);
  return null;
}

export default CookieBanner;
