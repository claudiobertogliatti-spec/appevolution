import { useState, useEffect } from "react";
import {
  Anchor, TrendingUp, Rocket, ArrowLeft, ArrowRight, Check, X,
  Calendar, Users, Clock, ShieldCheck, Lock, RotateCcw,
} from "lucide-react";

/**
 * Scala — programma di continuità in abbonamento, riservato a chi ha completato
 * i 12 mesi del Protocollo EVO. Non è un rinnovo tecnico: è l'accesso al livello
 * successivo. 4 soluzioni (Recupero / Continuita / Crescita / Espansione),
 * attivabili per almeno 6 mesi.
 *
 * Gating: GET /api/evo-booster/evo-s-eligibility/{partnerId} → se non sono passati
 * 12 mesi, i piani restano visibili ma in sola lettura (CTA bloccata). Se il backend
 * non risponde, la pagina resta sbloccata (non blocchiamo per un errore di rete).
 * CTA "Attiva questo piano" → POST /api/evo-booster/evo-s-checkout (Stripe abbonamento).
 */

const PLANS = [
  {
    id: "recover",
    name: "Recupero Ottimizza",
    price: 147,
    priceLabel: "147 € / mese",
    icon: RotateCcw,
    beneficio: "Per rimettere ordine quando i 12 mesi sono passati, ma Ottimizza non e' stata fatta davvero.",
    perChi:
      "Per partner arrivati al dodicesimo mese con sistema online, ma senza ritmo costante su calendario, live, KPI e revisione funnel.",
    obiettivo:
      "Recuperare la fase Ottimizza in modo guidato: capire cosa manca, riprendere il ritmo e arrivare a una decisione seria sul passo successivo.",
    comprende: [
      "Audit iniziale dello stato reale del sistema.",
      "Piano mensile di recupero con priorita' operative.",
      "Calendario guidato da seguire mese per mese.",
      "Piano live ogni 2 mesi con checklist di preparazione.",
      "Checklist KPI per leggere traffico, contatti, vendite e show-up.",
      "Indicazioni di ottimizzazione su funnel, offerta e follow-up.",
      "Report mensile sintetico con prossime azioni.",
      "Decisione finale: continuita', crescita, espansione o stop.",
    ],
    frequenza: "Mensile, con piano di recupero e controllo delle azioni.",
    cosaFaIlTeam: [
      "Legge lo stato del sistema e ti indica le priorita'.",
      "Prepara il piano operativo del mese.",
      "Ti dice cosa monitorare e quando fare la prossima live.",
      "Rivede i dati principali e aggiorna le prossime azioni.",
    ],
    cosaFaIlPartner: [
      "Esegue le azioni indicate nel piano mensile.",
      "Pubblica i contenuti previsti dal calendario.",
      "Tiene le live ricorrenti.",
      "Inserisce o comunica i dati necessari al report.",
    ],
    nonComprende: [
      "Produzione contenuti done-for-you.",
      "Gestione completa delle live.",
      "Copywriting completo di pagine, email o funnel.",
      "Gestione ads, budget pubblicitario o setup tecnico extra.",
    ],
    risultatoAtteso:
      "Un sistema rimesso in ordine e finalmente misurabile. Non e' scaling: e' il passaggio necessario per capire se e come continuare.",
  },
  {
    id: "start",
    name: "Ciak Continuita",
    price: 297,
    priceLabel: "297 € / mese",
    icon: Anchor,
    beneficio: "Il tuo sistema resta seguito anche dopo i 12 mesi, con una presenza leggera ma costante.",
    perChi:
      "Per chi ha completato i 12 mesi e vuole mantenere vivo e aggiornato il sistema, senza tornare a fare tutto da solo.",
    obiettivo:
      "Mantenere il sistema attivo e stabile, con un'ottimizzazione costante e leggera mese dopo mese.",
    comprende: [
      "Monitoraggio mensile dei numeri del funnel.",
      "Una revisione di ottimizzazione ogni mese.",
      "Calendario contenuti tenuto aggiornato.",
      "Supporto operativo via chat con il team.",
      "Un check periodico sulla tua live ricorrente.",
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
      "Un sistema che resta in ordine e continua a lavorare, senza perdere cio' che hai costruito. I risultati dipendono anche dalla tua costanza.",
  },
  {
    id: "grow",
    name: "Ciak Crescita",
    price: 497,
    priceLabel: "497 € / mese",
    icon: TrendingUp,
    popular: true,
    beneficio: "Piu' contenuti e ottimizzazione attiva per crescere con continuita'.",
    perChi:
      "Per chi ha un sistema che gia' vende e vuole crescere con piu' contenuti, piu' ottimizzazione e una spinta strutturata.",
    obiettivo: "Aumentare contatti e vendite in modo graduale e misurabile.",
    comprende: [
      "Tutto ciò che è incluso in Ciak Continuita.",
      "Ottimizzazioni del funnel più frequenti (ogni due settimane).",
      "Un pacchetto di contenuti extra prodotti dal team.",
      "Supporto sulla strategia delle tue live.",
      "Report avanzato con le azioni prioritarie.",
      "Una call mensile con il team.",
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
      "Creazione di nuovi prodotti complessi (vedi Ciak Espansione).",
    ],
    risultatoAtteso:
      "Una crescita graduale di contatti e vendite, costruita su contenuti e ottimizzazioni costanti. Nessun numero e' garantito: dipende anche dal mercato e dalla tua esecuzione.",
  },
  {
    id: "scale",
    name: "Ciak Espansione",
    price: 797,
    priceLabel: "797 € / mese",
    icon: Rocket,
    beneficio: "La soluzione piu' completa: advertising, nuovi prodotti e affiancamento strategico.",
    perChi:
      "Per chi ha validato il modello e vuole spingere: ads, nuovi funnel, nuovi prodotti, più entrate.",
    obiettivo: "Scalare il business e diversificare le entrate, con il team al tuo fianco.",
    comprende: [
      "Tutto ciò che è incluso in Ciak Crescita.",
      "Gestione delle campagne ads (budget escluso).",
      "Progettazione di un nuovo prodotto o funnel.",
      "Affiancamento strategico continuativo.",
      "Ottimizzazione continua del sistema.",
      "Call strategiche frequenti.",
    ],
    frequenza: "Continuativa, con call frequenti.",
    cosaFaIlTeam: [
      "Gestisce e ottimizza le campagne ads.",
      "Progetta con te nuovi funnel e prodotti.",
      "Ti affianca a livello strategico.",
      "Tiene sotto controllo tutti i numeri.",
    ],
    cosaFaIlPartner: [
      "Mette il budget pubblicitario.",
      "Partecipa alle decisioni e alle call.",
      "Registra i contenuti dei nuovi prodotti.",
    ],
    nonComprende: [
      "Il budget pubblicitario (a tuo carico).",
      "Garanzia di risultati di fatturato.",
      "Spese di strumenti o licenze di terze parti.",
    ],
    risultatoAtteso:
      "Le condizioni per scalare: piu' traffico, piu' prodotti, piu' entrate potenziali. E' il piano piu' ambizioso, ma i risultati dipendono da budget, mercato ed esecuzione.",
  },
];

const CONTINUITY_POINTS = [
  {
    title: "Il sistema non si spegne",
    text: "Funnel, contenuti, live e lista restano seguiti anche dopo la fase di costruzione.",
  },
  {
    title: "Le decisioni partono dai numeri",
    text: "Ogni mese guardiamo cosa sta funzionando e dove intervenire prima di disperdere energie.",
  },
  {
    title: "Cresci senza ricominciare da zero",
    text: "Scala parte da cio' che hai gia' costruito e lo rende piu' stabile, chiaro e vendibile.",
  },
];

function PlanCard({ plan, onOpen }) {
  const Icon = plan.icon;
  return (
    <button
      onClick={() => onOpen(plan.id)}
      className={`text-left bg-white rounded-xl p-5 flex flex-col transition hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] ${
        plan.popular ? "border-2 border-yellow-300 shadow-[0_0_24px_rgba(250,204,21,0.12)]" : "border border-gray-200 hover:border-yellow-300"
      }`}
    >
      {plan.popular && (
        <span className="self-start text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 mb-3">
          Il più scelto
        </span>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
          <Icon className="w-5 h-5 text-yellow-400" />
        </div>
        <p className="text-[16px] font-semibold text-slate-900 leading-tight">{plan.name}</p>
      </div>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-4">{plan.beneficio}</p>
      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Quando ha senso</p>
        <p className="text-[13px] text-slate-700 leading-snug mt-1">{plan.perChi}</p>
      </div>
      <p className="text-[12px] text-slate-500 mb-3">
        <span className="font-semibold text-slate-700">Investimento:</span> {plan.priceLabel} · Attivabile per almeno 6 mesi
      </p>
      <ul className="space-y-1.5 mb-4 flex-1">
        {plan.comprende.slice(0, 4).map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <span className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-slate-900 text-yellow-300 hover:bg-slate-800 transition">
        Capisci se fa per te <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function ContinuityPoint({ point }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{point.title}</p>
      <p className="text-[13px] leading-relaxed text-slate-600 mt-1">{point.text}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function BulletList({ items, tone = "neutral" }) {
  const Icon = tone === "no" ? X : Check;
  const color = tone === "no" ? "text-slate-400" : "text-emerald-600";
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] text-slate-700 leading-relaxed">
          <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
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
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      setRequested(true);
    } catch (e) {
      setRequested(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Scala
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
            <Icon className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{plan.name}</h1>
            <p className="text-[15px] font-semibold text-slate-700">{plan.priceLabel}</p>
          </div>
        </div>
        <p className="text-[15px] text-slate-600 leading-relaxed mb-5">{plan.beneficio}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Attivazione</span>
            </div>
            <p className="text-[14px] text-slate-700">Attivabile per almeno 6 mesi</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Frequenza</span>
            </div>
            <p className="text-[14px] text-slate-700">{plan.frequenza}</p>
          </div>
        </div>

        <Section title="Per chi è">
          <p className="text-[14px] text-slate-700 leading-relaxed">{plan.perChi}</p>
        </Section>

        <Section title="Obiettivo del piano">
          <p className="text-[14px] text-slate-700 leading-relaxed">{plan.obiettivo}</p>
        </Section>

        <Section title="Cosa comprende">
          <BulletList items={plan.comprende} />
        </Section>

        <Section title="Cosa fa il team Evolution PRO">
          <BulletList items={plan.cosaFaIlTeam} />
        </Section>

        <Section title="Cosa devi fare tu">
          <div className="flex items-start gap-2.5 mb-2 text-slate-400">
            <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-[12px] uppercase tracking-widest font-semibold">Il tuo ruolo</span>
          </div>
          <BulletList items={plan.cosaFaIlPartner} />
        </Section>

        <Section title="Cosa non comprende">
          <BulletList items={plan.nonComprende} tone="no" />
        </Section>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-widest">Risultato atteso</span>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed">{plan.risultatoAtteso}</p>
        </div>

        {locked ? (
          <div className="bg-slate-900 rounded-2xl p-5 flex items-start gap-3">
            <Lock className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[15px] font-semibold text-white">Disponibile al termine dei 12 mesi</p>
              <p className="text-[13px] text-slate-400 mt-1">
                Scala si attiva quando hai completato il Protocollo EVO
                {unlockInfo && unlockInfo.unlock_date ? ` (dal ${unlockInfo.unlock_date})` : ""}.
              </p>
            </div>
          </div>
        ) : requested ? (
          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-[15px] font-semibold text-white">Richiesta registrata</p>
            <p className="text-[13px] text-slate-400 mt-1">
              Il team ti contatta per completare l'attivazione di {plan.name}.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-white">Attiva {plan.name}</p>
              <p className="text-[13px] text-slate-400 mt-0.5">
                {plan.priceLabel} · Attivabile per almeno 6 mesi.
              </p>
            </div>
            <button
              onClick={activate}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-yellow-400 text-slate-900 hover:bg-yellow-300 disabled:opacity-50 transition flex-shrink-0"
            >
              {busy ? "..." : "Attiva questo piano"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
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
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <section className="overflow-hidden rounded-xl border border-yellow-200 bg-white shadow-[0_0_24px_rgba(250,204,21,0.12)] mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.92fr]">
            <div className="p-6 sm:p-8">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
                Dopo i 12 mesi
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-2">
                Hai costruito il sistema. Ora va mantenuto, ottimizzato e fatto crescere.
              </h1>
              <p className="text-[15px] text-slate-600 leading-relaxed mt-4 max-w-2xl">
                Le soluzioni post 12 mesi non sono un nuovo metodo e non sostituiscono il Protocollo EVO.
                Servono a scegliere il livello di supporto piu' adatto allo stato reale del tuo sistema:
                recupero, continuita', crescita o espansione.
              </p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">La scelta non e' “comprare un piano”.</p>
                <p className="text-[13px] text-slate-600 leading-relaxed mt-1">
                  E' decidere con lucidita' cosa serve adesso: rimettere ordine, mantenere il sistema,
                  crescere con piu' supporto o lavorare su una vera espansione.
                </p>
              </div>
            </div>
            <div className="relative min-h-[280px]">
              <img
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1100&q=80"
                alt="Dashboard di crescita e analisi dati"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              <div className="absolute left-5 right-5 bottom-5 rounded-xl bg-slate-950/55 backdrop-blur border border-white/80 p-4">
                <p className="text-sm font-bold text-white">Dopo il lancio contano i dati.</p>
                <p className="text-[13px] leading-relaxed text-white font-semibold mt-1">
                  Scala serve a non procedere a sensazione quando il sistema inizia a muoversi.
                </p>
              </div>
            </div>
          </div>
        </section>

        {locked && (
          <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-[14px] font-semibold text-slate-900">Scala si apre al termine dei 12 mesi</p>
            <p className="text-[13px] text-slate-600 mt-0.5">
              È il livello successivo, riservato a chi ha completato il Protocollo EVO.
              {elig && elig.months_remaining ? ` Mancano circa ${elig.months_remaining} mesi` : ""}
              {elig && elig.unlock_date ? ` · sblocco dal ${elig.unlock_date}` : ""}. Intanto puoi
              vedere cosa include ogni piano.
            </p>
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {CONTINUITY_POINTS.map((point) => (
            <ContinuityPoint key={point.title} point={point} />
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
              Se ti fermi
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "Il sistema resta online, ma rischia di perdere ritmo.",
                "Le ottimizzazioni dipendono solo da te.",
                "Contenuti, live e funnel possono diventare discontinui.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <X className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-white p-5 shadow-[0_0_18px_rgba(250,204,21,0.10)]">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-yellow-600">
              Se continui a scalare
            </p>
            <ul className="mt-3 space-y-2">
              {[
                "Mantieni un team che guarda numeri, contenuti e vendite.",
                "Scegli il livello di supporto piu' adatto alla fase.",
                "Trasformi il lavoro dei 12 mesi in una crescita piu' ordinata.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
            Soluzioni post 12 mesi
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 mt-1">Quattro modi per continuare con ordine</h2>
          <p className="text-sm text-slate-500 mt-1">
            Ogni soluzione e' attivabile per almeno 6 mesi. Cambia il livello di supporto, non il metodo:
            si parte sempre dai dati e dallo stato reale del sistema.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} onOpen={setSelectedId} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EvoSPage;
