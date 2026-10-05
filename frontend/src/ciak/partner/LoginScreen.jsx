import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, requestPasswordReset } from "./api";

// Login dell'area partner (ciak.io/partner). Pensato per chi ha poca dimestichezza:
// etichette sempre visibili (il segnaposto sparisce appena si scrive), il browser può
// ricordare le credenziali, "Mostra password" per controllare cosa si è scritto, un
// solo invio con il tasto Invio o con "Entra".

const FIELD =
  "w-full px-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-yellow-400";
const LABEL = "block text-sm font-medium text-slate-200 mb-1.5";
const PRIMARY =
  "w-full min-h-[48px] px-6 py-3 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 disabled:opacity-50 transition";
const LINK =
  "w-full min-h-[44px] text-slate-300 hover:text-white text-sm underline underline-offset-4 transition";

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Kicker() {
  return (
    <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-2">
      Ciak — Area Partner
    </p>
  );
}

/**
 * Schermata "Password dimenticata".
 *
 * Non è una rotta separata: LoginScreen la mostra al posto del form quando
 * l'utente clicca il link. Chi ha perso la password non è autenticato, quindi
 * non può passare da /partner/* (tutto sotto login) — un toggle qui evita di
 * aggiungere una rotta pubblica solo per questo.
 *
 * Il backend risponde sempre ok: il messaggio di conferma è quindi condizionale
 * ("se l'indirizzo è registrato"), mai un "email inviata" che rivelerebbe chi
 * esiste a chi prova indirizzi a caso.
 */
export function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Inserisci la tua email");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  };

  if (sent) {
    return (
      <Shell>
        <Kicker />
        <h1 className="text-2xl font-semibold text-white mb-3">Controlla la posta</h1>
        <p className="text-slate-300 text-sm leading-relaxed mb-2">
          Se <span className="text-white">{email.trim().toLowerCase()}</span> è
          registrato, tra pochi minuti arriva un'email con il link per scegliere
          una nuova password. Il link vale 24 ore.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Non la trovi? Guarda nello spam. Se non arriva, scrivi a
          assistenza@evolution-pro.it.
        </p>
        <button onClick={onBack} className={PRIMARY}>
          Torna al login
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} noValidate>
        <Kicker />
        <h1 className="text-2xl font-semibold text-white mb-2">Password dimenticata</h1>
        <p className="text-slate-300 text-sm mb-8">
          Scrivi l'email con cui accedi. Ti mandiamo un link per scegliere una
          nuova password.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className={LABEL}>Email</label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua-email@esempio.it"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? "forgot-error" : undefined}
              className={FIELD}
            />
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className={PRIMARY}>
            {busy ? "Invio…" : "Mandami il link"}
          </button>
          {error && (
            <p id="forgot-error" role="alert" className="text-yellow-300 text-sm">
              {error}
            </p>
          )}
          <button type="button" onClick={onBack} className={LINK}>
            Torna al login
          </button>
        </div>
      </form>
    </Shell>
  );
}

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Inserisci email e password");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await login(email, password);
    setBusy(false);
    if (res.ok) onLogin(res.user);
    else setError(res.error);
  };

  if (forgot) return <ForgotPasswordScreen onBack={() => setForgot(false)} />;

  return (
    <Shell>
      <form onSubmit={submit} noValidate>
        <Kicker />
        <h1 className="text-2xl font-semibold text-white mb-2">Accedi</h1>
        <p className="text-slate-300 text-sm mb-8">Entra con la tua email e la tua password.</p>
        <div className="space-y-4">
          <div>
            <label htmlFor="login-email" className={LABEL}>Email</label>
            <input
              id="login-email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua-email@esempio.it"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={FIELD}
            />
          </div>
          <div>
            <label htmlFor="login-password" className={LABEL}>Password</label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="La tua password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className={`${FIELD} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                className="absolute right-0 top-0 h-full w-12 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className={PRIMARY}>
            {busy ? "Entro…" : "Entra"}
          </button>
          {error && (
            <p id="login-error" role="alert" className="text-yellow-300 text-sm">
              {error}
            </p>
          )}
          <button type="button" onClick={() => setForgot(true)} className={LINK}>
            Password dimenticata?
          </button>
        </div>
      </form>
    </Shell>
  );
}

export default LoginScreen;
