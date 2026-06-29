/**
 * Ciak Admin — Fatture (Back office · Valentina).
 *
 * Genera fatture di cortesia PDF (Evolution PRO LLC, SENZA IVA) dalle vendite:
 *  - Ciak Blueprint €67   (diagnostic_sessions / orfani)
 *  - Partnership €2.790    (proposte pagate)
 *  - Servizi extra         (partner_servizi)
 *
 * 2 tab:
 *  - "Da fatturare" → sorgenti vendite con un click per generare la fattura
 *  - "Emesse"        → registro fatture, scarica PDF / annulla
 * + Fattura manuale (per casi fuori-sistema) + editor Dati emittente.
 *
 * Backend: /api/admin/ciak/invoices*  (api.js: apiGet/apiPost/apiPut/adminFetch)
 */
import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, adminFetch } from "../api";

function euro(n) {
  if (n == null) return "—";
  return `€ ${Number(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(iso).slice(0, 10);
  }
}

const FONTE_BADGE = {
  blueprint_67: { label: "Blueprint €67", cls: "bg-blue-100 text-blue-700" },
  partnership: { label: "Partnership", cls: "bg-purple-100 text-purple-700" },
  servizio_extra: { label: "Servizio extra", cls: "bg-emerald-100 text-emerald-700" },
  manuale: { label: "Manuale", cls: "bg-slate-100 text-slate-600" },
};

function Badge({ fonte }) {
  const b = FONTE_BADGE[fonte] || FONTE_BADGE.manuale;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${b.cls}`}>{b.label}</span>;
}

// ─── Modale generazione/modifica fattura ───────────────────────────────────

const EMPTY_CLIENTE = {
  nome: "", ragione_sociale: "", indirizzo: "", cap: "", citta: "",
  provincia: "", paese: "Italia", codice_fiscale: "", partita_iva: "",
  email: "", pec: "",
};

