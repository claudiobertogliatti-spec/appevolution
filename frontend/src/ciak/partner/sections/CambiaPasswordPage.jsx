/**
 * Ciak Partner — /partner/cambia-password
 *
 * Cambio password self-service per l'utente autenticato (partner o admin).
 * Chiama POST /api/auth/change-password (già esistente nel backend), che
 * richiede la password attuale + la nuova e aggiorna SIA `hashed_password`
 * SIA `password_hash`, azzerando `must_change_password`.
 *
 * La logica di rete è in ../api.js → changePassword(), che di proposito NON
 * passa da authFetch: l'endpoint risponde 401 anche quando la password
 * ATTUALE è errata, e authFetch sloggherebbe l'utente su qualunque 401.
 */
import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { changePassword } from "../api";

const MIN_LEN = 8;

export function CambiaPasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShow(false);
  };

  const submit = async () => {
    setError(null);

    // Validazioni lato client (allineate al backend)
    if (!current) {
      setError("Inserisci la password attuale.");
      return;
    }
    if (next.length < MIN_LEN) {
      setError(`La nuova password deve avere almeno ${MIN_LEN} caratteri.`);
      return;
    }
    if (next === current) {
      setError("La nuova password deve essere diversa da quella attuale.");
      return;
    }
    if (next !== confirm) {
      setError("Le due nuove password non coincidono.");
      return;
    }

    setBusy(true);
    const res = await changePassword(current, next);
    setBusy(false);

    if (res.ok) {
      reset();
      setDone(true);
    } else {
      setError(res.error);
    }
  };

  // ─── Stato: password aggiornata ───────────────────────────
  if (done) {
    return (
      <div className="max-w-lg mx-auto px-6 py-10 font-[Poppins,system-ui,sans-serif]">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-extrabold text-slate-900 mb-1">Password aggiornata</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            La prossima volta che accedi usa la nuova password. La sessione
            attuale resta valida.
          </p>
          <button
            onClick={() => setDone(false)}
            className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 text-yellow-400 text-xs font-bold hover:bg-slate-800 transition"
          >
            Cambia di nuovo
          </button>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto px-6 py-10 font-[Poppins,system-ui,sans-serif]">
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-slate-900 text-yellow-400 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Cambia password</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        Aggiorna la password del tuo account Evolution PRO. Ti serve la password
        attuale.
      </p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {/* Password attuale */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Password attuale
          </label>
          <input
            type={show ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            disabled={busy}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100"
          />
        </div>

        {/* Nuova password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Nuova password
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder={`Almeno ${MIN_LEN} caratteri`}
              autoComplete="new-password"
              disabled={busy}
              className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              aria-label={show ? "Nascondi password" : "Mostra password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Conferma nuova password */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Conferma nuova password
          </label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ripeti la nuova password"
            autoComplete="new-password"
            disabled={busy}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-slate-100"
          />
        </div>

        {error && (
          <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full px-6 py-3 rounded-lg bg-slate-900 text-yellow-400 font-bold hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition"
        >
          {busy ? "Aggiornamento…" : "Aggiorna password"}
        </button>
      </div>
    </div>
  );
}

export default CambiaPasswordPage;
