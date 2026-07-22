/** 
 * Ciak.io — vetrina istituzionale (Light & Human-Centered)
 * Palette Colori Allineata al Logo CIAK:
 *  - Sfondo: Bianco puro (#FFFFFF) / Slate-50 (#F8FAFC)
 *  - Accenti & CTA Primaria: Giallo CIAK (#FACC15 / #F59E0B) + Testo Slate-950 (#0F172A)
 *  - Testi & Headings: Slate-900 (#0F172A) e Slate-600 (#64748B)
 */
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Users, Sparkles, ShieldCheck, HelpCircle, PhoneCall, Award, Play } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { MarioRossiSimulation } from "../components/MarioRossiSimulation";

const primaryCta = "inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-7 py-3.5 font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2";
const secondaryCta = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 font-bold text-slate-900 hover:bg-slate-50 transition shadow-sm";

export function CiakLanding() {
  return (
    <>
      <CiakHeader />
      <main className="bg-white text-slate-900 font-[Poppins,system-ui,sans-serif]">
        
        {/* HERO SECTION - LIGHT & ALIGNED TO CIAK LOGO COLORS */}
        <section className="bg-gradient-to-b from-yellow-50/40 via-white to-white px-6 pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-100">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 border border-yellow-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 mb-6 shadow-sm">
                <Sparkles className="h-4 w-4 text-amber-600" /> Il Sistema per creare Accademie Digitali
              </span>
              <h1 className="text-4xl font-extrabold leading-tight text-slate-900 md:text-6xl tracking-tight">
                Crea la tua Accademia Digitale senza impazzire con la tecnologia.
              </h1>
              <p className="mt-6 text-lg md:text-xl leading-relaxed text-slate-600">
                Ciak aiuta professionisti, consulenti e formatori a trasformare competenze professionali in progetti digitali sostenibili e misurabili. Non devi saper programmare né studiare marketing complesso. Tu ci metti il tuo know-how, <strong>il nostro Team di Professionisti supportati dall'AI</strong> creano per te.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/masterclass" className={primaryCta}>
                  Guarda la Masterclass Gratuita <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/blueprint" className={secondaryCta}>
                  Scopri il Blueprint pronto
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> Nessuna competenza tecnica
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-amber-600" /> Tutor Umano Affiancato
                </span>
              </div>
            </div>

            {/* MARIO ROSSI DYNAMIC SIMULATION COMPONENT */}
            <div className="mt-8">
              <MarioRossiSimulation />
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US: SIMPLICITY & HUMAN SUPPORT */}
        <section className="bg-slate-50 px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">La soluzione per te</span>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                Perché i liberi professionisti scelgono Ciak.io
              </h2>
              <p className="mt-3 text-slate-600">
                Abbiamo eliminato tutto ciò che crea frustrazione nella creazione di corsi online tradizionali.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="h-12 w-12 rounded-xl bg-yellow-100 text-slate-950 font-extrabold flex items-center justify-center mb-6 border border-yellow-300">
                  01
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sistema Pronto personalizzato</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Pagine di vendita, lezioni video, registrazione utenti e incassi sono già configurati. Devi solo inserire i tuoi contenuti.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center mb-6 border border-emerald-300">
                  02
                </div>
                <h3 className="text-xl font-bold text-slate-900">Team Umano Dedicato</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Non sei mai solo con un software automatico. Un tutor umano reale ti guida passo-passo e verifica ogni singolo dettaglio prima del lancio.
                </p>
              </div>

              <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm hover:shadow-md transition">
                <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center mb-6 border border-amber-300">
                  03
                </div>
                <h3 className="text-xl font-bold text-slate-900">Motore AI Integrato</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  L'AI scrive gli script per i tuoi video, genera le schede per gli studenti e struttura il corso in pochissimi minuti; tu approvi o modifichi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* METHOD EVO SECTION */}
        <section className="bg-white px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Metodo EVO</span>
                <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
                  Esamina. Valida. Ottimizza.
                </h2>
                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                  Il Metodo EVO è il Protocollo testato negli ultimi 7 anni con cui la tua competenza professionale diventa un'Accademia Digitale solida e profittevole.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    ["Esamina la Competenza", "Analizziamo il tuo know-how e definiamo l'offerta unica che ti distingue sul mercato."],
                    ["Valida l'Accademia", "Costruiamo la piattaforma ed i contenuti pronti prima di investire in pubblicità."],
                    ["Ottimizza con i Dati", "Leggiamo i Dati prodotti nei primi mesi e interveniamo per migliorare costantemente il tuo progetto."],
                  ].map(([title, desc]) => (
                    <div key={title} className="flex gap-4 items-start">
                      <CheckCircle2 className="h-6 w-6 text-yellow-500 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-900">{title}</h4>
                        <p className="text-slate-600 text-sm mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
                <span className="inline-block px-3 py-1 bg-yellow-100 text-slate-950 rounded-md font-bold text-xs mb-4 border border-yellow-300">
                  Affiancamento Garantito
                </span>
                <h3 className="text-2xl font-bold text-slate-900">Chi c'è al tuo fianco?</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  Dietro Ciak.io c'è <strong>Claudio Bertogliatti</strong> ed il team di esperti di Evolution PRO. Non ti diamo solo la piattaforma: ti diamo la certezza di un supporto costante e professionale.
                </p>
                <div className="mt-6 pt-6 border-t border-slate-200 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-slate-950 text-yellow-400 font-extrabold flex items-center justify-center border-2 border-yellow-400">
                    CB
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Claudio Bertogliatti</h5>
                    <p className="text-xs text-slate-500">Creatore di Ciak.io e del Metodo EVO</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CLAUDIO BERTOGLIATTI FOUNDER STORY SECTION */}
        <section className="bg-slate-50 border-y border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Photo */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-3xl bg-yellow-400/30 blur-lg"></div>
                  <img 
                    src="/founder/claudio-portrait-640.webp" 
                    alt="Claudio Bertogliatti" 
                    className="relative w-full max-w-md h-auto rounded-2xl border-2 border-white shadow-xl object-cover"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-slate-950 text-white p-4 rounded-xl shadow-lg border border-slate-800 hidden sm:block">
                    <span className="block text-xl font-bold text-yellow-400 font-mono">25.000+</span>
                    <span className="text-xs text-slate-300">Trattative affrontate</span>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-yellow-100 border border-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider">
                  Il Fondatore
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
                  Ciao mi chiamo Claudio Bertogliatti
                </h2>

                <div className="space-y-4 text-base md:text-lg text-slate-700 leading-relaxed">
                  <p>
                    Dopo aver affrontato oltre <strong>25 mila trattative in 13 settori differenti</strong> generando oltre <strong>6 mln di euro di fatturato</strong>, negli ultimi 7 anni mi sono occupato di Digital Marketing osservando professionisti competenti perdere tempo, energia e denaro.
                  </p>
                  <p className="font-semibold text-slate-900 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    Ecco perché ho creato il Metodo EVO, il primo protocollo guidato che trasforma le tue competenze in Accademie Digitali vincenti.
                  </p>
                </div>

                {/* Key stats row */}
                <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="block text-xl font-bold font-mono text-amber-600">25.000+</span>
                    <span className="text-xs text-slate-500 font-medium">Trattative</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="block text-xl font-bold font-mono text-amber-600">13</span>
                    <span className="text-xs text-slate-500 font-medium">Settori</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="block text-xl font-bold font-mono text-amber-600">€6M+</span>
                    <span className="text-xs text-slate-500 font-medium">Fatturato</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="block text-xl font-bold font-mono text-amber-600">7 Anni</span>
                    <span className="text-xs text-slate-500 font-medium">Digital Marketing</span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="bg-white px-6 py-20 border-b border-slate-200">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-600">Domande Frequenti</span>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Tutto quello che vuoi sapere su Ciak.io</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Devo avere competenze informatiche?", "Assolutamente no. Il sistema è già pronto e il nostro team umano si occupa della configurazione per te."],
                ["Cosa faccio se mi blocco?", "Hai un tutor umano dedicato che risponde direttamente alle tue domande e ti aiuta ad ogni passaggio."],
                ["Quanto tempo serve per la prima lezione?", "Con la simulazione guidata e l'AI, la bozza dell'accademia è pronta in meno di 24 ore."],
                ["Posso usare i miei materiali esistenti?", "Sì! Il nostro team ti dirà esattamente come registrare le tue lezioni per convertire le tue slide, documenti o appunti in videocorsi professionali."],
              ].map(([q, a]) => (
                <div key={q} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="font-bold text-slate-900 text-base">{q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA BANNER IN CIAK LOGO YELLOW */}
        <section className="bg-yellow-400 px-6 py-20 text-center text-slate-950">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-extrabold md:text-4xl tracking-tight">
              Inizia Ora: Guarda la Masterclass Gratuita e scopri come creare la tua Accademia.
            </h2>
            <p className="mt-4 text-slate-900 text-lg font-medium">
              Guarda come Mario Rossi ed altri professionisti hanno lanciato la loro accademia senza stress tecnico.
            </p>
            <div className="mt-8">
              <Link to="/masterclass" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-8 py-4 font-bold text-white shadow-xl hover:bg-slate-800 transition">
                Guarda la Masterclass Gratuita <ArrowRight className="h-5 w-5 text-yellow-400" />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <CiakFooter />
    </>
  );
}
