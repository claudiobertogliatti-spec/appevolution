/**
 * Ciak.io — entry point app pubblica
 *
 * Mondo SEPARATO da Evolution PRO (app.evolution-pro.it). Stesso monorepo,
 * routing isolato. Servito quando hostname = ciak.io / www.ciak.io
 * (vedi detect host in index.js).
 *
 * Funnel a 4 livelli (decisione v5 8-10/5/2026):
 *  LIV 1  Social/Educazione  (esterno)
 *  LIV 2  Masterclass 60' gratis        → /masterclass  (lead magnet zero)
 *  LIV 3  Analisi Strategica €67         → /analisi      (checkout Stripe)
 *  LIV 4  Partnership Evolution €2.790   → redirect a evolution-pro.it/qualifica
 *
 * Post-acquisto €67:
 *  Diagnostica 8 domande Matteo (strumento operativo INTERNO Claudio)
 *   → /diagnostica/[token]  → /report/[token]
 *
 * Brand frozen (docs/brand/ciak-brand-kit.md v1.0):
 *  slate-900 #0F172A | slate-500 #64748B | gray-200 #E5E7EB | yellow-400 #FACC15
 *  Poppins SemiBold (600) + Medium (500)
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CiakLanding } from "./pages/Landing";
import { CiakMasterclass } from "./pages/Masterclass";
import { CiakAnalisi } from "./pages/Analisi";
import { CiakDiagnostica } from "./pages/Diagnostica";
import { CiakReport } from "./pages/Report";
import { CiakNotFound } from "./pages/NotFound";

export default function CiakApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900">
        <Routes>
          <Route path="/" element={<CiakLanding />} />
          <Route path="/masterclass" element={<CiakMasterclass />} />
          <Route path="/analisi" element={<CiakAnalisi />} />
          <Route path="/diagnostica/:token" element={<CiakDiagnostica />} />
          <Route path="/report/:token" element={<CiakReport />} />
          {/* Alias usabili per campagne ads */}
          <Route path="/masterclass-gratis" element={<Navigate to="/masterclass" replace />} />
          <Route path="/analisi-strategica" element={<Navigate to="/analisi" replace />} />
          <Route path="*" element={<CiakNotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
