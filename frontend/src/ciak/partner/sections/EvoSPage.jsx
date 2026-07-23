import { useState, useEffect } from "react";
import {
  Anchor, TrendingUp, Rocket, ArrowLeft, ArrowRight, Check, X,
  Calendar, Users, Clock, ShieldCheck, Lock, RotateCcw, Sparkles
} from "lucide-react";

/**
 * Rinnovo & Continuità (EVO S) — Programma di continuità in abbonamento post 12 mesi.
 *
 * 4 Piani Ufficiali:
 * 1. Start (147 € / mese)
 * 2. Pro (297 € / mese)
 * 3. Executive (497 € / mese - Il più scelto)
 * 4. Elite (797 € / mese)
 *
 * CTA: "Approfondimenti"
 * Prezzo ad alta visibilità (text-3xl sm:text-4xl font-extrabold).
 */

const PLANS = [
  {
    id: "start",
    name: "Start",
    price: 147,
    priceLabel: "147 € / mese",
    icon: RotateCcw,
    badge: "Livello 01 · Base",
    beneficio: "Per rimettere ordine ed ottimizzare il sistema online quando si completa il primo anno.",
    perChi:
      "Per chi ha completato il 12° mese ed ha bisogno di riordinare il sistema con un controllo guidato di priorità e KPI.",
    obiettivo:
      "Recuperare ed ottimizzare la fase operativa: capire cosa manca, riprendere il ritmo e misurare la stabilità del progetto.",
    comprende: [
      "Audit iniziale dello stato reale del sistema.",
      "Piano mensile di riordino con priorità operative.",
      "Calendario guidato da seguire mese per mese.",
      "Piano live ogni 2 mesi con checklist di preparazione.",
      "Checklist KPI per leggere traffico, contatti e vendite.",
      "Indicazioni di ottimizzazione su funnel ed offerta.",
      "Report mensile sintetico con prossime azioni.",
    ],
    frequenza: "Mensile, con piano di controllo delle azioni.",
    cosaFaIlTeam: [
      "Legge lo stato del sistema e ti indica le priorità.",
      "Prepara il piano operativo del mese.",
      "Ti dice cosa monitorare e quando fare la prossima live.",
      "Rivede i dati principali e aggiorna le prossime azioni.",
    ],
    cosaFaIlPartner: [
      "Esegue le azioni indicate nel piano mensile.",
      "Pubblica i contenuti previsti dal calendario.",
      "Tiene le live ricorrenti.",
      "Comunica i dati necessari al report.",
    ],
    nonComprende: [
      "Produzione contenuti done-for-you.",
      "Gestione completa delle live.",
      "Copywriting completo di pagine o funnel.",
      "Gestione ads o budget pubblicitario.",
    ],
    risultatoAtteso:
      "Un sistema rimesso in ordine e perfettamente misurabile.",
  },
  {
    id: "pro",
    name: "Pro",
    price: 297,
    priceLabel: "297 € / mese",
    icon: Anchor,
    badge: "Livello 02 · Continuità",
    beneficio: "Il tuo sistema resta seguito e protetto dopo i 12 mesi, con una presenza costante del team.",
    perChi:
      "Per chi vuole mantenere vivo, aggiornato e performante il sistema senza tornare a gestire tutto da solo.",
    obiettivo:
      "Mantenere il sistema attivo e stabile con un'ottimizzazione costante mese dopo mese.",
    comprende: [
      "Monitoraggio mensile dei numeri del funnel.",
      "Una revisione di ottimizzazione ogni mese.",
      "Calendario contenuti tenuto aggiornato.",
      "Supporto operativo via chat con il team.",
      "Un check periodico sulla tua live ricorrente.",
      "Assistenza prioritaria sulle procedure standard.",
    ],
    frequenza: "Mensile e continuativa.",
    cosaFaIlTeam: [
      "Controlla i KPI e ti segnala dove intervenire.",
      "Aggiorna il calendario editoriale.",
      "Rivede un elemento del funnel ogni mese.",
      "Risponde ai tuoi dubbi via chat.",
    ],
    cosaFaIlPartner: [
      "Pubblica i contenuti con costanza.",
      "Tiene le sue live ricorrenti.",
      "Applica le indicazioni di ottimizzazione.",
    ],
    nonComprende: [
      "Gestione ads e budget pubblicitario.",
      "Produzione di video o contenuti done-for-you.",
      "Creazione di nuovi prodotti o funnel.",
    ],
    risultatoAtteso:
      "Un sistema che resta in ordine e lavora senza perdere l'autorevolezza costruita.",
  },
  {
    id: "executive",
    name: "Executive",
    price: 497,
    priceLabel: "497 € / mese",
    icon: TrendingUp,
    popular: true,
    badge: "Livello 03 · Crescita Spinta",
    beneficio: "Più contenuti prodotti dal team ed ottimizzazione attiva per spingere la crescita.",
    perChi:
      "Per chi ha un sistema che già vende e vuole accelerare con più contenuti, ottimizzazione bisettimanale e call mensile.",
    obiettivo: "Aumentare contatti e vendite in modo graduale, guidato e misurabile.",
    comprende: [
      "Tutto ciò che è incluso nel piano Pro.",
      "Ottimizzazioni del funnel ogni due settimane.",
      "Pacchetto di contenuti extra prodotti dal team.",
      "Supporto sulla strategia delle tue live.",
      "Report avanzato con le azioni prioritarie.",
      "Una call mensile di allineamento con il team.",
    ],
    frequenza: "Mensile, con interventi sul funnel ogni due settimane.",
    cosaFaIlTeam: [
      "Ottimizza il funnel più spesso.",
      "Produce contenuti extra per te.",
      "Prepara e analizza le tue live.",
      "Ti guida in una call mensile.",
    ],
    cosaFaIlPartner: [
      "Registra o partecipa ai contenuti concordati.",
      "Tiene le live con il supporto del team.",
      "Applica le ottimizzazioni proposte.",
    ],
    nonComprende: [
      "Il budget pubblicitario.",
      "Gestione completa degli account social.",
      "Creazione di nuovi corsi o funnel complessi.",
    ],
    risultatoAtteso:
      "Una crescita accelerata di contatti qualificati e vendite ricorrenti.",
  },
  {
    id: "elite",
    name: "Elite",
    price: 797,
    priceLabel: "797 € / mese",
    icon: Rocket,
    badge: "Livello 04 · Massima Espansione",
    beneficio: "La soluzione più completa: gestione advertising Meta/Google, nuovi prodotti ed affiancamento VIP.",
    perChi:
      "Per chi vuole scalare il business: campagne ads a pagamento, nuovi funnel, nuovi prodotti e massima presenza sul mercato.",
    obiettivo: "Scalare l'Accademia e diversificare le entrate con il team al tuo fianco.",
    comprende: [
      "Tutto ciò che è incluso nel piano Executive.",
      "Gestione completa delle campagne ads (budget escluso).",
      "Progettazione di un nuovo prodotto o funnel.",
      "Affiancamento strategico continuativo VIP.",
      "Ottimizzazione continua di tutti i tassi di conversione.",
      "Call strategiche frequenti e prioritarie.",
    ],
    frequenza: "Continuativa con call strategiche frequenti.",
    cosaFaIlTeam: [
      "Gestisce e ottimizza le campagne ads.",
      "Progetta con te nuovi funnel e prodotti.",
      "Ti affianca a livello strategico.",
      "Tiene sotto controllo tutti i numeri.",
    ],
    cosaFaIlPartner: [
      "Mette il budget pubblicitario.",
      "Partecipa alle decisioni ed alle call.",
      "Registra i contenuti dei nuovi prodotti.",
    ],
    nonComprende: [
      "Il budget pubblicitario (a tuo carico).",
      "Garanzia automatica di fatturato.",
      "Spese di licenze di terze parti.",
    ],
    risultatoAtteso:
      "Massima scalabilità del business: più traffico, più prodotti ed entrate superiori.",
  },
];

