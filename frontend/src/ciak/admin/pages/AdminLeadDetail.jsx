/**
 * Ciak Admin — Dettaglio lead. GET /api/admin/ciak/lead?email=...
 *
 * Vista 360°: iscrizione (o anagrafica ricavata dal questionario, per chi non è
 * passato dall'opt-in) + questionari con report Carlo. Per i lead qualificati
 * (call_done + Stato 3-4) mostra il pannello "Genera Proposta Partnership".
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet, adminFetch, errorDetail, getAdminUser, SCOPE_DENIED_DETAIL } from "../api";
import LinkAccessoCliente from "../components/LinkAccessoCliente";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

const STATO_LABEL = {
  1: "Definizione",
  2: "Strutturazione",
  3: "Validazione",
  4: "Evoluzione Strategica",
};

// Instradamento ICP (da scoring AI): cosa proporre in call. Etichette senza
// prezzo (i prezzi vivono nell'offerta, non qui, così non invecchiano).
const INSTRADAMENTO = {
  partnership: { label: "Partnership Evolution", cls: "bg-emerald-100 text-emerald-700" },
  start:       { label: "Ciak Start",            cls: "bg-yellow-100 text-yellow-700" },
  nurture:     { label: "Nurturing",             cls: "bg-gray-100 text-slate-500" },
};

// Le 4 tappe che contano per capire la situazione reale del lead prima di una
// call: questionario compilato, report/blueprint generato, call fissata, call
// fatta. Data reale da state_history (non dedotta dal solo current_state, che
// è un singolo valore e nasconde le tappe precedenti) — vedi _state_ts() nel
// backend, stessa logica qui lato client sullo stesso campo.
const STAGES = [
  { key: "ciak_completed", label: "Questionario compilato" },
  { key: "report_generated", label: "Report / Blueprint generato" },
  { key: "call_booked", label: "Call fissata" },
  { key: "call_done", label: "Call fatta" },
];

function stateTs(diagnostic, state) {
  const history = diagnostic?.state_history || [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.state === state) return history[i].timestamp;
  }
  return null;
}

function formatDateTime(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function StageChecklist({ diagnostic }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STAGES.map((s) => {
        const ts = stateTs(diagnostic, s.key);
        const when = formatDateTime(ts);
        return (
          <div
            key={s.key}
            className={`rounded-lg border px-3 py-2 text-xs ${
              ts ? "border-slate-900 bg-slate-900 text-yellow-400" : "border-gray-200 bg-gray-50 text-slate-400"
            }`}
          >
            <div className="font-semibold">{ts ? "✓" : "—"} {s.label}</div>
            <div className={ts ? "text-slate-300" : "text-slate-400"}>{when || "non ancora"}</div>
          </div>
        );
      })}
    </div>
  );
}

// Scarica il Blueprint SALVATO in PDF (template lockato, 16 pagine): nessuna
// chiamata AI, nessun effetto collaterale. È lo stesso documento che il
// cliente riceve quando confermi di aver fatto la call.
async function downloadBlueprintPdf(email) {
  const res = await adminFetch(
    `/api/ciak/client/admin/blueprint-pdf?email=${encodeURIComponent(email)}`,
    { timeoutMs: 60000 }
  );
  if (!res.ok) throw new Error(await errorDetail(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeEmail = (email || "blueprint").replace(/[^a-z0-9]+/gi, "-");
  a.href = url;
  a.download = `Blueprint-${safeEmail}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Stesso ordine e stesso testo mostrato al lead in Diagnostica.jsx — le
// risposte grezze non erano mai esposte in admin prima di questa modifica
// (bug segnalato da Claudio: servono per prepararsi/rivedere prima della call).
const QUESTIONS = [
  { id: "q1_competenza", text: "Qual è la competenza su cui hai costruito il tuo lavoro? E questo lavoro ha un nome, un metodo o un marchio tuo — un libro, un percorso, una tecnica che hai codificato?" },
  { id: "q2_esperienza", text: "Da quanto la pratichi, come sei arrivato/a a padroneggiarla, e a quante persone l'hai già insegnata o erogata?" },
  { id: "q3_clienti", text: "Con chi hai già lavorato su questo tema, e ti hanno pagato per questo? Raccontami un risultato concreto che hai aiutato a ottenere." },
  { id: "q4_idea", text: "Se immagini un tuo corso o percorso digitale, cosa ti vedi offrire? Ce l'hai già un'offerta a pagamento, o è ancora un'intuizione?" },
  { id: "q9_materiale", text: "Che materiale hai già creato sul tuo tema — un libro, un podcast, un videocorso, delle dispense, una masterclass? Raccontami cosa esiste già, anche se grezzo." },
  { id: "q5_target", text: "A chi vorresti parlare con questo progetto? Descrivimi la persona che hai in mente e cosa la tiene sveglia la notte." },
  { id: "q6_problema", text: "Qual è il problema che risolvi meglio di chiunque altro? Com'è la vita di chi ti sceglie, prima e dopo di te?" },
  { id: "q7_digitale", text: "Che rapporto hai oggi con il mondo online? Cosa hai già provato — social, sito, vendite — e cosa ti mette ancora in difficoltà?" },
  { id: "q10_agenzie", text: "Ti sei già affidato ad agenzie o consulenti per portare online il tuo lavoro? Com'è andata, e cosa ti è mancato?" },
  { id: "q8_obiettivo", text: "Perché vuoi farlo, davvero? Cosa cambierebbe nella tua vita se questo progetto funzionasse?" },
];

// "Conferma call fissata" ha senso solo con l'analisi in mano e la call non
// ancora segnata: stesse regole del backend (ciak_admin.py::ciak_mark_call_booked).
// clicked_67/purchased_67 sono stati storici del vecchio funnel €27 = analisi pronta.
const _CALL_CONFIRMABLE_STATES = new Set([
  "ciak_completed", "report_generated", "clicked_67", "purchased_67",
]);

function QuestionnaireAnswers({ responses }) {
  if (!responses || Object.keys(responses).length === 0) {
    return <p className="text-slate-400 text-sm">Nessuna risposta registrata.</p>;
  }
  return (
    <div className="space-y-4">
      {QUESTIONS.map((q) => {
        const answer = responses[q.id];
        if (!answer) return null;
        return (
          <div key={q.id}>
            <p className="text-xs font-medium text-slate-500 mb-1">{q.text}</p>
            <p className="text-sm text-slate-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 leading-relaxed">
              {answer}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children, id }) {
  return (
    <div id={id} className="bg-white rounded-2xl border border-gray-200 p-6 mb-5 scroll-mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const BLUEPRINT_STATO = {
  mancante: { label: "Da generare", cls: "bg-gray-100 text-slate-600" },
  in_generazione: { label: "In preparazione…", cls: "bg-yellow-100 text-yellow-800" },
  pronto: { label: "Pronto", cls: "bg-slate-900 text-yellow-400" },
  errore: { label: "Generazione fallita", cls: "bg-red-50 text-red-700" },
  inviato_prima: { label: "Già inviato", cls: "bg-emerald-50 text-emerald-700" },
};

// Blueprint del lead: si genera UNA volta (Claude, 1-2 minuti) e si salva.
// Il PDF scaricato e quello inviato dopo la call sono lo stesso documento.
function BlueprintPanel({ blueprint, busy, message, onGenera, onRigenera, onScarica, pdfLoading, pdfError }) {
  const stato = blueprint?.stato || "mancante";
  const badge = BLUEPRINT_STATO[stato] || BLUEPRINT_STATO.mancante;
  const pronto = stato === "pronto";
  const inCorso = stato === "in_generazione" || busy;
  // Inviato con il flusso precedente (prima del Blueprint salvato): il cliente
  // l'ha già ricevuto, qui si mostra solo il documento spedito.
  if (stato === "inviato_prima" && !busy) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Blueprint · 16 pagine</h2>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Il cliente ha ricevuto il Blueprint il {formatWhen(blueprint.consegna_inviata_at) || "—"}, prima che il
          Blueprint venisse salvato in Ciak. Qui sotto trovi il PDF che gli è stato inviato.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {blueprint.pdf_url && (
            <a
              href={blueprint.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 transition"
            >
              Apri il PDF inviato
            </a>
          )}
          {onGenera && (
            <button
              type="button"
              onClick={onGenera}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-400 transition"
            >
              Genera una copia salvata
            </button>
          )}
        </div>
        {message && <p className="text-sm text-slate-600 mt-3">{message}</p>}
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Blueprint · 16 pagine</h2>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {inCorso && stato !== "in_generazione" ? BLUEPRINT_STATO.in_generazione.label : badge.label}
        </span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        {pronto
          ? onGenera
            ? `Generato il ${formatWhen(blueprint.generato_at) || "—"}. Scaricalo per la call: il cliente riceverà esattamente questo documento quando confermi di aver fatto la call.`
            : `Generato il ${formatWhen(blueprint.generato_at) || "—"}. Scaricalo per la call. L'invio al cliente, dopo la call, lo fa Claudio.`
          : inCorso
            ? "Carlo sta scrivendo il Blueprint (1-2 minuti). La pagina si aggiorna da sola."
            : onGenera
              ? "Generalo prima della call: ti serve per prepararti e per mostrarlo in videocall. Non viene inviato niente al cliente."
              : "Il Blueprint lo prepara Claudio prima della call. Quando è pronto lo trovi qui da scaricare."}
      </p>
      {stato === "errore" && blueprint?.errore && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 break-words">
          Motivo: {blueprint.errore}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {pronto ? (
          <>
            <button
              type="button"
              onClick={onScarica}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-wait"
            >
              {pdfLoading ? "Preparo il PDF…" : "⬇ Scarica Blueprint PDF"}
            </button>
            {onRigenera && (
              <button
                type="button"
                onClick={onRigenera}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-400 transition disabled:opacity-50"
              >
                Rigenera
              </button>
            )}
          </>
        ) : onGenera && (
          <button
            type="button"
            onClick={onGenera}
            disabled={inCorso}
            className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {inCorso ? "In preparazione…" : stato === "errore" ? "Riprova a generare" : "Genera Blueprint"}
          </button>
        )}
      </div>
      {pdfError && <p className="text-sm text-red-700 mt-3">{pdfError}</p>}
      {message && <p className="text-sm text-slate-600 mt-3">{message}</p>}
      {blueprint?.consegna_inviata_at && (
        <p className="text-sm text-emerald-700 mt-3">✓ Inviato al cliente il {formatWhen(blueprint.consegna_inviata_at)}.</p>
      )}
      {blueprint?.consegna_errore && !blueprint?.consegna_inviata_at && (
        <p className="text-sm text-red-700 mt-3 break-words">Ultimo invio fallito: {blueprint.consegna_errore}</p>
      )}
    </div>
  );
}

const RUOLO_STILE = {
  lead: "bg-gray-100 text-slate-700 border-gray-200",
  cliente_start: "bg-emerald-50 text-emerald-800 border-emerald-200",
  partner: "bg-slate-900 text-yellow-400 border-slate-900",
};

// Prima cosa da capire aprendo la scheda: e' un lead, un cliente che ha
// pagato Ciak Start o un partner? Il "Cliente" vale solo per chi ha pagato.
function RuoloBadge({ ruolo }) {
  if (!ruolo) return null;
  return (
    <div
      data-testid="ruolo-contatto"
      className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2 mb-8 ${RUOLO_STILE[ruolo.tipo] || RUOLO_STILE.lead}`}
    >
      <span className="text-sm font-semibold uppercase tracking-widest">{ruolo.label}</span>
      <span className="text-sm opacity-80">{ruolo.dettaglio}</span>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="mb-2">
      <span className="text-xs text-slate-400">{label}: </span>
      <span className="text-sm text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

// `?vai=` porta la scheda gia' sulla sezione giusta (lo usa il menu Azioni della
// pagina Lead). Una sezione che non c'e' (es. Blueprint gia' inviato) non fa nulla:
// la scheda resta aperta dall'inizio, come prima.
const VAI_A = {
  questionario: "lead-questionario",
  fissata: "lead-questionario",
  blueprint: "lead-blueprint",
  invia: "lead-invia",
  proposta: "lead-proposta",
  riporta: "lead-riporta",
};

export function AdminLeadDetail({ onAuthExpired }) {
  const { email } = useParams();
  // Dall'indirizzo del browser (non da un hook del router): la scheda non dipende da altro.
  const vai = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("vai");
  // Account commerciale (Mariangela): il reparto Acquisizione finisce a "call
  // fissata". Generare/inviare il Blueprint, la proposta e il ripristino sono
  // di Claudio (backend: 403, routers/ciak_admin.py): qui non compaiono.
  const isCommercial = getAdminUser()?.admin_type === "mariangela";
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [markMsg, setMarkMsg] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliverMsg, setDeliverMsg] = useState(null);
  const [deliverResult, setDeliverResult] = useState(null);
  const [askDeliver, setAskDeliver] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [bpBusy, setBpBusy] = useState(false);
  const [bpMsg, setBpMsg] = useState(null);
  const [askRigenera, setAskRigenera] = useState(false);
  const [askRiporta, setAskRiporta] = useState(false);
  const [riportando, setRiportando] = useState(false);
  const [riportaMsg, setRiportaMsg] = useState(null);
  const [bookingConfirming, setBookingConfirming] = useState(false);
  const [bookingMsg, setBookingMsg] = useState(null);

  useEffect(() => {
    apiGet("/lead", { email: decodeURIComponent(email) })
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired();
        else setError(e.message);
      });
  }, [email, onAuthExpired]);

  const sezioneId = VAI_A[vai];
  const caricata = Boolean(data);
  useEffect(() => {
    if (!sezioneId || !caricata) return;
    document.getElementById(sezioneId)?.scrollIntoView({ block: "start" });
  }, [sezioneId, caricata]);

  // Mentre il Blueprint è in preparazione ricarica la scheda ogni 10 secondi:
  // la generazione finisce lato server anche se la richiesta originale si è chiusa.
  const bpStato = data?.blueprint?.stato;
  useEffect(() => {
    if (bpStato !== "in_generazione" && !bpBusy) return undefined;
    const t = setInterval(() => {
      apiGet("/lead", { email: decodeURIComponent(email) }).then(setData).catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [bpStato, bpBusy, email]);

  // Ripristino: lead a "call appena fatta, Blueprint da inviare a mano".
  // Toglie Start/incassi creati per errore dal form admin, elimina l'account
  // cliente (si ricrea pulito all'invio) e azzera la registrazione dell'invio.
  async function riportaACallFatta() {
    setRiportando(true);
    setRiportaMsg(null);
    try {
      const response = await adminFetch("/api/admin/ciak/lead/riporta-a-call-fatta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!response.ok) throw new Error(await errorDetail(response));
      const r = await response.json();
      const tolti = (r.incassi_tolti?.payments || 0) + (r.incassi_tolti?.payment_transactions || 0);
      const chi = (r.start_attivato_da || []).join(", ");
      setRiportaMsg(
        `Fatto: lead riportato a "call fatta", Blueprint da inviare. ` +
        (tolti ? `Tolti ${tolti} record di incasso Start non pagato. ` : "") +
        (r.account_eliminato && Object.keys(r.account_eliminato).length ? "Account cliente eliminato. " : "") +
        (chi ? `Lo Start era stato attivato da: ${chi}.` : "")
      );
      const fresh = await apiGet("/lead", { email: data.email });
      setData(fresh);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setRiportaMsg("Errore: " + e.message);
    } finally {
      setRiportando(false);
      setAskRiporta(false);
    }
  }

  async function generaBlueprint(force) {
    setAskRigenera(false);
    setBpBusy(true);
    setBpMsg(null);
    setData((d) => ({ ...d, blueprint: { ...(d?.blueprint || {}), stato: "in_generazione" } }));
    try {
      const response = await adminFetch("/api/ciak/client/admin/blueprint/genera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, force: Boolean(force) }),
        timeoutMs: 300000,
      });
      if (!response.ok) throw new Error(await errorDetail(response));
      const stato = await response.json();
      setData((d) => ({ ...d, blueprint: stato }));
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      // Permesso negato (account commerciale): non è una connessione chiusa.
      else if (e.message === SCOPE_DENIED_DETAIL) setBpMsg(e.message);
      // Una connessione chiusa dal proxy non ferma la generazione: si continua
      // a leggere lo stato reale dalla scheda.
      else setBpMsg("La richiesta si è interrotta, ma la generazione può essere ancora in corso: controllo lo stato…");
    } finally {
      setBpBusy(false);
      apiGet("/lead", { email: data.email }).then(setData).catch(() => {});
    }
  }

  // Consegna Blueprint GRATUITO: l'admin conferma di aver fatto la call di consegna.
  // Innesca account cliente + analisi Carlo via email col magic-link + sblocco offerte.
  // Azione sensibile (email reale al cliente): passa da un ConfirmDialog in pagina.
  async function confirmDeliverBlueprint() {
    setAskDeliver(false);
    setDelivering(true);
    setDeliverMsg(null);
    try {
      const response = await adminFetch("/api/ciak/client/admin/consegna-blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!response.ok) throw new Error(await errorDetail(response));
      const r = await response.json();
      setDeliverResult(r);
      setDeliverMsg(r.gia_inviato
        ? "Il Blueprint era già stato inviato: nessuna nuova email."
        : "Fatto: il cliente ha ricevuto l'email con il Blueprint e il link d'accesso; le offerte sono sbloccate sulla sua sales page.");
      const fresh = await apiGet("/lead", { email: data.email });
      setData(fresh);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setDeliverMsg("Errore consegna: " + e.message);
    } finally {
      setDelivering(false);
      // Se la richiesta e' stata interrotta dal proxy la consegna puo' essere
      // andata a buon fine comunque: si rilegge lo stato vero dal server.
      apiGet("/lead", { email: data.email }).then(setData).catch(() => {});
    }
  }

  // Conferma manuale che la call è fissata — canale Mariangela: lei la fissa a
  // voce nel gruppo WhatsApp, niente popup Cal.com self-service per quei lead
  // (vedi diagnostic.py::complete), quindi nessuno stato "call_booked" arriva
  // da sola. Senza questa conferma il lead resta bloccato a "report_generated".
  async function handleConfirmCallBooked() {
    setBookingConfirming(true);
    setBookingMsg(null);
    try {
      const response = await adminFetch("/api/admin/ciak/lead/mark-call-booked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (!response.ok) throw new Error(await errorDetail(response));
      setBookingMsg("Call fissata confermata.");
      const fresh = await apiGet("/lead", { email: data.email });
      setData(fresh);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setBookingMsg("Errore: " + e.message);
    } finally {
      setBookingConfirming(false);
    }
  }

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      await downloadBlueprintPdf(data.email);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setPdfError("Errore PDF: " + e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function generateProposal() {
    setGeneratingProposal(true);
    setMarkMsg(null);
    try {
      const response = await adminFetch("/api/proposta/admin/genera-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          diagnostic_session_id: latest_diagnostic?.id || latest_diagnostic?._id || null,
        }),
      });
      if (!response.ok) throw new Error(await errorDetail(response));
      setProposal(await response.json());
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired();
      else setMarkMsg("Errore generazione proposta: " + e.message);
    } finally {
      setGeneratingProposal(false);
    }
  }

  if (error) return <div className="p-10 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const { lead, diagnostics, latest_diagnostic, qualified_for_proposta } = data;
  const callFatta = latest_diagnostic?.current_state === "call_done";
  const blueprintInviato = Boolean(
    data.blueprint?.consegna_inviata_at || data.blueprint?.stato === "inviato_prima"
  );

  return (
    <div className="p-10 max-w-4xl">
      <button
        onClick={() => navigate("/admin/leads")}
        className="text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        ← Tutti i leads
      </button>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        {lead?.nome || data.email}
      </h1>
      <p className="text-slate-500 mb-3">{data.email}</p>
      <RuoloBadge ruolo={data.ruolo} />

      {diagnostics.length > 0 && (
        <div id="lead-blueprint" className="scroll-mt-6">
        <BlueprintPanel
          blueprint={data.blueprint}
          busy={bpBusy}
          message={bpMsg}
          onGenera={isCommercial ? null : () => generaBlueprint(false)}
          onRigenera={isCommercial ? null : () => setAskRigenera(true)}
          onScarica={handleDownloadPdf}
          pdfLoading={pdfLoading}
          pdfError={pdfError}
        />
        </div>
      )}

      {/* Consegna Blueprint GRATUITO — sempre manuale, dopo la call.
          Visibile finché NON risulta un invio registrato (non basta lo stato
          "call fatta": un lead può essere a call_done senza aver mai ricevuto
          l'email). Dopo l'invio resta solo il riepilogo verde. */}
      {!isCommercial && diagnostics.length > 0 && (!blueprintInviato || deliverResult) && (
        <div id="lead-invia" className="bg-slate-900 text-white rounded-2xl p-6 mb-6 scroll-mt-6">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
            {callFatta && !blueprintInviato ? "Call fatta · Blueprint non ancora inviato" : "Dopo la call di consegna"}
          </p>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            Quando hai fatto la call, conferma qui: il cliente riceve l'email col{" "}
            <strong className="text-white">Blueprint</strong> (analisi Carlo) e il link
            d'accesso, e si sbloccano le offerte <strong className="text-white">Ciak Start</strong>{" "}
            e <strong className="text-white">Partnership</strong> sulla sua sales page.
          </p>
          {data.blueprint?.stato !== "pronto" && (
            <p className="text-yellow-400 text-sm mb-3">
              Prima genera il Blueprint qui sopra: si invia al cliente solo quello salvato.
            </p>
          )}
          {!blueprintInviato && (
            <button
              onClick={() => setAskDeliver(true)}
              disabled={delivering || data.blueprint?.stato !== "pronto"}
              className="px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm disabled:opacity-50"
            >
              {delivering
                ? "Invio in corso…"
                : callFatta
                  ? "Invia il Blueprint al cliente"
                  : "Ho fatto la call di consegna → invia il Blueprint"}
            </button>
          )}
          {deliverMsg && <p className="text-sm text-slate-200 mt-4 leading-relaxed">{deliverMsg}</p>}
          {deliverResult?.magic_link && (
            <div className="mt-4 rounded-xl border border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">Link d'accesso cliente</p>
              <div className="flex flex-wrap items-center gap-3">
                <code className="text-xs text-slate-200 break-all">{deliverResult.magic_link}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(deliverResult.magic_link)}
                  className="text-sm text-yellow-400 shrink-0"
                >
                  Copia link
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blueprint inviato: solo se l'invio è registrato davvero. */}
      {diagnostics.length > 0 && blueprintInviato && !deliverResult && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 mb-6 text-sm text-emerald-800">
          <span className="text-base" aria-hidden="true">✓</span>
          Blueprint inviato al cliente il {formatWhen(data.blueprint?.consegna_inviata_at) || "—"} con il link d'accesso alla sales page.
        </div>
      )}

      {/* Recupero accesso: il cliente non riesce a leggere la mail o il link e' scaduto.
          Crea un link personale nuovo e NON invia nessuna mail. Non esiste per chi non ha
          ancora un account cliente (nasce con la consegna del Blueprint). */}
      {!isCommercial && data.client_id && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">Accesso del cliente</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Se non riesce ad aprire l'area, crea qui un link personale nuovo e mandaglielo tu.
              Non parte nessuna mail.
            </p>
          </div>
          <LinkAccessoCliente
            client={{ id: data.client_id, email: data.email, name: lead?.nome }}
            onAuthExpired={onAuthExpired}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50"
          />
        </div>
      )}

      {/* Bridge Partnership */}
      {!isCommercial && qualified_for_proposta && (
        <div id="lead-proposta" className="bg-slate-900 text-white rounded-2xl p-6 mb-6 scroll-mt-6">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Lead qualificato — Partnership Evolution
          </p>
          <p className="text-slate-300 text-sm mb-4 leading-relaxed">
            Ha completato la call ed è in Stato{" "}
            {latest_diagnostic?.scoring?.stato_finale}. È il momento di generare la
            Proposta Partnership €2.990.
          </p>
          <button
            onClick={generateProposal}
            disabled={generatingProposal}
            className="px-5 py-2.5 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition text-sm"
          >
            {generatingProposal ? "Generazione..." : "Genera Proposta Partnership"}
          </button>
          {proposal?.url && (
            <p className="text-sm text-slate-200 mt-4 leading-relaxed">
              Proposta {proposal.status}. Il cliente la trova nella sua area: per mandargli
              l'accesso usa «Accesso del cliente» qui sotto.
            </p>
          )}
          {markMsg && <p className="text-sm text-slate-200 mt-3">{markMsg}</p>}
        </div>
      )}

      {/* Anagrafica */}
      <Section title="Anagrafica lead">
        <Field label="Nome" value={lead?.nome} />
        <Field label="Email" value={data.email} />
        <Field label="Fonte" value={lead?.source} />
        <Field label="Sources viste" value={(lead?.sources_seen || []).join(", ") || "—"} />
        <Field label="UTM source" value={lead?.utm?.utm_source} />
        <Field label="UTM campaign" value={lead?.utm?.utm_campaign} />
        <Field label="Creato" value={lead?.created_at} />
      </Section>

      {/* Questionario + report */}
      <Section id="lead-questionario" title={`Questionario (${diagnostics.length})`}>
        {diagnostics.length === 0 ? (
          <p className="text-slate-400 text-sm">Nessuna diagnostica avviata.</p>
        ) : (
          diagnostics.map((d, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-4 mb-5 last:mb-0">
              <StageChecklist diagnostic={d} />
              {_CALL_CONFIRMABLE_STATES.has(d.current_state) && (
                <div className="mb-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmCallBooked}
                    disabled={bookingConfirming}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-yellow-400 text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {bookingConfirming ? "Conferma in corso…" : "Conferma call fissata"}
                  </button>
                  {bookingMsg && <span className="text-xs text-slate-500">{bookingMsg}</span>}
                </div>
              )}
              {d.responses && Object.keys(d.responses).length > 0 && (
                <details className="mb-4" open>
                  <summary className="text-sm text-yellow-600 cursor-pointer font-medium">
                    Risposte al questionario
                  </summary>
                  <div className="mt-3">
                    <QuestionnaireAnswers responses={d.responses} />
                  </div>
                </details>
              )}
              <Field label="Stato corrente" value={d.current_state} />
              <Field
                label="Stato finale"
                value={
                  d.scoring?.stato_finale
                    ? `S${d.scoring.stato_finale} — ${STATO_LABEL[d.scoring.stato_finale]}`
                    : null
                }
              />
              <Field label="Score numerico" value={d.scoring?.score_numerico} />
              {d.scoring?.instradamento && (
                <div className="mb-2">
                  <span className="text-xs text-slate-400">Instradamento (proposta consigliata): </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${INSTRADAMENTO[d.scoring.instradamento]?.cls || "bg-gray-100 text-slate-600"}`}>
                    {INSTRADAMENTO[d.scoring.instradamento]?.label || d.scoring.instradamento}
                  </span>
                  {typeof d.scoring.pronto === "boolean" && (
                    <span className={`ml-2 text-[11px] font-semibold ${d.scoring.pronto ? "text-emerald-600" : "text-slate-400"}`}>
                      {d.scoring.pronto ? "· pronto" : "· non ancora pronto"}
                    </span>
                  )}
                </div>
              )}
              {d.scoring?.rationale && (
                <details className="mb-2">
                  <summary className="text-xs text-slate-400 cursor-pointer">Perché questo instradamento</summary>
                  <p className="text-[13px] text-slate-700 mt-1 whitespace-pre-wrap">{d.scoring.rationale}</p>
                </details>
              )}
              <Field
                label="Override"
                value={(d.scoring?.override_applicati || []).join(", ") || "—"}
              />
              <Field label="Avviata" value={d.created_at} />
              {d.report?.report_markdown && (
                <details className="mt-3">
                  <summary className="text-sm text-yellow-600 cursor-pointer font-medium">
                    Report Carlo (interno)
                  </summary>
                  <pre className="mt-2 text-xs text-slate-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 leading-relaxed">
                    {d.report.report_markdown}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </Section>

      <ConfirmDialog
        open={askDeliver}
        title={`Invia il Blueprint — ${data.email}`}
        body="Conferma di aver fatto la call di consegna. Il cliente riceverà l'email con il Blueprint che hai scaricato (lo stesso documento) e il link d'accesso, e le offerte Ciak Start e Partnership diventano acquistabili sulla sua sales page."
        confirmLabel="Invia il Blueprint"
        cancelLabel="Annulla"
        busy={delivering}
        onConfirm={confirmDeliverBlueprint}
        onCancel={() => setAskDeliver(false)}
      />

      {!isCommercial && callFatta && (
        <div id="lead-riporta" className="rounded-2xl border border-gray-200 bg-white p-6 mt-2 mb-5 scroll-mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-2">Ripristino</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Se questo lead ha un Ciak Start attivato per errore o non ha mai ricevuto il Blueprint,
            riportalo al momento subito dopo la call: nessun account cliente, nessun incasso finto,
            Blueprint da inviare a mano.
          </p>
          <button
            type="button"
            onClick={() => setAskRiporta(true)}
            disabled={riportando}
            className="px-4 py-2 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-50"
          >
            {riportando ? "Ripristino in corso…" : "Riporta a: call fatta, Blueprint da inviare"}
          </button>
          {riportaMsg && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{riportaMsg}</p>}
        </div>
      )}

      <ConfirmDialog
        open={askRiporta}
        title={`Riporta ${data.email} a "call fatta"`}
        body="Elimina l'account cliente con il suo percorso e gli accessi, toglie gli incassi Ciak Start creati dal form admin (mai quelli pagati davvero) e azzera la registrazione dell'invio del Blueprint. Il questionario, il report e l'analisi restano. Operazione irreversibile."
        confirmLabel="Riporta a call fatta"
        cancelLabel="Annulla"
        destructive
        busy={riportando}
        onConfirm={riportaACallFatta}
        onCancel={() => setAskRiporta(false)}
      />

      <ConfirmDialog
        open={askRigenera}
        title="Rigenerare il Blueprint?"
        body="Carlo scrive una nuova versione e sostituisce quella attuale: il testo cambia rispetto al PDF che hai già scaricato. Al cliente non viene inviato niente."
        confirmLabel="Rigenera"
        cancelLabel="Annulla"
        busy={bpBusy}
        onConfirm={() => generaBlueprint(true)}
        onCancel={() => setAskRigenera(false)}
      />
    </div>
  );
}
