import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  FileVideo,
  Film,
  Layers,
  Route,
  Users,
  XCircle,
} from "lucide-react";
import { apiGet, adminFetch } from "../api";
import { toast } from "sonner";

const MACRO_TONE = {
  esamina: "bg-blue-50 text-blue-700 border-blue-200",
  valida: "bg-amber-50 text-amber-700 border-amber-200",
  ottimizza: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const OFFER_TONE = {
  completa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  parziale: "bg-amber-50 text-amber-700 border-amber-200",
  mancante: "bg-rose-50 text-rose-700 border-rose-200",
};

const OWNER_TONE = {
  "Team/Claudio": "bg-rose-50 text-rose-700",
  Claudio: "bg-slate-900 text-yellow-400",
  Luca: "bg-slate-800 text-amber-300",
  Partner: "bg-blue-50 text-blue-700",
  Team: "bg-slate-100 text-slate-600",
};

const PRIO_TONE = {
  alta: "bg-rose-100 text-rose-700",
  media: "bg-amber-100 text-amber-700",
  bassa: "bg-emerald-100 text-emerald-700",
};

const OWNER_OPTIONS = ["", "Claudio", "Luca", "Team", "Partner"];
const PRIO_OPTIONS = ["", "alta", "media", "bassa"];

function Chip({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    rose: "bg-rose-50 text-rose-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-2xl font-semibold leading-none">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide mt-1 opacity-80">{label}</p>
    </div>
  );
}

function Flag({ ok, labelOk, labelNo }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> {labelOk}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
      <Circle className="w-3.5 h-3.5" /> {labelNo}
    </span>
  );
}

function openPartner(item) {
  try {
    localStorage.setItem(
      "ciak_partner_view_id",
      JSON.stringify({ id: item.id, name: item.name || item.id })
    );
    window.location.assign("/partner/mio-spazio");
  } catch {
    window.location.assign("/admin/partner");
  }
}

