import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";
import { authHeaders } from "../../api";

const API = process.env.REACT_APP_BACKEND_URL || "";

// Contratto firmato e distinta si caricano UNA volta sola, nel passo F-2 (Step01Contratto):
// qui si chiedono solo i dati. Chiederli di nuovo bloccava chi aveva già F-2 completato.

// Sezioni del form dati. type: text | checkbox.
const SECTIONS = [
  {
    title: "Anagrafica e contatti",
    fields: [
      { k: "nome", label: "Nome", required: true },
      { k: "cognome", label: "Cognome", required: true },
      { k: "email", label: "Email", required: true, type: "email" },
      { k: "telefono", label: "Telefono / cellulare", required: true },
    ],
  },
  {
    title: "Residenza / sede",
    fields: [
      { k: "indirizzo", label: "Indirizzo (via e civico)", required: true, full: true },
      { k: "cap", label: "CAP" },
      { k: "comune", label: "Comune" },
      { k: "provincia", label: "Provincia", placeholder: "es. TO" },
      { k: "paese", label: "Paese", placeholder: "Italia" },
    ],
  },
  {
    title: "Dati fiscali (per la fattura)",
    fields: [
      { k: "codice_fiscale", label: "Codice fiscale", required: true },
      { k: "partita_iva", label: "Partita IVA" },
      { k: "ragione_sociale", label: "Ragione sociale (se società)" },
      { k: "pec", label: "PEC", type: "email" },
      { k: "iban", label: "IBAN", required: true, full: true },
      { k: "codice_sdi", label: "Codice destinatario / SDI" },
      { k: "regime_forfettario", label: "Sono in regime forfettario", type: "checkbox" },
    ],
  },
];

const REQUIRED = ["nome", "email", "indirizzo", "codice_fiscale", "iban"];

export default function StepBurocrazia({ step, partnerId, onComplete, onSaveDraft }) {
  const [data, setData] = useState(step?.data || {});

  // Pre-popola dai dati profilo già noti (contatti) se lo step è vuoto.
  useEffect(() => {
    if (step?.data && Object.keys(step.data).length > 0) return;
    if (!partnerId) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/partner-hub/${partnerId}`, {
          headers: authHeaders(),
        });
        if (!r.ok) return;
        const p = await r.json();
        setData((prev) => ({
          nome: p.name || prev.nome || "",
          email: p.email || prev.email || "",
          telefono: p.phone || prev.telefono || "",
          comune: p.city || prev.comune || "",
          ...prev,
        }));
      } catch {
        /* prefill best-effort */
      }
    })();
  }, [partnerId, step]);

  const setField = (k, v) => setData((prev) => ({ ...prev, [k]: v }));
  const persist = () => onSaveDraft(data);

  const canComplete = REQUIRED.every((k) => String(data[k] || "").trim());
  // Passo già completato: i dati restano modificabili (cambio indirizzo, IBAN, PEC…).
  // Il backend accetta di nuovo il salvataggio e aggiorna scheda partner e dati del contratto.
  // Solo se i dati ci sono davvero: un passo segnato "fatto" dalla migrazione, senza dati,
  // deve restare un form da compilare (non "già salvato").
  // Si guarda ai dati salvati (step.data), non a quelli in modifica: svuotare un campo
  // mentre si corregge non deve far cambiare la schermata sotto le mani.
  const isDone = step?.status === "done" && REQUIRED.every((k) => String(step?.data?.[k] || "").trim());

  return (
    <StepBase
      step={step}
      title="I tuoi dati"
      ctaLabel={isDone ? "Salva le modifiche" : undefined}
      ctaDisabled={!canComplete}
      onCta={() => onComplete(data)}
      secondaryNote={
        isDone
          ? "Se qualcosa cambia, correggilo qui e salva: aggiorniamo noi fatture e documenti."
          : "Servono per la fattura e per intestare correttamente il tuo progetto. Si inseriscono una volta sola e li conserviamo noi."
      }
    >
      <div className="space-y-6">
        {isDone && (
          <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            I tuoi dati sono già salvati. Puoi modificarli in qualsiasi momento.
          </p>
        )}
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              {sec.title}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sec.fields.map((f) => {
                if (f.type === "checkbox") {
                  return (
                    <label key={f.k} className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={!!data[f.k]}
                        onChange={(e) => setField(f.k, e.target.checked)}
                        onBlur={persist}
                        className="w-4 h-4 accent-yellow-400"
                      />
                      {f.label}
                    </label>
                  );
                }
                return (
                  <div key={f.k} className={f.full ? "md:col-span-2" : ""}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      {f.label} {f.required && <span className="text-yellow-600">*</span>}
                    </label>
                    <input
                      type={f.type || "text"}
                      value={data[f.k] || ""}
                      placeholder={f.placeholder || ""}
                      onChange={(e) => setField(f.k, e.target.value)}
                      onBlur={persist}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!canComplete && (
          <p className="text-xs text-slate-400">
            Per procedere completa i campi con <span className="text-yellow-600">*</span>.
          </p>
        )}
      </div>
    </StepBase>
  );
}
