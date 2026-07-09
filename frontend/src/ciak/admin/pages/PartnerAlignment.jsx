/**
 * Ciak Admin — Partner Alignment (cabina di regia Delivery).
 *
 * Vista operativa per riallineare i partner esistenti dentro il Metodo EVO senza
 * perdere dati già raccolti. Una riga per partner con: atto EVO, stato reale
 * stimato, asset presenti/mancanti, rischio, prossimo step, responsabile,
 * priorità e azioni rapide. La stima arriva dal backend
 * (GET /api/admin/ciak/partner-alignment) e rispetta gli override manuali,
 * modificabili da un pannello laterale (PATCH .../partner/{id}/alignment).
 *
 * Non è una landing: densa, scansionabile, da uso quotidiano.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminFetch, getToken, getAdminUser } from "../api";

const PRIORITA_META = {
  alta: { label: "Alta", cls: "bg-red-100 text-red-700 border-red-200" },
  media: { label: "Media", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  bassa: { label: "Bassa", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const ATTO_META = {
  Esamina: "bg-sky-100 text-sky-700",
  Valida: "bg-violet-100 text-violet-700",
  Ottimizza: "bg-emerald-100 text-emerald-700",
};

const RESP_META = {
  Claudio: "bg-slate-900 text-yellow-400",
  Luca: "bg-slate-800 text-amber-300",
  "Agente Ciak": "bg-indigo-100 text-indigo-700",
  Partner: "bg-orange-100 text-orange-700",
};

const OWNER_OPTIONS = ["", "Claudio", "Luca", "Agente Ciak", "Partner"];
const PRIORITA_OPTIONS = ["", "alta", "media", "bassa"];

const FILTRI = [
  { id: "tutti", label: "Tutti" },
  { id: "alta", label: "Alta priorità" },
  { id: "Esamina", label: "Esamina" },
  { id: "Valida", label: "Valida" },
  { id: "Ottimizza", label: "Ottimizza" },
  { id: "bloccati", label: "Bloccati/Sospesi" },
  { id: "no-asset", label: "Mancano asset" },
  { id: "no-kpi", label: "Mancano KPI" },
];

const PRIO_RANK = { alta: 0, media: 1, bassa: 2 };

/** Entra nell'area partner in vista-admin (stesso pattern di PercorsoEvoPanel). */
function entraVistaPartner(row, stepId) {
  const token = getToken();
  const user = getAdminUser();
  if (token) localStorage.setItem("ciak_partner_token", token);
  if (user) localStorage.setItem("ciak_partner_user", JSON.stringify(user));
  localStorage.setItem(
    "ciak_partner_view_id",
    JSON.stringify({ id: row.partner_id, name: row.name, phase: row.phase })
  );
  if (stepId) localStorage.setItem("ciak_partner_initial_step", stepId);
  window.location.href = "/partner";
}

function isBloccato(r) {
  return r.stato === "quarantena" || r.stato === "sospeso";
}

/** Rank per ordinamento default: alta priorità → bloccati → asset mancanti → incoerenza. */
function rankRow(r) {
  return [
    PRIO_RANK[r.priorita] ?? 3,
    isBloccato(r) ? 0 : 1,
    -(r.asset_mancanti_count || 0),
    r.incoerenza ? 0 : 1,
    (r.name || "").toLowerCase(),
  ];
}

function cmpRank(a, b) {
  const ra = rankRow(a);
  const rb = rankRow(b);
  for (let i = 0; i < ra.length; i++) {
    if (ra[i] < rb[i]) return -1;
    if (ra[i] > rb[i]) return 1;
  }
  return 0;
}

