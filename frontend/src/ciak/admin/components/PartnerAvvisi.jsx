/**
 * Home «Oggi» — Valentina: avvisi di percorso + compiti aperti sui partner.
 * - Avvisi: un partner ha finito un passo (ultimi 7 giorni). «Visto» lo toglie. Sola lettura
 *   del percorso: qui non si sposta niente.
 * - Compiti: quelli creati nelle schede partner, scaduti per primi. «Fatto» li chiude.
 * Una fonte che non risponde lo dice; non si finge che sia vuota.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { dataIt } from "./PassoPannello";

const Titolo = ({ id, children, sotto }) => (
  <>
    <h2 id={id} className="text-2xl font-semibold text-slate-900">{children}</h2>
    {sotto && <p className="mt-1 text-sm text-slate-500">{sotto}</p>}
  </>
);

export function PartnerAvvisi({ onAuthExpired }) {
  const [avvisi, setAvvisi] = useState(undefined); // undefined = carico · null = non leggibili
  const [compiti, setCompiti] = useState(undefined);

  const carica = useCallback(() => {
    const gestisci = (e, set) => {
      if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
      set(null);
    };
    apiGet("/avvisi-percorso").then((r) => setAvvisi(Array.isArray(r?.items) ? r.items : null)).catch((e) => gestisci(e, setAvvisi));
    apiGet("/partner-attivita").then((r) => setCompiti(Array.isArray(r?.items) ? r.items : null)).catch((e) => gestisci(e, setCompiti));
  }, [onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  const azione = (path, body) =>
    apiPost(path, body).then(carica).catch((e) => { if (e?.message === "AUTH_EXPIRED") onAuthExpired?.(); });

  const Riprova = () => (
    <p className="text-sm text-slate-600">Dato non disponibile. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button></p>
  );

  return (
    <>
      <section aria-labelledby="t-avvisi" className="mb-10">
        <div className="flex items-center gap-4">
          <img src="/agents/valentina.jpg" alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-yellow-400 bg-slate-200" />
          <Titolo id="t-avvisi" sotto="Passi completati dai partner negli ultimi 7 giorni. Solo da leggere: il percorso va avanti da solo.">
            Avvisi di Valentina
          </Titolo>
        </div>
        <div className="mt-4">
          {avvisi === undefined ? <p className="text-sm text-slate-500">Carico…</p>
            : avvisi === null ? <Riprova />
            : avvisi.length === 0 ? <p className="text-sm text-slate-500">Nessun passo completato di recente.</p>
            : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {avvisi.slice(0, 5).map((a) => (
                  <li key={`${a.partner_id}-${a.step_id}`} className="flex items-center justify-between gap-4 px-6 py-4">
                    <p className="min-w-0 text-base text-slate-900">
                      <span className="font-semibold">{a.partner_nome || "Un partner"}</span> ha finito «{a.step_label}».{" "}
                      <span className="text-slate-600">{a.prossimo ? `Ora tocca a «${a.prossimo}».` : "Il percorso è completo."}</span>
                    </p>
                    <button type="button" onClick={() => azione("/avvisi-percorso/visto", { partner_id: a.partner_id, step_id: a.step_id })}
                      className="flex-shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-900">
                      Visto
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </section>

      <section aria-labelledby="t-compiti" className="mb-10">
        <Titolo id="t-compiti" sotto="I compiti che hai scritto nelle schede dei partner, scaduti per primi.">Compiti sui partner</Titolo>
        <div className="mt-4">
          {compiti === undefined ? <p className="text-sm text-slate-500">Carico…</p>
            : compiti === null ? <Riprova />
            : compiti.length === 0 ? <p className="text-sm text-slate-500">Nessun compito aperto.</p>
            : (
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                {compiti.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-4">
                    <p className="min-w-0 text-base text-slate-900">
                      <span className="font-semibold">{c.partner_nome || "Partner"}</span> · {c.testo}
                      {c.scadenza && (
                        <span className={`ml-2 text-sm ${c.stato_scadenza === "scaduto" ? "font-semibold text-red-700" : "text-slate-500"}`}>
                          {c.stato_scadenza === "scaduto" ? "scaduto il" : "entro il"} {dataIt(c.scadenza)}
                        </span>
                      )}
                    </p>
                    <button type="button" onClick={() => azione("/partner-attivita/fatto", { id: c.id })} aria-label={`Segna come fatto: ${c.testo}`}
                      className="flex-shrink-0 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-900">
                      Fatto
                    </button>
                  </li>
                ))}
              </ul>
            )}
          {Array.isArray(compiti) && compiti.length > 5 && <p className="mt-2 text-xs text-slate-500">Altri {compiti.length - 5} nelle schede dei partner.</p>}
        </div>
      </section>
    </>
  );
}

export default PartnerAvvisi;
