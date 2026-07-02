import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Clock,
  Package,
  Tag,
  MessageCircle,
  Gauge,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { BOOSTER_CATALOG, BOOSTER_ORDER } from "../booster/boosterCatalog";

/**
 * Booster EVO — vetrina (stile e-commerce) dei servizi extra attivabili durante
 * i 12 mesi del Protocollo EVO. Vetrina con macro-card → click → pagina dettaglio
 * (/partner/booster-evo/:serviceId). CTA "Richiedi questo Booster" registra la
 * richiesta (POST /api/evo-booster/booster-request) e avvisa il team; se il
 * backend non risponde, fallback al Team di supporto.
 */

const SERVICE_VISUALS = {
  "video-premium": {
    image:
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
    group: "Qualita' percepita",
    promise: "Video piu' professionali per vendere meglio il valore del tuo metodo.",
  },
  "shooting-fotografico": {
    image:
      "https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=900&q=80",
    group: "Qualita' percepita",
    promise: "Immagini tue, coerenti e autorevoli, da usare su sito, funnel e social.",
  },
  "campagne-adv": {
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    group: "Piu' visibilita'",
    promise: "Portare traffico qualificato sul funnel quando il sistema e' pronto.",
  },
  "copywriting-premium": {
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    group: "Vendere meglio",
    promise: "Trasformare pagine ed email in messaggi piu' chiari e persuasivi.",
  },
  "contenuti-social-extra": {
    image:
      "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=900&q=80",
    group: "Piu' visibilita'",
    promise: "Aumentare costanza e qualita' dei contenuti senza fare tutto da solo.",
  },
  "automazioni-ai": {
    image:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
    group: "Delegare operativita'",
    promise: "Far lavorare strumenti e AI sulle attivita' ripetitive del sistema.",
  },
  "sessione-strategica": {
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    group: "Sbloccare decisioni",
    promise: "Uscire da una fase confusa con priorita' e prossime mosse chiare.",
  },
  "setup-tecnico-extra": {
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    group: "Delegare operativita'",
    promise: "Risolvere configurazioni tecniche extra senza rallentare il lancio.",
  },
  "email-marketing-extra": {
    image:
      "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=900&q=80",
    group: "Vendere meglio",
    promise: "Far lavorare meglio la lista con sequenze, newsletter e follow-up.",
  },
  "lead-magnet-extra": {
    image:
      "https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=900&q=80",
    group: "Piu' visibilita'",
    promise: "Creare un ingresso forte per attirare contatti piu' qualificati.",
  },
};

const GROUPS = [
  {
    title: "Voglio piu' visibilita'",
    subtitle: "Per portare piu' persone giuste verso masterclass, funnel e contenuti.",
    ids: ["campagne-adv", "contenuti-social-extra", "lead-magnet-extra"],
  },
  {
    title: "Voglio vendere meglio",
    subtitle: "Per rendere messaggi, email e pagine piu' forti nel momento della decisione.",
    ids: ["copywriting-premium", "email-marketing-extra", "sessione-strategica"],
  },
  {
    title: "Voglio delegare cio' che mi rallenta",
    subtitle: "Per toglierti operativita' tecnica o ripetitiva e proteggere il ritmo del progetto.",
    ids: ["setup-tecnico-extra", "automazioni-ai"],
  },
  {
    title: "Voglio alzare la qualita' percepita",
    subtitle: "Per presentarti meglio quando immagine, video e autorevolezza contano di piu'.",
    ids: ["video-premium", "shooting-fotografico"],
  },
];

const BENEFITS = [
  { icon: Zap, title: "Accelera", text: "Riduci i tempi su una parte specifica senza cambiare percorso." },
  { icon: ShieldCheck, title: "Evita errori", text: "Delega passaggi tecnici o comunicativi che possono frenare il lancio." },
  { icon: Target, title: "Aumenta precisione", text: "Intervieni solo dove serve: traffico, contenuti, copy, email o automazioni." },
  { icon: Gauge, title: "Alza la qualita'", text: "Dai piu' forza alla percezione del tuo metodo e del tuo brand." },
];

