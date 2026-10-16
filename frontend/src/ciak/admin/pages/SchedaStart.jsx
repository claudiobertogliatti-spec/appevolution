/**
 * Ciak Admin — Account di un cliente Start (`/admin/start/:clientId`).
 *
 * Stesso impianto della scheda del partner (`PartnerDetailModal`): intestazione e schede
 * in alto, stesso stile. Panoramica (cosa tocca a te adesso) · Percorso (i 6 materiali in
 * ordine, ciascuno col suo stato e UN pulsante giusto: Genera / Leggi e approva) ·
 * Materiali (risposte alle 20 domande e marchio) · Documenti (PDF) · Impostazioni (link
 * d'accesso). Niente scheda Pagamenti: per Start non c'e' un dato verificato da mostrare.
 * Sostituisce i 12 pulsanti piatti di Consegne Start, che restano li' per chi li usa.
 *
 * Backend: GET  /start/pipeline            (riga del cliente: stato, prossima mossa)
 *          GET  /start/{id}/bozze          (contenuto delle bozze, da leggere prima di approvare)
 *          POST /start/{id}/<materiale>/genera, /deliverable/approva, /bozze/prepara, /pdf/crea
 * Approvare e' un'azione esplicita sul singolo materiale: mai in blocco.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, Target, Edit3, FileText, Settings } from "lucide-react";
import { apiGet, apiPost } from "../api";
import { Valore } from "./ConsegneStart";
import { StatusPill } from "../components/ui/StatusPill";
import { Domande20, MarchioScelto } from "./SchedaStartDati";
import { CodaAssistente } from "../components/CodaAssistente";

const GENERA = {
  positioning: "posizionamento/genera",
  brand_kit: "marchio/genera",
  social_profiles: "profili/genera",
  showcase: "vetrina/genera",
  content_plan_90d: "calendario-90/genera",
  partnership_readiness: "readiness/genera",
};

const STATO = {
  approvato: { testo: "Approvato · il cliente lo vede", tono: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  da_approvare: { testo: "Bozza da approvare", tono: "bg-amber-50 text-amber-800 border-amber-200" },
  in_generazione: { testo: "In generazione…", tono: "bg-slate-100 text-slate-600 border-slate-200" },
  errore: { testo: "Generazione fallita", tono: "bg-red-50 text-red-700 border-red-200" },
  da_fare: { testo: "Da fare", tono: "bg-slate-100 text-slate-500 border-slate-200" },
};

const SCHEDE = [
  { id: "panoramica", label: "Panoramica", Icon: Eye },
  { id: "percorso", label: "Percorso", Icon: Target },
  { id: "materiali", label: "Materiali", Icon: Edit3 },
  { id: "documenti", label: "Documenti", Icon: FileText },
  { id: "impostazioni", label: "Impostazioni", Icon: Settings },
];

const STAGE_TESTO = {
  attesa_cliente: "Aspetta il cliente",
  da_preparare: "Da preparare",
  da_approvare: "Da approvare",
  completato: "Completato",
};

function stato(item) {
  if (item.generato) return item.approval_status === "approved" ? "approvato" : "da_approvare";
  if (item.generation_status === "errore") return "errore";
  if (item.generation_status === "in_corso") return "in_generazione";
  return "da_fare";
}

const BTN_SCURO =
  "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition";
const BTN_CHIARO =
  "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition";

function RigaMateriale({ n, item, titolo, inCorso, onGenera, onApprova }) {
  const s = stato(item);
  const auto = s === "approvato" && item.approvato_da === "ciak-automatico";
  const ripiego = s === "da_approvare" && item.ripiego;
  const manuale = item.type === "showcase" || item.type === "partnership_readiness";
  const [aperto, setAperto] = useState(false);
  const occupato = inCorso === item.type;
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
          {n}
        </span>
        <h3 className="text-sm font-semibold text-slate-900">{titolo}</h3>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${STATO[s].tono}`}>
          {auto ? "Approvato in automatico · il cliente lo vede" : ripiego ? "Testo di ripiego · da rivedere" : STATO[s].testo}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {item.generato && (
            <button type="button" aria-expanded={aperto} onClick={() => setAperto((v) => !v)} className={BTN_CHIARO}>
              {aperto ? "Chiudi" : "Leggi"}
            </button>
          )}
          {(s === "da_fare" || s === "errore") && (
            <button type="button" disabled={occupato} onClick={() => onGenera(item)} className={BTN_SCURO}>
              {occupato ? "Attendi…" : s === "errore" ? "Riprova" : "Genera bozza"}
            </button>
          )}
          {s === "da_approvare" && (
            <button type="button" disabled={occupato} onClick={() => onApprova(item)} className={BTN_SCURO}>
              {occupato ? "Attendi…" : item.type === "showcase" ? "Approva sito e dominio" : "Approva"}
            </button>
          )}
        </div>
      </div>
      {item.generation_error && <p className="mt-2 text-xs text-red-700">{item.generation_error}</p>}
      {s === "da_approvare" && !aperto && (
        <p className="mt-2 text-xs text-slate-500">
          {ripiego
            ? "La sintesi automatica non e' riuscita: il testo e' di ripiego e non va al cliente da solo. Riscrivilo o rivedilo prima di approvare."
            : item.type === "showcase"
              ? "Approvare vuol dire che il sito e' online sul suo dominio: ti chiedo l'indirizzo (https://…). Premi \"Leggi\" per controllarlo prima."
              : manuale
                ? 'Premi "Leggi" per controllare la bozza prima di approvarla.'
                : 'Premi "Leggi" per controllare la bozza prima di approvarla. (Di solito questo materiale va al cliente da solo: e\' fermo perche\' esisteva gia\' prima o per altro motivo.)'}
        </p>
      )}
      {aperto && item.generato && (
        <div className="mt-3 space-y-3">
          {item.contenuto?.fallback || item.contenuto?._fallback ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              Attenzione: la sintesi automatica non è riuscita, questo testo è di ripiego. Va riscritto a mano prima di
              approvare.
            </p>
          ) : null}
          <Valore v={item.contenuto} />
          {item.live_url && (
            <p className="text-sm">
              Pubblicata su: <Valore v={item.live_url} />
            </p>
          )}
          {item.html && (
            <iframe
              title={`Anteprima ${titolo}`}
              sandbox=""
              srcDoc={item.html}
              className="h-96 w-full rounded-lg border border-gray-200"
            />
          )}
        </div>
      )}
    </li>
  );
}

export function SchedaStart({ onAuthExpired }) {
  const { clientId } = useParams();
  const [riga, setRiga] = useState(undefined); // undefined = carico, null = non trovato
  const [bozze, setBozze] = useState(null);
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(null);
  const [esito, setEsito] = useState(null);
  const [params, setParams] = useSearchParams();
  const scheda = SCHEDE.some((x) => x.id === params.get("scheda")) ? params.get("scheda") : "panoramica";
  const [link, setLink] = useState(null);
  const vaiA = (id) => setParams(id === "panoramica" ? {} : { scheda: id }, { replace: true });

  const generaLink = async () => {
    setInCorso("link");
    setEsito(null);
    setLink(null);
    try {
      const r = await apiPost(`/clients/${clientId}/link-accesso`, { email: riga.email });
      setLink(r);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setEsito({ ok: false, testo: e.message });
    } finally {
      setInCorso(null);
    }
  };

  // "Vista cliente": come "Vista" dei partner, ma per Start. Apre in una scheda nuova l'area di
  // Linda con la sua barra a sinistra. Usa un link d'accesso nuovo (tracciato nello storico
  // del cliente come "link_accesso_generato_da_admin"): non invia nessuna email.
  const apriVistaCliente = async () => {
    const finestra = window.open("", "_blank"); // subito, nel clic: dopo un await il browser la blocca
    setInCorso("vista");
    setEsito(null);
    try {
      const r = await apiPost(`/clients/${clientId}/link-accesso`, { email: riga.email });
      if (finestra) finestra.location.href = r.link;
      else setEsito({ ok: false, testo: "Il browser ha bloccato la nuova scheda: consenti i popup per ciak.io e riprova." });
    } catch (e) {
      finestra?.close();
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setEsito({ ok: false, testo: e.message });
    } finally {
      setInCorso(null);
    }
  };

  const carica = useCallback(() => {
    setErrore(null);
    Promise.all([apiGet("/start/pipeline"), apiGet(`/start/${clientId}/bozze`)])
      .then(([pipe, b]) => {
        const tutti = pipe.colonne.flatMap((c) => c.clienti);
        setRiga(tutti.find((c) => c.client_id === clientId) || null);
        setBozze(b);
      })
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setErrore(e.message);
      });
  }, [clientId, onAuthExpired]);

  useEffect(carica, [carica]);

  const esegui = async (chiave, route, body, testoOk) => {
    setInCorso(chiave);
    setEsito(null);
    try {
      const r = await apiPost(route, body || {});
      setEsito({ ok: true, testo: r?.generating ? `${testoOk} Ci vuole 1-2 minuti: aggiorna la pagina.` : testoOk });
      carica();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setEsito({ ok: false, testo: e.message });
    } finally {
      setInCorso(null);
    }
  };

  const onGenera = (item) =>
    esegui(item.type, `/start/${clientId}/${GENERA[item.type]}`, null, "Bozza generata: leggila prima di approvare.");

  const onApprova = (item) => {
    let liveUrl = null;
    if (item.type === "showcase") {
      liveUrl = window.prompt("Indirizzo della pagina online (https://...)");
      if (!liveUrl) return;
    }
    esegui(
      item.type,
      `/start/${clientId}/deliverable/approva`,
      item.type === "showcase" ? { tipo: item.type, live_url: liveUrl } : { tipo: item.type },
      "Approvato: ora il cliente lo vede.",
    );
  };

  if (errore) {
    return (
      <div className="p-10 max-w-4xl">
        <p className="text-slate-700 mb-4">Errore nel caricamento: {errore}</p>
        <button onClick={carica} className={BTN_SCURO}>
          Riprova
        </button>
      </div>
    );
  }
  if (riga === undefined || !bozze) return <div className="p-10 text-slate-400">Caricamento…</div>;
  if (riga === null) {
    return (
      <div className="p-10 max-w-4xl">
        <p className="text-slate-700 mb-4">Questo cliente non risulta tra i clienti Start attivi.</p>
        <Link to="/admin/start" className="text-sm font-semibold text-slate-900 underline">
          Torna ai clienti
        </Link>
      </div>
    );
  }

  const titoli = Object.fromEntries(riga.materiali.map((m) => [m.type, m.titolo]));
  const scad = riga.prossima_scadenza;
  const primoDaApprovare = bozze.items.find((i) => stato(i) === "da_approvare");

  return (
    <div className="p-10 max-w-4xl">
      <Link to="/admin/start" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clienti
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">{riga.nome || riga.email}</h1>
        <button
          type="button"
          disabled={inCorso === "vista"}
          onClick={apriVistaCliente}
          title="Entra nell'area del cliente, come la vede lui"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
        >
          {inCorso === "vista" ? "Attendi…" : "Vista cliente →"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {riga.email} · {STAGE_TESTO[riga.stage]} · {riga.approvati} di {riga.totale} materiali approvati
      </p>
      {(riga.fermo || riga.ultimo_movimento?.giorni != null) && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {riga.ultimo_movimento?.giorni != null && (
            <span>
              Ultimo movimento{" "}
              {riga.ultimo_movimento.da_acquisto
                ? `nessuno dall'acquisto (${riga.ultimo_movimento.giorni} giorni)`
                : riga.ultimo_movimento.giorni === 0 ? "oggi" : riga.ultimo_movimento.giorni === 1 ? "ieri" : `${riga.ultimo_movimento.giorni} giorni fa`}
            </span>
          )}
          {riga.fermo && <StatusPill tone="warning" label="Fermo" />}
        </p>
      )}

      {esito && (
        <p
          role="status"
          className={`sticky top-4 z-20 my-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            esito.ok ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {esito.testo}
        </p>
      )}

      <div className="mt-6 flex overflow-x-auto border-b border-gray-200 bg-[#FAFAF7]" role="tablist" aria-label="Schede del cliente">
        {SCHEDE.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={scheda === id}
            onClick={() => vaiA(id)}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
              scheda === id ? "border-yellow-400 bg-white text-gray-900" : "border-transparent text-gray-500 hover:bg-white/50 hover:text-gray-700"
            }`}
            data-testid={`scheda-${id}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {scheda === "panoramica" && (
        <>
      <section className="my-6 rounded-2xl border border-slate-900 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cosa fare adesso</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{riga.prossima_azione}</p>
        {scad && (
          <p className="mt-1 text-sm text-slate-500">
            Prossima consegna promessa: tappa {scad.tappa} ({scad.titolo}) entro il {scad.data_promessa}
            {scad.giorni < 0 ? ` — in ritardo di ${-scad.giorni} ${scad.giorni === -1 ? "giorno" : "giorni"}` : ""}.
          </p>
        )}
        {riga.stage === "da_preparare" && (
          <button
            type="button"
            disabled={inCorso === "prepara"}
            onClick={() =>
              esegui("prepara", `/start/${clientId}/bozze/prepara`, null, "Bozze in preparazione: nessuna viene approvata da sola.")
            }
            className={`mt-3 ${BTN_SCURO}`}
          >
            {inCorso === "prepara" ? "Attendi…" : "Prepara tutte le bozze"}
          </button>
        )}
        {riga.stage === "da_approvare" && primoDaApprovare && (
          <p className="mt-3 text-xs text-slate-500">
            Leggi la bozza ("Leggi" nella riga qui sotto), poi premi "Approva". Il cliente vede solo ciò che e' approvato.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Come funziona: posizionamento, marchio, profili social e calendario vanno al cliente da soli, a meno che il testo
          sia di ripiego. A mano restano solo il sito web (con il suo dominio) e il controllo finale.
        </p>
      </section>

          <CodaAssistente base={`/start/${clientId}`} email={riga.email} onAuthExpired={onAuthExpired} />
        </>
      )}

      {scheda === "percorso" && (
        <>
      <h2 className="mb-3 mt-6 text-sm font-semibold text-slate-900">I 6 materiali, in ordine</h2>
      <ol className="space-y-3">
        {bozze.items.map((item, i) => (
          <RigaMateriale
            key={item.type}
            n={i + 1}
            item={item}
            titolo={titoli[item.type] || item.type}
            inCorso={inCorso}
            onGenera={onGenera}
            onApprova={onApprova}
          />
        ))}
      </ol>

        </>
      )}

      {scheda === "materiali" && (
        <>
      <Domande20 risposte={bozze.risposte} domande={bozze.domande} />
      <MarchioScelto marchio={bozze.marchio_scelto} />

      <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Dati grezzi (per controllo)</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Risposte</p>
            <Valore v={bozze.risposte} />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Marchio scelto</p>
            <Valore v={bozze.marchio_scelto} />
          </div>
        </div>
      </details>

        </>
      )}

      {scheda === "documenti" && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">PDF dei materiali approvati</h2>
          <p className="mt-1 text-xs text-slate-500">Crea i PDF di quello che il cliente puo' gia' vedere. Non approva niente.</p>
          <button
            type="button"
            disabled={inCorso === "pdf"}
            onClick={() => esegui("pdf", `/start/${clientId}/pdf/crea`, null, "PDF dei materiali approvati creati.")}
            className={`mt-3 ${BTN_CHIARO}`}
          >
            {inCorso === "pdf" ? "Attendi…" : "Crea i PDF dei materiali approvati"}
          </button>
        </section>
      )}

      {scheda === "impostazioni" && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Link di accesso del cliente</h2>
          <p className="mt-1 text-xs text-slate-500">
            Il link gia' mandato vale 30 giorni dalla creazione ed e' riutilizzabile: prova prima quello. Ne crei uno nuovo solo
            se non entra. Non invia nessuna email e non invalida i link precedenti: lo copi e lo mandi tu.
          </p>
          <button type="button" disabled={inCorso === "link"} onClick={generaLink} className={`mt-3 ${BTN_SCURO}`}>
            {inCorso === "link" ? "Attendi…" : "Genera un link nuovo"}
          </button>
          {link && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="break-all font-mono" data-testid="link-generato">{link.link}</p>
              <p className="mt-1">Scade il {String(link.scade_il).slice(0, 10)}.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
