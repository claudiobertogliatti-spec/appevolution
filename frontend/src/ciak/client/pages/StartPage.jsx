import { useEffect, useState } from "react";
import {
  ArrowRight, Check, LockKeyhole, Loader2, Gift, Wallet, Timer, ShieldCheck,
  Zap, Camera, ClipboardList, Bot, Mic,
} from "lucide-react";
import { clientGet, clientPost, journeyGet } from "../api";
import { PRICING } from "../../pricing";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

const NAVY_GRADIENT = "linear-gradient(158deg,#0D2952 0%,#101326 74%)";

const STATO_LABEL = {
  done: "completato",
  in_progress: "in corso",
  pending: "in attesa",
  blocked: "bloccato",
  skipped: "saltato",
};

function StatoBadge({ status }) {
  if (status === "done") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <Check className="h-3 w-3" aria-hidden="true" />
        {STATO_LABEL.done}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-yellow-400">
        {STATO_LABEL.in_progress}
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {STATO_LABEL[status] || STATO_LABEL.pending}
    </span>
  );
}

// Countdown ONESTO: guidato dalla scadenza reale (bonus_expires_at = call_done + 48h).
function Countdown({ deadline }) {
  const target = new Date(deadline).getTime();
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(left / 1000);
  const pad = (n) => String(n).padStart(2, "0");
  const cells = [
    { n: pad(Math.floor(s / 3600)), l: "ore" },
    { n: pad(Math.floor((s % 3600) / 60)), l: "min" },
    { n: pad(s % 60), l: "sec" },
  ];
  return (
    <span className="inline-flex gap-2" aria-label="tempo rimanente">
      {cells.map((c) => (
        <span key={c.l} className="min-w-[52px] rounded-lg bg-slate-900 px-1.5 py-1.5 text-center tabular-nums">
          <span className="block text-xl font-extrabold leading-none text-white">{c.n}</span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-widest text-slate-400">{c.l}</span>
        </span>
      ))}
    </span>
  );
}

