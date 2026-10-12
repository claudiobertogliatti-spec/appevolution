/**
 * Cronologia di un contatto + il suo prossimo passo (scheda lead).
 * Mostra solo eventi con una data vera nelle fonti di Ciak. Telefonate e messaggi fatti fuori
 * da Ciak non sono registrati: la nota in fondo lo dice, non lo nasconde.
 */
import { useCallback, useEffect, useState } from "react";
import { apiGet, SCOPE_DENIED_DETAIL } from "../api";
import { PassoPannello, dataIt, oggiISO } from "./PassoPannello";

const quando = (iso) => {
  try {
    return new Date(iso).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

export function CronologiaLead({ email, nome, onAuthExpired }) {
  const [dati, setDati] = useState(undefined); // undefined = carico · null = non disponibile · {eventi, passo}
  const [apri, setApri] = useState(false);
  const [nascosta, setNascosta] = useState(false);

  const carica = useCallback(() => {
    apiGet("/cronologia", { email })
      .then((r) => setDati(Array.isArray(r?.eventi) ? r : null))
      .catch((e) => {
        if (e?.message === "AUTH_EXPIRED") return onAuthExpired?.();
        if (e?.message === SCOPE_DENIED_DETAIL) return setNascosta(true);
        if (/Errore 404/.test(String(e?.message))) return setDati({ eventi: [], passo: null });
        setDati(null);
      });
  }, [email, onAuthExpired]);

  useEffect(() => { carica(); }, [carica]);

  if (nascosta) return null;
  const passo = dati?.passo;
  const scaduto = passo && passo.scadenza < oggiISO();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">Cronologia e prossimo passo</h2>

      {dati === undefined && <p className="text-sm text-slate-500">Carico…</p>}
      {dati === null && (
        <p className="text-sm text-slate-600">Cronologia non disponibile. <button type="button" onClick={carica} className="font-semibold underline underline-offset-2">Riprova</button></p>
      )}

      {dati && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            {passo ? (
              <p className="text-sm text-slate-900">
                <span className="font-semibold">Prossimo passo:</span> {passo.testo}{" "}
                <span className={scaduto ? "font-semibold text-red-700" : "text-slate-500"}>
                  {scaduto ? "scaduto il" : "entro il"} {dataIt(passo.scadenza)}
                </span>
              </p>
            ) : (
              <p className="text-sm font-semibold text-amber-800">Manca il prossimo passo.</p>
            )}
            <button type="button" onClick={() => setApri(true)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-yellow-400 hover:bg-slate-800">
              {passo ? "Cambia o chiudi" : "Imposta"}
            </button>
          </div>

          {dati.eventi.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nessun evento registrato.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {dati.eventi.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex gap-4 text-sm">
                  <span className="w-32 flex-shrink-0 tabular-nums text-slate-500">{quando(e.at)}</span>
                  <span className="min-w-0 text-slate-900">
                    <span className="font-semibold">{e.titolo}</span>
                    {e.dettaglio ? <span className="text-slate-600"> — {e.dettaglio}</span> : null}
                    {e.autore ? <span className="text-slate-400"> · {e.autore}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-xs text-slate-500">Qui compare solo ciò che Ciak ha registrato. Telefonate e messaggi fatti altrove non ci sono.</p>
        </>
      )}

      {apri && (
        <PassoPannello
          email={email}
          nome={nome}
          passo={passo}
          onClose={() => setApri(false)}
          onSalvato={carica}
          onFatto={carica}
          onAuthExpired={onAuthExpired}
        />
      )}
    </div>
  );
}

export default CronologiaLead;
