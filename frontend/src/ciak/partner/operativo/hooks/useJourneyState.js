import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

export function useJourneyState(partnerId) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/partner-journey/operativo/state/${partnerId}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setState(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const completeStep = useCallback(async (stepId, data) => {
    const r = await fetch(
      `${API}/api/partner-journey/operativo/complete/${partnerId}/${stepId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: data || {} }),
      }
    );
    if (!r.ok) throw new Error(`Complete failed: ${r.status}`);
    await refresh();
    return r.json();
  }, [partnerId, refresh]);

  const saveDraft = useCallback(async (stepId, data) => {
    const r = await fetch(
      `${API}/api/partner-journey/operativo/save-draft/${partnerId}/${stepId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: data || {} }),
      }
    );
    if (!r.ok) throw new Error(`SaveDraft failed: ${r.status}`);
    return r.json();
  }, [partnerId]);

  return { state, loading, error, refresh, completeStep, saveDraft };
}
