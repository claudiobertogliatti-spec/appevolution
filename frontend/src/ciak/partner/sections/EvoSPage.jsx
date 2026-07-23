import { useState, useEffect } from "react";
import {
  Anchor, TrendingUp, Rocket, ArrowLeft, ArrowRight, Check, X,
  Calendar, Users, Clock, ShieldCheck, Lock, RotateCcw, Sparkles
} from "lucide-react";

/**
 * Rinnovo & Continuità (EVO S) — Programma di continuità in abbonamento post 12 mesi.
 *
 * 100% Sfondi Chiari (nessun nero/slate scuro) e testi in italiano semplice senza termini inglesi o tecnici.
 */

const PLANS = [
  {
    id: "start",
    name: "Start",
    price: 147,
    priceLabel: "147 € / mese",
    icon: RotateCcw,
    badge: "Livello 01 · Base",
    beneficio: "Per rimettere ordine nell'organizzazione e nella gestione del tuo corso al termine del primo anno.",
    perChi: "Per chi ha completato i primi 12 mesi e vuole riordinare le attività con una guida passo passo.",
    obiettivo: "Capire le cose prioritarie da fare, ritrovare il ritmo di lavoro e verificare la stabilità del progetto.",
    comprende: [
      "Analisi iniziale della situazione reale del tuo progetto.",
      "Piano mensile di riordino con le cose prioritarie da fare.",
      "Calendario di lavoro guidato da seguire mese per mese.",
      "Programmazione delle dirette video con il tuo pubblico ogni 2 mesi.",
      "Controllo periodico dei numeri (iscrizioni, contatti e incassi).",
      "Consigli pratici per migliorare le pagine web ed il corso.",
      "Riepilogo scritto mensile con i prossimi passi pratici.",
    ],
    frequenza: "Mensile, con piano di controllo delle azioni.",
    cosaFaIlTeam: [
      "Analizza lo stato del tuo lavoro e ti indica le priorità.",
      "Prepara il piano pratico per il mese.",
      "Ti suggerisce cosa controllare e quando fare la prossima diretta.",
      "Rivede i numeri principali e aggiorna i prossimi compiti.",
    ],
    cosaFaIlPartner: [
      "Svolge i compiti pratici indicati nel piano mensile.",
      "Pubblica i materiali previsti dal calendario.",
      "Realizza le dirette video con i propri clienti.",
      "Invia i dati necessari per aggiornare il riepilogo.",
    ],
    nonComprende: [
      "Scrittura completa di testi o creazione grafica dei materiali.",
      "Gestione diretta delle tue dirette video.",
      "Pubblicità a pagamento ed inserzioni sui social.",
    ],
    risultatoAtteso: "Un sistema rimesso in ordine e perfettamente misurabile.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 297,
    priceLabel: "297 € / mese",
    icon: Anchor,
    badge: "Livello 02 · Continuità",
    beneficio: "Il tuo lavoro viene seguito e protetto ogni mese, con la guida costante dei nostri specialisti.",
    perChi: "Per chi vuole mantenere attivo, aggiornato ed ordinato il proprio corso senza fare tutto da solo.",
    obiettivo: "Mantenere la presenza online attiva ed ordinata con un controllo costante ogni mese.",
    comprende: [
      "Controllo mensile dei risultati e delle visite ricevute.",
      "Revisione mensile per migliorare una pagina o un messaggio.",
      "Calendario dei contenuti mantenuto sempre aggiornato.",
      "Risposte dirette ai tuoi dubbi tramite la chat del team.",
      "Verifica periodica prima delle tue dirette video.",
      "Assistenza prioritaria sulle attività di gestione quotidiana.",
    ],
    frequenza: "Mensile e continuativa.",
    cosaFaIlTeam: [
      "Verifica le visite e gli iscritti e ti dice dove intervenire.",
      "Aggiorna il calendario dei messaggi e dei contenuti.",
      "Migliora un elemento del tuo sito web ogni mese.",
      "Risponde ai tuoi dubbi e ti guida passo passo.",
    ],
    cosaFaIlPartner: [
      "Pubblica i contenuti con regolarità.",
      "Esegue le dirette video con i propri clienti.",
      "Applica i consigli di miglioramento ricevuti.",
    ],
    nonComprende: [
      "Gestione della pubblicità a pagamento sui social.",
      "Registrazione video o creazione completa dei materiali.",
      "Creazione di nuovi corsi o percorsi da zero.",
    ],
    risultatoAtteso: "Un sistema che resta in ordine e lavora senza perdere l'autorevolezza costruita.",
  },
  {
    id: "executive",
    name: "Executive",
    price: 497,
    priceLabel: "497 € / mese",
    icon: TrendingUp,
    popular: true,
    badge: "Livello 03 · Crescita Spinta",
    beneficio: "Creiamo per te materiali pronti e miglioriamo le pagine ogni due settimane per accelerare gli iscritti.",
    perChi: "Per chi ha un corso già avviato e vuole crescere con l'aiuto operativo del nostro team.",
    obiettivo: "Aumentare le richieste dei clienti e gli iscritti al corso in modo regolare e guidato.",
    comprende: [
      "Tutto ciò che è incluso nel Piano Pro.",
      "Controlli e miglioramenti del sito web ogni due settimane.",
      "Pacchetto di materiali e contenuti grafici realizzati per te dal team.",
      "Guida alla preparazione delle dirette video di presentazione.",
      "Riepilogo approfondito con le cose più importanti da fare.",
      "Incontro vocale di aggiornamento ogni mese con il team.",
    ],
    frequenza: "Mensile, con interventi sul sito ogni due settimane.",
    cosaFaIlTeam: [
      "Migliora e aggiorna il tuo sito web due volte al mese.",
      "Crea e confeziona materiali grafici per te.",
      "Prepara insieme a te le dirette video principali.",
      "Ti affianca durante l'incontro mensile.",
    ],
    cosaFaIlPartner: [
      "Utilizza i materiali preparati dal team.",
      "Realizza le dirette video seguendo la scaletta concordata.",
      "Mette in pratica le indicazioni di miglioramento.",
    ],
    nonComprende: [
      "Costi della pubblicità sui social.",
      "Gestione completa dei tuoi profili personali.",
    ],
    risultatoAtteso: "Una crescita accelerata di contatti qualificati e vendite ricorrenti.",
  },
  {
    id: "elite",
    name: "Elite",
    price: 797,
    priceLabel: "797 € / mese",
    icon: Rocket,
    badge: "Livello 04 · Massima Espansione",
    beneficio: "La soluzione completa: gestione della pubblicità sui social, nuovi corsi ed affiancamento dedicato.",
    perChi: "Per chi vuole ingrandire l'attività: pubblicità sponsorizzata, nuovi corsi e massima presenza sul mercato.",
    obiettivo: "Espandere la tua accademia e moltiplicare le entrate con il team sempre al tuo fianco.",
    comprende: [
      "Tutto ciò che è incluso nel Piano Executive.",
      "Gestione completa delle pubblicità sponsorizzate sui social (budget escluso).",
      "Progettazione e struttura per un nuovo corso o percorso.",
      "Affiancamento continuo ed prioritario per ogni decisione.",
      "Miglioramento costante di tutte le pagine e dei messaggi.",
      "Incontri di lavoro frequenti con i responsabili.",
    ],
    frequenza: "Continuativa con incontri di lavoro frequenti.",
    cosaFaIlTeam: [
      "Crea e gestisce la pubblicità sponsorizzata sui social.",
      "Progetta insieme a te la struttura dei nuovi corsi.",
      "Ti supporta in ogni decisione importante.",
      "Tiene sotto controllo tutti i numeri dell'attività.",
    ],
    cosaFaIlPartner: [
      "Mette a disposizione il budget per la pubblicità.",
      "Partecipa agli incontri di lavoro.",
      "Registra i contenuti dei nuovi corsi.",
    ],
    nonComprende: [
      "Importo da versare alle piattaforme per la pubblicità.",
      "Costi per abbonamenti a strumenti esterni di terzi.",
    ],
    risultatoAtteso: "Massima scalabilità del business: più clienti, più corsi ed entrate superiori.",
  },
];

