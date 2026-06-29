import React, { useState, useEffect } from "react";
import StepBase from "./StepBase";

const API = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

async function uploadFile(file, partnerId) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API}/api/partner-journey/operativo/upload/${partnerId}`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(`Upload fallito: ${r.status}`);
  return (await r.json()).url;
}

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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Pre-popola dai dati profilo già noti (contatti) se lo step è vuoto.
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
          ...prev,
        }));
      } catch {
        /* prefill best-effort */
      }
    })();
  }, [partnerId, step]);

  const setField = (k, v) => setData((prev) => ({ ...prev, [k]: v }));
  const persist = () => onSaveDraft(data);

  const handleDoc = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadFile(file, partnerId);
      const next = { ...data, [kind === "contract" ? "contract_url" : "receipt_url"]: url };
      setData(next);
      onSaveDraft(next);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const canComplete = REQUIRED.every((k) => String(data[k] || "").trim()) && !!data.contract_url && !!data.receipt_url && !busy;

  return (
    <StepBase
      step={step}
      title="I tuoi dati"
      ctaDisabled={!canComplete}
      onCta={() => onComplete(data)}
      secondaryNote="Servono per la fattura e per intestare correttamente il tuo progetto. Si inseriscono una volta sola e li conserviamo noi."
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

        {/* Contratto e distinta */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Contratto e distinta
          </p>
          <p className="text-xs text-slate-500 mb-2 leading-relaxed">
            La firma del contratto e il pagamento li hai già fatti prima di entrare. Qui carichi il
            <strong className="text-slate-700"> contratto firmato</strong> e la
            <strong className="text-slate-700"> distinta del pagamento</strong>: li conserviamo noi.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DocSlot label="Contratto firmato" url={data.contract_url} accept="application/pdf" onPick={(f) => handleDoc("contract", f)} />
            <DocSlot label="Distinta di pagamento" url={data.receipt_url} accept="application/pdf,image/*" onPick={(f) => handleDoc("receipt", f)} />
          </div>
          {busy && <p className="text-xs text-slate-500 mt-2">Caricamento in corso…</p>}
          {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
        </div>

        {!canComplete && (
          <p className="text-xs text-slate-400">
            Per procedere completa i campi con <span className="text-yellow-600">*</span> e carica il contratto firmato e la distinta.
          </p>
        )}
      </div>
    </StepBase>
  );
}

function DocSlot({ label, url, accept, onPick }) {
  return (
    <label className={`block border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition ${url ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"}`}>
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{url ? `✓ ${label}` : label}</div>
      {url ? (
        <a className="text-xs text-green-700 underline mt-1 inline-block" href={url} target="_blank" rel="noreferrer">apri caricato</a>
      ) : (
        <div className="text-xs text-slate-500 mt-1">⬆ Clicca o trascina</div>
      )}
    </label>
  );
}
