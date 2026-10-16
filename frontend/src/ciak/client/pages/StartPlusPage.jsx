import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { PRICING } from "../../pricing";
import { offerData } from "../../insider/offerData";
import { LessonCard } from "./PartnershipEducationPage";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

// Tre video brevi, stesso schema della pagina Partnership. Senza `videoUrl` la scheda mostra
// "Video guida in preparazione": nessun video finto. I file andranno in `frontend/public/video/`.
const lessons = [
  { title: "Cosa costruiamo per te", note: "Prodotto, pagina di vendita, checkout e messaggio di lancio." },
  { title: "Cosa fai tu", note: "Le decisioni, i contenuti e il lancio verso il tuo pubblico." },
  { title: "Come funziona il credito", note: "Da Start Plus alla Partnership, in 60 giorni." },
];

export function StartPlusPage() {
  const total = PRICING.partnership.cents;
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
        {lessons.map((lesson, idx) => (
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
            <span>Credito Start Plus</span>
            <strong>-{euro(PRICING.startPlus.cents)}</strong>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-yellow-200 pt-3 text-base text-slate-900">
            <span>Se passi alla Partnership entro 60 giorni dall'acquisto</span>
            <strong>{euro(PRICING.upgradeFromStartPlus.cents)}</strong>
          </div>
          <p className="text-slate-600">
            Il totale finale resta {euro(total)}: {euro(PRICING.startPlus.cents)} oggi e {euro(PRICING.upgradeFromStartPlus.cents)} dopo.
          </p>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          {offerData.startPlus.disclaimer}{" "}
          Vuoi confrontare i tre percorsi? <Link to="/cliente" className="font-semibold text-blue-700 underline underline-offset-2">Torna alla Home</Link>.
        </p>
      </section>
    </div>
  );
}
