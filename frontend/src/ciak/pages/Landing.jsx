/** Ciak.io — vetrina istituzionale. La conversione inizia su /masterclass. */
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

const masterclassCta = "inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2";

export function CiakLanding() {
  return (
    <>
      <CiakHeader />
      <main>
        <section className="bg-slate-950 px-6 py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-yellow-300">Ciak · Il sistema per accademie digitali</p>
            <div className="grid gap-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">La tua competenza merita un sistema. Non un altro tentativo isolato.</h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">Ciak aiuta professionisti, consulenti e formatori a trasformare una competenza reale in un progetto digitale chiaro, costruibile e misurabile.</p>
                <Link to="/masterclass" className={`${masterclassCta} mt-9`}>Guarda la masterclass gratuita <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <aside className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                <p className="text-sm font-semibold text-yellow-300">Anche se hai già un corso fermo</p>
                <p className="mt-3 leading-relaxed text-slate-300">Prima di rifare pagine, contenuti o campagne, serve capire dove il progetto si è fermato e quale parte va rimessa in ordine.</p>
              </aside>
            </div>
          </div>
        </section>

        <section className="bg-white px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Il problema</p><h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">Un corso, un sito o qualche contenuto non sono ancora un sistema.</h2></div>
            <div className="space-y-4 text-lg leading-relaxed text-slate-600"><p>Quando posizionamento, offerta, pagine e lancio vengono affrontati separatamente, il progetto resta fragile.</p><p>Ciak mette queste parti nello stesso percorso: così ogni scelta ha un motivo, una priorità e una prossima azione concreta.</p></div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 px-6 py-20">
          <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Metodo EVO</p><h2 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">Esamina. Valida. Ottimizza.</h2><p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">Metodo EVO è il modo in cui Ciak affronta un progetto: prima legge la situazione, poi costruisce ciò che serve, infine usa i dati per decidere cosa migliorare.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">{[
              ["Esamina", "Competenza, pubblico, posizionamento e offerta: prima della produzione."],
              ["Valida", "Gli asset essenziali per presentare e vendere un progetto in modo ordinato."],
              ["Ottimizza", "Osservazioni e correzioni basate su ciò che accade davvero, non su ipotesi."],
            ].map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6"><CheckCircle2 className="h-6 w-6 text-yellow-500" /><h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3><p className="mt-3 leading-relaxed text-slate-600">{text}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-white px-6 py-20"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Cosa costruisce Ciak</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-900 md:text-4xl">Un progetto digitale con fondamenta chiare.</h2><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["Posizionamento e offerta", "Masterclass e contenuti", "Pagine, email e checkout", "Lancio e lettura dei dati"].map((item) => <div key={item} className="rounded-xl bg-slate-900 p-5 font-medium text-white">{item}</div>)}</div></div></section>

        <section className="bg-slate-950 px-6 py-20 text-white"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">Il percorso</p><h2 className="mt-3 text-3xl font-semibold md:text-4xl">Prima capisci. Poi decidi.</h2><div className="mt-10 grid gap-5 md:grid-cols-3"><article><p className="text-yellow-300">01 · Masterclass gratuita</p><p className="mt-3 text-slate-300">I punti che bloccano più spesso un progetto digitale professionale.</p></article><article><p className="text-yellow-300">02 · Ciak Blueprint</p><p className="mt-3 text-slate-300">Una lettura più precisa del progetto e delle sue priorità.</p></article><article><p className="text-yellow-300">03 · Partnership</p><p className="mt-3 text-slate-300">Per chi decide di costruire il sistema con Evolution PRO.</p></article></div></div></section>

        <section className="bg-slate-50 px-6 py-20"><div className="mx-auto max-w-4xl"><p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Chi c'è dietro</p><h2 className="mt-3 text-3xl font-semibold text-slate-900">Claudio Bertogliatti, creatore di Ciak e del Metodo EVO.</h2><p className="mt-5 text-lg leading-relaxed text-slate-600">Ciak nasce per fare una cosa semplice ma difficile: portare metodo e ordine nel passaggio dalla competenza professionale a un'offerta digitale.</p></div></section>

        <section className="bg-white px-6 py-20"><div className="mx-auto max-w-4xl"><h2 className="text-3xl font-semibold text-slate-900">Domande frequenti</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{[["Ciak è una piattaforma corsi?", "No. È il sistema che coordina analisi, costruzione e miglioramento del progetto."],["Devo avere già un corso?", "No. Puoi partire dalla tua competenza o da un progetto già avviato."],["La masterclass è per chi vende corsi?", "È per chi vuole trasformare competenza, consulenza o formazione in un progetto digitale più solido."],["Ci sono risultati garantiti?", "No. Ciak propone un processo e decisioni più chiare, non promesse automatiche."]].map(([q,a]) => <article key={q} className="rounded-xl border border-slate-200 p-5"><h3 className="font-semibold text-slate-900">{q}</h3><p className="mt-2 leading-relaxed text-slate-600">{a}</p></article>)}</div></div></section>

        <section className="bg-yellow-400 px-6 py-20 text-center"><h2 className="mx-auto max-w-3xl text-3xl font-semibold text-slate-900 md:text-4xl">Inizia dalla masterclass: è il modo più semplice per leggere meglio il tuo progetto.</h2><Link to="/masterclass" className={`${masterclassCta} mt-8 bg-slate-950 text-white hover:bg-slate-800`}>Vai alla masterclass gratuita <ArrowRight className="h-4 w-4" /></Link></section>
      </main>
      <CiakFooter />
    </>
  );
}
