/**
 * Start Plus: le quattro voci del passo "Il tuo primo prodotto".
 *
 * Lo stato di ogni voce lo scrive una persona; nessun automatismo segna "consegnato".
 * Il passo si chiude solo col via finale, che il backend concede a voci tutte consegnate.
 *
 * Design: perimetro interno (admin Ciak), brand lock. Slate/giallo `#FACC15` come il resto
 * della pagina, nessun effetto decorativo. Bersagli >= 44 px e focus visibile.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut } from "../api";

export const STATI_VOCE = [
  { id: "da_fare", label: "Da fare" },
  { id: "in_lavorazione", label: "In lavorazione" },
  { id: "consegnato", label: "Consegnato" },
];

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900";
const CAMPO = `w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 ${FOCUS}`;

function messaggioErrore(err) {
  const testo = String(err?.message || "");
  const dopo = testo.indexOf(": ");
  if (dopo !== -1) {
    try {
      const detail = JSON.parse(testo.slice(dopo + 2))?.detail;
      if (typeof detail === "string") return detail;
    } catch {
      // risposta non JSON: mostro il testo grezzo
    }
  }
  return testo || "Operazione non riuscita.";
}

function VoceRiga({ voce, clientId, onAggiornata }) {
  const [stato, setStato] = useState(voce.stato);
  const [valore, setValore] = useState(voce.valore || "");
  const [nota, setNota] = useState(voce.nota || "");
  const [salvo, setSalvo] = useState(false);
  const conLink = voce.chiave === "pagina_vendita" || voce.chiave === "checkout";

  const salva = async () => {
    setSalvo(true);
    try {
      const res = await apiPut(`/start/${clientId}/primo-prodotto/voce`, {
        voce: voce.chiave, stato, valore, nota,
      });
      onAggiornata(res);
      toast.success(`${voce.label}: salvato`);
    } catch (err) {
      toast.error(messaggioErrore(err));
    } finally {
      setSalvo(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" data-testid={`voce-${voce.chiave}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`stato-${clientId}-${voce.chiave}`} className="text-sm font-semibold text-slate-900">
          {voce.label}
        </label>
        <select
          id={`stato-${clientId}-${voce.chiave}`}
          value={stato}
          onChange={(e) => setStato(e.target.value)}
          className={`min-h-[44px] rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 ${FOCUS}`}
        >
          {STATI_VOCE.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
      {conLink ? (
        <input
          aria-label={`${voce.label}: link`}
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          placeholder="https://..."
          className={`mt-3 min-h-[44px] ${CAMPO}`}
        />
      ) : (
        <textarea
          aria-label={`${voce.label}: testo`}
          value={valore}
          onChange={(e) => setValore(e.target.value)}
          rows={3}
          className={`mt-3 ${CAMPO}`}
        />
      )}
      <input
        aria-label={`${voce.label}: nota`}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota interna (facoltativa)"
        className={`mt-2 min-h-[44px] ${CAMPO}`}
      />
      <button
        type="button"
        onClick={salva}
        disabled={salvo}
        className={`mt-3 min-h-[44px] rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-700 active:bg-slate-800 disabled:opacity-50 ${FOCUS}`}
      >
        {salvo ? "Salvo..." : "Salva voce"}
      </button>
    </div>
  );
}

export function PrimoProdottoPanel({ clientId }) {
  const [dati, setDati] = useState(null);
  const [errore, setErrore] = useState(null);
  const [inCorso, setInCorso] = useState(false);

  const carica = useCallback(async () => {
    try {
      setDati(await apiGet(`/start/${clientId}/primo-prodotto`));
      setErrore(null);
    } catch (err) {
      setErrore(messaggioErrore(err));
    }
  }, [clientId]);

  useEffect(() => {
    carica();
  }, [carica]);

  const darViaFinale = async () => {
    setInCorso(true);
    try {
      setDati(await apiPost(`/start/${clientId}/primo-prodotto/via-finale`, {}));
      toast.success("Primo prodotto: via finale dato");
    } catch (err) {
      toast.error(messaggioErrore(err));
    } finally {
      setInCorso(false);
    }
  };

  if (errore) return <p role="alert" className="p-4 text-sm text-rose-700">{errore}</p>;
  if (!dati) return <p className="p-4 text-sm text-slate-500">Carico il primo prodotto...</p>;

  const chiuso = Boolean(dati.via_finale);
  const pronto = dati.mancanti.length === 0;

  return (
    <div className="space-y-4 p-4" data-testid="primo-prodotto-panel">
      <div className="grid gap-4 md:grid-cols-2">
        {dati.voci.map((voce) => (
          <VoceRiga
            key={`${voce.chiave}-${voce.aggiornata_il || "nuova"}`}
            voce={voce}
            clientId={clientId}
            onAggiornata={setDati}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        {chiuso ? (
          <p className="text-sm font-medium text-emerald-700" data-testid="via-finale-dato">
            Via finale dato da {dati.via_finale.da}. Il passo è chiuso.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={darViaFinale}
              disabled={!pronto || inCorso}
              className={`min-h-[44px] rounded-md bg-yellow-400 px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-yellow-300 active:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS}`}
            >
              {inCorso ? "Invio..." : "Dai il via finale"}
            </button>
            <p className="text-sm text-slate-600" data-testid="via-finale-mancanti">
              {pronto
                ? "Le quattro voci sono consegnate: puoi chiudere il passo."
                : `Per chiudere il passo mancano: ${dati.mancanti.join(", ")}.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