function Chip({ children, cls }) {
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

function OverridePanel({ row, onClose, onSaved, onAuthExpired }) {
  const [form, setForm] = useState({
    alignment_status_override: row.ha_override && row.stato_reale !== row.stima.stato_reale ? row.stato_reale : "",
    alignment_risk: "",
    alignment_next_step: "",
    alignment_owner: "",
    alignment_priority: "",
    alignment_notes: row.note || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${row.partner_id}/alignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await onSaved();
      onClose();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else window.alert("Errore salvataggio: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white shadow-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">Override — {row.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Lascia vuoto un campo per usare la stima automatica. Stima attuale:
          <span className="font-medium text-slate-700"> {row.stima.stato_reale}</span>.
        </p>

        <label className="block text-xs font-semibold text-slate-600 mb-1">Stato reale (forzato)</label>
        <input value={form.alignment_status_override} onChange={(e) => set("alignment_status_override", e.target.value)}
          placeholder={row.stima.stato_reale}
          className="w-full text-sm px-3 py-2 mb-3 rounded-lg border border-gray-300 outline-none focus:border-slate-900" />

        <label className="block text-xs font-semibold text-slate-600 mb-1">Rischio principale</label>
        <input value={form.alignment_risk} onChange={(e) => set("alignment_risk", e.target.value)}
          placeholder={row.stima.rischio}
          className="w-full text-sm px-3 py-2 mb-3 rounded-lg border border-gray-300 outline-none focus:border-slate-900" />

        <label className="block text-xs font-semibold text-slate-600 mb-1">Prossimo step</label>
        <input value={form.alignment_next_step} onChange={(e) => set("alignment_next_step", e.target.value)}
          placeholder={row.stima.prossimo_step}
          className="w-full text-sm px-3 py-2 mb-3 rounded-lg border border-gray-300 outline-none focus:border-slate-900" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Responsabile</label>
            <select value={form.alignment_owner} onChange={(e) => set("alignment_owner", e.target.value)}
              className="w-full text-sm px-2 py-2 rounded-lg border border-gray-300 outline-none focus:border-slate-900">
              {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o || `Auto (${row.stima.responsabile})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priorità</label>
            <select value={form.alignment_priority} onChange={(e) => set("alignment_priority", e.target.value)}
              className="w-full text-sm px-2 py-2 rounded-lg border border-gray-300 outline-none focus:border-slate-900">
              {PRIORITA_OPTIONS.map((o) => <option key={o} value={o}>{o || `Auto (${row.stima.priorita})`}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1">Nota di regia</label>
        <textarea value={form.alignment_notes} onChange={(e) => set("alignment_notes", e.target.value)} rows={3}
          className="w-full text-sm px-3 py-2 mb-4 rounded-lg border border-gray-300 outline-none focus:border-slate-900 resize-y" />

        <button onClick={save} disabled={saving}
          className="w-full py-2 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Salvo…" : "Salva override"}
        </button>
      </div>
    </div>
  );
}

function AzioniRapide({ row, navigate }) {
  const btn = "text-[11px] px-2 py-1 rounded-lg bg-gray-100 text-slate-700 hover:bg-gray-200 transition whitespace-nowrap";
  return (
    <div className="flex flex-wrap gap-1.5">
      <button className={btn} onClick={() => navigate(`/admin/partner?id=${encodeURIComponent(row.partner_id)}&tab=profilo`)}>Scheda</button>
      <button className={btn} onClick={() => navigate(`/admin/partner?id=${encodeURIComponent(row.partner_id)}&tab=journey`)}>Journey</button>
      <button className={btn} onClick={() => entraVistaPartner(row)}>Vista partner</button>
      <button className={btn} onClick={() => navigate("/admin/documenti-partner")}>Documenti</button>
      {row.has_video && (
        <button className={btn} onClick={() => navigate("/admin/video-review")}>Video review</button>
      )}
      {row.is_ottimizza && (
        <button className={btn} onClick={() => navigate("/admin/metriche")}>KPI</button>
      )}
    </div>
  );
}

export function PartnerAlignment({ onAuthExpired }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState("tutti");
  const [edit, setEdit] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await adminFetch("/api/admin/ciak/partner-alignment");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setRows((d.items || []).slice().sort(cmpRank));
      setError(null);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else setError(e.message);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const f = (r) => {
      switch (filtro) {
        case "alta": return r.priorita === "alta";
        case "Esamina": return r.atto_evo === "Esamina";
        case "Valida": return r.atto_evo === "Valida";
        case "Ottimizza": return r.atto_evo === "Ottimizza";
        case "bloccati": return isBloccato(r);
        case "no-asset": return (r.asset_mancanti_count || 0) > 0;
        case "no-kpi": return (r.asset_mancanti || []).includes("KPI");
        default: return true;
      }
    };
    return rows.filter(f);
  }, [rows, filtro]);

  const counts = useMemo(() => {
    const c = { alta: 0, bloccati: 0, incoerenza: 0 };
    (rows || []).forEach((r) => {
      if (r.priorita === "alta") c.alta++;
      if (isBloccato(r)) c.bloccati++;
      if (r.incoerenza) c.incoerenza++;
    });
    return c;
  }, [rows]);

  return (
    <div className="p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Partner Alignment</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Riallineamento operativo dei partner nel Metodo EVO — dove stanno davvero, cosa manca, chi ci lavora.
          </p>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <div><span className="font-semibold text-red-600">{counts.alta}</span> alta priorità · <span className="font-semibold text-red-600">{counts.bloccati}</span> bloccati</div>
          <div><span className="font-semibold text-amber-600">{counts.incoerenza}</span> incoerenze fase↔asset</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {FILTRI.map((ff) => (
          <button key={ff.id} onClick={() => setFiltro(ff.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${filtro === ff.id ? "bg-slate-900 text-yellow-400 border-slate-900" : "bg-white text-slate-600 border-gray-300 hover:border-slate-400"}`}>
            {ff.label}
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-600 mb-3">Errore: {error}</div>}
      {!rows && !error && <div className="text-sm text-slate-400">Carico i partner…</div>}

      {rows && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-gray-200">
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Atto EVO</th>
                <th className="px-3 py-2">Stato reale</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Rischio / prossimo step</th>
                <th className="px-3 py-2">Resp.</th>
                <th className="px-3 py-2">Prio</th>
                <th className="px-3 py-2">Modif.</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.partner_id} className="border-b border-gray-100 align-top hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{r.name || r.partner_id}</div>
                    <div className="text-[11px] text-slate-400">
                      {r.phase || "—"}{r.files_count ? ` · ${r.files_count} file` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Chip cls={ATTO_META[r.atto_evo] || "bg-gray-100 text-slate-500"}>{r.atto_evo}</Chip>
                    {r.incoerenza && <div className="mt-1"><Chip cls="bg-amber-100 text-amber-700">incoerente</Chip></div>}
                  </td>
                  <td className="px-3 py-2 max-w-[180px]">
                    <div className="text-slate-800">{r.stato_reale}</div>
                    {r.ha_override && <span className="text-[10px] text-violet-600">override manuale</span>}
                  </td>
                  <td className="px-3 py-2 max-w-[190px]">
                    <div className="flex flex-wrap gap-1">
                      {(r.asset_presenti || []).map((a) => (
                        <Chip key={a} cls="bg-emerald-50 text-emerald-700">{a}</Chip>
                      ))}
                      {(r.asset_mancanti || []).map((a) => (
                        <Chip key={a} cls="bg-red-50 text-red-500 line-through">{a}</Chip>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 max-w-[240px]">
                    <div className="text-slate-600 text-[12px]">{r.rischio}</div>
                    <div className="text-slate-900 text-[12px] font-medium mt-0.5">➜ {r.prossimo_step}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Chip cls={RESP_META[r.responsabile] || "bg-gray-100 text-slate-600"}>{r.responsabile}</Chip>
                  </td>
                  <td className="px-3 py-2">
                    <Chip cls={PRIORITA_META[r.priorita]?.cls || "bg-gray-100 text-slate-500"}>
                      {PRIORITA_META[r.priorita]?.label || r.priorita}
                    </Chip>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-slate-400 whitespace-nowrap">{fmtDate(r.ultima_modifica)}</td>
                  <td className="px-3 py-2">
                    <AzioniRapide row={r} navigate={navigate} />
                    <button onClick={() => setEdit(r)}
                      className="mt-1.5 text-[11px] px-2 py-1 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800">
                      Regia ✎
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">Nessun partner per questo filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <OverridePanel row={edit} onClose={() => setEdit(null)} onSaved={load} onAuthExpired={onAuthExpired} />
      )}
    </div>
  );
}
