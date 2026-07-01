function euro(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

const lessons = [
  "Cosa succede dentro la Partnership",
  "Cosa costruisce Evolution",
  "Cosa deve fornire il cliente",
  "Perche' lavoriamo nel tuo spazio dedicato",
  "Come funziona il credito Start garantito",
];

export function PartnershipEducationPage({ dashboard }) {
  const isPartner = dashboard.partner_area?.status === "attiva";
  const pricing = dashboard.pricing?.partnership || {};
  const fullAmount = pricing.full_amount_cents ?? 279000;
  const creditAmount = pricing.credit_amount_cents ?? 49900;
  const dueAmount = pricing.due_amount_cents ?? 229100;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Verso la Partnership</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isPartner ? "Partnership attiva" : "Capisci prima cosa succede dopo"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isPartner
            ? "La tua Partnership e' attiva. L'area partner dedicata resta il punto operativo principale."
            : "Questa sezione ti accompagna nel capire il percorso completo. L'area partner si apre solo dopo l'attivazione della Partnership."}
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {lessons.map((lesson, idx) => (
          <div key={lesson} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-yellow-600">Lezione {idx + 1}</p>
            <p className="mt-1 font-semibold text-slate-900">{lesson}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Credito Start garantito</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <span>Partnership completa</span>
            <strong>{euro(fullAmount)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Credito Ciak Start</span>
            <strong>-{euro(creditAmount)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-yellow-200 pt-3 text-base text-slate-900">
            <span>Totale upgrade</span>
            <strong>{euro(dueAmount)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
