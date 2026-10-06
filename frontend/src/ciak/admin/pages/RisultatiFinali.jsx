/**
 * Ciak Admin — Risultati finali.
 *
 * Risponde a una domanda: "com'e' venuto quello che abbiamo costruito?"
 * Un posto solo per vedere il lavoro finito, senza chiedere link a nessuno:
 *   - il sito vetrina dei clienti Start (HTML generato, in riquadro isolato);
 *   - il funnel dei partner (anteprima Vercel, pagina per pagina).
 *
 * Sola lettura. Backend: GET /api/admin/ciak/risultati-finali
 *                        GET /api/admin/ciak/start/{id}/bozze  (HTML della vetrina)
 *
 * Design system: quello dell'admin Ciak (card bianche, bordo grigio, pulsanti
 * slate-900 con testo giallo, Poppins dallo shell). Nessun elemento nuovo.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api";

const BADGE = "text-[11px] font-semibold px-2 py-0.5 rounded border";
const BOTTONE =
  "rounded-lg px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition";

function FunnelCard({ funnel }) {
  const [indice, setIndice] = useState(0);
  const pagina = funnel.pages[indice];

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-slate-900">{funnel.nome}</h3>
        {funnel.released ? (
          <span className={`${BADGE} bg-emerald-50 text-emerald-700 border-emerald-200`}>Visibile al partner</span>
        ) : (
          <span className={`${BADGE} bg-slate-100 text-slate-500 border-slate-200`}>Non ancora rilasciato al partner</span>
        )}
        {typeof funnel.progress === "number" && (
          <span className={`${BADGE} bg-slate-100 text-slate-600 border-slate-200`}>
            {funnel.progress}% approvato dal partner
          </span>
        )}
        {funnel.corrections_open > 0 && (
          <span className={`${BADGE} bg-amber-50 text-amber-800 border-amber-200`}>
            {funnel.corrections_open} {funnel.corrections_open === 1 ? "correzione aperta" : "correzioni aperte"}
          </span>
        )}
      </div>

      {funnel.url_non_valido ? (
        <p className="mt-3 text-sm text-red-700">
          L'indirizzo dell'anteprima non e' valido (serve https e un indirizzo *.vercel.app): non lo apro.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label={`Pagine del funnel di ${funnel.nome}`}>
            {funnel.pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === indice}
                onClick={() => setIndice(i)}
                className={`${BOTTONE} ${
                  i === indice
                    ? "bg-slate-900 text-yellow-400"
                    : "border border-gray-300 text-slate-700 hover:bg-gray-50"
                }`}
              >
                {p.title}
              </button>
            ))}
          </div>
          {pagina && (
            <>
              <iframe
                title={`Anteprima ${funnel.nome}: ${pagina.title}`}
                src={pagina.url}
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="mt-3 h-[70vh] w-full rounded-lg border border-gray-200"
              />
              <p className="mt-2 text-xs text-slate-500">
                Se l'anteprima non si carica qui,{" "}
                <a href={pagina.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  aprila in una nuova scheda
                </a>
                .
              </p>
            </>
          )}
        </>
      )}
    </article>
  );
}

function VetrinaCard({ vetrina, onAuthExpired }) {
  const [aperta, setAperta] = useState(false);
  const [html, setHtml] = useState(null);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    if (!aperta || html !== null) return undefined;
    let attivo = true;
    apiGet(`/start/${vetrina.client_id}/bozze`)
      .then((r) => {
        if (!attivo) return;
        const item = (r.items || []).find((i) => i.type === "showcase");
        setHtml(item?.html || "");
      })
      .catch((e) => {
        if (!attivo) return;
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setErrore(e.message);
      });
    return () => {
      attivo = false;
    };
  }, [aperta, html, vetrina.client_id, onAuthExpired]);

  const approvata = vetrina.approval_status === "approved";

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-slate-900">{vetrina.nome}</h3>
        {approvata ? (
          <span className={`${BADGE} bg-emerald-50 text-emerald-700 border-emerald-200`}>Approvato · il cliente lo vede</span>
        ) : (
          <span className={`${BADGE} bg-amber-50 text-amber-800 border-amber-200`}>
            Bozza da approvare · il cliente non la vede
          </span>
        )}
        {vetrina.live_url ? (
          <a href={vetrina.live_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline break-all">
            {vetrina.live_url}
          </a>
        ) : (
          <span className="text-xs text-slate-400">Non ancora pubblicato online</span>
        )}
      </div>
      <button
        type="button"
        aria-expanded={aperta}
        onClick={() => setAperta((v) => !v)}
        className={`${BOTTONE} mt-3 bg-slate-900 text-yellow-400 hover:bg-slate-800`}
      >
        {aperta ? "Nascondi anteprima" : "Vedi il sito"}
      </button>
      {aperta && (
        <div className="mt-3">
          {errore && <p className="text-sm text-red-700">Errore: {errore}</p>}
          {!errore && html === null && <p className="text-sm text-slate-400">Caricamento…</p>}
          {html === "" && <p className="text-sm text-slate-500">Nessuna anteprima disponibile per questa vetrina.</p>}
          {html && (
            <iframe
              title={`Anteprima sito vetrina di ${vetrina.nome}`}
              sandbox=""
              srcDoc={html}
              className="h-[70vh] w-full rounded-lg border border-gray-200"
            />
          )}
        </div>
      )}
    </article>
  );
}

export function RisultatiFinali({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    apiGet("/risultati-finali")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="text-slate-700 mb-4">Errore nel caricamento: {error}</p>
        <button type="button" onClick={load} className={`${BOTTONE} bg-slate-900 text-yellow-400 hover:bg-slate-800`}>
          Riprova
        </button>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Risultati finali</h1>
      <p className="text-slate-500 mb-8">
        Il lavoro finito, da guardare prima che lo veda il cliente: i siti vetrina dei clienti Start e i funnel dei partner.
      </p>

      <section className="mb-10">
        <h2 className="font-semibold text-slate-900 mb-3">Siti vetrina Start</h2>
        {data.vetrine.length ? (
          <div className="space-y-4">
            {data.vetrine.map((v) => (
              <VetrinaCard key={v.client_id} vetrina={v} onAuthExpired={onAuthExpired} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-slate-500">
            Nessun sito vetrina ancora preparato. Compaiono qui appena Ciak ne genera uno per un cliente Start.
          </p>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-3">Funnel dei partner</h2>
        {data.funnel.length ? (
          <div className="space-y-4">
            {data.funnel.map((f) => (
              <FunnelCard key={f.partner_id} funnel={f} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-slate-500">
            Nessun funnel in anteprima. Compaiono qui appena a un partner viene assegnato l'indirizzo dell'anteprima.
          </p>
        )}
      </section>

      <button type="button" onClick={load} className={`${BOTTONE} mt-8 border border-gray-300 text-slate-700 hover:bg-gray-50`}>
        Aggiorna
      </button>
    </div>
  );
}
