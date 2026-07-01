import { useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { clientPost } from "../api";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const access = dashboard.client?.access_level;
  const active = access === "cliente_start" || access === "partner";
  const recommended = dashboard.diagnostic?.recommended_offer;
  const unlocked = active || recommended === "ciak_start";
  const progress = Array.isArray(dashboard.start?.progress) && dashboard.start.progress.length
    ? dashboard.start.progress
    : active
      ? FALLBACK_PROGRESS
      : FALLBACK_PROGRESS.map((item) => ({ ...item, status: "incluso" }));
  const startPrice = dashboard.pricing?.ciak_start?.amount_cents ?? 49900;
  const creditAmount = dashboard.pricing?.partnership?.credit_amount_cents ?? 49900;
  const startLocked = !unlocked;

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
          {active ? "Fondazioni in corso" : startLocked ? "Passaggio disponibile dopo la call" : "Il passo giusto per preparare il terreno"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {startLocked
            ? "Questo passaggio si apre dopo la sessione strategica."
            : "Ciak Start sistema social, brand base, primo posizionamento, sito vetrina, calendario e strategia contenuti."}
        </p>
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-slate-700">
          Ciak Start vale {euro(startPrice)} e il credito di {euro(creditAmount)} resta sempre garantito se passi alla Partnership.
        </div>
        {!active && !startLocked ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Apro il checkout..." : "Attiva Ciak Start"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-sm text-slate-500">Accesso cliente unico, credito Start sempre garantito.</p>
          </div>
        ) : null}
        {startLocked ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>Qui vedrai servizi, avanzamento e prossimi passi quando il Blueprint avra' definito se Ciak Start e' il percorso giusto.</p>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
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