function BoosterCard({ item, onOpen }) {
  const Icon = item.icon;
  const visual = SERVICE_VISUALS[item.id];
  return (
    <button
      onClick={() => onOpen(item.id)}
      className="overflow-hidden text-left bg-white rounded-xl border border-gray-200 flex flex-col hover:border-yellow-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition group"
    >
      <div className="relative h-36 bg-slate-100">
        <img src={visual?.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
        <div className="absolute left-3 bottom-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/95">
            <Icon className="w-4 h-4 text-slate-900" />
          </div>
          <span className="rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-900">
            {visual?.group}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[16px] font-semibold text-slate-900 leading-tight">{item.name}</p>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-2 flex-1">
          {visual?.promise || item.beneficio}
        </p>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Ideale se</p>
          <p className="text-[13px] text-slate-700 leading-snug mt-1">{item.idealePer}</p>
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-slate-800 group-hover:text-yellow-700">
          Scopri come funziona <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </button>
  );
}

function BenefitCard({ benefit }) {
  const Icon = benefit.icon;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="w-10 h-10 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-yellow-700" />
      </div>
      <p className="text-sm font-semibold text-slate-900">{benefit.title}</p>
      <p className="text-[13px] leading-relaxed text-slate-600 mt-1">{benefit.text}</p>
    </div>
  );
}

