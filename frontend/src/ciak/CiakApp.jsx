/**
 * Ciak.io — entry point app pubblica.
 *
 * Mondo SEPARATO da Evolution PRO (app.evolution-pro.it). Stesso monorepo,
 * routing isolato. Servito quando hostname = ciak.io / www.ciak.io
 * (vedi detect host in index.js).
 *
 * Funnel 4 livelli (lockato 2026-05-12 — memory/ciak_brand_copy_framework.md):
 *  LIV 1  Cold/Social (esterno)
 *  LIV 2  Masterclass 30' gratis             → /masterclass (lead magnet + Checkpoint)
 *  LIV 3  Ciak Blueprint €67                 → /ciak-blueprint (checkout Stripe)
 *  LIV 4  Partnership Evolution PRO €2.790   → www.evolution-pro.it (esterno)
 *
 * Post-acquisto Ciak Blueprint:
 *  8 Domande Ciak → /diagnostica → /report/[token] (output Matteo) → CTA €67
 *
 * Rename 2026-05-12: /analisi → /ciak-blueprint con redirect 301 lato Vercel
 * (vercel.json) + Navigate fallback per route legacy.
 *
 * Brand frozen (docs/brand/ciak-brand-kit.md v1.0):
 *  slate-900 #0F172A | slate-500 #64748B | gray-200 #E5E7EB | yellow-400 #FACC15
 *  Poppins SemiBold (600) + Medium (500)
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { CiakLanding } from "./pages/Landing";
import { CiakMasterclass } from "./pages/Masterclass";
import { CiakCheckpoint } from "./pages/Checkpoint";
import { CiakBlueprint } from "./pages/CiakBlueprint";
import { CiakGrazie } from "./pages/Grazie";
import { CiakDiagnostica } from "./pages/Diagnostica";
import { CiakReport } from "./pages/Report";
import { CiakAnalisi } from "./pages/Analisi";
import { CiakProposta } from "./pages/Proposta";
import { PartnerSetupPassword } from "./pages/PartnerSetupPassword";
import { CiakNotFound } from "./pages/NotFound";
import { CookieBanner } from "./components/CookieBanner";
import CiakAdminApp from "./admin/CiakAdminApp";
import CiakPartnerApp from "./partner/CiakPartnerApp";
// CiakClienteApp rimosso 2026-06-03 (consolidamento EVO/Ciak): duplicava il
// flusso pubblico token-based di Ciak (/proposta/:token, /diagnostica/:token)
// con login + porting Evolution. Su Ciak la strategia LOCKATA è magic-link
// token-based; la cartella ciak/cliente/ è stata cancellata perché dead code.

export default function CiakApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900">
        {/* Cookie banner + legal modals identici a www.evolution-pro.it.
            Si auto-monta al primo load: mostra banner se nessun consenso,
            altrimenti FAB "Gestisci cookie" + funzioni globali epOpenPolicy
            usate dal footer per Privacy/Cookie/Condizioni di Vendita. */}
        <CookieBanner />
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<CiakLanding />} />
          <Route path="/masterclass" element={<CiakMasterclass />} />

          {/* Checkpoint Strategico standalone — deep-link da email Systeme */}
          <Route path="/checkpoint" element={<CiakCheckpoint />} />

          {/* LIV 3 — Ciak Blueprint (rename da /analisi 2026-05-12) */}
          <Route path="/ciak-blueprint" element={<CiakBlueprint />} />
          <Route path="/ciak-blueprint/grazie" element={<CiakGrazie />} />

          {/* Legacy redirect /analisi → /ciak-blueprint
              (preserva query string per success/cancel/from parameter Stripe) */}
          <Route path="/analisi" element={<Navigate to="/ciak-blueprint" replace />} />
          <Route path="/analisi/grazie" element={<Navigate to={`/ciak-blueprint/grazie${window.location.search}`} replace />} />
          <Route path="/analisi-strategica" element={<Navigate to="/ciak-blueprint" replace />} />

          {/* 8 Domande Ciak — lead magnet PRE-pagamento (no token: la sessione
              la crea /api/diagnostic/start). Vecchia route con :token mantenuta
              come alias per link legacy già diffusi. */}
          <Route path="/diagnostica" element={<CiakDiagnostica />} />
          <Route path="/diagnostica/:token" element={<CiakDiagnostica />} />
          <Route path="/report/:token" element={<CiakReport />} />
          <Route path="/analisi/:token" element={<CiakAnalisi />} />

          {/* FASE 1 migrazione — Proposta Partnership post-call (porting da Evolution) */}
          <Route path="/proposta/:token" element={<CiakProposta />} />

          {/* Alias usabili per campagne ads */}
          <Route path="/masterclass-gratis" element={<Navigate to="/masterclass" replace />} />

          {/* Area Admin Ciak (login proprio, role admin — Claudio + Antonella) */}
          <Route path="/admin/*" element={<CiakAdminApp />} />

          {/* Setup password partner (magic link post-pagamento, NO auth required).
              Deve venire PRIMA del catch-all /partner/* per matchare prima. */}
          <Route path="/partner/setup-password" element={<PartnerSetupPassword />} />

          {/* Area Partner Ciak — Fase 2a migrazione (login proprio, role partner) */}
          <Route path="/partner/*" element={<CiakPartnerApp />} />

          {/* Area /cliente/* DISATTIVATA 2026-05-15: duplicava il flusso
              pubblico token-based (vedi import commentato sopra). */}

          <Route path="*" element={<CiakNotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
