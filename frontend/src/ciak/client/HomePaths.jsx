import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { offerData } from "../insider/offerData";
import { PRICING } from "../pricing";

const euro = (cents) =>
  `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)} €`;

function PathCard({ kind, badge, name, price, priceNote, body, bullets, to, cta, strong }) {
  return (
    <section
      data-path={kind}
      className={`relative flex flex-col rounded-2xl p-7 ${
        strong ? "border-2 border-yellow-400 bg-white" : "border border-slate-200 bg-white"
      }`}
    >
      {badge ? (
        <span className="absolute -top-3 left-6 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-900">
          {badge}
        </span>
      ) : null}
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{kind === "start" ? "Ciak Start" : "Partnership"}</p>
      <h3 className="mt-2 text-2xl font-extrabold text-slate-900">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2 text-slate-900">
        <span className="text-4xl font-extrabold tracking-tight">{price}</span>
        <span className="text-sm font-semibold text-slate-500">una tantum</span>
      </p>
      {priceNote ? <p className="mt-1 text-sm font-semibold text-slate-800">{priceNote}</p> : null}
      <ul className="mt-5 flex flex-col gap-2.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3 text-sm leading-snug text-slate-700">
            <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Link
          to={to}
          className={`inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-bold transition ${
            strong ? "bg-yellow-400 text-slate-900 hover:bg-yellow-300" : "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
          }`}
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/**
 * I due percorsi a confronto nella Home. Ognuno ha la sua pagina: qui si sceglie, li' si approfondisce.
 * Il percorso consigliato dal Blueprint va per primo. I prezzi arrivano dal dashboard; il 10% della
 * Partnership e' scritto accanto al prezzo, non nascosto (Art. 5.5 del contratto).
 */
export function HomePaths({ dashboard }) {
  const startCents = dashboard.pricing?.ciak_start?.amount_cents ?? PRICING.start.cents;
  const fullCents = dashboard.pricing?.partnership?.full_amount_cents ?? PRICING.partnership.cents;
  const partnershipFirst = dashboard.raccomandata === "partnership";

  const start = (
    <PathCard
      key="start"
      kind="start"
      strong={!partnershipFirst && dashboard.raccomandata === "start"}
      badge={!partnershipFirst && dashboard.raccomandata === "start" ? "Consigliato per te" : partnershipFirst ? "Se preferisci partire leggero" : ""}
      name="Le fondamenta, fatte bene"
      price={euro(startCents)}
      body={offerData.start.body}
      bullets={offerData.start.servizi.slice(0, 5)}
      to="/cliente/start"
      cta="Scopri Ciak Start"
    />
  );
  const partnership = (
    <PathCard
      key="partnership"
      kind="partnership"
      strong={partnershipFirst}
      badge={partnershipFirst ? "Consigliato per te" : ""}
      name="Il sistema completo, con noi"
      price={euro(fullCents)}
      priceNote="+ 10% sulle vendite del tuo corso, per 12 mesi dalla firma"
      body={offerData.partnership.body[0]}
      bullets={[
        "12 mesi di collaborazione: lavoriamo in due, non è un servizio chiavi in mano",
        "Metodo Evo in tre fasi: Esamina, Valida, Ottimizza",
        "Accademia online costruita insieme in circa 3-4 settimane, come da proposta",
      ]}
      to="/cliente/partnership"
      cta="Scopri la Partnership"
    />
  );

  return (
    <section className="pc-section" id="prossimo-passo">
      <div className="pc-wrap">
        <p className="pc-kicker">Il tuo prossimo passo</p>
        <h2 className="pc-h2">Due percorsi. Ognuno ha la sua pagina: scegli e approfondisci.</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">{partnershipFirst ? [partnership, start] : [start, partnership]}</div>
        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          I {euro(startCents)} di Ciak Start si scalano interi se poi passi alla Partnership. Nessun guadagno è garantito: ci impegniamo
          sul lavoro e sul metodo, i risultati dipendono anche da mercato, contenuti e impegno.
        </p>
      </div>
    </section>
  );
}
