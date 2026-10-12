/**
 * Ciak Admin — nuova home «Oggi» (anteprima su /admin/nuova, solo per Claudio).
 *
 * Ordine deciso il 12/10/2026: 1) quante call oggi e a che ora, 2) le trattative da
 * sollecitare per chiudere, 3) la consegna (partner e clienti Start). Gli agenti con la faccia
 * stanno nella sidebar (CiakAdminApp, MacroLabel), non qui.
 *
 * Dati: gli stessi della home di oggi (useOggiData, OggiCallStrip, OggiStart). Nessuna
 * fonte nuova, nessuna cifra scritta a mano. Una fonte che non risponde lo dice.
 *
 * Non ci sono pulsanti che non fanno nulla: «Prepara il sollecito» arriva col punto 3.
 */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useOggiData } from "../components/OggiBlocks";
import { OggiCallStrip } from "../components/OggiCallStrip";
import { OggiStart } from "../components/OggiStart";
import { daSollecitare, frasePrincipale, SOLLECITO_GIORNI } from "../nuovaHomeModel";

const RIGHE = 5;

const leadHref = (email) => `/admin/leads/${encodeURIComponent(email)}`;
const giorniLabel = (n) => `${n} ${n === 1 ? "giorno" : "giorni"}`;
const TONO = {
  critical: "text-red-700",
  warning: "text-amber-700",
  neutral: "text-slate-500",
  info: "text-slate-500",
};

function Sezione({ id, titolo, sotto, children }) {
  return (
    <section aria-labelledby={id} className="mb-8">
      <h2 id={id} className="text-lg font-semibold text-slate-900">{titolo}</h2>
      {sotto && <p className="text-sm text-slate-500 mb-3">{sotto}</p>}
      {children}
    </section>
  );
}

function Stato({ children }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export function NuovaHome({ user, onAuthExpired }) {
  const nome = (user?.name || "").trim().split(/\s+/)[0] || "Claudio";
  const { src, model, reload } = useOggiData(onAuthExpired);

  const pipeLoading = src.pipeline === undefined;
  const auditLoading = src.audit === undefined;
  const solleciti = daSollecitare(model.trattative);
  const tocca = model.partner ? model.partner.tocca : null;
  const caricando = pipeLoading || auditLoading;

  const frase = caricando
    ? "Controllo cosa c'è da fare…"
    : frasePrincipale({
        solleciti: solleciti ? solleciti.lista.length : null,
        tocca: tocca ? tocca.length : null,
      });

  return (
    <div className="p-5 sm:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Buongiorno, {nome}.</h1>
        <p className="text-slate-600 mt-2" aria-live="polite">{frase}</p>
      </div>

      <div>
        <div className="min-w-0 flex-1">
          {/* 1. Call di oggi, con l'orario */}
          <OggiCallStrip onAuthExpired={onAuthExpired} />

          {/* 2. Trattative da sollecitare */}
          <Sezione
            id="t-soll"
            titolo="Da sollecitare per chiudere"
            sotto={`In trattativa da ${SOLLECITO_GIORNI} giorni o più, dalla più vecchia.`}
          >
            {pipeLoading ? (
              <Stato>Carico le trattative…</Stato>
            ) : !solleciti ? (
              <div>
                <Stato>Dato non disponibile.</Stato>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-1 text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
                >
                  Riprova
                </button>
              </div>
            ) : solleciti.lista.length === 0 ? (
              <Stato>Nessuna trattativa ferma da {SOLLECITO_GIORNI} giorni o più.</Stato>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
                {solleciti.lista.slice(0, RIGHE).map((t) => (
                  <li key={t.email || t.nome} className="flex items-center justify-between gap-3 py-3">
                    <Link
                      to={leadHref(t.email)}
                      className="min-w-0 font-semibold text-slate-900 truncate hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
                    >
                      {t.nome}
                    </Link>
                    <span className={`text-sm flex-shrink-0 ${TONO[t.tone] || TONO.neutral}`}>
                      In trattativa da {giorniLabel(t.giorni)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {solleciti && solleciti.lista.length > RIGHE && (
              <Link to="/admin/trattative" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Vedi tutte ({solleciti.lista.length}) <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
            {solleciti && solleciti.senzaData > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {solleciti.senzaData} {solleciti.senzaData === 1 ? "trattativa non ha" : "trattative non hanno"} una data: non posso dire da quanto è ferma.
              </p>
            )}
          </Sezione>

          {/* 3. Consegna: partner e clienti Start */}
          <Sezione id="t-del" titolo="Partner che aspettano te" sotto="Prima chi è bloccato, poi chi è fermo.">
            {auditLoading ? (
              <Stato>Carico i partner…</Stato>
            ) : !tocca ? (
              <div>
                <Stato>Dato non disponibile.</Stato>
                <button
                  type="button"
                  onClick={reload}
                  className="mt-1 text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
                >
                  Riprova
                </button>
              </div>
            ) : tocca.length === 0 ? (
              <Stato>Nessun partner aspetta te.</Stato>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-4">
                {tocca.slice(0, RIGHE).map((p) => (
                  <li key={p.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 font-semibold text-slate-900 truncate">{p.nome}</span>
                      {p.giorni != null && (
                        <span className={`text-sm flex-shrink-0 ${p.fermo ? "text-amber-700" : "text-slate-500"}`}>
                          {p.fermo ? "Fermo da" : "Da"} {giorniLabel(p.giorni)}
                        </span>
                      )}
                    </div>
                    {(p.azione || p.motivo) && (
                      <p className="text-sm text-slate-500 truncate">{p.azione || p.motivo}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {tocca && tocca.length > RIGHE && (
              <Link to="/admin/partner" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                Vedi tutti e {tocca.length} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
          </Sezione>

          <OggiStart onAuthExpired={onAuthExpired} />
        </div>
      </div>
    </div>
  );
}

export default NuovaHome;