// Pannello di regia: correzioni manuali che vincono sulla stima automatica.
function RegiaPanel({ item, onClose, onSaved, onAuthExpired }) {
  const [form, setForm] = useState({
    alignment_status_override: item.stato_override || "",
    alignment_risk: "",
    alignment_next_step: item.ha_override && item.nota_regia ? "" : "",
    alignment_owner: "",
    alignment_priority: "",
    alignment_notes: item.nota_regia || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminFetch(`/api/admin/ciak/partner/${item.id}/alignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await onSaved();
      onClose();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
      else toast.error("Errore salvataggio: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white shadow-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900">Regia — {item.name || item.id}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Correzioni manuali che vincono sulla stima automatica. Lascia vuoto per usare la stima.
          Stima attuale: <span className="font-medium text-slate-700">{item.next_action_auto || item.next_action}</span>.
        </p>

        <label className="block text-xs font-semibold text-slate-600 mb-1">Prossima azione (forzata)</label>
        <input value={form.alignment_next_step} onChange={(e) => set("alignment_next_step", e.target.value)}
          placeholder={item.next_action_auto || item.next_action}
          className="w-full text-sm px-3 py-2 mb-3 rounded-lg border border-gray-300 outline-none focus:border-slate-900" />

        <label className="block text-xs font-semibold text-slate-600 mb-1">Rischio / nota di stato</label>
        <input value={form.alignment_risk} onChange={(e) => set("alignment_risk", e.target.value)}
          placeholder="es. cliente in ferie fino al 20"
          className="w-full text-sm px-3 py-2 mb-3 rounded-lg border border-gray-300 outline-none focus:border-slate-900" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chi muove</label>
            <select value={form.alignment_owner} onChange={(e) => set("alignment_owner", e.target.value)}
              className="w-full text-sm px-2 py-2 rounded-lg border border-gray-300 outline-none focus:border-slate-900">
              {OWNER_OPTIONS.map((o) => <option key={o} value={o}>{o || `Auto (${item.owner_auto || item.owner})`}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priorità</label>
            <select value={form.alignment_priority} onChange={(e) => set("alignment_priority", e.target.value)}
              className="w-full text-sm px-2 py-2 rounded-lg border border-gray-300 outline-none focus:border-slate-900">
              {PRIO_OPTIONS.map((o) => <option key={o} value={o}>{o || `Auto (${item.priorita})`}</option>)}
            </select>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1">Nota di regia</label>
        <textarea value={form.alignment_notes} onChange={(e) => set("alignment_notes", e.target.value)} rows={3}
          className="w-full text-sm px-3 py-2 mb-4 rounded-lg border border-gray-300 outline-none focus:border-slate-900 resize-y" />

        <button onClick={save} disabled={saving}
          className="w-full py-2 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 disabled:opacity-50">
          {saving ? "Salvo…" : "Salva regia"}
        </button>
      </div>
    </div>
  );
}

export function DeliveryAudit({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("tutti");
  const [edit, setEdit] = useState(null);

  const loadAll = () => {
    apiGet("/delivery-audit")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
    apiGet("/partner-alignment/overrides")
      .then((d) => setOverrides(d.overrides || {}))
      .catch(() => {});
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [onAuthExpired]);

  const items = useMemo(() => {
    if (!data) return [];
    let list = (data.items || []).map((i) => {
      const ov = overrides[i.id] || {};
      const has = Object.keys(ov).some(
        (k) => k.startsWith("alignment_") && !["alignment_updated_at", "alignment_updated_by"].includes(k)
      );
      const priorita = ov.alignment_priority || i.priorita || (i.blocked || i.stale || i.incoerenza ? "alta" : "media");
      return {
        ...i,
        owner_auto: i.owner,
        next_action_auto: i.next_action,
        owner: ov.alignment_owner || i.owner,
        next_action: ov.alignment_next_step || i.next_action,
        stato_override: ov.alignment_status_override || "",
        nota_regia: ov.alignment_notes || null,
        priorita,
        ha_override: has,
      };
    });
    if (filter === "fermi") list = list.filter((i) => i.blocked || i.stale);
    else if (filter === "alta") list = list.filter((i) => i.priorita === "alta");
    else if (filter === "offerta") list = list.filter((i) => i.offerta !== "completa");
    else if (filter === "videocorso") list = list.filter((i) => (i.videocorso_lessons || 0) === 0);
    else if (filter === "funnel") list = list.filter((i) => !i.funnel_systeme);
    else if (filter === "claudio") list = list.filter((i) => i.owner === "Team/Claudio" || i.owner === "Claudio");
    // Ordina: priorità alta prima, poi fermi, poi il resto.
    const rank = (i) => (i.priorita === "alta" ? 0 : i.priorita === "media" ? 1 : 2) * 10 + (i.blocked || i.stale ? 0 : 1);
    return list.slice().sort((a, b) => rank(a) - rank(b));
  }, [data, overrides, filter]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento delivery audit...</div>;

  const c = data.counters || {};
  const nAlta = items.filter((i) => i.priorita === "alta").length;
  const filters = [
    { id: "tutti", label: `Tutti (${data.total || 0})` },
    { id: "alta", label: `Alta priorità` },
    { id: "fermi", label: `Fermi (${c.fermi || 0})` },
    { id: "offerta", label: `Offerta (${c.offerta_mancante || 0})` },
    { id: "videocorso", label: `Videocorso 0 (${c.videocorso_zero || 0})` },
    { id: "funnel", label: `Funnel (${c.funnel_mancante || 0})` },
    { id: "claudio", label: `Serve OK (${c.serve_claudio || 0})` },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Delivery · Simona</p>
            <h1 className="text-2xl font-semibold text-slate-900">Delivery Audit</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Stato reale del percorso EVO di ogni partner attivo: fase, offerta, videocorso, funnel Systeme,
          blocchi e prossima azione. Una riga per partner — chi è fermo, cosa manca, chi deve muoversi.
          Usa <b>Regia</b> su una riga per correggere a mano stato, priorità, chi muove o la prossima azione.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Chip label="Partner attivi" value={data.total || 0} />
        <Chip label="Alta priorità" value={nAlta} tone={nAlta ? "rose" : "slate"} />
        <Chip label="Offerta mancante" value={c.offerta_mancante || 0} tone={c.offerta_mancante ? "amber" : "slate"} />
        <Chip label="Videocorso 0 lezioni" value={c.videocorso_zero || 0} tone={c.videocorso_zero ? "amber" : "slate"} />
        <Chip label="Funnel mancante" value={c.funnel_mancante || 0} tone={c.funnel_mancante ? "amber" : "slate"} />
        <Chip label="Fermi" value={c.fermi || 0} tone={c.fermi ? "rose" : "slate"} />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Partner</th>
                <th className="px-4 py-3 font-semibold">Prio</th>
                <th className="px-4 py-3 font-semibold">Fase EVO</th>
                <th className="px-4 py-3 font-semibold">Posiz.</th>
                <th className="px-4 py-3 font-semibold">Offerta</th>
                <th className="px-4 py-3 font-semibold">Masterclass</th>
                <th className="px-4 py-3 font-semibold">Videocorso</th>
                <th className="px-4 py-3 font-semibold">Funnel</th>
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Chi</th>
                <th className="px-4 py-3 font-semibold">Prossima azione</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/60 align-top">
                  <td className="px-4 py-3">
                    <button onClick={() => openPartner(i)} className="text-left group">
                      <p className="font-semibold text-slate-900 group-hover:text-blue-700 truncate max-w-[180px]">
                        {i.name || i.id}
                      </p>
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">{i.niche || "—"}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${PRIO_TONE[i.priorita] || "bg-slate-100 text-slate-600"}`}>
                      {i.priorita}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${MACRO_TONE[i.macro_phase] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {i.macro_label}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{i.phase} · {i.current_step || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${i.positioning_filled >= 6 ? "text-emerald-600" : i.positioning_filled > 0 ? "text-amber-600" : "text-rose-500"}`}>
                      {i.positioning_filled}/6
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${OFFER_TONE[i.offerta]}`}>
                      {i.offerta} {i.offerta !== "mancante" ? `${i.offer_filled}/4` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    <Flag ok={i.masterclass_script} labelOk="Script" labelNo="Script" />
                    <div><Flag ok={i.masterclass_video} labelOk="Video" labelNo="Video" /></div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${i.videocorso_lessons > 0 ? "text-slate-700" : "text-rose-500"}`}>
                      <Film className="w-3.5 h-3.5" /> {i.videocorso_lessons}
                      {i.videocorso_lessons > 0 && (
                        <span className="text-xs text-slate-400">({i.videocorso_lessons_ready} pronte)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Flag ok={i.funnel_systeme} labelOk="Systeme" labelNo="Manca" />
                  </td>
                  <td className="px-4 py-3">
                    {i.blocked ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> Bloccato</span>
                    ) : i.stale ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><AlertTriangle className="w-3.5 h-3.5" /> Fermo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> In moto</span>
                    )}
                    {i.incoerenza && (
                      <p className="text-[11px] text-rose-500 mt-1 max-w-[150px] leading-snug">{i.incoerenza}</p>
                    )}
                    {i.ha_override && (
                      <p className="text-[10px] text-violet-600 mt-1">regia manuale</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${OWNER_TONE[i.owner] || "bg-slate-100 text-slate-600"}`}>
                      {i.owner}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600 max-w-[240px] leading-snug">{i.next_action}</p>
                    {i.stato_reale && (
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] leading-snug">{i.stato_reale}</p>
                    )}
                    {i.nota_regia && <p className="text-[11px] text-violet-500 mt-1 max-w-[240px] leading-snug">“{i.nota_regia}”</p>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEdit(i)}
                      className="text-[11px] px-2 py-1 rounded-lg bg-slate-900 text-yellow-400 hover:bg-slate-800 whitespace-nowrap">
                      Regia ✎
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">Nessun partner in questo filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4">
        <Users className="w-5 h-5 text-slate-400 mt-0.5" />
        <p className="text-sm text-slate-500 leading-relaxed">
          Gap sistematici da chiudere per primi: <b>offerta</b> (nome, prezzo, cosa include, garanzia),
          <b> videocorso</b> (avviare le lezioni) e <b>funnel Systeme</b> nell'account del partner.
          Priorità: sblocca prima chi è fermo e chi aspetta un OK, poi allinea gli asset base.
        </p>
      </div>

      {edit && (
        <RegiaPanel item={edit} onClose={() => setEdit(null)} onSaved={loadAll} onAuthExpired={onAuthExpired} />
      )}
    </div>
  );
}

export default DeliveryAudit;
