import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Facebook,
  Film,
  Image,
  Link2,
  Lock,
  Megaphone,
  Mic2,
  PenLine,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
} from "lucide-react";

const APPS = [
  {
    name: "Canva",
    icon: Image,
    status: "Da collegare",
    role: "Creativita' statiche, caroselli e visual ads.",
    action: "Prepara template visual",
  },
  {
    name: "HeyGen",
    icon: Video,
    status: "Da collegare",
    role: "Avatar e video ad con presentatore.",
    action: "Genera brief video",
  },
  {
    name: "ElevenLabs",
    icon: Mic2,
    status: "Da collegare",
    role: "Voiceover per video ads e varianti audio.",
    action: "Prepara script voce",
  },
  {
    name: "Clideo / CapCut",
    icon: Film,
    status: "Da collegare",
    role: "Montaggio rapido, sottotitoli e versioni verticali.",
    action: "Crea brief editing",
  },
];

const APPROVALS = [
  {
    title: "Aumentare budget campagna",
    owner: "Claude Campaign Manager",
    risk: "Impatta spesa reale",
    status: "Richiede approvazione Claudio",
  },
  {
    title: "Pubblicare nuova creativita'",
    owner: "Content Studio",
    risk: "Impatta brand e percezione",
    status: "Richiede approvazione Claudio",
  },
  {
    title: "Mettere in pausa ads con CPL alto",
    owner: "Meta Business Connect",
    risk: "Riduce traffico immediato",
    status: "Richiede approvazione Claudio",
  },
];

function Panel({ children, className = "" }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title, children }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-slate-900 mt-0.5">{title}</h2>
        {children && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{children}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{hint}</p>
    </div>
  );
}

export function AcqCampaignsPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="bg-white border border-yellow-300 rounded-xl p-6 shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Acquisizione</p>
            <h1 className="text-3xl font-semibold text-slate-900 mt-1">Campagne Ads</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
              Qui colleghiamo traffico, creativita' e decisioni operative. Meta misura, Claude propone, il Content Studio produce, Claudio approva.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3">
            <ShieldCheck className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-sm font-semibold">Approvazione manuale obbligatoria</p>
              <p className="text-xs text-slate-300">Nessuna spesa o pubblicazione automatica.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <Panel className="xl:col-span-2">
          <SectionTitle icon={Facebook} eyebrow="Step 1" title="Meta Business Connect">
            Collegamento previsto a Business Manager, Ad Account, Pixel e Conversions API. In questa fase prepariamo il controllo operativo senza usare token reali.
          </SectionTitle>

          <div className="grid md:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Stato" value="Non collegato" hint="Setup API da fare" />
            <MetricCard label="Ad Account" value="Da scegliere" hint="Business Manager" />
            <MetricCard label="Pixel / CAPI" value="Da verificare" hint="Tracking conversioni" />
            <MetricCard label="Regola" value="Read-first" hint="Prima lettura dati, poi gestione" />
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Permessi previsti</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Prima fase: lettura campagne, spesa, click, lead e conversioni. Seconda fase: proposte di modifica preparate da Claude, applicate solo dopo conferma manuale.
                </p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Target} eyebrow="Obiettivo" title="4 partnership/mese">
            Le ads non vanno giudicate sui lead, ma sulla capacita' di alimentare Blueprint, call e contratti.
          </SectionTitle>
          <div className="space-y-3">
            {[
              "Costo per lead",
              "Costo per Blueprint",
              "Costo per call prenotata",
              "Costo per partnership",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{item}</span>
                <span className="text-xs font-semibold text-slate-400">da tracciare</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <Panel>
          <SectionTitle icon={Bot} eyebrow="Step 2" title="Claude Campaign Manager">
            Claude analizza, propone e prepara. Claudio decide. Questo mantiene velocita' senza perdere controllo sui soldi.
          </SectionTitle>

          <div className="space-y-3">
            {[
              ["Analisi settimanale", "Legge CPL, CTR, click checkout, acquisti Blueprint e identifica il collo di bottiglia."],
              ["Azioni suggerite", "Propone pausa campagna, nuovo hook, nuovo pubblico o redistribuzione budget."],
              ["Copy e hook", "Genera varianti ads coerenti con target professionisti poco digitali."],
              ["Checklist approvazione", "Ogni modifica esce come proposta da validare prima dell'esecuzione."],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3 rounded-lg border border-slate-100 p-3">
                <Sparkles className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={ClipboardList} eyebrow="Controllo" title="Coda approvazioni">
            Le azioni sensibili vengono preparate, ma restano ferme finche' Claudio non approva.
          </SectionTitle>

          <div className="space-y-3">
            {APPROVALS.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.owner} · {item.risk}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                    Manuale
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2">{item.status}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle icon={PlayCircle} eyebrow="Step 3" title="Content Studio">
          Le app creative diventano una catena di produzione: brief, asset, approvazione, pubblicazione su Meta.
        </SectionTitle>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {APPS.map((app) => (
            <div key={app.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <app.icon className="w-5 h-5 text-blue-700" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                  {app.status}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mt-4">{app.name}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed min-h-[48px]">{app.role}</p>
              <button className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 transition">
                {app.action} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid xl:grid-cols-3 gap-5">
        <Panel>
          <SectionTitle icon={PenLine} eyebrow="Workflow" title="Da idea ad asset" />
          <ol className="space-y-3">
            {["Claude genera angoli e hook", "Claudio approva direzione", "Content Studio crea asset", "Claudio approva asset finale", "Asset pronto per Meta"].map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center text-xs font-semibold">{index + 1}</span>
                <span className="text-sm text-slate-700">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <SectionTitle icon={Megaphone} eyebrow="Campagne" title="Regole anti-spreco" />
          <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
            <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> Ogni campagna deve avere UTM e obiettivo chiaro.</p>
            <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> Ogni creativita' deve collegarsi a un collo di bottiglia.</p>
            <p className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> Budget e pubblicazione restano manuali.</p>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={AlertTriangle} eyebrow="Prossimo cablaggio" title="Integrazioni API" />
          <p className="text-sm text-slate-600 leading-relaxed">
            Quando colleghiamo Meta Business servono Business Manager, Ad Account, Pixel, token e permessi. Per Canva, HeyGen ed ElevenLabs useremo connettori dedicati o API dove disponibili.
          </p>
          <a
            href="/admin/pipeline"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            Torna al CRM Acquisizione <ExternalLink className="w-4 h-4" />
          </a>
        </Panel>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-start gap-3">
          <BadgeCheck className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Principio operativo</p>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed">
              Ciak deve macinare denaro senza bruciare budget: i dati guidano le decisioni, Claude prepara il lavoro, Claudio approva cio' che impatta soldi e brand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
