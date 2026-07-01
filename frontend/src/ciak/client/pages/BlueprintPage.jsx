export function BlueprintPage({ dashboard }) {
  const diagnostic = dashboard.diagnostic || {};
  const score = diagnostic.score;
  const hasScore = Number.isFinite(score);
  const analysis = dashboard.analysis || {};
  const roadmap = Array.isArray(analysis.roadmap) ? analysis.roadmap : [];
  const callState = diagnostic.state;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Ciak Blueprint</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">La tua diagnosi iniziale</h1>
        <div className="mt-5 rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500">Punteggio readiness</p>
          <p className="mt-1 text-4xl font-semibold text-slate-900">
            {hasScore ? `${score}/100` : "In preparazione"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {hasScore
              ? score < 50
                ? "Il passo consigliato e' Ciak Start: sistemiamo le fondazioni prima della partnership."
                : "Il passo consigliato e' la Partnership completa."
              : "Stiamo preparando il punteggio per darti una lettura piu' precisa."}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Call strategica</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {callState === "call_done"
              ? "La sessione e' stata completata. Qui restano analisi, roadmap e passo consigliato."
              : callState === "call_booked"
                ? "La sessione e' prenotata. Prima della call trovi qui analisi e materiali utili."
                : "Completiamo prima analisi e prenotazione, poi qui si allinea tutto il percorso."}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Decisione consigliata</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {diagnostic.recommended_offer === "ciak_start"
              ? "Al momento il consiglio e' consolidare le fondazioni con Ciak Start."
              : diagnostic.recommended_offer === "partnership"
                ? "Al momento il consiglio e' la Partnership completa."
                : "La decisione finale compare qui dopo la lettura completa del Blueprint."}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">{analysis.title || "Analisi in preparazione"}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {analysis.status === "inviata"
            ? "La tua analisi e' disponibile. La roadmap qui sotto guida la sessione strategica."
            : "Stiamo preparando analisi e roadmap per la sessione strategica."}
        </p>
        <div className="mt-5 space-y-3">
          {roadmap.length ? roadmap.map((item, idx) => (
            <div key={`${item.fase || "fase"}-${idx}`} className="rounded-lg border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{item.fase || `Fase ${idx + 1}`}</p>
              <p className="mt-1 text-sm text-slate-500">{item.attivita || "Roadmap in aggiornamento."}</p>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              La roadmap comparira' qui appena pronta.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
