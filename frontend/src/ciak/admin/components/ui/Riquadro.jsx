/**
 * Riquadro — sezione lunga che si apre e si chiude con la freccia.
 *
 * Intestazione nel blu scuro della sidebar (slate-900, titolo bianco, freccia gialla).
 * Chiuso mostra il titolo e un riassunto (i numeri che servono a colpo d'occhio);
 * aperto mostra il contenuto. Tutta la riga d'intestazione e' cliccabile, ma il
 * controllo vero e' un solo `<button aria-expanded>` dentro l'`<h2>`: il nome del
 * titolo resta pulito, il riassunto e' collegato con `aria-describedby`.
 *
 * `state`: "loading" | "error" | "ok". Una fonte che non risponde non diventa mai
 * uno zero: dice "Dato non disponibile" con "Riprova".
 *
 * Ricorda cosa e' aperto in questo browser (localStorage, solo comodita': se non e'
 * disponibile, parte chiuso). Il contenuto resta montato anche da chiuso (`hidden`).
 */
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

const CHIAVE = "ciak_admin_home_riquadri";

function leggiAperti() {
  try {
    const v = JSON.parse(window.localStorage.getItem(CHIAVE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function salvaAperto(id, aperto) {
  try {
    const set = new Set(leggiAperti());
    if (aperto) set.add(id); else set.delete(id);
    window.localStorage.setItem(CHIAVE, JSON.stringify([...set]));
  } catch {
    /* niente storage: il riquadro funziona lo stesso */
  }
}

export function Riquadro({ id, title, summary, state = "ok", onRetry, children }) {
  const uid = useId();
  const [aperto, setAperto] = useState(() => leggiAperti().includes(id));
  const corpoId = `${uid}-corpo`;
  const sommId = `${uid}-somm`;

  const riassunto = state === "loading" ? "…" : state === "error" ? "Dato non disponibile" : summary;

  return (
    <section id={id} aria-labelledby={`${uid}-t`} className="overflow-hidden rounded-2xl border border-slate-900 bg-white scroll-mt-6">
      <div className="relative flex items-center gap-4 bg-slate-900 px-5 py-4">
        <h2 id={`${uid}-t`} className="text-lg font-semibold text-white flex-shrink-0">
          <button
            type="button"
            aria-expanded={aperto}
            aria-controls={corpoId}
            aria-describedby={sommId}
            onClick={() => { setAperto(!aperto); salvaAperto(id, !aperto); }}
            className="text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-yellow-400"
          >
            {title}
          </button>
        </h2>
        <p id={sommId} className="min-w-0 flex-1 truncate text-sm text-slate-300">{riassunto}</p>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-yellow-400 transition-transform motion-reduce:transition-none ${aperto ? "rotate-180" : ""}`}
          aria-hidden
        />
      </div>
      <div id={corpoId} hidden={!aperto} className="px-5 pb-5 pt-4">
        {state === "loading" ? (
          <p className="text-sm text-slate-400" aria-busy="true">Caricamento…</p>
        ) : state === "error" ? (
          <p className="text-sm text-slate-600">
            Dato non disponibile.{" "}
            <button type="button" onClick={onRetry} className="font-semibold text-slate-900 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400">
              Riprova
            </button>
          </p>
        ) : children}
      </div>
    </section>
  );
}

export default Riquadro;
