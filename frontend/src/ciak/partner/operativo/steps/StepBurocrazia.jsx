import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

// Sezioni del form. type: text | checkbox.
const SECTIONS = [
  {
    title: "Anagrafica e contatti",
    fields: [
      { k: "nome", label: "Nome", required: true },
      { k: "cognome", label: "Cognome", required: true },
      { k: "email", label: "Email", required: true, type: "email" },
      { k: "telefono", label: "Telefono / cellulare", required: true },
      { k: "data_nascita", label: "Data di nascita", placeholder: "gg/mm/aaaa" },
      { k: "luogo_nascita", label: "Luogo di nascita" },
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
  {
    title: "Presenza online",
    fields: [
      { k: "sito_web", label: "Sito web" },
      { k: "blog", label: "Blog" },
      { k: "instagram", label: "Instagram" },
      { k: "linkedin", label: "LinkedIn" },
      { k: "youtube", label: "YouTube" },
      { k: "facebook", label: "Facebook" },
      { k: "tiktok", label: "TikTok" },
      { k: "altri_link", label: "Altri link", full: true },
    ],
  },
];

const REQUIRED = ["nome", "email", "indirizzo", "codice_fiscale", "iban"];

export default function StepBurocrazia({ step, partnerId, onComplete, onSaveDraft }) {
  const [data, setData] = useState(step?.data || {});

  // Pre-popola dai dati profilo già noti (contatti/social) se lo step è vuoto.
  useEffect(() => {
    if (step?.data && Object.keys(step.data).length > 0) return;
    if (!partnerId) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/partner-hub/${partnerId}`);
        if (!r.ok) return;
        const p = await r.json();
        setData((prev) => ({
          nome: p.name || prev.nome || "",
          email: p.email || prev.email || "",
          telefono: p.phone || prev.telefono || "",
          comune: p.city || prev.comune || "",
          sito_web: p.website || prev.sito_web || "",
          instagram: p.instagram || prev.instagram || "",
          linkedin: p.linkedin || prev.linkedin || "",
          youtube: p.youtube || prev.youtube || "",
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

  return (
    <StepBase
      eyebrow="Step 3 — I tuoi dati"
      title="Confermiamo i tuoi dati e completiamo quelli che mancano"
      ctaDisabled={!canComplete}
      onCta={() => onComplete(data)}
      secondaryNote="Servono per il contratto, la fattura dei €2.790 e per intestare correttamente il tuo Progetto. Li archiviamo noi."
    >
      <div className="space-y-6">
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
            Per procedere completa i campi contrassegnati con <span className="text-yellow-600">*</span> (nome, email, indirizzo, codice fiscale, IBAN).
          </p>
        )}
      </div>
    </StepBase>
  );
}
