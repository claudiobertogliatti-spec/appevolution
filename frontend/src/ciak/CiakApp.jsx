/**
 * Ciak.io — entry point app pubblica.
 *
 * Unico brand servito su tutti gli host (consolidamento 2026-06-18).
 * Stesso monorepo, routing isolato (vedi detect host in index.js).
 *
 * Funnel gratuito (unico processo vivo dal 29/9/2026):
 *  /blueprint (landing analisi gratuita) → /diagnostica (questionario) → popup
 *  Cal.com per la call (il canale Mariangela ?utm_source=mariangela non lo vede).
 *  Il report di Carlo è INTERNO: lo legge solo l'admin, mai il lead.
 *  /masterclass resta come contenuto di fiducia/nurturing.
 *
 * /ciak-blueprint, /analisi, /checkpoint e le vecchie pagine di conferma del
 * checkout €27 (ritirato) sono solo redirect verso le pagine vive.
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
import { CiakBlueprint } from "./pages/CiakBlueprint";
import { CiakDispensaDemo } from "./pages/CiakDispensaDemo";
import { CiakPartnerDashboardDemo } from "./pages/CiakPartnerDashboardDemo";
import { CiakPartnerPercorsoDemo } from "./pages/CiakPartnerPercorsoDemo";
import { CiakPartnerMaterialiDemo } from "./pages/CiakPartnerMaterialiDemo";
import { CiakPartnerTeamDemo } from "./pages/CiakPartnerTeamDemo";
import { CiakPartnerServiziExtraDemo } from "./pages/CiakPartnerServiziExtraDemo";
import { CiakPartnerRinnovoDemo } from "./pages/CiakPartnerRinnovoDemo";
import { CiakDiagnostica } from "./pages/Diagnostica";
import { CiakAnalisi } from "./pages/Analisi";
import { CiakProposta } from "./pages/Proposta";
import InsiderSalesPage from "./insider/InsiderSalesPage";
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
import { isAdminPath } from "./lib/adminPath";
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

/**
 * Cookie banner solo sul sito pubblico: nell'admin (dietro login, nessun
 * tracciamento) copriva il pulsante "Esci" della sidebar.
 */
function PublicCookieBanner() {
  const { pathname } = useLocation();
  if (isAdminPath(pathname)) return null;
  return <CookieBanner />;
}

export default function CiakApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900">
        {/* Cookie banner + legal modals identici a www.evolution-pro.it.
            Si auto-monta al primo load: mostra banner se nessun consenso,
            altrimenti FAB "Gestisci cookie" + funzioni globali epOpenPolicy
            usate dal footer per Privacy/Cookie/Condizioni di Vendita. */}
        <PublicCookieBanner />
        <RouteTracker />
        <Toaster position="top-center" richColors />
        <Routes>
          <Route path="/" element={<CiakLanding />} />
          <Route path="/masterclass" element={<MasterclassLanding />} />
          {/* Il viewer resta accessibile direttamente da email e dal bridge post-opt-in. */}
          <Route path="/masterclass/guarda" element={<CiakMasterclass />} />

          {/* Landing dell'analisi gratuita. */}
          <Route path="/blueprint" element={<CiakBlueprint />} />
          <Route path="/dispensa-demo" element={<CiakDispensaDemo />} />
          <Route path="/partner-demo" element={<CiakPartnerDashboardDemo />} />
          <Route path="/percorso-demo" element={<CiakPartnerPercorsoDemo />} />
          <Route path="/materiali-demo" element={<CiakPartnerMaterialiDemo />} />
          <Route path="/team-demo" element={<CiakPartnerTeamDemo />} />
          <Route path="/servizi-extra-demo" element={<CiakPartnerServiziExtraDemo />} />
          <Route path="/rinnovo-demo" element={<CiakPartnerRinnovoDemo />} />

          {/* Redirect legacy: link vecchi ancora in giro (email, post, bio). La query
              string si preserva per non perdere utm_source. */}
          <Route path="/ciak-blueprint" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/ciak-blueprint/grazie" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/blueprint/grazie" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/analisi" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/analisi/grazie" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/analisi-strategica" element={<RedirectWithSearch to="/blueprint" />} />
          <Route path="/checkpoint" element={<RedirectWithSearch to="/diagnostica" />} />

          {/* Questionario dell'analisi gratuita (la sessione la crea
              /api/diagnostic/start). La route con :token resta come alias per
              link già diffusi. */}
          <Route path="/diagnostica" element={<CiakDiagnostica />} />
          <Route path="/diagnostica/:token" element={<CiakDiagnostica />} />
          <Route path="/analisi/:token" element={<CiakAnalisi />} />

          {/* FASE 1 migrazione — Proposta Partnership post-call (porting da Evolution) */}
          <Route path="/proposta/:token" element={<CiakProposta />} />

          {/* Insider closing page — post-call, pre-partnership (SDD 2026-09-09) */}
          <Route path="/insider/:token" element={<InsiderSalesPage />} />

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
