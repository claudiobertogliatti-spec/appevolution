import { useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole, PlayCircle } from "lucide-react";
import "../../insider/postcall.css";
import ProposalChat from "../../insider/ProposalChat";
import { PRICING } from "../../pricing";
import { SalesChat } from "../SalesChat";
import { PartnershipCheckout } from "../PartnershipCheckout";
import { lessonVideos } from "./lessonVideos";

function euro(cents) {
  return `${new Intl.NumberFormat("it-IT", { useGrouping: true, maximumFractionDigits: 0 }).format((cents || 0) / 100)}€`;
}

const lessons = [
  { title: "Cosa succede dentro la Partnership", note: "Panoramica del percorso e delle fasi.", ...lessonVideos[1] },
  { title: "Cosa costruiamo insieme", note: "Struttura, materiali e priorita' operative.", ...lessonVideos[2] },
  { title: "Cosa validi tu", note: "Decisioni, feedback e ritmo delle revisioni.", ...lessonVideos[3] },
  { title: "Perche' il sistema resta tuo", note: "Ordine, proprieta' e continuita' del lavoro.", ...lessonVideos[4] },
  { title: "Perche' esiste il 10% per 12 mesi", note: "Allineamento sugli obiettivi e crescita nel tempo.", ...lessonVideos[5] },
];
// Una lezione senza `videoUrl` mostra "Video guida in preparazione" al posto del lettore.

export function LessonCard({ lesson, index }) {
  // Niente espressioni `{...}` come figlie di <video>: in sviluppo un plugin di editing visivo le
  // avvolge in <span> e il <track> finirebbe fuori dal video. Tre alberi JSX letterali.
  let player;
  if (!lesson.videoUrl) {
    player = <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Video guida in preparazione</p>;
  } else if (lesson.captionsUrl) {
    player = (
      <video
        className="mt-3 aspect-video w-full rounded-lg bg-slate-900"
        controls
        playsInline
        preload="metadata"
        poster={lesson.posterUrl || undefined}
        aria-label={lesson.title}
      >
        <source src={lesson.videoUrl} type="video/mp4" />
        <track kind="captions" srcLang="it" label="Italiano" src={lesson.captionsUrl} default />
        Il tuo browser non riesce a riprodurre il video.
      </video>
    );
  } else {
    player = (
      <video
        className="mt-3 aspect-video w-full rounded-lg bg-slate-900"
        controls
        playsInline
        preload="metadata"
        poster={lesson.posterUrl || undefined}
        aria-label={lesson.title}
      >
        <source src={lesson.videoUrl} type="video/mp4" />
        Il tuo browser non riesce a riprodurre il video.
      </video>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold text-yellow-600">Lezione {index + 1}</p>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{lesson.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{lesson.note}</p>
        </div>
        <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
      </div>
      {player}
    </div>
  );
}

export function PartnershipEducationPage({ dashboard }) {
  const access = dashboard.client?.access_level;
  const isPartner = dashboard.partner_area?.status === "attiva";
  const callDone = dashboard.diagnostic?.state === "call_done";
  const pricing = dashboard.pricing?.partnership || {};
  const fullAmount = pricing.full_amount_cents ?? PRICING.partnership.cents;
  const creditAmount = pricing.credit_amount_cents ?? 0;
  const dueAmount = pricing.due_amount_cents ?? fullAmount - creditAmount;
  // Contratto e pagamento si aprono dopo la call (o per chi ha gia' Start): prima non c'e' niente da firmare.
  const canBuy = !isPartner && (callDone || access === "cliente_start");

  const [proposta, setProposta] = useState(dashboard.proposta || null);
  const [chatOpen, setChatOpen] = useState(false);
  const token = proposta?.token;
  const offer = dashboard.offer || {};
  const bonusAttiva = !!offer.bonus_guida_attiva && !!offer.bonus_expires_at;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Partnership Evolution PRO</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isPartner ? "Partnership attiva" : "Capisci cosa succede dopo, poi decidi"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isPartner
            ? "La tua Partnership è attiva. L'area partner dedicata resta il punto operativo principale."
            : "Cinque video brevi per capire il percorso completo prima di decidere: cosa succede, cosa costruiamo, cosa decidi tu, cosa è tuo e come funziona il 10%."}
        </p>
        {!isPartner ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <p>L'area partner si apre dopo l'attivazione della Partnership.</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 md:grid-cols-2" aria-label="Le cinque lezioni">
        {lessons.map((lesson, idx) => (
          <LessonCard key={lesson.title} lesson={lesson} index={idx} />
        ))}
      </section>

      {!isPartner ? (
        <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-6" aria-labelledby="partnership-prezzo">
          <h2 id="partnership-prezzo" className="text-lg font-semibold text-slate-900">
            {creditAmount > 0 ? "Credito Start garantito" : "Il prezzo"}
          </h2>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <span>Partnership completa, una tantum</span>
              <strong>{euro(fullAmount)}</strong>
            </div>
            {creditAmount > 0 ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span>Credito Ciak Start</span>
                  <strong>-{euro(creditAmount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-yellow-200 pt-3 text-base text-slate-900">
                  <span>Totale upgrade</span>
                  <strong>{euro(dueAmount)}</strong>
                </div>
              </>
            ) : (
              <p className="text-slate-600">
                Se parti da Ciak Start, i {euro(PRICING.start.cents)} si scalano interi dalla Partnership.
              </p>
            )}
            <div className="flex items-start justify-between gap-4 border-t border-yellow-200 pt-3 text-slate-900">
              <span>In più, per 12 mesi dalla firma</span>
              <strong className="text-right">10% dell'importo netto incassato dalle vendite del tuo corso</strong>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-600">
            Nessun guadagno è garantito: ci impegniamo sul lavoro e sul metodo, i risultati dipendono anche da mercato, contenuti e
            impegno. Per fare due conti con i tuoi numeri usa il{" "}
            <Link to="/cliente/simulatore" className="font-semibold text-blue-700 underline underline-offset-2">
              Simulatore Corsi
            </Link>
            .
          </p>
        </section>
      ) : null}

      {canBuy ? (
        <PartnershipCheckout proposta={proposta} checkoutReadiness={dashboard.checkout_readiness} onProposta={setProposta} />
      ) : null}

      {!isPartner ? (
        token ? (
          <div className="pc pc-embed">
            <ProposalChat
              token={token}
              name={dashboard.client?.name}
              open={chatOpen}
              onOpen={() => setChatOpen(true)}
              onClose={() => setChatOpen(false)}
            />
          </div>
        ) : (
          <SalesChat bonusAttiva={bonusAttiva} recPartnership />
        )
      ) : null}
    </div>
  );
}
