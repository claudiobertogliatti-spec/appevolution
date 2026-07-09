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
import { apiGet } from "../api";

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
  Partner: "bg-blue-50 text-blue-700",
  Team: "bg-slate-100 text-slate-600",
};

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

export function DeliveryAudit({ onAuthExpired }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("tutti");

  useEffect(() => {
    apiGet("/delivery-audit")
      .then(setData)
      .catch((e) => {
        if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
        else setError(e.message);
      });
  }, [onAuthExpired]);

  const items = useMemo(() => {
    if (!data) return [];
    const list = data.items || [];
    if (filter === "fermi") return list.filter((i) => i.blocked || i.stale);
    if (filter === "offerta") return list.filter((i) => i.offerta !== "completa");
    if (filter === "videocorso") return list.filter((i) => (i.videocorso_lessons || 0) === 0);
    if (filter === "funnel") return list.filter((i) => !i.funnel_systeme);
    if (filter === "claudio") return list.filter((i) => i.owner === "Team/Claudio");
    return list;
  }, [data, filter]);

  if (error) return <div className="p-8 text-slate-600">Errore: {error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Caricamento delivery audit...</div>;

  const c = data.counters || {};
  const filters = [
    { id: "tutti", label: `Tutti (${data.total || 0})` },
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
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Delivery · Stefania</p>
            <h1 className="text-2xl font-semibold text-slate-900">Delivery Audit</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Stato reale del percorso EVO di ogni partner attivo: fase, offerta, videocorso, funnel Systeme,
          blocchi e prossima azione. Una riga per partner — chi è fermo, cosa manca, chi deve muoversi.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Chip label="Partner attivi" value={data.total || 0} />
        <Chip label="Offerta mancante" value={c.offerta_mancante || 0} tone={c.offerta_mancante ? "amber" : "slate"} />
        <Chip label="Videocorso 0 lezioni" value={c.videocorso_zero || 0} tone={c.videocorso_zero ? "amber" : "slate"} />
        <Chip label="Funnel mancante" value={c.funnel_mancante || 0} tone={c.funnel_mancante ? "amber" : "slate"} />
        <Chip label="Fermi" value={c.fermi || 0} tone={c.fermi ? "rose" : "slate"} />
        <Chip label="Serve OK" value={c.serve_claudio || 0} tone={c.serve_claudio ? "rose" : "slate"} />
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
                <th className="px-4 py-3 font-semibold">Fase EVO</th>
                <th className="px-4 py-3 font-semibold">Posiz.</th>
                <th className="px-4 py-3 font-semibold">Offerta</th>
                <th className="px-4 py-3 font-semibold">Masterclass</th>
                <th className="px-4 py-3 font-semibold">Videocorso</th>
                <th className="px-4 py-3 font-semibold">Funnel</th>
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Chi</th>
                <th className="px-4 py-3 font-semibold">Prossima azione</th>
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
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${OWNER_TONE[i.owner] || "bg-slate-100 text-slate-600"}`}>
                      {i.owner}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600 max-w-[240px] leading-snug">{i.next_action}</p>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">Nessun partner in questo filtro.</td>
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
    </div>
  );
}

export default DeliveryAudit;