function ServiceGroup({ group, onOpen }) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">{group.title}</h2>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">{group.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.ids.map((id) => (
          <BoosterCard key={id} item={BOOSTER_CATALOG[id]} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function Vetrina({ onOpen }) {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <section className="overflow-hidden rounded-xl border border-yellow-200 bg-white shadow-[0_0_24px_rgba(250,204,21,0.12)]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-6 sm:p-8">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-yellow-600">
                Acceleratori facoltativi
              </span>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight mt-2">
                Servizi extra per dare piu' forza al tuo percorso
              </h1>
              <p className="text-[15px] text-slate-600 leading-relaxed mt-4 max-w-2xl">
                Il Protocollo EVO include gia' costruzione, lancio e accompagnamento. I servizi extra
                esistono perche' ogni partner ha tempi, budget e bisogni diversi: quando vuoi delegare
                una parte, aumentare la qualita' o accelerare un risultato, puoi aggiungere il supporto
                giusto senza cambiare percorso.
              </p>
              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => document.getElementById("servizi-extra-catalogo")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-yellow-300 hover:bg-slate-800 transition"
                >
                  Trova il supporto giusto <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onOpen("sessione-strategica")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-yellow-300 transition"
                >
                  Ho bisogno di capire cosa scegliere
                </button>
              </div>
            </div>
            <div className="relative min-h-[260px]">
              <img
                src="https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=80"
                alt="Team al lavoro su una strategia digitale"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              <div className="absolute left-5 right-5 bottom-5 rounded-xl bg-slate-950/55 backdrop-blur border border-white/80 p-4">
                <p className="text-sm font-bold text-white">Non sono obblighi: sono leve.</p>
                <p className="text-[13px] leading-relaxed text-white font-semibold mt-1">
                  Si attivano solo quando aiutano davvero il tuo obiettivo del momento.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {BENEFITS.map((benefit) => (
            <BenefitCard key={benefit.title} benefit={benefit} />
          ))}
        </section>

        <div id="servizi-extra-catalogo">
          {GROUPS.map((group) => (
            <ServiceGroup key={group.title} group={group} onOpen={onOpen} />
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">
            Tutti i servizi
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Preferisci vedere l'elenco completo? Ogni servizio viene comunque valutato dal team prima
            dell'attivazione, cosi' evitiamo acquisti inutili o fuori fase.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {BOOSTER_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => onOpen(id)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-yellow-300 hover:bg-yellow-50 transition"
              >
                {BOOSTER_CATALOG[id].name}
              </button>
            ))}
          </div>
        </section>
      </div>
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

function Dettaglio({ item, partnerId, onBack, onSupport }) {
  const Icon = item.icon;
  const visual = SERVICE_VISUALS[item.id];
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const request = async () => {
    if (!partnerId) {
      onSupport();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/evo-booster/booster-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: String(partnerId),
          booster_id: item.id,
          booster_name: item.name,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        onSupport();
      }
    } catch (e) {
      onSupport();
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
          <ArrowLeft className="w-4 h-4" /> Servizi extra
        </button>

        <div className="overflow-hidden rounded-xl border border-yellow-200 bg-white mb-6 shadow-[0_0_22px_rgba(250,204,21,0.10)]">
          <div className="relative h-56 bg-slate-100">
            <img src={visual?.image} alt={item.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
            <div className="absolute left-5 bottom-5 right-5">
              <span className="inline-flex rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-900">
                {visual?.group || "Acceleratore"}
              </span>
              <h1 className="text-2xl font-semibold text-white tracking-tight mt-3">{item.name}</h1>
              <p className="text-[14px] text-white/85 leading-relaxed mt-2">{visual?.promise || item.beneficio}</p>
            </div>
          </div>
          <div className="p-5 flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
              <Icon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-slate-400">Perche' valutarlo</p>
              <p className="text-[15px] text-slate-700 leading-relaxed mt-1">{item.beneficio}</p>
            </div>
          </div>
        </div>

        <Section title="A cosa serve">
          <p className="text-[14px] text-slate-700 leading-relaxed">{item.aCosaServe}</p>
        </Section>

        <Section title="Quando ti serve">
          <BulletList items={item.quandoTiServe} />
        </Section>

        <Section title="Cosa comprende">
          <BulletList items={item.comprende} />
        </Section>

        <Section title="Cosa non comprende">
          <BulletList items={item.nonComprende} tone="no" />
        </Section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Package className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Output</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.output}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Tempi</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.tempi}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-widest">Investimento</span>
            </div>
            <p className="text-[13px] text-slate-700 leading-snug">{item.investimento}</p>
          </div>
        </div>

        {done ? (
          <div className="bg-slate-900 rounded-2xl p-5">
            <p className="text-[15px] font-semibold text-white">Richiesta inviata</p>
            <p className="text-[13px] text-slate-400 mt-1">
              Il team ti contatta a breve con un preventivo su misura per «{item.name}».
            </p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[15px] font-semibold text-white">Vuoi valutare questo supporto?</p>
              <p className="text-[13px] text-slate-400 mt-0.5">
                Invia la richiesta al team: ti prepariamo una proposta su misura, senza impegno.
              </p>
            </div>
            <button
              onClick={request}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-yellow-400 text-slate-900 hover:bg-yellow-300 disabled:opacity-50 transition flex-shrink-0"
            >
              <MessageCircle className="w-4 h-4" /> {busy ? "Invio..." : "Richiedi informazioni"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function BoosterEvoPage({ partnerId, basePath = "/partner/booster-evo" }) {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const item = serviceId ? BOOSTER_CATALOG[serviceId] : null;

  const goSupport = () => {
    navigate("/partner/team-ciak");
  };

  if (serviceId && !item) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <button
            onClick={() => navigate(basePath)}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Servizi extra
          </button>
          <p className="text-slate-500">Servizio non trovato.</p>
        </div>
      </div>
    );
  }

  if (item) {
    return (
      <Dettaglio
        item={item}
        partnerId={partnerId}
        onBack={() => navigate(basePath)}
        onSupport={goSupport}
      />
    );
  }

  return <Vetrina onOpen={(id) => navigate(`${basePath}/${id}`)} />;
}

export default BoosterEvoPage;
