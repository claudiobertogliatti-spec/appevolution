/**
 * ForcePasswordChange — modal obbligatorio mostrato al primo login per utenti con
 * must_change_password=true (default per partner/clienti creati o resettati con
 * la password condivisa "Evolution2026!"). Sicurezza: nessuna escape (no chiusura,
 * no logout shortcut) — l'utente DEVE cambiare la password per accedere all'app.
 *
 * Decisione 2026-04-29 Claudio: tutti partner/clienti (vecchi e nuovi) hanno
 * password iniziale standard "Evolution2026!" + flag must_change_password=true.
 * Admin (Claudio + Antonella) esenti — admin_type="claudio"/"antonella" o role="admin"
 * con must_change_password=false.
 */
import { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL || "";

export function ForcePasswordChange({ user, onSuccess }) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const validate = () => {
    if (!currentPwd) return "Inserisci la password attuale";
    if (!newPwd) return "Inserisci la nuova password";
    if (newPwd.length < 8) return "La nuova password deve essere almeno 8 caratteri";
    if (newPwd === currentPwd) return "La nuova password deve essere diversa da quella attuale";
    if (newPwd !== confirmPwd) return "Le due password nuove non coincidono";
    return null;
  };

  const submit = async (e) => {
    e?.preventDefault();
    const v = validate();
    if (v) { setError(v); return; }

    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token");
      await axios.post(
        `${API}/api/auth/change-password`,
        { current_password: currentPwd, new_password: newPwd },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Aggiorna user in localStorage
      const updated = { ...user, must_change_password: false };
      localStorage.setItem("user", JSON.stringify(updated));
      onSuccess?.(updated);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Errore cambio password");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8">
        <div className="mb-5">
          <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#FFD24D" }}>
            Sicurezza
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: "#1E2128" }}>
            Imposta la tua password
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>
            Stai usando la password temporanea condivisa. Per la tua sicurezza, devi sceglierne una personale
            prima di accedere alla piattaforma.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "#374151" }}>
              Password attuale (temporanea)
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              autoComplete="current-password"
              placeholder="Evolution2026!"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: "#FAFAF7", border: "1px solid #E5E7EB" }}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "#374151" }}>
              Nuova password (min 8 caratteri)
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                placeholder="Almeno 8 caratteri"
                className="w-full px-4 py-3 pr-16 rounded-xl outline-none text-sm"
                style={{ background: "#FAFAF7", border: "1px solid #E5E7EB" }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                style={{ color: "#6B7280" }}
              >
                {showNew ? "Nascondi" : "Mostra"}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-1 block" style={{ color: "#374151" }}>
              Conferma nuova password
            </label>
            <input
              type={showNew ? "text" : "password"}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              autoComplete="new-password"
              placeholder="Riscrivi la nuova password"
              className="w-full px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: "#FAFAF7", border: "1px solid #E5E7EB" }}
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-black text-sm transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "#1E2128", color: "#FFD24D" }}
          >
            {submitting ? "Aggiornamento..." : "Imposta nuova password e prosegui →"}
          </button>

          <p className="text-[11px] text-center pt-2" style={{ color: "#9CA3AF" }}>
            La password è criptata e non visibile agli amministratori. Scegli qualcosa che ricorderai.
          </p>
        </form>
      </div>
    </div>
  );
}

export default ForcePasswordChange;
