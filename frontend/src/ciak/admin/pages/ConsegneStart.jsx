/**
 * Ciak Admin — Consegne Start.
 *
 * Risponde a una sola domanda: "cosa devo consegnare adesso, e a chi?"
 *
 * L'email di attivazione di Ciak Start promette per iscritto tre tappe con date
 * precise (7/14/21 giorni dal pagamento). Quelle date partono da sole a ogni
 * incasso e finora non le ricordava nessuno. Con l'Edizione Settembre — 8 posti,
 * partenza unica — sono 24 consegne datate in 21 giorni tenute a memoria.
 *
 * Le date mostrate qui sono le STESSE dell'email: stessa sorgente
 * (`services/ciak_start_milestones.delivery_datetimes`), non una formula
 * equivalente. Se le due divergessero, la versione giusta sarebbe sempre quella
 * che il cliente ha ricevuto per iscritto.
 *
 * Backend: GET  /api/admin/ciak/start/consegne
 *          POST /api/admin/ciak/start/consegne/segna
 *
 * Design system: quello dell'admin Ciak, ereditato da ConsegneMancate.jsx (card
 * bianche, bordo grigio, barra di gravita' a sinistra, Poppins dallo shell).
 * Nessun elemento nuovo introdotto. Rosso e ambra sono semantici — scaduto e
 * imminente — non decorativi.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

const URGENZA = {
  scaduta: {
    label: "Scaduta",
    badge: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-500",
    numero: "text-red-600",
  },
  imminente: {
    label: "Entro 48 ore",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    bar: "bg-amber-500",
    // Il giallo del brand (#FACC15) vive su fondo scuro: come testo su bianco
    // sta a ~2,2:1, sotto WCAG. Ambra scura, stessa famiglia, 4,6:1.
    numero: "text-amber-700",
  },
  in_corso: {
    label: "In corso",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    bar: "bg-slate-300",
    // Attenuato di proposito: un "13 giorni" nero pesa quanto un "-3 di
    // ritardo" e ruba l'occhio a cio' che e' davvero urgente.
    numero: "text-slate-400",
  },
  chiusa: {
    label: "Consegnata",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bar: "bg-emerald-500",
    numero: "text-slate-400",
  },
};

const STATO_LABEL = {
  da_fare: "Da fare",
  da_approvare: "Pronta, aspetta la tua approvazione",
  consegnata: "Consegnata",
};

function contatore(item) {
  if (item.stato === "consegnata") return { numero: "✓", nota: "consegnata" };
  if (item.giorni < 0) {
    return {
      numero: `−${item.giorni_ritardo}`,
      nota: item.giorni_ritardo === 1 ? "giorno di ritardo" : "giorni di ritardo",
    };
  }
  if (item.giorni === 0) return { numero: "0", nota: "scade oggi" };
  return { numero: `${item.giorni}`, nota: item.giorni === 1 ? "giorno" : "giorni" };
}

function Riquadro({ etichetta, valore, dettaglio, tono = "slate" }) {
  const colore = {
    slate: "text-slate-900",
    red: "text-red-600",
    amber: "text-amber-700",
  }[tono];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        {etichetta}
      </p>
      <p className={`text-3xl font-semibold ${colore}`}>{valore}</p>
      {dettaglio && <p className="text-xs text-slate-400 mt-1">{dettaglio}</p>}
    </div>
  );
}

function VoceTappa({ item, onSegna, inCorso }) {
  const urg = URGENZA[item.urgenza] || URGENZA.in_corso;
  const { numero, nota } = contatore(item);
  const [apertoForm, setApertoForm] = useState(false);
  const [riferimento, setRiferimento] = useState("");
  const [notaTesto, setNotaTesto] = useState("");
  const chiusa = item.stato === "consegnata";

  const conferma = async () => {
    await onSegna(item, "consegnata", { riferimento, nota: notaTesto });
    setApertoForm(false);
    setRiferimento("");
    setNotaTesto("");
  };

  return (
    <li className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex">
      {/* La barra di urgenza e' l'unico elemento cromatico forte insieme al
          contatore: da soli ordinano la lettura senza aggiungere rumore. */}
      <span className={`w-1 shrink-0 ${urg.bar}`} aria-hidden="true" />
      <div className="p-5 flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${urg.badge}`}
              >
                {urg.label}
              </span>
              <span className="text-xs font-medium text-slate-500">Tappa {item.tappa}</span>
            </div>
            <p className="text-slate-900 font-medium">{item.titolo}</p>
            <p className="text-sm text-slate-600 mt-1 break-words">
              {item.nome ? `${item.nome} · ` : ""}
              {item.email || "email non disponibile"}
            </p>
            <p className="text-sm text-slate-500 mt-2">{item.contenuto}</p>
          </div>

          {/* Il contatore e' la firma della pagina: un numero solo, col segno
              che dice da che parte sta il tempo. */}
          <div className="text-right shrink-0">
            <p className={`text-4xl font-semibold leading-none ${urg.numero}`}>{numero}</p>
            <p className="text-xs text-slate-400 mt-1">{nota}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-slate-500 space-y-1">
          <p>
            Promessa al cliente:{" "}
            <span className="font-medium text-slate-800">{item.data_promessa}</span>
            {" · "}
            sulla tua scrivania entro il{" "}
            <span className="font-medium text-slate-800">{item.scadenza_interna}</span>
          </p>
          <p>
            Stato: <span className="font-medium text-slate-800">{STATO_LABEL[item.stato] || item.stato}</span>
            {item.riferimento && (
              <>
                {" · "}
                <span className="break-all">{item.riferimento}</span>
              </>
            )}
          </p>
          {item.nota && <p className="text-slate-500 break-words">{item.nota}</p>}
        </div>

        {!chiusa && (
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {item.stato !== "da_approvare" && (
              <button
                onClick={() => onSegna(item, "da_approvare", {})}
                disabled={inCorso}
                className="text-xs font-semibold px-4 py-2 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
              >
                Pronta da approvare
              </button>
            )}
            <button
              onClick={() => setApertoForm((v) => !v)}
              disabled={inCorso}
              aria-expanded={apertoForm}
              className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
            >
              {inCorso ? "Salvo…" : "Segna consegnata"}
            </button>
          </div>
        )}

        {apertoForm && !chiusa && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Riferimento
              </span>
              <input
                type="text"
                value={riferimento}
                onChange={(e) => setRiferimento(e.target.value)}
                placeholder="Link al documento consegnato, o dove sta"
                className="mt-1 w-full text-sm px-3 py-2 rounded border border-gray-300 focus:border-slate-900 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Nota
              </span>
              <input
                type="text"
                value={notaTesto}
                onChange={(e) => setNotaTesto(e.target.value)}
                placeholder="Facoltativa"
                className="mt-1 w-full text-sm px-3 py-2 rounded border border-gray-300 focus:border-slate-900 focus:outline-none"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={conferma}
                disabled={inCorso}
                className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
              >
                Conferma consegna
              </button>
              <button
                onClick={() => setApertoForm(false)}
                className="text-xs font-semibold px-4 py-2 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export function ConsegneStart({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [inCorso, setInCorso] = useState(null);
  const [esito, setEsito] = useState(null);

  const load = useCallback(() => {
    setError(null);
    apiGet("/start/consegne")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(load, [load]);

  const onSegna = async (item, stato, { riferimento, nota }) => {
    const chiave = `${item.client_id}-${item.tappa}`;
    setInCorso(chiave);
    setEsito(null);
    try {
      await apiPost("/start/consegne/segna", {
        client_id: item.client_id,
        tappa: item.tappa,
        stato,
        riferimento: riferimento || null,
        nota: nota || null,
      });
      setEsito({
        ok: true,
        testo:
          stato === "consegnata"
            ? `Tappa ${item.tappa} di ${item.nome || item.email}: consegnata.`
            : `Tappa ${item.tappa} di ${item.nome || item.email}: in attesa della tua approvazione.`,
      });
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setEsito({ ok: false, testo: `Tappa ${item.tappa}: ${e.message}` });
    } finally {
      setInCorso(null);
    }
  };

  if (error) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="text-slate-700 mb-4">Errore nel caricamento: {error}</p>
        <button
          onClick={load}
          className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
        >
          Riprova
        </button>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Consegne Start</h1>
      <p className="text-slate-500 mb-6">
        Le tre tappe che ogni cliente Ciak Start ha ricevuto per iscritto, con le date
        promesse nella sua email di attivazione. {data.totale_clienti}{" "}
        {data.totale_clienti === 1 ? "cliente" : "clienti"} · {data.totale_tappe} tappe ·{" "}
        {data.consegnate} {data.consegnate === 1 ? "gia' consegnata" : "gia' consegnate"}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Riquadro
          etichetta="Tappe scadute"
          valore={data.scadute}
          dettaglio="La data promessa al cliente e' passata"
          tono={data.scadute > 0 ? "red" : "slate"}
        />
        <Riquadro
          etichetta="Entro 48 ore"
          valore={data.entro_48_ore}
          dettaglio="Dovrebbero essere gia' sulla tua scrivania per l'approvazione"
          tono={data.entro_48_ore > 0 ? "amber" : "slate"}
        />
      </div>

      {esito && (
        <p
          role="status"
          className={`text-sm mb-4 px-4 py-3 rounded-xl border ${
            esito.ok
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {esito.testo}
        </p>
      )}

      {data.totale_tappe === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-slate-900 font-medium mb-1">Nessun cliente Ciak Start attivo.</p>
          <p className="text-slate-500 text-sm">
            Le tappe compaiono qui appena un cliente riceve l'accesso: le date sono quelle
            della sua email di attivazione.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((item) => (
            <VoceTappa
              key={`${item.client_id}-${item.tappa}`}
              item={item}
              onSegna={onSegna}
              inCorso={inCorso === `${item.client_id}-${item.tappa}`}
            />
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400 mt-6">
        Lo step 7 del percorso (revisione finale e readiness partnership) non compare qui:
        l'email non gli promette nessuna data.
      </p>

      <button
        onClick={load}
        className="mt-4 text-xs font-semibold px-4 py-2 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 transition"
      >
        Aggiorna
      </button>
    </div>
  );
}
