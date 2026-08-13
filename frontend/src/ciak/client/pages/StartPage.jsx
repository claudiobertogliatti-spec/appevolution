import { useEffect, useState } from "react";
import { ArrowRight, Check, LockKeyhole, Loader2 } from "lucide-react";
import { clientGet, clientPost, journeyGet } from "../api";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

// Etichette dei 7 servizi promessi in vendita. Servono SOLO quando il percorso
// non e' ancora attivo: e' la vetrina della proposta, non uno stato.
const SERVIZI_PROPOSTI = [
  "Direzione di posizionamento",
  "Basi del brand",
  "Sistemazione profili social",
  "Sito vetrina semplice",
  "Strategia contenuti",
  "Calendario contenuti",
  "Revisione finale e readiness partnership",
];

const STATO_LABEL = {
  done: "completato",
  in_progress: "in corso",
  pending: "in attesa",
  blocked: "bloccato",
  skipped: "saltato",
};

function StatoBadge({ status }) {
  if (status === "done") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <Check className="h-3 w-3" aria-hidden="true" />
        {STATO_LABEL.done}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-yellow-400">
        {STATO_LABEL.in_progress}
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {STATO_LABEL[status] || STATO_LABEL.pending}
    </span>
  );
}

export function StartPage({ dashboard }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [journey, setJourney] = useState(null);
  const [journeyError, setJourneyError] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [deliverables, setDeliverables] = useState([]);

  const access = dashboard.client?.access_level;
  const active = access === "cliente_start" || access === "partner";
  const decided = dashboard.diagnostic?.offer_decision === "ciak_start";
  const showStartOffer = active || decided;
  const startPrice = dashboard.pricing?.ciak_start?.amount_cents ?? 49900;
  const creditAmount = dashboard.pricing?.partnership?.credit_amount_cents ?? 49900;
  const startLocked = !showStartOffer;
  const clientId = dashboard.client?.id;

  // Il percorso e' la journey vera, non `start_progress`: quel campo veniva
  // scritto solo alla creazione con un default e nessun endpoint lo faceva
  // avanzare, quindi mostrava sette etichette immobili. E' in dismissione.
  useEffect(() => {
    if (!active || !clientId) return undefined;
    let annullato = false;
    setJourneyLoading(true);
    journeyGet(`/operativo/state/${clientId}`)
      .then((data) => {
        if (!annullato) {
          setJourney(data);
          setJourneyError("");
        }
      })
      .catch((e) => {
        if (!annullato) setJourneyError(e.message || "Percorso non disponibile");
      })
      .finally(() => {
        if (!annullato) setJourneyLoading(false);
      });
    return () => {
      annullato = true;
    };
  }, [active, clientId]);

  useEffect(() => {
    if (!active) return;
    clientGet("/start/deliverables")
      .then((data) => setDeliverables(data.items || []))
      .catch(() => setDeliverables([]));
  }, [active, clientId]);

  const steps = journey?.steps || [];
  const lockedSteps = journey?.locked_steps || [];
  const completati = steps.filter((s) => s.status === "done").length;

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");
      const data = await clientPost("/start/checkout");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("Checkout non disponibile");
    } catch (e) {
      setError(e.message || "Errore avvio checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-yellow-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {active ? "Fondazioni in corso" : decided ? "Ciak Start proposto" : "Percorso ancora chiuso"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {active
            ? "Ciak Start sistema social, brand base, primo posizionamento, sito vetrina, calendario e strategia contenuti."
            : decided
              ? "Questa e' la proposta Start: i servizi sono visibili, ma non ancora attivi."
              : "La sezione Start resta chiusa finché il Blueprint non definisce il percorso."}
        </p>
        {showStartOffer ? (
          <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
            {active
              ? `Ciak Start vale ${euro(startPrice)} e il credito di ${euro(creditAmount)} resta sempre garantito se passi alla Partnership.`
              : `Proposta Ciak Start da ${euro(startPrice)}. Se la attivi, il credito di ${euro(creditAmount)} resta garantito verso la Partnership.`}
          </div>
        ) : null}
        {decided && !active ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Apro il checkout..." : "Attiva Ciak Start"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-sm text-slate-500">Proposta non attiva, credito Start garantito verso la Partnership.</p>
          </div>
        ) : null}
        {startLocked ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>Dopo la consegna del Blueprint e la call, qui comparira' Ciak Start solo se il team conferma che non sei ancora pronto per la Partnership.</p>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>

      {active ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Il tuo percorso</h2>
            {steps.length ? (
              <p className="text-sm text-slate-500">
                {completati} di {steps.length} completati
              </p>
            ) : null}
          </div>

          {journeyLoading && !steps.length ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Carico il percorso...
            </p>
          ) : null}

          {journeyError && !steps.length ? (
            <p className="mt-4 text-sm text-slate-500">
              Il percorso non è ancora disponibile. Riprova fra qualche minuto: se resta così, scrivici.
            </p>
          ) : null}

          {steps.length ? (
            <ol className="mt-4 space-y-2">
              {steps.map((step) => (
                <li
                  key={step.step_id}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                    step.status === "in_progress"
                      ? "border-yellow-300 bg-yellow-50/60"
                      : "border-slate-200"
                  }`}
                >
                  <span className="font-medium text-slate-800">{step.label || step.step_id}</span>
                  <StatoBadge status={step.status} />
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : showStartOffer ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Servizi proposti</h2>
          <div className="mt-4 space-y-2">
            {SERVIZI_PROPOSTI.map((label) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
                <span className="font-medium text-slate-800">{label}</span>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">proposto</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {active && deliverables.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Materiali approvati</h2>
          <p className="mt-1 text-sm text-slate-500">Qui compaiono soltanto gli output revisionati dal team.</p>
          <div className="mt-4 space-y-3">
            {deliverables.map((item) => (
              <details key={item.type} className="rounded-lg border border-slate-200 p-4">
                <summary className="cursor-pointer font-semibold text-slate-800">
                  {item.type === "content_plan_90d" ? "Calendario contenuti — 90 giorni" : "Verifica finale Partnership"}
                </summary>
                {item.type === "content_plan_90d" ? (
                  <div className="mt-4 space-y-5">
                    {(item.calendar?.months || []).map((month) => (
                      <div key={month.mese}>
                        <h3 className="text-sm font-semibold text-slate-900">Mese {month.mese}</h3>
                        {(month.blocchi || []).map((block) => (
                          <div key={block.fase} className="mt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{block.fase}</p>
                            <ul className="mt-2 space-y-2">
                              {(block.giorni || []).map((day) => (
                                <li key={`${month.mese}-${day.giorno}`} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                                  <span className="font-semibold">Giorno {day.giorno} · {day.formato}</span> — {day.tema}
                                  <p className="mt-1 text-xs text-slate-500">{day.come_farlo} · CTA: {day.cta}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.note}</p>
                )}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {active && lockedSteps.length ? (
        <section className="rounded-xl border border-slate-200 bg-slate-900 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Con la Partnership</p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Altri {lockedSteps.length} step, quando decidi di continuare
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Masterclass, videocorso, sistema di vendita e lancio. Quello che compili adesso non si perde:
            resta dentro e riparte da dove sei arrivato.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {lockedSteps.map((step) => (
              <li
                key={step.step_id}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
              >
                <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                {step.label || step.step_id}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
