import React, { useState } from "react";
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

export default function Step01Contratto({ step, partnerId, onComplete, onSaveDraft }) {
  const [contractUrl, setContractUrl] = useState(step?.data?.contract_url || "");
  const [receiptUrl, setReceiptUrl] = useState(step?.data?.receipt_url || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const handle = async (kind, file) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadFile(file, partnerId);
      if (kind === "contract") {
        setContractUrl(url);
        onSaveDraft({ contract_url: url });
      } else {
        setReceiptUrl(url);
        onSaveDraft({ receipt_url: url });
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const canComplete = contractUrl && receiptUrl && !busy;

  return (
    <StepBase
      eyebrow="Step 1 — Contratto"
      title="Carica contratto firmato + distinta di pagamento"
      ctaDisabled={!canComplete}
      onCta={() => onComplete({ contract_url: contractUrl, receipt_url: receiptUrl })}
      secondaryNote="PDF, max 200 MB ciascuno. Li archiviamo noi."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileSlot label="Contratto firmato" url={contractUrl} onPick={(f) => handle("contract", f)} accept="application/pdf" />
        <FileSlot label="Distinta pagamento" url={receiptUrl} onPick={(f) => handle("receipt", f)} accept="application/pdf,image/*" />
      </div>
      {busy && <p className="text-xs text-slate-500 mt-3">Upload in corso...</p>}
      {err && <p className="text-red-600 text-sm mt-3">{err}</p>}
    </StepBase>
  );
}

function FileSlot({ label, url, onPick, accept }) {
  return (
    <label className={`block border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition ${url ? "bg-green-50 border-green-500" : "bg-slate-50 border-slate-400 hover:border-yellow-400"}`}>
      <input type="file" accept={accept} className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
      <div className="text-sm font-medium text-slate-900">{url ? `✓ ${label}` : label}</div>
      {url ? (
        <div className="text-xs text-green-700 mt-2 truncate">
          <a className="underline" href={url} target="_blank" rel="noreferrer">apri caricato</a>
        </div>
      ) : (
        <div className="text-xs text-slate-500 mt-2">⬆ Clicca o trascina</div>
      )}
    </label>
  );
}
