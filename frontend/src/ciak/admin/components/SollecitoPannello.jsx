/**
 * Pannello «Sollecito»: Marco prepara la bozza, Claudio la legge, la modifica e SOLO con
 * «Invia» parte l'email. Niente parte da solo.
 *
 * - Bozza: POST /solleciti/bozza (non invia nulla). Se l'AI non risponde, il server manda una
 *   bozza base e lo dice (`da_ai: false`): qui viene mostrato.
 * - Invio: POST /solleciti/invia con `approvato: true` (il clic). Un errore si legge com'è.
 * - Sotto la bozza: i fatti che Marco conosce. Quello che non sta lì, non è nella bozza.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiPost } from "../api";

/** «Errore 409: {"detail":"..."}» → il testo del dettaglio, se c'è. */
export function messaggioErrore(e) {
  const m = String(e?.message || "");
  const d = m.match(/"detail"\s*:\s*"([^"]+)"/);
  return d ? d[1] : "Non sono riuscito a completare l'operazione. Riprova tra un momento.";
}

export function SollecitoPannello({ email, nome, onClose, onInviato, onAuthExpired }) {
  const [stato, setStato] = useState("carico"); // carico | pronta | invio | errore-bozza
  const [bozza, setBozza] = useState({ subject: "", body: "" });
  const [daAi, setDaAi] = useState(true);
  const [fatti, setFatti] = useState([]);
  const [errore, setErrore] = useState(null);
  const primoCampo = useRef(null);
  // Referenza stabile: se il genitore ricrea la funzione, la bozza non si ricarica.
  const authRef = useRef(onAuthExpired);
  authRef.current = onAuthExpired;

  useEffect(() => {
    let vivo = true;
    apiPost("/solleciti/bozza", { email })
      .then((r) => {
        if (!vivo) return;
        setBozza(r.bozza);
        setDaAi(r.da_ai === true);
        setFatti(Array.isArray(r.fatti) ? r.fatti : []);
        setStato("pronta");
      })
      .catch((e) => {
        if (!vivo) return;
        if (e?.message === "AUTH_EXPIRED") return authRef.current?.();
        setErrore(messaggioErrore(e));
        setStato("errore-bozza");
      });
    return () => { vivo = false; };
  }, [email]);

  useEffect(() => {
    if (stato === "pronta") primoCampo.current?.focus();
  }, [stato]);

  const invia = async () => {
    setErrore(null);
    setStato("invio");
    try {
      await apiPost("/solleciti/invia", {
        email,
        subject: bozza.subject,
        body: bozza.body,
        approvato: true,
      });
      onInviato?.(email);
      onClose();
    } catch (e) {
      if (e?.message === "AUTH_EXPIRED") return authRef.current?.();
      setErrore(messaggioErrore(e));
      setStato("pronta");
    }
  };

  const tasto = (e) => { if (e.key === "Escape" && stato !== "invio") onClose(); };
  const pronto = bozza.subject.trim().length >= 3 && bozza.body.trim().length >= 20;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6"
      onKeyDown={tasto}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="soll-titolo"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/agents/marco.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-2 ring-yellow-400 bg-slate-200" />
            <div>
              <h2 id="soll-titolo" className="text-xl font-semibold text-slate-900">Sollecito per {nome}</h2>
              <p className="text-sm text-slate-500">A: {email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={stato === "invio"}
            aria-label="Chiudi senza inviare"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {stato === "carico" && <p className="mt-6 text-sm text-slate-600" aria-live="polite">Marco sta scrivendo la bozza…</p>}

        {stato === "errore-bozza" && (
          <p className="mt-6 text-sm text-red-700" role="alert">{errore}</p>
        )}

        {(stato === "pronta" || stato === "invio") && (
          <>
            <p className={`mt-5 rounded-xl px-4 py-3 text-sm ${daAi ? "bg-slate-50 text-slate-600" : "bg-amber-50 text-amber-900"}`}>
              {daAi
                ? "Bozza scritta da Marco, un assistente AI di Ciak, solo con i fatti qui sotto. Leggila: non parte finché non premi Invia."
                : "Marco non ha potuto scrivere: questa è una bozza base, senza AI e senza dettagli. Completala tu prima di inviare."}
            </p>

            <label htmlFor="soll-oggetto" className="mt-5 block text-sm font-semibold text-slate-900">Oggetto</label>
            <input
              id="soll-oggetto"
              ref={primoCampo}
              value={bozza.subject}
              maxLength={200}
              onChange={(e) => setBozza({ ...bozza, subject: e.target.value.replace(/[\r\n]/g, " ") })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
            />

            <label htmlFor="soll-testo" className="mt-4 block text-sm font-semibold text-slate-900">Messaggio</label>
            <textarea
              id="soll-testo"
              value={bozza.body}
              maxLength={5000}
              rows={9}
              onChange={(e) => setBozza({ ...bozza, body: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-base leading-relaxed text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
            />

            {fatti.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-900">Cosa sa Marco</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                  {fatti.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}

            {errore && <p className="mt-4 text-sm text-red-700" role="alert">{errore}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={stato === "invio"}
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400"
              >
                Non inviare
              </button>
              <button
                type="button"
                onClick={invia}
                disabled={!pronto || stato === "invio"}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-yellow-400 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
              >
                {stato === "invio" ? "Invio…" : "Invia a " + email}
              </button>
            </div>
          </>
        )}

        {stato === "errore-bozza" && (
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:border-slate-900">
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SollecitoPannello;
