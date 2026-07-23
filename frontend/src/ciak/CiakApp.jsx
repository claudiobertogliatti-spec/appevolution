/**
 * Ciak.io — entry point app pubblica.
 *
 * Unico brand servito su tutti gli host (consolidamento 2026-06-18).
 * Stesso monorepo, routing isolato (vedi detect host in index.js).
 *
 * Funnel 4 livelli (lockato 2026-05-12 — memory/ciak_brand_copy_framework.md):
 *  LIV 1  Cold/Social (esterno)
 *  LIV 2  Masterclass 30' gratis             → /masterclass (lead magnet + Checkpoint)
 *  LIV 3  Ciak Blueprint €27                 → /blueprint (checkout Stripe)
 *  LIV 4  Partnership Evolution PRO €2.790   → www.evolution-pro.it (esterno)
 *
 * Post-acquisto Ciak Blueprint:
 *  8 Domande Ciak → /diagnostica → /report/[token] (output Matteo) → CTA €27
 *
 * Canonicalizzazione 2026-07-22: /blueprint e' la route pubblica; /ciak-blueprint
 * e /analisi restano esclusivamente redirect legacy lato Vercel e React.
 *
 * Brand frozen (docs/brand/ciak-brand-kit.md v1.0):
 *  slate-900 #0F172A | slate-500 #64748B | gray-200 #E5E7EB | yellow-400 #FACC15
 *  Poppins SemiBold (600) + Medium (500)
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

function RedirectWithSearch({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}`} replace />;
}
import { Toaster } from "sonner";
import { CiakLanding } from "./pages/Landing";
import { CiakMasterclass } from "./pages/Masterclass";
import { MasterclassLanding } from "./pages/MasterclassLanding";
import { CiakCheckpoint } from "./pages/Checkpoint";
import { CiakBlueprint } from "./pages/CiakBlueprint";
import { CiakDispensaDemo } from "./pages/CiakDispensaDemo";
import { CiakPartnerDashboardDemo } from "./pages/CiakPartnerDashboardDemo";
import { CiakPartnerPercorsoDemo } from "./pages/CiakPartnerPercorsoDemo";
import { CiakPartnerMaterialiDemo } from "./pages/CiakPartnerMaterialiDemo";
import { CiakGrazie } from "./pages/Grazie";
import { CiakDiagnostica } from "./pages/Diagnostica";
import { CiakReport } from "./pages/Report";
import { CiakAnalisi } from "./pages/Analisi";
import { CiakProposta } from "./pages/Proposta";
import { PartnerSetupPassword } from "./pages/PartnerSetupPassword";
import { CiakNotFound } from "./pages/NotFound";
import { CookieBanner } from "./components/CookieBanner";
import CiakAdminApp from "./admin/CiakAdminApp";
import CiakClientApp from "./client/CiakClientApp";
import CiakPartnerApp from "./partner/CiakPartnerApp";
// Side-effect: registra window.ciakEnableMarketing e (se il consenso marketing
// è già presente) inizializza i Meta Pixel. Vedi lib/metaPixel.js.
import "./lib/metaPixel";
import { usePageTracking } from "./hooks/usePageTracking";
// Area cliente riattivata 2026-07-01 con sessione magic-link dedicata e
// routing separato dall'area partner.

/**
 * Tracker route SPA per Meta Pixel. Deve stare DENTRO <BrowserRouter> perché
 * usa useLocation. Non renderizza nulla.
 */
function RouteTracker() {
  usePageTracking();
  return null;
}

export default function CiakApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900">
        {/* Cookie banner + legal modals identici a www.evolution-pro.it.
            Si auto-monta al primo load: mostra banner se nessun consenso,
            altrimenti FAB "Gestisci cookie" + funzioni globali epOpenPolicy
            usate dal footer per Privacy/Cookie/Condizioni di Vendita. */}
        <CookieBanner />
        <RouteTracker />
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<CiakLanding />} />
          <Route path="/masterclass" element={<MasterclassLanding />} />
          {/* Il viewer resta accessibile direttamente da email e dal bridge post-opt-in. */}
          <Route path="/masterclass/guarda" element={<CiakMasterclass />} />

          {/* Checkpoint Strategico standalone — deep-link da email Systeme */}
          <Route path="/checkpoint" element={<CiakCheckpoint />} />

          {/* LIV 3 — Ciak Blueprint. Canonical /blueprint dal 2026-07-22 (rename da
              /ciak-blueprint, a sua volta rename da /analisi 2026-05-12). */}
          <Route path="/blueprint" element={<CiakBlueprint />} />
          <Route path="/blueprint/grazie" element={<CiakGrazie />} />
          <Route path="/dispensa-demo" element={<CiakDispensaDemo />} />
          <Route path="/partner-demo" element={<CiakPartnerDashboardDemo />} />
          <Route path="/percorso-demo" element={<CiakPartnerPercorsoDemo />} />
          <Route path="/materiali-demo" element={<CiakPartnerMaterialiDemo />} />

          {/* Redirect legacy → /blueprint. Preservano la query string per i parametri
              Stripe (session_id success / from=cancel) finché il backend checkout non
              emette gli URL canonici /blueprint (FASE 2 Codex). /ciak-blueprint resta
              vivo perché il success_url/cancel_url attuali lo usano ancora. */}
          <Route path="/ciak-blueprint" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/ciak-blueprint/grazie" element={<RedirectWithSearch to="/blueprint/grazie" />} />
          <Route path="/analisi" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/analisi/grazie" element={<RedirectWithSearch to="/blueprint/grazie" />} />
          <Route path="/analisi-strategica" element={<RedirectWithSearch to="/blueprint" />} />

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

          {/* Area Cliente Ciak — accesso magic-link per Blueprint/Start/Partnership. */}
          <Route path="/cliente/*" element={<CiakClientApp />} />

          {/* Setup password partner (magic link post-pagamento, NO auth required).
              Deve venire PRIMA del catch-all /partner/* per matchare prima. */}
          <Route path="/partner/setup-password" element={<PartnerSetupPassword />} />

          {/* Area Partner Ciak — Fase 2a migrazione (login proprio, role partner) */}
          <Route path="/partner/*" element={<CiakPartnerApp />} />

          <Route path="*" element={<CiakNotFound />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
