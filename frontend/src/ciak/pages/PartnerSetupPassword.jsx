/**
 * Ciak.io /partner/setup-password?token=...
 *
 * Pagina pubblica (NO login required) che il partner apre dal link nell'email
 * Systeme "Benvenuto in Partnership Ciak — Imposta la tua password".
 *
 * Flow:
 *   1. Verifica token via POST /api/partner/verify-setup-token
 *   2. Mostra welcome "Ciao {nome}" + form nuova password
 *   3. Submit POST /api/partner/setup-password → JWT + auto-login
 *   4. Salva token in localStorage ciak_partner_token + redirect /partner
 *
 * Pattern lockato 17/5/2026 — sostituisce il vecchio invio password generata
 * via SMTP (fragile su Cloud Run, DNS register.it fallisce). Vedi memory
 * session_2026_05_16_admin_ciak_completion.md "saga email checkpoint".
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

const MIN_PASSWORD_LEN = 8;

export function PartnerSetupPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");

  const [phase, setPhase] = useState("verifying"); // verifying | ready | submitting | done | invalid
  const [contactInfo, setContactInfo] = useState(null); // {email, nome, expires_at}
  const [error, setError] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verifica token al primo render
  useEffect(() => {
    if (!token) {
      setError("Link non valido: token mancante");
      setPhase("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/partner/verify-setup-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error || "Link non valido");
          setPhase("invalid");
          return;
        }
        setContactInfo({ email: data.email, nome: data.nome, expires_at: data.expires_at });
        setPhase("ready");
      } catch (e) {
        setError("Errore di rete. Riprova.");
        setPhase("invalid");
      }
    })();
  }, [token]);

  const submit = async () => {
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`La password deve avere almeno ${MIN_PASSWORD_LEN} caratteri.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Le due password non coincidono.");
      return;
    }
    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/partner/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || "Errore durante il salvataggio");
        setPhase("ready");
        return;
      }
      // Auto-login: salva JWT + user, redirect /partner
      if (data.access_token) {
        localStorage.setItem("ciak_partner_token", data.access_token);
        if (data.user) {
          localStorage.setItem("ciak_partner_user", JSON.stringify(data.user));
        }
      }
      setPhase("done");
      // Breve pausa per mostrare "Pronto" prima del redirect
      setTimeout(() => navigate("/partner", { replace: true }), 1200);
    } catch (e) {
      setError("Errore di rete. Riprova.");
      setPhase("ready");
    }
  };

  return (
    <>
      <CiakHeader />

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-xl px-6 pt-16 pb-12">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Partnership Ciak — Setup account
          </p>
          {phase === "verifying" && (
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">
              Verifica del link…
            </h1>
          )}
          {phase === "invalid" && (
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">
              Link non valido
            </h1>
          )}
          {phase === "ready" && contactInfo && (
            <>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">
                {contactInfo.nome ? `Ciao ${contactInfo.nome},` : "Ciao,"}
              </h1>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Scegli una password per accedere alla tua area partner Ciak.
                Useremo <strong>{contactInfo.email}</strong> come email di login.
              </p>
            </>
          )}
          {phase === "submitting" && (
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">
              Sto salvando la password…
            </h1>
          )}
          {phase === "done" && (
            <>
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-3">
                Tutto pronto.
              </h1>
              <p className="text-base md:text-lg text-slate-300 leading-relaxed">
                Ti porto subito alla tua area partner.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-xl px-6 py-12">
          {phase === "verifying" && (
            <p className="text-slate-500 text-center">Un attimo…</p>
          )}

          {phase === "invalid" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-red-800 text-sm leading-relaxed mb-3">
                <strong>{error}</strong>
              </p>
              <p className="text-slate-700 text-sm leading-relaxed">
                Se hai appena completato il pagamento e questo link non funziona,
                contatta <a href="mailto:assistenza@evolution-pro.it" className="text-yellow-600 underline">assistenza@evolution-pro.it</a>
                {" "}— ti rigeneriamo un link in pochi minuti.
              </p>
            </div>
          )}

          {(phase === "ready" || phase === "submitting") && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Nuova password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={`Almeno ${MIN_PASSWORD_LEN} caratteri`}
                    disabled={phase === "submitting"}
                    className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-slate-500 disabled:bg-gray-100"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? "Nascondi" : "Mostra"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Conferma password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Ripeti la password"
                  disabled={phase === "submitting"}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-slate-500 disabled:bg-gray-100"
                />
              </div>

              {error && (
                <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={phase === "submitting"}
                className="w-full px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-gray-300 disabled:text-gray-500 text-yellow-400 font-semibold rounded-lg transition"
              >
                {phase === "submitting" ? "Salvataggio…" : "Imposta password e accedi →"}
              </button>

              <p className="text-xs text-slate-400 text-center leading-relaxed mt-2">
                Scegli una password che ricorderai. Potrai recuperarla via email
                in futuro se la dimentichi.
              </p>
            </div>
          )}

          {phase === "done" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <p className="text-emerald-800 font-medium">✓ Password salvata.</p>
              <p className="text-slate-600 text-sm mt-2">Caricamento dell'area partner…</p>
            </div>
          )}
        </div>
      </section>

      <CiakFooter />
    </>
  );
}
