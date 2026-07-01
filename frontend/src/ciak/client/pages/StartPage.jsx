function euro(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

const FALLBACK_PROGRESS = [
  "Direzione di posizionamento",
  "Basi del brand",
  "Sistemazione profili social",
  "Sito vetrina semplice",
  "Strategia contenuti",
  "Calendario contenuti",
  "Revisione finale e readiness partnership",
].map((label) => ({ label, status: "in attesa" }));

export function StartPage({ dashboard }) {
  const active = dashboard.client?.access_level === "cliente_start";
  const progress = Array.isArray(dashboard.start?.progress) && dashboard.start.progress.length
    ? dashboard.start.progress
    : FALLBACK_PROGRESS;
  const startPrice = dashboard.pricing?.ciak_start?.amount_cents ?? 49900;
  const creditAmount = dashboard.pricing?.partnership?.credit_amount_cents ?? 49900;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-yellow-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {active ? "Fondazioni in corso" : "Il passo giusto per preparare il terreno"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Ciak Start sistema social, brand base, primo posizionamento, sito vetrina, calendario e strategia contenuti.
        </p>
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
          Ciak Start vale {euro(startPrice)} e il credito di {euro(creditAmount)} resta sempre garantito se passi alla Partnership.
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Servizi inclusi</h2>
        <div className="mt-4 space-y-2">
          {progress.map((item, index) => (
            <div key={item.id || item.label || index} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <span className="font-medium text-slate-800">{item.label || `Attivita' ${index + 1}`}</span>
              <span className="shrink-0 text-xs font-semibold uppercase text-slate-400">{item.status || "in attesa"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
