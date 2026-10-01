import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { clientGet, clientPut } from "../api";
import { START_DOMANDE, MIN_CARATTERI } from "../startDomande";

/**
 * Le domande di Ciak Start: una alla volta, parole semplici, si salva da sola.
 * Con queste risposte il team prepara la prima tappa (marchio e "chi sei").
 */
export function StartDomandePage({ dashboard }) {
  const consegne = dashboard?.start?.consegne || [];
  const [risposte, setRisposte] = useState({});
  const [indice, setIndice] = useState(0);
  const [caricamento, setCaricamento] = useState(true);
  const [inviate, setInviate] = useState(false);
  const [modifica, setModifica] = useState(false);
  const [salvataggio, setSalvataggio] = useState("");
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);
  const campoRef = useRef(null);

  useEffect(() => {
    let annullato = false;
    clientGet("/start/risposte")
      .then((dati) => {
        if (annullato) return;
        const date = dati.answers || {};
        setRisposte(date);
        if (dati.completato_at) {
          setInviate(true);
        } else {
          // Si riparte dalla prima domanda senza risposta utile.
          const prima = START_DOMANDE.findIndex((d) => (date[d.id] || "").trim().length < MIN_CARATTERI);
          setIndice(prima === -1 ? START_DOMANDE.length - 1 : prima);
        }
      })
      .catch((e) => {
        if (!annullato) setErrore(e.message === "AUTH_EXPIRED" ? "La sessione è scaduta: riapri il link che ti abbiamo mandato." : "Non riesco a caricare le domande. Riprova fra poco.");
      })
      .finally(() => {
        if (!annullato) setCaricamento(false);
      });
    return () => {
      annullato = true;
    };
  }, []);

  useEffect(() => {
    if (campoRef.current) campoRef.current.focus();
  }, [indice, caricamento, inviate, modifica]);

  const domanda = START_DOMANDE[indice];
  const testo = risposte[domanda?.id] || "";
  const utile = testo.trim().length >= MIN_CARATTERI;
  const ultima = indice === START_DOMANDE.length - 1;

  async function salva(id) {
    const valore = risposte[id];
    if (valore === undefined) return true;
    setSalvataggio("Salvo...");
    try {
      await clientPut("/start/risposte", { answers: { [id]: valore } });
      setSalvataggio("Salvato");
      setErrore("");
      return true;
    } catch (e) {
      setSalvataggio("");
      setErrore("Non sono riuscito a salvare. Controlla la connessione e riprova.");
      return false;
    }
  }

  async function vai(passo) {
    if (await salva(domanda.id)) setIndice((i) => Math.min(Math.max(i + passo, 0), START_DOMANDE.length - 1));
  }

  async function invia() {
    setInvio(true);
    setErrore("");
    try {
      await clientPut("/start/risposte", { answers: risposte, completato: true });
      setInviate(true);
      setModifica(false);
    } catch (e) {
      if (e.mancanti && e.mancanti.length) {
        const primo = START_DOMANDE.findIndex((d) => e.mancanti.includes(d.id));
        if (primo !== -1) setIndice(primo);
        setErrore("Manca ancora una risposta: l'ho aperta qui sotto.");
      } else {
        setErrore("Non sono riuscito a inviare. Riprova fra poco.");
      }
    } finally {
      setInvio(false);
    }
  }

  if (caricamento) {
    return <p className="text-sm text-slate-500">Un attimo, preparo le tue domande...</p>;
  }

  if (inviate && !modifica) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" data-testid="domande-inviate">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">Ciak Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Grazie, abbiamo le tue risposte</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          Da qui ci pensiamo noi. Prepariamo il tuo marchio e le frasi che spiegano chi sei e cosa offri,
          e prima di mandarteli li controlliamo uno per uno.
          {consegne[0] ? ` La prima tappa arriva entro il ${consegne[0]}.` : ""}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/cliente/start/marchio"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-yellow-400 px-6 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300"
          >
            Ora il tuo marchio
          </Link>
          <Link
            to="/cliente/start"
            className="inline-flex min-h-[48px] items-center rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500"
          >
            Torna al tuo percorso
          </Link>
          <button
            type="button"
            onClick={() => {
              setIndice(0);
              setModifica(true);
            }}
            className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500"
          >
            Voglio cambiare una risposta
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-yellow-600">
        Domanda {indice + 1} di {START_DOMANDE.length}
      </p>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={START_DOMANDE.length}
        aria-valuenow={indice + 1}
        aria-label="Avanzamento delle domande"
      >
        <div className="h-full bg-yellow-400" style={{ width: `${((indice + 1) / START_DOMANDE.length) * 100}%` }} />
      </div>

      <h1 className="mt-5 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{domanda.domanda}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{domanda.hint}</p>

      <label htmlFor="risposta" className="sr-only">
        La tua risposta
      </label>
      <textarea
        id="risposta"
        ref={campoRef}
        value={testo}
        onChange={(e) => setRisposte((r) => ({ ...r, [domanda.id]: e.target.value }))}
        onBlur={() => salva(domanda.id)}
        rows={6}
        maxLength={2000}
        placeholder="Scrivi qui con parole tue"
        className="mt-4 w-full rounded-xl border border-slate-300 p-4 text-base leading-relaxed text-slate-900 outline-none focus:border-slate-900 focus-visible:ring-2 focus-visible:ring-yellow-400"
      />

      <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">Un esempio: </span>
        {domanda.esempio}
      </div>

      <p className="mt-3 min-h-[1.25rem] text-sm" aria-live="polite">
        {errore ? <span className="text-red-700">{errore}</span> : <span className="text-slate-400">{salvataggio}</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => vai(-1)}
          disabled={indice === 0}
          className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-6 text-base font-medium text-slate-700 transition-colors duration-200 hover:border-slate-500 disabled:opacity-40"
        >
          Indietro
        </button>
        {ultima ? (
          <button
            type="button"
            onClick={invia}
            disabled={invio || !utile}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300 disabled:opacity-50"
          >
            {invio ? "Invio..." : "Invia le risposte"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => vai(1)}
            disabled={!utile}
            className="min-h-[48px] rounded-xl bg-yellow-400 px-8 text-base font-semibold text-slate-900 transition-colors duration-200 hover:bg-yellow-300 disabled:opacity-50"
          >
            Avanti
          </button>
        )}
      </div>
      {!utile && (
        <p className="mt-3 text-sm text-slate-500">Scrivi almeno qualche parola per andare avanti.</p>
      )}
    </section>
  );
}