function InvoiceModal({ initial, onClose, onSaved }) {
  const [cliente, setCliente] = useState({ ...EMPTY_CLIENTE, ...(initial.cliente || {}) });
  const [righe, setRighe] = useState(
    initial.righe && initial.righe.length
      ? initial.righe
      : [{ descrizione: "", quantita: 1, prezzo_unitario: 0 }]
  );
  const [note, setNote] = useState(initial.note || "");
  const [dataEm, setDataEm] = useState(initial.data_emissione || new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const setC = (k, v) => setCliente((c) => ({ ...c, [k]: v }));
  const setR = (i, k, v) => setRighe((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRiga = () => setRighe((rs) => [...rs, { descrizione: "", quantita: 1, prezzo_unitario: 0 }]);
  const delRiga = (i) => setRighe((rs) => rs.filter((_, j) => j !== i));

  const totale = righe.reduce(
    (s, r) => s + (Number(r.quantita) || 0) * (Number(r.prezzo_unitario) || 0),
    0
  );

  const submit = async () => {
    if (!cliente.nome && !cliente.ragione_sociale) {
      setError("Inserisci almeno il nome o la ragione sociale del cliente.");
      return;
    }
    if (!righe.length || !righe.some((r) => r.descrizione.trim())) {
      setError("Inserisci almeno una riga con descrizione.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiPost("/invoices", {
        cliente,
        righe: righe
          .filter((r) => r.descrizione.trim())
          .map((r) => ({
            descrizione: r.descrizione,
            quantita: Number(r.quantita) || 1,
            prezzo_unitario: Number(r.prezzo_unitario) || 0,
          })),
        fonte: initial.fonte || "manuale",
        source_key: initial.source_key || null,
        partner_id: initial.partner_id || null,
        data_emissione: dataEm,
        note: note || null,
      });
      onSaved();
    } catch (e) {
      setError(e.message?.includes("409") ? "Questa vendita è già stata fatturata." : e.message || "Errore");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center overflow-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initial.source_key ? "Genera fattura" : "Nuova fattura manuale"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Cliente */}
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-600 font-semibold mb-2">Intestatario</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome e cognome" value={cliente.nome} onChange={(v) => setC("nome", v)} />
              <Field label="Ragione sociale" value={cliente.ragione_sociale} onChange={(v) => setC("ragione_sociale", v)} />
              <Field label="Indirizzo" value={cliente.indirizzo} onChange={(v) => setC("indirizzo", v)} />
              <div className="grid grid-cols-3 gap-2">
                <Field label="CAP" value={cliente.cap} onChange={(v) => setC("cap", v)} />
                <Field label="Città" value={cliente.citta} onChange={(v) => setC("citta", v)} />
                <Field label="Prov." value={cliente.provincia} onChange={(v) => setC("provincia", v)} />
              </div>
              <Field label="Codice fiscale" value={cliente.codice_fiscale} onChange={(v) => setC("codice_fiscale", v)} />
              <Field label="Partita IVA" value={cliente.partita_iva} onChange={(v) => setC("partita_iva", v)} />
              <Field label="Email" value={cliente.email} onChange={(v) => setC("email", v)} />
              <Field label="PEC" value={cliente.pec} onChange={(v) => setC("pec", v)} />
            </div>
          </div>

          {/* Righe */}
          <div>
            <p className="text-xs uppercase tracking-widest text-yellow-600 font-semibold mb-2">Righe</p>
            <div className="space-y-2">
              {righe.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"
                    placeholder="Descrizione"
                    value={r.descrizione}
                    onChange={(e) => setR(i, "descrizione", e.target.value)}
                  />
                  <input
                    type="number" min="0" step="1"
                    className="w-16 px-2 py-2 rounded-lg border border-gray-300 text-sm text-right"
                    value={r.quantita}
                    onChange={(e) => setR(i, "quantita", e.target.value)}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    className="w-28 px-2 py-2 rounded-lg border border-gray-300 text-sm text-right"
                    placeholder="Prezzo"
                    value={r.prezzo_unitario}
                    onChange={(e) => setR(i, "prezzo_unitario", e.target.value)}
                  />
                  <button
                    onClick={() => delRiga(i)}
                    className="text-slate-300 hover:text-red-500 px-1"
                    disabled={righe.length === 1}
                    title="Rimuovi riga"
                  >×</button>
                </div>
              ))}
            </div>
            <button onClick={addRiga} className="mt-2 text-sm text-yellow-700 hover:underline">+ Aggiungi riga</button>
          </div>

          {/* Data + note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Data emissione</label>
              <input
                type="date" value={dataEm}
                onChange={(e) => setDataEm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <div className="flex items-end justify-end">
              <div className="text-right">
                <p className="text-xs text-slate-500">Totale (senza IVA)</p>
                <p className="text-2xl font-bold text-slate-900">{euro(totale)}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Note (facoltative)</label>
            <textarea
              rows={2} value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              placeholder="Es. Pagamento ricevuto via Stripe il …"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-gray-100">Annulla</button>
          <button
            onClick={submit} disabled={busy}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "Genero…" : "Genera fattura PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
      />
    </div>
  );
}

// ─── Editor dati emittente ─────────────────────────────────────────────────

function EmittenteEditor({ onAuthExpired }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && !data) {
      apiGet("/invoices/settings").then(setData).catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      });
    }
  }, [open, data, onAuthExpired]);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const save = async () => {
    try {
      const r = await apiPut("/invoices/settings", data);
      setData(r);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-slate-700">Dati emittente (Evolution PRO LLC)</span>
        <span className="text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && data && (
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ragione sociale" value={data.ragione_sociale} onChange={(v) => set("ragione_sociale", v)} />
            <Field label="Indirizzo" value={data.indirizzo} onChange={(v) => set("indirizzo", v)} />
            <Field label="Città / Stato" value={data.citta} onChange={(v) => set("citta", v)} />
            <Field label="Paese" value={data.paese} onChange={(v) => set("paese", v)} />
            <Field label="EIN" value={data.ein} onChange={(v) => set("ein", v)} />
            <Field label="File Number" value={data.file_number} onChange={(v) => set("file_number", v)} />
            <Field label="Sede operativa" value={data.sede_operativa} onChange={(v) => set("sede_operativa", v)} />
            <Field label="Email" value={data.email} onChange={(v) => set("email", v)} />
            <Field label="Banca" value={data.banca} onChange={(v) => set("banca", v)} />
            <Field label="IBAN" value={data.iban} onChange={(v) => set("iban", v)} />
            <Field label="Intestatario conto" value={data.intestatario_conto} onChange={(v) => set("intestatario_conto", v)} />
            <Field label="Prefisso numero (es. EVO-)" value={data.numero_prefix} onChange={(v) => set("numero_prefix", v)} />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nota fiscale (stampata in calce)</label>
            <textarea
              rows={3} value={data.nota_fiscale || ""}
              onChange={(e) => set("nota_fiscale", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={save} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700">
              Salva dati emittente
            </button>
            {saved && <span className="text-sm text-emerald-600">Salvato ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pagina ────────────────────────────────────────────────────────────────

export function Fatture({ onAuthExpired }) {
  const [tab, setTab] = useState("da-fatturare");
  const [sources, setSources] = useState(null);
  const [issued, setIssued] = useState(null);
  const [modal, setModal] = useState(null); // initial payload o null
  const [error, setError] = useState(null);

  const loadSources = () =>
    apiGet("/invoices/sources").then(setSources).catch((e) => {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    });
  const loadIssued = () =>
    apiGet("/invoices").then(setIssued).catch((e) => {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    });

  useEffect(() => {
    loadSources();
    loadIssued();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaved = () => {
    setModal(null);
    loadSources();
    loadIssued();
  };

  const genFromSource = (s) =>
    setModal({
      cliente: s.cliente || {},
      righe: [{ descrizione: s.descrizione, quantita: 1, prezzo_unitario: s.importo }],
      fonte: s.fonte,
      source_key: s.source_key,
      partner_id: s.partner_id || null,
    });

  const downloadPdf = async (inv) => {
    try {
      const res = await adminFetch(`/api/admin/ciak/invoices/${inv.id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  const cancelInvoice = async (inv) => {
    if (!window.confirm(`Annullare la fattura ${inv.numero}? Resta a registro ma esce dai totali.`)) return;
    try {
      await apiPost(`/invoices/${inv.id}/cancel`);
      loadIssued();
      loadSources();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-bold text-slate-900">Fatture</h1>
        <button
          onClick={() => setModal({ cliente: {}, righe: [], fonte: "manuale" })}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700"
        >
          + Fattura manuale
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Fatture di cortesia in PDF — Evolution PRO LLC, senza IVA (reverse charge ove applicabile).
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("da-fatturare")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "da-fatturare" ? "bg-slate-900 text-white" : "bg-white border border-gray-200 text-slate-600"}`}
        >
          Da fatturare {sources ? `(${sources.da_fatturare})` : ""}
        </button>
        <button
          onClick={() => setTab("emesse")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "emesse" ? "bg-slate-900 text-white" : "bg-white border border-gray-200 text-slate-600"}`}
        >
          Emesse {issued ? `(${issued.total})` : ""}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-4">Errore: {error}</div>}

      {tab === "da-fatturare" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {!sources ? (
            <div className="p-6 text-slate-400">Caricamento…</div>
          ) : sources.items.length === 0 ? (
            <div className="p-6 text-slate-400">Nessuna vendita trovata.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                  <th className="px-5 py-3 font-semibold">Fonte</th>
                  <th className="px-5 py-3 font-semibold">Cliente</th>
                  <th className="px-5 py-3 font-semibold">Descrizione</th>
                  <th className="px-5 py-3 font-semibold text-right">Importo</th>
                  <th className="px-5 py-3 font-semibold">Data</th>
                  <th className="px-5 py-3 font-semibold text-right">Azione</th>
                </tr>
              </thead>
              <tbody>
                {sources.items.map((s, i) => (
                  <tr key={s.source_key + i} className="border-b border-gray-100 last:border-0">
                    <td className="px-5 py-3"><Badge fonte={s.fonte} /></td>
                    <td className="px-5 py-3">
                      <div className="text-slate-800">{s.cliente?.nome || s.cliente?.ragione_sociale || "—"}</div>
                      <div className="text-xs text-slate-400">{s.cliente?.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{s.descrizione}</td>
                    <td className="px-5 py-3 text-right font-medium">{euro(s.importo)}</td>
                    <td className="px-5 py-3 text-slate-500">{fmtDate(s.data)}</td>
                    <td className="px-5 py-3 text-right">
                      {s.gia_fatturata ? (
                        <span className="text-xs text-emerald-600 font-medium">Fatturata ✓</span>
                      ) : (
                        <button
                          onClick={() => genFromSource(s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                        >
                          Genera fattura
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "emesse" && (
        <>
          {issued && (
            <div className="mb-4 text-sm text-slate-600">
              Totale fatturato (non annullate): <span className="font-semibold text-slate-900">{euro(issued.totale_fatturato_euro)}</span>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {!issued ? (
              <div className="p-6 text-slate-400">Caricamento…</div>
            ) : issued.items.length === 0 ? (
              <div className="p-6 text-slate-400">Nessuna fattura emessa.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-gray-200">
                    <th className="px-5 py-3 font-semibold">Numero</th>
                    <th className="px-5 py-3 font-semibold">Data</th>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Fonte</th>
                    <th className="px-5 py-3 font-semibold text-right">Totale</th>
                    <th className="px-5 py-3 font-semibold text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {issued.items.map((inv) => (
                    <tr key={inv.id} className={`border-b border-gray-100 last:border-0 ${inv.stato === "annullata" ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {inv.numero}
                        {inv.stato === "annullata" && <span className="ml-2 text-[11px] text-red-500">annullata</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{fmtDate(inv.data_emissione)}</td>
                      <td className="px-5 py-3 text-slate-700">{inv.cliente?.nome || inv.cliente?.ragione_sociale || "—"}</td>
                      <td className="px-5 py-3"><Badge fonte={inv.fonte} /></td>
                      <td className="px-5 py-3 text-right font-medium">{euro(inv.totale)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => downloadPdf(inv)} className="text-sm text-blue-600 hover:underline mr-3">PDF</button>
                        {inv.stato !== "annullata" && (
                          <button onClick={() => cancelInvoice(inv)} className="text-sm text-red-500 hover:underline">Annulla</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <div className="mt-6">
        <EmittenteEditor onAuthExpired={onAuthExpired} />
      </div>

      {modal && <InvoiceModal initial={modal} onClose={() => setModal(null)} onSaved={onSaved} />}
    </div>
  );
}
