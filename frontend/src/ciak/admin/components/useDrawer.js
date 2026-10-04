/**
 * useDrawer — comportamento di un menu a scomparsa (sidebar mobile dell'admin).
 *
 * Perche' esiste: la sidebar era `w-72` fissa, senza breakpoint. Sotto i 1024px
 * mangiava mezzo schermo e schiacciava il contenuto. Qui vive SOLO il
 * comportamento (apri/chiudi, Esc, focus intrappolato, chiusura al cambio pagina
 * e al passaggio a desktop): il disegno resta nel guscio, il comportamento si
 * prova qui senza trascinarsi dietro tutte le pagine dell'admin.
 *
 * Accessibilita': Esc chiude e riporta il focus sul pulsante, Tab resta dentro il
 * pannello finche' e' aperto, il pannello chiuso non e' raggiungibile da tastiera
 * (lo nasconde il guscio con `visibility`).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useDrawer(routeKey, { desktopQuery = "(min-width: 1024px)" } = {}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Cambio pagina → il menu si chiude (altrimenti resterebbe sopra la nuova pagina).
  useEffect(() => {
    setOpen(false);
  }, [routeKey]);

  // Si passa a desktop → il menu torna fisso e il drawer non deve restare "aperto".
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(desktopQuery);
    const onChange = (e) => {
      if (e.matches) setOpen(false);
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [desktopQuery]);

  // Aperto: il focus entra nel pannello, Esc chiude, Tab non esce.
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const items = () => (panel ? Array.from(panel.querySelectorAll(FOCUSABLE)) : []);
    items()[0]?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return { open, setOpen, close, triggerRef, panelRef };
}

export default useDrawer;
