/**
 * usePageTracking — invia una PageView Meta Pixel ad ogni cambio route.
 *
 * Necessario perché Ciak è una SPA (React Router): senza questo hook il pixel
 * registrerebbe solo il primo caricamento. La PageView INIZIALE la invia già
 * initPixels() in lib/metaPixel.js, quindi qui saltiamo il primo run per non
 * duplicarla. trackPageView() è no-op finché i pixel non sono inizializzati
 * (cioè finché manca il consenso marketing).
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../lib/metaPixel";

export function usePageTracking() {
  const location = useLocation();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return; // PageView iniziale gestita da initPixels()
    }
    trackPageView();
  }, [location.pathname]);
}

export default usePageTracking;
