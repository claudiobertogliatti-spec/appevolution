import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { clientPost } from "../api";
import { PRICING } from "../../pricing";
import { offerData } from "../../insider/offerData";
import { LessonCard } from "./PartnershipEducationPage";
import { startPlusLessons } from "./startPlusVideos";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

/**
 * Pagina Start Plus (790 €). Tre video brevi (stesso schema della pagina Partnership: senza file vero la
 * scheda dice "Video guida in preparazione"), cosa c'e' dentro, credito sulla Partnership.
 *
 * Il pulsante di acquisto compare solo dopo la call e solo a chi non ha ancora Start ne' Partnership:
 * chi ha gia' Start non puo' comprare Plus da qui (il prezzo del passaggio non e' deciso).
 */
export function StartPlusPage({ dashboard = {} }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const access = dashboard.client?.access_level;
  const isPartner = access === "partner" || dashboard.partner_area?.status === "attiva";
  const hasStart = access === "cliente_start" || dashboard.start?.attivo === true;
  const callDone = dashboard.diagnostic?.state === "call_done";
  const canBuy = callDone && !hasStart && !isPartner;

  const plus = dashboard.pricing?.ciak_start_plus || {};
  const plusCents = plus.amount_cents ?? PRICING.startPlus.cents;
  const afterExpiryCents = plus.credit_after_expiry_cents ?? PRICING.start.cents;
  const days = plus.credit_valid_days ?? 60;
  const total = PRICING.partnership.cents;

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");
      const data = await clientPost("/start-plus/checkout");
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
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Start Plus</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{offerData.startPlus.tagline}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {offerData.startPlus.body} Tre video brevi per capire cosa costruiamo, cosa fai tu e come funziona il credito, prima di decidere.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3" aria-label="I tre video">
        {startPlusLessons.map((lesson, idx) => (
          <LessonCard key={lesson.title} lesson={lesson} index={idx} />
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="startplus-include">
        <h2 id="startplus-include" className="text-lg font-semibold text-slate-900">Cosa c'è dentro</h2>
        <ul className="mt-4 flex flex-col gap-2.5">
          {offerData.startPlus.servizi.map((s) => (
            <li key={s} className="flex items-start gap-3 text-sm leading-snug text-slate-700">
              <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm leading-relaxed text-slate-700">{offerData.startPlus.yourPart}</p>
      </section>

      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-6" aria-labelledby="startplus-prezzo">
        <h2 id="startplus-prezzo" className="text-lg font-semibold text-slate-900">Credito Start Plus garantito</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-4">
            <span>Partnership</span>
            <strong>{euro(total)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Credito Start Plus, se passi entro {days} giorni dall'acquisto</span>
            <strong>-{euro(plusCents)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-yellow-200 pt-3 text-base text-slate-900">
            <span>Totale upgrade entro {days} giorni</span>
            <strong>{euro(total - plusCents)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-600">
            <span>Dopo {days} giorni restano {euro(afterExpiryCents)} di credito: upgrade</span>
            <strong>{euro(total - afterExpiryCents)}</strong>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          {offerData.startPlus.disclaimer}{" "}
          Vuoi confrontare i tre percorsi? <Link to="/cliente" className="font-semibold text-blue-700 underline underline-offset-2">Torna alla Home</Link>.
        </p>
      </section>

      {canBuy ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6" aria-label="Attiva Start Plus">
          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 text-[15px] font-bold text-slate-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Apro il checkout..." : `Attiva Start Plus, ${euro(plusCents)}`}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
            Puoi rateizzare con Klarna, dentro il checkout.
          </p>
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        </section>
      ) : null}

      {!canBuy && hasStart && !isPartner ? (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          Hai già Ciak Start. Se ti interessa Start Plus, scrivi al team: ti diciamo come fare il passaggio.
        </section>
      ) : null}
    </div>
  );
}
