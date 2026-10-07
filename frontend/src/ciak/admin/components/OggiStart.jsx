/**
 * Home "Oggi" — Clienti Start: cosa tocca a te.
 *
 * Una lista corta e ordinata: prima le bozze che il cliente aspetta da te, poi
 * quelle da preparare. Ogni riga apre l'account del cliente (`/admin/start/:id`),
 * dove c'e' il pulsante giusto. Chi aspetta il cliente non e' lavoro tuo: si
 * conta, non si elenca. Le regole stanno in `oggiModel.buildOggiStart`.
 *
 * Stati onesti: caricamento, dato non disponibile (con "Riprova"), vuoto, valori.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { apiGet } from "../api";
import { buildOggiStart } from "../oggiModel";
import { StatusPill } from "./ui/StatusPill";

const RIGHE = 6;

function quando(s) {
  if (!s) return null;
  if (s.giorni < 0) return { tone: "critical", label: `Tappa ${s.tappa} in ritardo di ${-s.giorni} ${s.giorni === -1 ? "giorno" : "giorni"}` };
  if (s.giorni <= 2) return { tone: "warning", label: `Tappa ${s.tappa} ${s.giorni === 0 ? "oggi" : `fra ${s.giorni} ${s.giorni === 1 ? "giorno" : "giorni"}`}` };
  return { tone: "neutral", label: `Tappa ${s.tappa} · ${s.data_promessa}` };
}

function Lista({ titolo, righe, vuoto }) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
        {titolo} · {righe.length}
      </h3>
      {righe.length === 0 ? (
        <p className="text-sm text-slate-500">{vuoto}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {righe.slice(0, RIGHE).map((r) => {
            const q = quando(r.scadenza);
            return (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    to={`/admin/start/${r.id}`}
                    className="block font-semibold text-slate-900 truncate hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
                  >
                    {r.nome}
                  </Link>
                  {r.azione && <p className="text-xs text-slate-500 truncate">{r.azione}</p>}
                </div>
                {q && <span className="flex-shrink-0"><StatusPill tone={q.tone} label={q.label} /></span>}
              </li>
            );
          })}
        </ul>
      )}
      {righe.length > RIGHE && (
        <Link to="/admin/start" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
          Vedi tutti ({righe.length}) <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export function OggiStart({ onAuthExpired }) {
  // undefined = in caricamento · null = non disponibile · oggetto = dati veri
  const [pipeline, setPipeline] = useState(undefined);

  const carica = useCallback(() => {
    setPipeline(undefined);
    apiGet("/start/pipeline")
      .then(setPipeline)
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") onAuthExpired?.();
        setPipeline(null);
      });
  }, [onAuthExpired]);

  useEffect(carica, [carica]);

  const m = useMemo(() => buildOggiStart(pipeline), [pipeline]);
  const stato = pipeline === undefined ? "loading" : m ? "ok" : "error";

  return (
    <section id="start" aria-labelledby="start-t" className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="start-t" className="text-lg font-semibold text-slate-900">Clienti Start</h2>
          <p className="text-sm text-slate-500 mt-0.5">Cosa tocca a te: prima le bozze che il cliente aspetta</p>
        </div>
        <Link to="/admin/start" className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex-shrink-0">
          Apri tutti
        </Link>
      </div>
      <div className="mt-4">
        {stato === "loading" && <p className="text-sm text-slate-400" aria-busy="true">Caricamento…</p>}
        {stato === "error" && (
          <p className="text-sm text-slate-600">
            Dato non disponibile.{" "}
            <button type="button" onClick={carica} className="font-semibold text-slate-900 underline underline-offset-2">
              Riprova
            </button>
          </p>
        )}
        {stato === "ok" && (
          <>
            {m.inScadenza.length > 0 && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {m.inScadenza.length === 1 ? "1 cliente ha" : `${m.inScadenza.length} clienti hanno`} una consegna in
                scadenza: {m.inScadenza.slice(0, 3).map((r) => r.nome).join(", ")}
                {m.inScadenza.length > 3 ? "…" : ""}.
              </p>
            )}
            <Lista titolo="Da approvare" righe={m.daApprovare} vuoto="Nessuna bozza in attesa di te." />
            <Lista titolo="Da preparare" righe={m.daPreparare} vuoto="Niente da preparare." />
            <p className="text-sm text-slate-500">
              {m.aspettano.length === 0
                ? "Nessun cliente aspetta di rispondere."
                : `${m.aspettano.length} ${m.aspettano.length === 1 ? "cliente deve" : "clienti devono"} ancora inviare risposte o marchio: non puoi fare niente.`}
            </p>
            {m.esclusi.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">Non contati: {m.esclusi.length} account di prova ({m.esclusi.join(", ")}).</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default OggiStart;
