/**
 * Ciak Admin — Consegne mancate.
 *
 * Risponde a una sola domanda: "chi ha pagato e non ha ricevuto?"
 *
 * Il backend persisteva gia' ogni indizio di fallimento
 * (finalizzazione_partnership.<effetto>="failed", bozza_errore,
 * ciak_client_access_recovery, ciak_orphan_purchases) ma nessuna schermata li
 * leggeva: un cliente poteva pagare 2.790 EUR e restare senza account senza
 * che nessuno se ne accorgesse.
 *
 * Backend: GET  /api/admin/ciak/consegne-mancate
 *          POST /api/admin/ciak/consegne-mancate/retry-partnership
 *
 * Design system: quello dell'admin Ciak (card bianche, bordo grigio, accento
 * giallo #FACC15 su slate-900). Nessun elemento nuovo introdotto.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";

const SEVERITY = {
  critica: {
    label: "Critica",
    badge: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-500",
  },
  alta: {
    label: "Alta",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
  },
  media: {
    label: "Media",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    bar: "bg-slate-400",
  },
};

const TIPO_LABEL = {
  partnership_finalizzazione: "Partnership",
  analisi_non_consegnata: "Analisi Blueprint",
  accesso_blueprint: "Accesso cliente",
  acquisto_orfano: "Acquisto orfano",
};

function fmtOre(ore) {
  if (ore === null || ore === undefined) return "—";
  if (ore < 1) return "meno di un'ora fa";
  if (ore < 24) return `${Math.floor(ore)} ore fa`;
  const giorni = Math.floor(ore / 24);
  return giorni === 1 ? "1 giorno fa" : `${giorni} giorni fa`;
}

function fmtEuro(valore) {
  if (!valore) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(valore);
}

function Riquadro({ etichetta, valore, tono = "slate" }) {
  // Il giallo del brand (#FACC15) vive su fondo scuro: come testo su bianco sta
  // a ~2,2:1 di contrasto, sotto la soglia WCAG anche per il testo grande.
  // Per l'importo si usa quindi l'ambra scura, stessa famiglia cromatica e 4,6:1.
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
    </div>
  );
}

function VoceConsegna({ item, onRetry, inCorso }) {
  const sev = SEVERITY[item.severity] || SEVERITY.media;
  const effetti = [...(item.effetti_falliti || []), ...(item.effetti_incompleti || [])];

  return (
    <li className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex">
      {/* La barra di gravita' e' l'unico elemento cromatico forte: da sola
          ordina la lettura senza aggiungere rumore. */}
      <span className={`w-1 shrink-0 ${sev.bar}`} aria-hidden="true" />
      <div className="p-5 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${sev.badge}`}
              >
                {sev.label}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {TIPO_LABEL[item.tipo] || item.tipo}
              </span>
            </div>
            <p className="text-slate-900 font-medium">{item.titolo}</p>
            <p className="text-sm text-slate-600 mt-1 break-words">
              {item.email || "email non disponibile"}
              {item.nome ? ` · ${item.nome}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-semibold text-slate-900">{fmtEuro(item.importo_eur)}</p>
            <p className="text-xs text-slate-400">{fmtOre(item.pagato_da_ore)}</p>
          </div>
        </div>

        {effetti.length > 0 && (
          <p className="text-sm text-slate-600 mt-3">
            Passaggi non riusciti:{" "}
            <span className="font-medium text-slate-800">{effetti.join(", ")}</span>
          </p>
        )}
        {item.errore && (
          <p className="text-sm text-red-700 mt-2 break-words">{item.errore}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <p className="text-sm text-slate-500 flex-1 min-w-[16rem]">{item.azione}</p>
          {item.retriable && (
            <button
              onClick={() => onRetry(item.email)}
              disabled={inCorso}
              className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {inCorso ? "Riprovo…" : "Riprova consegna"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export function ConsegneMancate({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [retryEmail, setRetryEmail] = useState(null);
  const [esito, setEsito] = useState(null);

  const load = useCallback(() => {
    setError(null);
    apiGet("/consegne-mancate")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  useEffect(load, [load]);

  const onRetry = async (email) => {
    setRetryEmail(email);
    setEsito(null);
    try {
      const res = await apiPost("/consegne-mancate/retry-partnership", { email });
      setEsito({
        ok: true,
        testo: res.already_complete
          ? `${email}: risultava gia' completata.`
          : `${email}: consegna completata.`,
      });
      load();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setEsito({ ok: false, testo: `${email}: ${e.message}` });
    } finally {
      setRetryEmail(null);
    }
  };

  if (error) {
    return (
      <div className="p-10 max-w-6xl">
        <p className="text-slate-700 mb-4">Errore nel caricamento: {error}</p>
        <button
          onClick={load}
          className="text-xs font-semibold px-4 py-2 rounded bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
        >
          Riprova
        </button>
      </div>
    );
  }
  if (!data) return <div className="p-10 text-slate-400">Caricamento…</div>;

  const critiche = data.items.filter((i) => i.severity === "critica").length;

  return (
    <div className="p-10 max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Consegne mancate</h1>
      <p className="text-slate-500 mb-6">
        Clienti che hanno pagato e non hanno ricevuto quello per cui hanno pagato.
        La lista si costruisce dagli errori registrati dal sistema, non da una segnalazione.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Riquadro etichetta="Da sistemare" valore={data.totale} />
        <Riquadro
          etichetta="Critiche"
          valore={critiche}
          tono={critiche > 0 ? "red" : "slate"}
        />
        <Riquadro
          etichetta="Importo a rischio"
          valore={fmtEuro(data.importo_a_rischio_eur)}
          tono={data.importo_a_rischio_eur > 0 ? "amber" : "slate"}
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

      {data.totale === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-slate-900 font-medium mb-1">Nessuna consegna mancata.</p>
          <p className="text-slate-500 text-sm">
            Ogni pagamento registrato risulta consegnato. La pagina si aggiorna a ogni apertura.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((item, i) => (
            <VoceConsegna
              key={`${item.tipo}-${item.riferimento}-${i}`}
              item={item}
              onRetry={onRetry}
              inCorso={retryEmail === item.email}
            />
          ))}
        </ul>
      )}

      <button
        onClick={load}
        className="mt-6 text-xs font-semibold px-4 py-2 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 transition"
      >
        Aggiorna
      </button>
    </div>
  );
}
