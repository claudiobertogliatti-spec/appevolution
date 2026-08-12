import React, { useEffect, useState } from "react";
import StepBase from "./StepBase";
import { authHeaders } from "../../api";

const CHECKLIST = [
  "I miei video (lezione gratuita e corso) sono pronti e approvati",
  "Ho visto le mie pagine di vendita online",
  "Ho fissato il giorno e l'ora della mia diretta di vendita",
  "Sono pronto a pubblicare e a rispondere a chi mi scrive",
];

export default function Step13Lancio({ step, partnerId, onSaveDraft }) {
  const [checked, setChecked] = useState(step?.data?.checklist || {});
  const [readiness, setReadiness] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!partnerId) return;
    fetch(`/api/partner-journey/operativo/readiness/${partnerId}/launch`, { headers: authHeaders() })
      .then((response) => response.ok ? response.json() : null).then(setReadiness).catch(() => setReadiness(null));
  }, [partnerId]);

  const toggle = (i) => {
    const next = { ...checked, [i]: !checked[i] };
    setChecked(next);
    onSaveDraft({ checklist: next });
  };

  const allDone = CHECKLIST.every((_, i) => checked[i]);

  const activate = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/partner-journey/lancio/activate", {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ partner_id: partnerId }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      window.location.reload();
    } catch (err) { setError("Il lancio non può ancora essere attivato: controlla gli elementi mancanti."); }
    finally { setBusy(false); }
  };

  return (
    <StepBase
      step={step}
      title="Pronti a partire"
      ctaLabel="Si parte! 🚀"
      ctaDisabled={!allDone || !readiness?.ready || busy}
      onCta={activate}
      secondaryNote="Alla parte tecnica (pagamenti, tracciamenti, invii) pensiamo noi. Quando confermi, il tuo percorso di costruzione è chiuso: da qui in poi ci concentriamo sulle vendite."
    >
      <p className="text-sm text-slate-600 mb-3">Un ultimo sguardo insieme. Spunta quello che è a posto:</p>
      {readiness && <ul className="mb-4 space-y-1 text-xs">{readiness.checks.map((check) => <li key={check.id} className={check.ok ? "text-emerald-700" : "text-amber-700"}>{check.ok ? "✓" : "○"} {check.label}</li>)}</ul>}
      <ul className="space-y-1">
        {CHECKLIST.map((label, i) => (
          <li key={i}>
            <label className="flex items-start gap-3 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 px-2 py-2 rounded">
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 w-4 h-4 accent-yellow-400 cursor-pointer"
              />
              <span className={checked[i] ? "line-through text-slate-400" : ""}>{label}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </StepBase>
  );
}
