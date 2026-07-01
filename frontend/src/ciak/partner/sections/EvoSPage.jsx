import { useState, useEffect } from "react";
import {
  Anchor, TrendingUp, Rocket, ArrowLeft, ArrowRight, Check, X,
  Calendar, Users, Clock, ShieldCheck, Lock,
} from "lucide-react";

/**
 * Scala — programma di continuità in abbonamento, riservato a chi ha completato
 * i 12 mesi del Protocollo EVO. Non è un rinnovo tecnico: è l'accesso al livello
 * successivo. 3 piani (Start / Grow / Scale), permanenza minima 6 mesi.
 *
 * Gating: GET /api/evo-booster/evo-s-eligibility/{partnerId} → se non sono passati
 * 12 mesi, i piani restano visibili ma in sola lettura (CTA bloccata). Se il backend
 * non risponde, la pagina resta sbloccata (non blocchiamo per un errore di rete).
 * CTA "Attiva questo piano" → POST /api/evo-booster/evo-s-checkout (Stripe abbonamento).
 */

const PLANS = [
  {
    id: "start",
    name: "Scala Start",
    price: 297,
    priceLabel: "297 € / mese",
    icon: Anchor,
    beneficio: "Il tuo sistema resta seguito anche dopo i 12 mesi.",
    perChi:
      "Per chi ha completato i 12 mesi e vuole mantenere vivo e aggiornato il sistema, senza tornare a fare tutto da solo.",
    obiettivo:
      "Mantenere il sistema attivo e stabile, con un'ottimizzazione costante e leggera mese dopo mese.",
    comprende: [
      "Monitoraggio mensile dei numeri del funnel.",
      "Una revisione di ottimizzazione ogni mese.",
      "Calendario contenuti tenuto aggiornato.",
      "Supporto via chat con il team.",
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
      "Un sistema che resta in ordine e continua a lavorare, senza perdere ciò che hai costruito. I risultati dipendono anche dalla tua costanza.",
  },
  {
    id: "grow",
    name: "Scala Grow",
    price: 497,
    priceLabel: "497 € / mese",
    icon: TrendingUp,
    popular: true,
    beneficio: "Più contenuti e ottimizzazione attiva per crescere con continuità.",
    perChi:
      "Per chi ha un sistema che già vende e vuole crescere con più contenuti, più ottimizzazione e una spinta strutturata.",
    obiettivo: "Aumentare contatti e vendite in modo graduale e misurabile.",
    comprende: [
      "Tutto ciò che è incluso in Scala Start.",
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
      "Creazione di nuovi prodotti complessi (vedi Scala Scale).",
    ],
    risultatoAtteso:
      "Una crescita graduale di contatti e vendite, costruita su contenuti e ottimizzazioni costanti. Nessun numero è garantito: dipende anche dal mercato e dalla tua esecuzione.",
  },
  {
    id: "scale",
    name: "Scala Scale",
    price: 797,
    priceLabel: "797 € / mese",
    icon: Rocket,
    beneficio: "La spinta completa: advertising, nuovi prodotti e affiancamento strategico.",
    perChi:
      "Per chi ha validato il modello e vuole spingere: ads, nuovi funnel, nuovi prodotti, più entrate.",
    obiettivo: "Scalare il business e diversificare le entrate, con il team al tuo fianco.",
    comprende: [
      "Tutto ciò che è incluso in Scala Grow.",
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
      "Le condizioni per scalare: più traffico, più prodotti, più entrate potenziali. È il piano più ambizioso, ma i risultati dipendono da budget, mercato ed esecuzione.",
  },
];

function PlanCard({ plan, onOpen }) {
  const Icon = plan.icon;
  return (
    <button
      onClick={() => onOpen(plan.id)}
      className={`text-left bg-white rounded-2xl p-5 flex flex-col transition hover:shadow-md ${
        plan.popular ? "border-2 border-yellow-300 shadow-lg shadow-yellow-400/10" : "border border-gray-200 hover:border-slate-300"
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
      <p className="text-2xl font-semibold text-slate-900 mb-0.5">{plan.priceLabel}</p>
      <p className="text-[12px] text-slate-400 mb-3">Permanenza minima 6 mesi</p>
      <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{plan.beneficio}</p>
      <p className="text-[12px] text-slate-500 mb-3">
        <span className="font-semibold text-slate-700">Per chi è:</span> {plan.perChi}
      </p>
      <ul className="space-y-1.5 mb-4 flex-1">
        {plan.comprende.slice(0, 5).map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 leading-snug">
            <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <span className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 group-hover:bg-slate-800 transition">
        Scopri il piano <ArrowRight className="w-4 h-4" />
      </span>
    </button>
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
              <span className="text-[11px] font-semibold uppercase tracking-widest">Permanenza minima</span>
            </div>
            <p className="text-[14px] text-slate-700">6 mesi</p>
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
                {plan.priceLabel} · permanenza minima 6 mesi.
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
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-7">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
            Dopo i 12 mesi
          </span>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-1">Continua a scalare</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl">
            Dopo il percorso non devi tornare a gestire tutto da solo. Scala è il servizio in
            abbonamento che mantiene il sistema seguito, aggiornato e orientato alle vendite.
            Tutti i piani hanno permanenza minima di 6 mesi.
          </p>
        </div>

        {locked && (
          <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-[14px] font-semibold text-slate-900">Scala si apre al termine dei 12 mesi</p>
            <p className="text-[13px] text-slate-600 mt-0.5">
              È il livello successivo, riservato a chi ha completato il Protocollo EVO.
              {elig && elig.months_remaining ? ` Mancano circa ${elig.months_remaining} mesi` : ""}
              {elig && elig.unlock_date ? ` · sblocco dal ${elig.unlock_date}` : ""}. Intanto puoi
              vedere cosa include ogni piano.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <PlanCard key={p.id} plan={p} onOpen={setSelectedId} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EvoSPage;
