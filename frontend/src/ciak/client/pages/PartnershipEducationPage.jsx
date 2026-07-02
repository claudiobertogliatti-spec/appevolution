import { useState } from "react";
import { ArrowRight, LockKeyhole, PlayCircle } from "lucide-react";
import { clientPost } from "../api";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

const lessons = [
  { title: "Cosa succede dentro la Partnership", note: "Panoramica del percorso e delle fasi." },
  { title: "Cosa costruiamo insieme", note: "Struttura, materiali e priorita' operative." },
  { title: "Cosa validi tu", note: "Decisioni, feedback e ritmo delle revisioni." },
  { title: "Perche' il sistema resta tuo", note: "Ordine, proprieta' e continuita' del lavoro." },
  { title: "Perche' esiste il 10% per 12 mesi", note: "Allineamento sugli obiettivi e crescita nel tempo." },
];

export function PartnershipEducationPage({ dashboard }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const access = dashboard.client?.access_level;
  const isPartner = dashboard.partner_area?.status === "attiva";
  const recommended = dashboard.diagnostic?.recommended_offer;
  const canUpgrade = isPartner || access === "cliente_start" || recommended === "partnership";
  const pricing = dashboard.pricing?.partnership || {};
  const fullAmount = pricing.full_amount_cents ?? 279000;
  const creditAmount = pricing.credit_amount_cents ?? 49900;
  const dueAmount = pricing.due_amount_cents ?? 229100;

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");
      const data = await clientPost("/partnership/checkout");
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
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>{isPartner ? "Area partner gia' attiva." : "Area partner disponibile solo dopo attivazione."}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {lessons.map((lesson, idx) => (
          <div key={lesson.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-yellow-600">Lezione {idx + 1}</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{lesson.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{lesson.note}</p>
              </div>
              <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            </div>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Video guida in preparazione</p>
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
        {!isPartner && canUpgrade ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCheckout}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Apro il checkout..." : "Attiva la Partnership"}
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-sm text-slate-600">Per i clienti Start l'upgrade resta a {euro(dueAmount)}.</p>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </section>
    </div>
  );
}
