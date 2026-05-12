/**
 * Ciak.io — entry point app pubblica.
 *
 * Mondo SEPARATO da Evolution PRO (app.evolution-pro.it). Stesso monorepo,
 * routing isolato. Servito quando hostname = ciak.io / www.ciak.io
 * (vedi detect host in index.js).
 *
 * Funnel 4 livelli (lockato 2026-05-12 — memory/ciak_brand_copy_framework.md):
 *  LIV 1  Cold/Social (esterno)
 *  LIV 2  Masterclass 60' gratis             → /masterclass (lead magnet + Checkpoint)
 *  LIV 3  Ciak Blueprint €67                 → /ciak-blueprint (checkout Stripe)
 *  LIV 4  Partnership Evolution PRO €2.790   → www.evolution-pro.it (esterno)
 *
 * Post-acquisto Ciak Blueprint:
 *  8 Domande Ciak → /diagnostica/[token] → /report/[token] (output Matteo)
 *
 * Rename 2026-05-12: /analisi → /ciak-blueprint con redirect 301 lato Vercel
 * (vercel.json) + Navigate fallback per route legacy.
 *
 * Brand frozen (docs/brand/ciak-brand-kit.md v1.0):
 *  slate-900 #0F172A | slate-500 #64748B | gray-200 #E5E7EB | yellow-400 #FACC15
 *  Poppins SemiBold (600) + Medium (500)
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CiakLanding } from "./pages/Landing";
import { CiakMasterclass } from "./pages/Masterclass";
import { CiakBlueprint } from "./pages/CiakBlueprint";
import { CiakGrazie } from "./pages/Grazie";
import { CiakDiagnostica } from "./pages/Diagnostica";
import { CiakReport } from "./pages/Report";
import { CiakNotFound } from "./pages/NotFound";
import { CookieBanner } from "./components/CookieBanner";

export default function CiakApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900">
        {/* Cookie banner + legal modals identici a www.evolution-pro.it.
            Si auto-monta al primo load: mostra banner se nessun consenso,
            altrimenti FAB "Gestisci cookie" + funzioni globali epOpenPolicy
            usate dal footer per Privacy/Cookie/Condizioni di Vendita. */}
        <CookieBanner />
        <Routes>
          <Route path="/" element={<CiakLanding />} />
          <Route path="/masterclass" element={<CiakMasterclass />} />

          {/* LIV 3 — Ciak Blueprint (rename da /analisi 2026-05-12) */}
          <Route path="/ciak-blueprint" element={<CiakBlueprint />} />
          <Route path="/ciak-blueprint/grazie" element={<CiakGrazie />} />

          {/* Legacy redirect /analisi → /ciak-blueprint
              (preserva query string per success/cancel/from parameter Stripe) */}
          <Route path="/analisi" element={<Navigate to="/ciak-blueprint" replace />} />
          <Route path="/analisi/grazie" element={<Navigate to={`/ciak-blueprint/grazie${window.location.search}`} replace />} />
          <Route path="/analisi-strategica" element={<Navigate to="/ciak-blueprint" replace />} />

          <Route path="/diagnostica/:token" element={<CiakDiagnostica />} />
          <Route path="/report/:token" element={<CiakReport />} />

          {/* Alias usabili per campagne ads */}
          <Route path="/masterclass-gratis" element={<Navigate to="/masterclass" replace />} />

          <Route path="*" element={<CiakNotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