const CONTINUITY_POINTS = [
  { icon: ShieldCheck, title: "Nessuna regressione", text: "Mantieni l'infrastruttura attiva senza rischiare di disperdere il lavoro svolto nei primi 12 mesi." },
  { icon: Clock, title: "Risparmio di tempo", text: "Delega la manutenzione e l'ottimizzazione mensile al team per concentrarti sui tuoi studenti." },
  { icon: Sparkles, title: "Evoluzione costante", text: "Aggiorna script, e-mail e pagine in base alla risposta reale del mercato." },
  { icon: Users, title: "Affiancamento continuativo", text: "Mantieni il contatto diretto con il tuo team per qualsiasi dubbio strategico o tecnico." },
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

        {/* PREZZO AD ALTA VISIBILITÀ */}
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

function PlanDetail({ plan, partnerId, locked, unlockInfo, onBack }) {
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const Icon = plan.icon;

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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-950 transition bg-slate-100 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Torna a tutti i Piani di Rinnovo
        </button>

        <div className="overflow-hidden rounded-3xl border-2 border-slate-200 bg-white shadow-md">
          <div className="bg-slate-950 text-white p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="inline-flex rounded-full bg-yellow-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-slate-950">
                {plan.badge}
              </span>
              <div className="flex items-baseline gap-1 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-3xl font-extrabold text-yellow-400">{plan.price} €</span>
                <span className="text-xs text-slate-400 font-semibold">/ mese</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">{plan.name}</h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">{plan.beneficio}</p>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">Obiettivo Principale</h3>
                <p className="text-sm text-slate-800 font-semibold">{plan.obiettivo}</p>
              </div>
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">Per Chi è Ideale</h3>
                <p className="text-sm text-slate-800 font-semibold">{plan.perChi}</p>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h2 className="text-base font-extrabold text-slate-950">Cosa comprende il Piano {plan.name}:</h2>
              <BulletList items={plan.comprende} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">Cosa fa il Team</h3>
                <BulletList items={plan.cosaFaIlTeam} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">Cosa fa il Partner</h3>
                <BulletList items={plan.cosaFaIlPartner} />
              </div>
            </div>

            {requested ? (
              <div className="bg-slate-950 text-white rounded-2xl p-6 space-y-2 border border-slate-800">
                <p className="text-base font-extrabold text-yellow-400">Richiesta registrata con successo!</p>
                <p className="text-xs text-slate-300">
                  Il team ti contatterà per completare l'attivazione del Piano {plan.name}.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
                <div>
                  <h3 className="text-xl font-extrabold text-white">Attiva il Piano {plan.name}</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {plan.priceLabel} · Impegno minimo 6 mesi per garantire continuità.
                  </p>
                </div>
                <button
                  onClick={activate}
                  disabled={busy}
                  className="px-6 py-3.5 bg-yellow-400 text-slate-950 font-extrabold rounded-2xl text-xs hover:bg-yellow-300 transition shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2 shrink-0"
                >
                  {busy ? "Elaborazione..." : `Attiva Piano ${plan.name}`} <ArrowRight className="w-4 h-4" />
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