function FeatItem({ children, dark }) {
  return (
    <li className="flex items-start gap-3 text-sm leading-snug">
      <span
        className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[12px] font-extrabold ${
          dark ? "bg-yellow-400/20 text-yellow-400" : "bg-emerald-500/12 text-emerald-600"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span className={dark ? "text-slate-200" : "text-slate-700"}>{children}</span>
    </li>
  );
}

const BONUS_INCLUDE = [
  "Scegliere la nicchia giusta",
  "Definire lo studente ideale",
  "Struttura a moduli e lezioni",
  "Il funnel: attira, nutri, converti",
  "Prezzo e offerte oneste",
  "Il lancio e la checklist finale",
];

const PILLARS = [
  { Icon: Zap, t: "Col metodo giusto, è veloce", d: "Sai già cosa dire e in che ordine: registrare diventa la parte breve. E Ciak è fatto per andare spediti, senza giri a vuoto." },
  { Icon: Camera, t: "Zero attrezzatura costosa", d: "Niente studio né telecamere da migliaia di euro. Basta quello che hai già. La qualità che serve, non quella che si sfoggia." },
  { Icon: ClipboardList, t: "Non parti da zero", d: "Template e script già pronti, e gli argomenti su cui costruire. Riempi una traccia con la tua esperienza, non un foglio bianco." },
  { Icon: Bot, t: "Agenti AI attivi 24 ore su 24", d: "Ti danno una mano quando vuoi tu — la sera, all'alba, tra un cliente e l'altro. Ti organizzi come è meglio per te, senza aspettare nessuno." },
  { Icon: Mic, t: "La voce resta la tua", d: "L'AI non fa tutto: gli script li personalizzi nel tuo stile. Il metodo fa risparmiare tempo, il tuo modo di dire le cose resta tuo." },
];

const REASSURANCE = [
  { Icon: Wallet, t: "Credito garantito", d: "I 390€ di Ciak Start si scalano interi se poi passi alla Partnership. Non paghi due volte." },
  { Icon: ArrowRight, t: "Rateizzi tu", d: "Con Klarna, già dentro il checkout, dividi l'importo senza chiedere niente a nessuno." },
  { Icon: Timer, t: "48 ore vere", d: "Il bonus scade davvero allo scadere delle 48h dalla call. Nessun finto conto alla rovescia." },
  { Icon: ShieldCheck, t: "Onestà", d: "Ti diamo il metodo, non promesse di guadagno. I risultati dipendono dal mercato e dal tuo impegno." },
];

export function StartPage({ dashboard }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [journey, setJourney] = useState(null);
  const [journeyError, setJourneyError] = useState("");
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [deliverables, setDeliverables] = useState([]);

  const access = dashboard.client?.access_level;
  const active = access === "cliente_start" || access === "partner";
  // Modello Blueprint GRATUITO "tutto automatico": dopo la call di consegna
  // (call_done) Ciak Start e' acquistabile dal cliente, senza `offer_decision`
  // manuale del team. Allineato ai gate backend allentati.
  const callDone = dashboard.diagnostic?.state === "call_done";
  const showStartOffer = active || callDone;
  const startPrice = dashboard.pricing?.ciak_start?.amount_cents ?? PRICING.start.cents;
  const partnershipPrice = dashboard.pricing?.partnership?.amount_cents ?? PRICING.partnership.cents;
  const upgradePrice = dashboard.pricing?.partnership?.upgrade_from_start_cents ?? (partnershipPrice - startPrice);
  const clientId = dashboard.client?.id;
  const primo = (dashboard.client?.name || "").trim().split(" ")[0] || "";
  // Instradamento dal Blueprint: se l'analisi consiglia la Partnership, la sales
  // page mette la Partnership come percorso consigliato (coerente con la CTA del
  // Blueprint). Altrimenti resta Ciak Start come primo passo.
  const recPartnership = dashboard.diagnostic?.recommended_offer === "partnership";

  // Finestra bonus 48h (guida videocorso in omaggio): countdown REALE dal backend.
  const offer = dashboard.offer || {};
  const bonusAttiva = !!offer.bonus_guida_attiva && !!offer.bonus_expires_at;
  const guidaValore = offer.guida_valore_cents || 4900;

  // Il percorso e' la journey vera, non `start_progress`.
  useEffect(() => {
    if (!active || !clientId) return undefined;
    let annullato = false;
    setJourneyLoading(true);
    journeyGet(`/operativo/state/${clientId}`)
      .then((data) => {
        if (!annullato) {
          setJourney(data);
          setJourneyError("");
        }
      })
      .catch((e) => {
        if (!annullato) setJourneyError(e.message || "Percorso non disponibile");
      })
      .finally(() => {
        if (!annullato) setJourneyLoading(false);
      });
    return () => {
      annullato = true;
    };
  }, [active, clientId]);

  useEffect(() => {
    if (!active) return;
    clientGet("/start/deliverables")
      .then((data) => setDeliverables(data.items || []))
      .catch(() => setDeliverables([]));
  }, [active, clientId]);

  const steps = journey?.steps || [];
  const lockedSteps = journey?.locked_steps || [];
  const completati = steps.filter((s) => s.status === "done").length;

  async function handleCheckout() {
    try {
      setLoading(true);
      setError("");
      const data = await clientPost("/start/checkout");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("Checkout non disponibile");
    } catch (e) {
      setError(e.message || "Errore avvio checkout");
    } finally {
      setLoading(false);
    }
  }

  // ─── STATO VENDITA (post-call, non ancora cliente) ─────────────────────────
  if (showStartOffer && !active) {
    return (
      <div className="space-y-6">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl text-white" style={{ background: NAVY_GRADIENT }}>
          <div className="relative z-10 p-7 sm:p-9">
            {primo ? <p className="text-sm font-semibold text-slate-300">Ciao {primo},</p> : null}
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-300">
              <span className="h-0.5 w-6 bg-yellow-400" /> Il tuo Blueprint è pronto
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Hai la mappa.<br />Ora costruiamo <span className="text-yellow-400">il percorso.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-200">
              Nella call abbiamo visto dove sei e dove puoi arrivare. Il passo successivo è trasformare
              quell'analisi in qualcosa di concreto — con metodo, senza doverlo capire da solo.
            </p>
          </div>
        </section>

        {/* PERCORSO CONSIGLIATO dalla tua analisi (instradamento del Blueprint) */}
        {recPartnership ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl px-5 py-4 text-center text-white" style={{ background: NAVY_GRADIENT }}>
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <span className="h-0.5 w-6 bg-yellow-400" /> Dalla tua analisi, il percorso consigliato per te è la <span className="text-yellow-400">Partnership Evolution PRO</span>
            </span>
          </div>
        ) : bonusAttiva ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl bg-yellow-400 px-5 py-4 text-center text-slate-900">
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <Gift className="h-4 w-4" /> Guida in omaggio attivando Ciak Start — l'offerta scade tra
            </span>
            <Countdown deadline={offer.bonus_expires_at} />
          </div>
        ) : null}

        {/* DUE TIER */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* START */}
          <section className={`relative flex flex-col rounded-2xl bg-white p-7 shadow-[0_18px_50px_rgba(16,19,38,0.10)] ${recPartnership ? "border border-slate-200" : "border-2 border-yellow-400"}`} style={{ order: recPartnership ? 2 : 1 }}>
            <span className="absolute -top-3 left-6 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-900 shadow">
              {recPartnership ? "Se preferisci partire leggero" : "Consigliato per iniziare"}
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ciak Start</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Le fondamenta, fatte bene</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Il primo passo concreto: posizionamento, brand di base, presenza online e un piano di contenuti pronto da seguire.
            </p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900">{euro(startPrice)}</span>
              <span className="text-sm font-semibold text-slate-500">una tantum</span>
            </div>
            <ul className="mt-6 flex flex-col gap-3">
              <FeatItem>Direzione di posizionamento chiara</FeatItem>
              <FeatItem>Basi del brand e sistemazione dei profili social</FeatItem>
              <FeatItem>Sito vetrina semplice</FeatItem>
              <FeatItem>Strategia + calendario dei contenuti</FeatItem>
              <FeatItem>Revisione finale e prontezza alla Partnership</FeatItem>
            </ul>
            {bonusAttiva ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-yellow-400 text-slate-900">
                  <Gift className="h-5 w-5" />
                </span>
                <p className="text-[13px] leading-snug text-slate-700">
                  <b className="font-extrabold">In omaggio: la guida "Come creare un videocorso che vende"</b>{" "}
                  (40 pagine). <span className="text-slate-500">Valore {euro(guidaValore)} — inclusa solo se attivi entro 48h.</span>
                </p>
              </div>
            ) : null}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 text-[15px] font-bold text-slate-900 shadow-[0_8px_22px_rgba(251,192,2,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(251,192,2,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Apro il checkout..." : "Attiva Ciak Start"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                I {euro(startPrice)} restano un credito garantito verso la Partnership. Puoi rateizzare con Klarna.
              </p>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          </section>

          {/* PARTNERSHIP TURBO */}
          <section className={`relative flex flex-col rounded-2xl p-7 text-white ${recPartnership ? "border-2 border-yellow-400" : "border border-transparent"}`} style={{ background: NAVY_GRADIENT, order: recPartnership ? 1 : 2 }}>
            <span className={`absolute -top-3 left-6 rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide shadow ${recPartnership ? "bg-yellow-400 text-slate-900" : "bg-slate-900 text-yellow-400"}`}>
              {recPartnership ? "Consigliato per te" : "Il turbo"}
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Partnership Evolution PRO</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white">Il sistema completo, con noi</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Tutto il metodo costruito insieme, dall'inizio al lancio: non solo le fondamenta, ma l'accademia che vende.
            </p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-white">{euro(partnershipPrice)}</span>
              <span className="text-sm font-semibold text-slate-300">tutto incluso</span>
            </div>
            <ul className="mt-6 flex flex-col gap-3">
              <FeatItem dark>Tutto ciò che c'è in Ciak Start</FeatItem>
              <FeatItem dark>Masterclass e videocorso costruiti con te</FeatItem>
              <FeatItem dark>Sistema di vendita completo (funnel + email)</FeatItem>
              <FeatItem dark>Lancio guidato e accompagnamento</FeatItem>
              <FeatItem dark>Revisione continua del percorso</FeatItem>
            </ul>
            <div className="mt-6 border-t border-white/10 pt-6">
              <span className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-white/25 px-6 text-[15px] font-bold text-white/90">
                Ne parliamo insieme &nbsp;→
              </span>
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-300">
                Hai già Ciak Start? L'upgrade è di {euro(upgradePrice)}: il credito dei {euro(startPrice)} è già scalato.
              </p>
            </div>
          </section>
        </div>

        {/* BONUS SPOTLIGHT — copertina guida */}
        {bonusAttiva ? (
          <section className="grid items-center gap-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_12px_40px_rgba(16,19,38,0.06)] sm:p-9 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex justify-center [perspective:1600px]">
              <div className="relative rounded-[4px_8px_8px_4px] shadow-[-26px_30px_60px_rgba(16,19,38,0.34)] [transform:rotateY(-20deg)_rotateX(4deg)]">
                <img
                  src="/ciak/guida-videocorso-cover.png"
                  alt='Copertina della guida "Come creare un videocorso che vende davvero"'
                  className="block w-[240px] max-w-full rounded-[4px_8px_8px_4px]"
                  loading="lazy"
                />
                <span className="pointer-events-none absolute inset-y-0 left-0 w-4 rounded-l-[4px] bg-gradient-to-r from-black/30 to-transparent" />
              </div>
            </div>
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <span className="h-0.5 w-6 bg-yellow-400" /> Il tuo regalo di benvenuto
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                "Come creare un videocorso <span className="text-yellow-500">che vende davvero"</span>
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
                40 pagine, metodo passo-passo: dalla scelta della nicchia al lancio. La stessa logica di Evolution PRO,
                messa nero su bianco. È tua in omaggio se attivi Ciak Start entro 48 ore.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {BONUS_INCLUDE.map((v) => (
                  <li key={v} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-slate-900 text-[11px] font-extrabold text-yellow-400">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {v}
                  </li>
                ))}
              </ul>
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-dashed border-yellow-500 bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-600">Incluso gratis</span>
                <span className="text-sm text-slate-500">
                  Valore <b className="text-slate-900 line-through">{euro(guidaValore)}</b> — solo entro 48h dalla call
                </span>
              </div>
            </div>
          </section>
        ) : null}

        {/* REGISTRAZIONE — obiezione "porta via troppo tempo" */}
        <section className="rounded-2xl border border-slate-200 bg-white p-7">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <span className="h-0.5 w-6 bg-yellow-400" /> «Ce la faccio?» Sì.
            </p>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              La paura è la parte lunga.<br /><span className="text-yellow-500">La registrazione no.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
              Immagini mesi di lavoro, tecnica da imparare, serate perse. Non è così — ed ecco perché.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-yellow-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-extrabold leading-tight text-slate-900">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4 rounded-2xl p-6 text-white" style={{ background: NAVY_GRADIENT }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-yellow-400 text-slate-900">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <p className="text-[15px] leading-relaxed text-slate-200">
              <b className="font-extrabold text-white">La tua parte è piccola, ed è quella che sai già fare:</b>{" "}
              mettere la tua competenza davanti alla telecamera. Al peso — struttura, montaggio, funnel — pensiamo noi.
            </p>
          </div>
        </section>

        {/* REASSURANCE */}
        <section className="rounded-2xl border border-slate-200 bg-white p-7">
          <h2 className="text-center text-xl font-extrabold tracking-tight text-slate-900">Come funziona, in chiaro</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {REASSURANCE.map(({ Icon, t, d }) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-yellow-400">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3.5 text-sm font-bold text-slate-900">{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
            Ciak Start {euro(startPrice)} · Partnership {euro(partnershipPrice)} (upgrade da Start {euro(upgradePrice)}, credito incluso).
            Nessun risultato economico è garantito: il metodo è lo strumento, i risultati dipendono dal mercato e dal tuo impegno.
          </p>
        </section>
      </div>
    );
  }

  // ─── STATO BLOCCATO (call non ancora fatta) ────────────────────────────────
  if (!active) {
    return (
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Percorso ancora chiuso</h1>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p>Ciak Start si sblocca dopo la call di consegna del Blueprint.</p>
          </div>
        </section>
      </div>
    );
  }

  // ─── STATO CLIENTE ATTIVO (percorso + materiali) ───────────────────────────
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-yellow-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Fondazioni in corso</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Ciak Start sistema social, brand base, primo posizionamento, sito vetrina, calendario e strategia contenuti.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Il tuo percorso</h2>
          {steps.length ? (
            <p className="text-sm text-slate-500">
              {completati} di {steps.length} completati
            </p>
          ) : null}
        </div>

        {journeyLoading && !steps.length ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carico il percorso...
          </p>
        ) : null}

        {journeyError && !steps.length ? (
          <p className="mt-4 text-sm text-slate-500">
            Il percorso non è ancora disponibile. Riprova fra qualche minuto: se resta così, scrivici.
          </p>
        ) : null}

        {steps.length ? (
          <ol className="mt-4 space-y-2">
            {steps.map((step) => (
              <li
                key={step.step_id}
                className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                  step.status === "in_progress" ? "border-yellow-300 bg-yellow-50/60" : "border-slate-200"
                }`}
              >
                <span className="font-medium text-slate-800">{step.label || step.step_id}</span>
                <StatoBadge status={step.status} />
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      {deliverables.length ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Materiali approvati</h2>
          <p className="mt-1 text-sm text-slate-500">Qui compaiono soltanto gli output revisionati dal team.</p>
          <div className="mt-4 space-y-3">
            {deliverables.map((item) => (
              <details key={item.type} className="rounded-lg border border-slate-200 p-4">
                <summary className="cursor-pointer font-semibold text-slate-800">
                  {item.type === "content_plan_90d" ? "Ciclo contenuti — 60 giorni (ripetibile)" : "Verifica finale Partnership"}
                </summary>
                {item.type === "content_plan_90d" ? (
                  <div className="mt-4 space-y-5">
                    {item.calendar?.ritmo ? (
                      <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm leading-relaxed text-slate-700">
                        {item.calendar.ritmo}
                      </p>
                    ) : null}
                    {(item.calendar?.fasi || []).map((fase) => (
                      <div key={fase.fase}>
                        <h3 className="text-sm font-semibold text-slate-900">{fase.fase}</h3>
                        {fase.obiettivo ? (
                          <p className="mt-0.5 text-xs text-slate-500">{fase.obiettivo}</p>
                        ) : null}
                        <ul className="mt-2 space-y-2">
                          {(fase.giorni || []).map((day) => (
                            <li key={`${fase.fase}-${day.giorno}`} className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                              <span className="font-semibold">Giorno {day.giorno} · {day.formato}</span> — {day.tema}
                              <p className="mt-1 text-xs text-slate-500">{day.come_farlo} · CTA: {day.cta}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.note}</p>
                )}
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {lockedSteps.length ? (
        <section className="rounded-xl border border-slate-200 p-6 text-white" style={{ background: NAVY_GRADIENT }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Con la Partnership</p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Altri {lockedSteps.length} step, quando decidi di continuare
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Masterclass, videocorso, sistema di vendita e lancio. Quello che compili adesso non si perde:
            resta dentro e riparte da dove sei arrivato — <span className="font-semibold text-white">e i tuoi {euro(startPrice)} di Ciak Start sono già scalati sul prezzo della Partnership.</span>
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {lockedSteps.map((step) => (
              <li key={step.step_id} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">
                <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                {step.label || step.step_id}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