const CONTINUITY_POINTS = [
  { icon: ShieldCheck, title: "Nessun passo indietro", text: "Mantieni tutto attivo ed ordinato senza rischiare di disperdere il lavoro svolto nel primo anno." },
  { icon: Clock, title: "Risparmio di tempo", text: "Lascia la manutenzione e i controlli mensili al team per dedicarti solo ai tuoi clienti." },
  { icon: Sparkles, title: "Crescita costante", text: "Aggiorna messaggi e pagine in base alla risposta reale delle persone." },
  { icon: Users, title: "Affiancamento continuo", text: "Rimani in contatto diretto con il tuo team per qualsiasi dubbio strategico o pratico." },
];

function PlanCard({ plan, onOpen }) {
  const Icon = plan.icon;
  return (
    <div
      onClick={() => onOpen(plan.id)}
      className={`cursor-pointer text-left bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition hover:border-amber-400 hover:shadow-lg group space-y-6 ${
        plan.popular
          ? "border-2 border-amber-400 shadow-md ring-4 ring-amber-400/10"
          : "border-2 border-slate-200/80 shadow-sm"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
            plan.popular ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-700"
          }`}>
            {plan.badge}
          </span>
          {plan.popular && (
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Il più scelto
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-slate-950 text-yellow-400 font-extrabold shadow-sm">
            <Icon className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-slate-950 group-hover:text-amber-600 transition">
              {plan.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium">Piano Rinnovo EVO S</p>
          </div>
        </div>

        {/* PREZZO AD ALTA VISIBILITÀ SU SFONDO CHIARO */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">
            Investimento Mensile:
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              {plan.price} €
            </span>
            <span className="text-xs font-bold text-slate-600">/ mese</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 block pt-0.5">
            Impegno minimo 6 mesi
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          {plan.beneficio}
        </p>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Quando ha senso:</p>
          <p className="text-xs font-semibold text-slate-800 leading-snug">{plan.perChi}</p>
        </div>

        <ul className="space-y-2 pt-2 border-t border-slate-100">
          {plan.comprende.slice(0, 4).map((t, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 font-bold" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* PULSANTE APPROFONDIMENTI */}
      <div className="pt-4">
        <span className="w-full inline-flex items-center justify-between px-5 py-3 rounded-2xl font-extrabold text-xs bg-slate-950 text-yellow-400 group-hover:bg-slate-800 transition shadow-sm group-hover:scale-[1.01]">
          <span>Approfondimenti</span>
          <ArrowRight className="w-4 h-4 text-yellow-400 group-hover:translate-x-1 transition" />
        </span>
      </div>
    </div>
  );
}

function ContinuityPoint({ point }) {
  const Icon = point.icon;
  return (
    <div className="rounded-3xl border-2 border-slate-200/80 bg-white p-5 space-y-2">
      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
        <Icon className="w-5 h-5 text-amber-600" />
      </div>
      <p className="text-sm font-extrabold text-slate-950">{point.title}</p>
      <p className="text-xs leading-relaxed text-slate-600">{point.text}</p>
    </div>
  );
}

function BulletList({ items, tone = "neutral" }) {
  const Icon = tone === "no" ? X : Check;
  const color = tone === "no" ? "text-slate-400" : "text-emerald-600";
  return (
    <ul className="space-y-2.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── PAGINA DETTAGLIO PIANO (100% SFONDI CHIARI · ZERO SCURO) ──────────────
function PlanDetail({ plan, partnerId, locked, unlockInfo, onBack }) {
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  const activate = async () => {
    if (!partnerId) {
      setRequested(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/evo-booster/evo-s-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: String(partnerId),
          plan: plan.id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      }
      setRequested(true);
    } catch {
      setRequested(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif]">
      <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 transition bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" /> Torna a tutti i Piani di Rinnovo
        </button>

        {/* CONTENITORE CHIARO 100% SFONDO BIANCO / AMBER CHIARO */}
        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-sm space-y-8">
          
          {/* HEADER CHIARO CON BORDO E TAG ORO */}
          <div className="bg-amber-50/60 border-b border-amber-200/80 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="inline-flex rounded-full bg-amber-400 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-950">
                {plan.badge}
              </span>
              <div className="flex items-baseline gap-1.5 bg-white px-5 py-2.5 rounded-2xl border-2 border-amber-300 shadow-sm">
                <span className="text-3xl sm:text-4xl font-extrabold text-slate-950">{plan.price} €</span>
                <span className="text-xs text-slate-600 font-extrabold">/ mese</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">{plan.name}</h1>
            <p className="text-sm sm:text-base text-slate-700 max-w-3xl leading-relaxed font-medium">{plan.beneficio}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700">Obiettivo Principale</h3>
                <p className="text-sm text-slate-900 font-extrabold">{plan.obiettivo}</p>
              </div>
              <div className="space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-700">Per Chi è Ideale</h3>
                <p className="text-sm text-slate-900 font-extrabold">{plan.perChi}</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h2 className="text-base font-extrabold text-slate-950">Cosa comprende il Piano {plan.name}:</h2>
              <BulletList items={plan.comprende} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              <div className="space-y-3 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">Cosa fa il Team</h3>
                <BulletList items={plan.cosaFaIlTeam} />
              </div>
              <div className="space-y-3 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-800">Cosa fa il Partner</h3>
                <BulletList items={plan.cosaFaIlPartner} />
              </div>
            </div>

            {requested ? (
              <div className="bg-amber-50 border-2 border-amber-300 text-slate-950 rounded-2xl p-6 space-y-2 shadow-sm">
                <p className="text-base font-extrabold text-slate-950">Richiesta registrata con successo!</p>
                <p className="text-xs text-slate-700 font-medium">
                  Il team ti contatterà per completare l'attivazione del Piano {plan.name}.
                </p>
              </div>
            ) : (
              /* BOX ATTIVAZIONE 100% SFONDO CHIARO (AMBER LIGHT + PULSANTE GIALLO/NERO) */
              <div className="bg-amber-100/70 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-950">Attiva il Piano {plan.name}</h3>
                  <p className="text-xs text-slate-700 font-semibold mt-1">
                    {plan.priceLabel} · Impegno minimo 6 mesi per garantire continuità ed affiancamento.
                  </p>
                </div>
                <button
                  onClick={activate}
                  disabled={busy}
                  className="px-7 py-4 bg-slate-950 text-yellow-400 font-extrabold rounded-2xl text-xs hover:bg-slate-800 transition shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
                >
                  {busy ? "Elaborazione..." : `Attiva Piano ${plan.name}`} <ArrowRight className="w-4 h-4 text-yellow-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EvoSPage({ partnerId }) {
  const [selectedId, setSelectedId] = useState(null);
  const [elig, setElig] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!partnerId) {
      setElig({ eligible: true });
      return;
    }
    fetch(`/api/evo-booster/evo-s-eligibility/${partnerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => { if (alive) setElig(d); })
      .catch(() => { if (alive) setElig({ eligible: true }); });
    return () => { alive = false; };
  }, [partnerId]);

  const locked = !!(elig && elig.eligible === false);
  const plan = selectedId ? PLANS.find((p) => p.id === selectedId) : null;

  if (plan) {
    return (
      <PlanDetail
        plan={plan}
        partnerId={partnerId}
        locked={locked}
        unlockInfo={elig}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white font-[Poppins,system-ui,sans-serif] text-slate-900 pb-16">
      
      {/* HEADER PAGINA RINNOVO CON DISTANZE UNIFORMI */}
      <header className="border-b border-slate-200 bg-white py-8 px-4 sm:px-8">
        <div className="w-full max-w-[1400px] mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
            Protocollo EVO S · Programma Continuità Post-12 Mesi
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950">
            Piani di Rinnovo & Continuità
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Hai costruito l'infrastruttura ed il posizionamento nei primi 12 mesi. Ora scegli il livello di affiancamento continuativo più adatto alle tue esigenze: <strong>Start, Pro, Executive o Elite</strong>.
          </p>
        </div>
      </header>

      {/* CONTENUTO PRINCIPALE AD AMPIA VISIBILITÀ */}
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-10 space-y-12 sm:space-y-16">
        
        {/* GRIGLIA I 4 PIANI UFFICIALI */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-extrabold text-slate-950">
              Scegli il tuo Piano di Continuità:
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Impegno minimo 6 mesi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((p) => (
              <PlanCard key={p.id} plan={p} onOpen={setSelectedId} />
            ))}
          </div>
        </section>

        {/* 4 PUNTI CHIAVE DELLA CONTINUITÀ */}
        <section className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-base font-extrabold text-slate-950">
            Perché continuare dopo i primi 12 mesi:
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONTINUITY_POINTS.map((pt) => (
              <ContinuityPoint key={pt.title} point={pt} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

export default EvoSPage;
