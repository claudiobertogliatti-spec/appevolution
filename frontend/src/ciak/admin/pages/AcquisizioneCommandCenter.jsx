import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Database,
  FileSignature,
  Flame,
  ListChecks,
  MapPin,
  PhoneCall,
  Route,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiGet } from "../api";

function fmtDate(value) {
  if (!value) return "Data non registrata";
  try {
    return new Date(value).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Data non registrata";
  }
}

function KpiCard({ icon: Icon, label, value, hint, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-2xl font-semibold text-slate-900 leading-tight">{value}</p>
        </div>
      </div>
      {hint && <p className="text-xs text-slate-500 mt-3 leading-relaxed">{hint}</p>}
    </div>
  );
}

function InfoPanel({ icon: Icon, title, children, tone = "blue" }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-700",
    slate: "border-slate-200 bg-white text-slate-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="text-sm text-slate-600 mt-3 leading-relaxed">{children}</div>
    </div>
  );
}

function PriorityList({ title, description, items, empty, tone = "blue" }) {
  const toneClass = tone === "hot" ? "border-yellow-300 bg-yellow-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border ${toneClass} overflow-hidden`}>
      <div className="p-4 border-b border-slate-200/80">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="p-5 text-sm text-slate-400">{empty}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <Link
              key={item.email}
              to={`/admin/leads/${encodeURIComponent(item.email)}`}
              className="group flex items-center justify-between gap-4 p-4 hover:bg-white transition"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{item.nome || item.email}</p>
                <p className="text-xs text-slate-500 truncate">{item.email}</p>
                <p className="text-xs text-slate-400 mt-1">{item.reason}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-slate-400">{fmtDate(item.updated_at)}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 mt-2">
                  Apri <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AcquisizioneCommandCenter({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/acquisizione-command-center")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const priorityTotal = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.priorities || {}).reduce((sum, items) => sum + (items?.length || 0), 0);
  }, [data]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento command center...</div>;

  const target = data.target || {};
  const funnel = data.funnel || {};
  const priorities = data.priorities || {};
  const routine = data.routine || {};
  const activity = data.activity_today || {};
  const channels = data.channels || {};
  const partnerSalesEngine = data.partner_sales_engine || {};
  const discoveryEngine = data.discovery_engine || {};
  const targetMinimum = target.minimum_monthly || 3;
  const targetOptimal = target.optimal_monthly || target.partnerships_monthly || 4;

  return (
    <div className="p-8 space-y-6">
      <div className="bg-white border border-yellow-300 rounded-xl p-6 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">CRM Acquisizione</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-1">
              Acquisizione Evolution
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
              Progetto pilota madre: minimo {targetMinimum}, ottimale {targetOptimal} ingressi Metodo EVO al mese. Luca coordina contatti, recuperi e report giornaliero.
            </p>
          </div>
          <div className="rounded-xl bg-slate-900 text-white px-5 py-4 min-w-[210px]">
            <p className="text-xs uppercase tracking-widest text-yellow-400 font-semibold">Gap mese</p>
            <p className="text-4xl font-semibold mt-1">{target.gap || 0}</p>
            <p className="text-xs text-slate-300 mt-1">
              {target.partnerships_closed || 0}/{targetOptimal} ingressi Metodo EVO
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4">
        <KpiCard icon={Target} label="Ottimale" value={targetOptimal} hint={`Minimo sostenibile: ${targetMinimum} ingressi Metodo EVO.`} tone="yellow" />
        <KpiCard icon={CheckCircle2} label="Ingressi" value={target.partnerships_closed || 0} hint="Contratti pagati nel mese." tone="green" />
        <KpiCard icon={CreditCard} label="Blueprint" value={funnel.blueprint_purchased || 0} hint="Acquisti da 27 euro nel mese." />
        <KpiCard icon={CalendarClock} label="Call prenotate" value={funnel.call_booked || 0} hint="Sessioni fissate dopo il Blueprint." tone="slate" />
        <KpiCard icon={PhoneCall} label="Call fatte" value={funnel.call_done || 0} hint="Call concluse e pronte per proposta." tone="slate" />
        <KpiCard icon={FileSignature} label="Trattative" value={funnel.proposals_open || 0} hint="Proposte inviate o viste." tone="blue" />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Ponte operativo</p>
            <h2 className="text-xl font-semibold text-slate-900">Ciak Discovery -> Systeme Evolution</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
          <KpiCard icon={Database} label="Scoperti" value={discoveryEngine.new_leads_total || 0} hint="Lead in discovery_leads." tone="slate" />
          <KpiCard icon={Flame} label="Hot" value={discoveryEngine.hot_leads_total || 0} hint="Score almeno 75." tone="yellow" />
          <KpiCard icon={MapPin} label="Google Places" value={discoveryEngine.google_places_total || 0} hint="Professionisti offline trovati." tone="green" />
          <KpiCard icon={ListChecks} label="Coda Systeme" value={discoveryEngine.queued_systeme_pending || 0} hint="Source ammesse, pronte import." tone="blue" />
          <KpiCard icon={CheckCircle2} label="Importati" value={discoveryEngine.queued_systeme_imported || 0} hint="Gia' entrati in Systeme." tone="green" />
          <KpiCard icon={AlertTriangle} label="Bloccati" value={discoveryEngine.lista_fredda_pending_blocked || 0} hint="Lista fredda esclusa da policy." tone="slate" />
        </div>
      </div>

      {data.bottlenecks?.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {data.bottlenecks.map((b) => (
            <div key={b.title} className="bg-white border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm font-semibold">{b.title}</p>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{b.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <InfoPanel icon={ListChecks} title="Routine Luca" tone="yellow">
          <p>
            {routine.daily_new_contacts || 20} nuovi contatti al giorno, {routine.weekly_new_contacts || 100} a settimana, {routine.monthly_new_contacts || 400} al mese.
          </p>
          <p className="mt-2 text-slate-900 font-semibold">
            Oggi: {activity.new_leads || 0} nuovi lead · {activity.diagnostics_completed || 0} diagnosi (target {activity.target_new_contacts || 20} contatti)
          </p>
          <div className="mt-3 space-y-2">
            {(routine.today || []).map((item) => (
              <div key={item.id} className="rounded-lg bg-white/70 border border-white px-3 py-2">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.owner} · {item.metric}</p>
              </div>
            ))}
          </div>
        </InfoPanel>
        <InfoPanel icon={ShieldCheck} title="Canali ammessi" tone="blue">
          <ul className="space-y-1">
            {(channels.allowed || []).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </InfoPanel>
        <InfoPanel icon={AlertTriangle} title="Da non fare ora" tone="slate">
          <ul className="space-y-1">
            {(channels.blocked || []).map((item) => <li key={item}>- {item}</li>)}
          </ul>
        </InfoPanel>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Da lavorare oggi</h2>
          <p className="text-sm text-slate-500 mt-1">
            {priorityTotal} contatti con potenziale economico immediato.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold">
          <TrendingUp className="w-4 h-4" />
          Priorita' vendite
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        {/* La card "Checkpoint fatto, 8 domande mancanti" e' stata rimossa il 4/9/2026:
            il Checkpoint e' ritirato dal funnel vivo, quella lista mostrava solo i
            fantasmi di giugno. Il backend non espone piu' checkpoint_no_diagnostic. */}
        <PriorityList
          title="8 domande completate, Blueprint non acquistato"
          description="Hanno dato dati reali. Qui serve spingere il valore del Blueprint prima di qualsiasi investimento."
          items={priorities.diagnostic_no_purchase || []}
          empty="Nessun lead fermo dopo le 8 domande."
        />
        <PriorityList
          title="Checkout cliccato, pagamento mancante"
          description="Sono i recuperi piu' caldi: hanno mostrato intenzione economica."
          items={priorities.clicked_no_purchase || []}
          empty="Nessun checkout caldo da recuperare."
          tone="hot"
        />
        <PriorityList
          title="Blueprint acquistato, call non prenotata"
          description="Qui il rischio e' perdere slancio. La call deve arrivare subito."
          items={priorities.purchased_no_call || []}
          empty="Tutti gli acquirenti Blueprint hanno una call o sono gia' oltre."
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Duplicazione partner</p>
        <h2 className="text-xl font-semibold text-slate-900 mt-1">Motore Vendite Partner</h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          {partnerSalesEngine.summary || "Il sistema validato su Evolution viene adattato al mercato del partner."}
        </p>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-sm font-semibold text-slate-900">Resta stabile</p>
            <p className="text-sm text-slate-500 mt-1">{(partnerSalesEngine.stable_parts || []).join(" · ")}</p>
          </div>
          <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Si adatta</p>
            <p className="text-sm text-slate-600 mt-1">{(partnerSalesEngine.adapted_parts || []).join(" · ")}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="font-semibold">Regola operativa</p>
            <p className="text-sm text-slate-300 mt-1">
              Prima lavori recuperi caldi e Blueprint, poi alimenti ogni giorno la pipeline con 20 nuovi contatti mirati.
            </p>
          </div>
        </div>
        <Link
          to="/admin/acq-campagne-ads"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          Apri Campagne Ads <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
