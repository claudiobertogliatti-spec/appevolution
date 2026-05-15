/**
 * Ciak Cliente — /cliente/proposta · /cliente/firma · /cliente/decisione-partnership
 *
 * Wrapper sottile che ri-usa il componente Evolution originale
 * `frontend/src/components/cliente/PostAnalisiPartnership.jsx` (1437 righe).
 * Il componente Evolution legge il token JWT da `localStorage.access_token`.
 * Qui copio temporaneamente `ciak_cliente_token` → `access_token` (al mount)
 * così tutte le sue chiamate `${API}/api/cliente-analisi/*` funzionano senza
 * patchare il componente.
 *
 * Trade-off accettato: durante la permanenza dell'utente cliente su /cliente/proposta
 * la chiave `access_token` esiste in localStorage. È rimossa allo smontaggio.
 *
 * NOTA: `API` da utils/api-config su ciak.io ritorna stringa vuota (vedi patch
 * 2026-05-15 a PRODUCTION_DOMAINS) → le fetch passano via rewrite Vercel
 * /api/* → https://app.evolution-pro.it/api/*.
 */
import { useEffect, useState } from "react";
import PostAnalisiPartnershipEvolution from "../../../components/cliente/PostAnalisiPartnership";
import { getToken, getClienteUser } from "../api";

export function PostAnalisiPartnership({ user, adminPreview = false }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Shim: copia il token Ciak Cliente nelle chiavi che il componente Evolution
    // si aspetta (access_token + user). Salviamo i valori precedenti e li
    // ripristiniamo allo smontaggio per non sporcare lo stato globale.
    const prevAccessToken = localStorage.getItem("access_token");
    const prevToken = localStorage.getItem("token");
    const prevUser = localStorage.getItem("user");

    const t = getToken();
    const u = user || getClienteUser();
    if (t) {
      localStorage.setItem("access_token", t);
      localStorage.setItem("token", t);
    }
    if (u) localStorage.setItem("user", JSON.stringify(u));
    setReady(true);

    return () => {
      // Ripristino stato precedente
      if (prevAccessToken === null) localStorage.removeItem("access_token");
      else localStorage.setItem("access_token", prevAccessToken);
      if (prevToken === null) localStorage.removeItem("token");
      else localStorage.setItem("token", prevToken);
      if (prevUser === null) localStorage.removeItem("user");
      else localStorage.setItem("user", prevUser);
    };
  }, [user]);

  if (!ready) return null;

  return <PostAnalisiPartnershipEvolution user={user || getClienteUser()} adminPreview={adminPreview} />;
}

export default PostAnalisiPartnership;
