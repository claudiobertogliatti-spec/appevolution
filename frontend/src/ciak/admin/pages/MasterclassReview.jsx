/**
 * Ciak Admin — REVISIONE TRASCRIZIONE (stile Descript), masterclass.
 *
 * Replica il cuore di Descript dentro Ciak: la pipeline si ferma a
 * "da_revisionare" e qui leggi la trascrizione, vedi i tagli proposti
 * (intercalari, silenzi, ripetizioni) barrati nel testo, li attivi/disattivi
 * con un click confrontando con lo SCRIPT del team, e dai l'OK al montaggio.
 *
 * Dati: GET  /api/partner-journey/masterclass/review-data/{partnerId}
 * Approva: POST /api/partner-journey/masterclass/review-approve
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Scissors, Check, AlertTriangle, Volume2, Repeat, FileText } from "lucide-react";
import { adminFetch } from "../api";

const fmt = (s) => {
  s = Math.max(0, Math.round(s || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

const TYPE_META = {
  filler: { label: "Intercalare", icon: Scissors, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  silence: { label: "Pausa lunga", icon: Volume2, color: "text-sky-600", bg: "bg-sky-50 border-sky-200" },
  smart: { label: "Ripetizione", icon: Repeat, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};

export function MasterclassReview({ onAuthExpired }) {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(() => new Set()); // id dei tagli ANNULLATI
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/partner-journey/masterclass/review-data/${partnerId}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      setError("Impossibile caricare i dati di revisione.");
    } finally {
      setLoading(false);
    }
  }, [partnerId, onAuthExpired]);

  useEffect(() => { load(); }, [load]);

  const segs = useMemo(() => (data?.cut_segments || []).slice().sort((a, b) => (a.start || 0) - (b.start || 0)), [data]);

  // Normalizza i tempi delle parole a secondi (AssemblyAI a volte è in ms).
  const words = useMemo(() => {
    const ws = data?.words || [];
    if (!ws.length) return [];
    const maxEnd = ws.reduce((m, w) => Math.max(m, w.end || 0), 0);
    const dur = data?.raw_duration_s || 0;
    const isMs = dur > 0 ? maxEnd > dur * 3 : maxEnd > 3600;
    const k = isMs ? 1000 : 1;
    return ws.map((w) => ({ text: w.text || w.word || "", start: (w.start || 0) / k, end: (w.end || 0) / k }));
  }, [data]);

  const activeSegs = useMemo(() => segs.filter((s) => !disabled.has(s.id)), [segs, disabled]);

  const isWordCut = useCallback(
    (w) => activeSegs.some((s) => w.start >= (s.start || 0) - 0.05 && w.end <= (s.end || 0) + 0.05),
    [activeSegs]
  );

  const toggle = (id) => {
    setDisabled((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const keptCount = segs.length - disabled.size;
  const savedS = activeSegs.reduce((t, s) => t + ((s.end || 0) - (s.start || 0)), 0);

  const approve = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await adminFetch(`/api/partner-journey/masterclass/review-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_id: partnerId, disabled_cut_ids: Array.from(disabled) }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Errore ${res.status}`);
      }
      setDone(true);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") { onAuthExpired?.(); return; }
      setError("Errore nell'avvio del montaggio. Riprova.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Carico la revisione…
      </div>
    );
  }

  const status = data?.pipeline_status;
  if (done || status === "montaggio") {
    return (
      <div className="max-w-2xl p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 mb-6 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <Check className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Montaggio avviato</h2>
          <p className="text-slate-600 mt-2">Sto applicando i tagli approvati e caricando il video. Ti avviso quando è pronto per l'approvazione finale.</p>
        </div>
      </div>
    );
  }

  if (status !== "da_revisionare") {
    return (
      <div className="max-w-2xl p-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 mb-6 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Indietro
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Nessuna revisione testo in attesa per questo partner{status ? ` (stato: ${status})` : ""}.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl p-6 md:p-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 mb-4 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Indietro
      </button>

      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revisione del taglio</h1>
          <p className="text-sm text-slate-500 mt-1">
            Leggi la trascrizione confrontandola con lo script. I tagli proposti sono <span className="line-through text-slate-400">barrati</span>. Togli un taglio se mozza una frase, poi approva.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900">{keptCount}<span className="text-base font-normal text-slate-400">/{segs.length} tagli</span></div>
          <div className="text-xs text-slate-500">risparmio ~{fmt(savedS)}</div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Script del team — riferimento */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Script del team (riferimento)</h2>
          </div>
          <div className="p-5 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {data?.script ? data.script : <span className="text-slate-400">Script non disponibile per questo partner.</span>}
          </div>
        </div>

        {/* Trascrizione con tagli barrati */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <h2 className="font-semibold text-slate-800">Trascrizione del registrato</h2>
          </div>
          <div className="p-5 text-sm leading-7 text-slate-800 max-h-[60vh] overflow-y-auto">
            {words.length ? (
              words.map((w, i) => {
                const cut = isWordCut(w);
                return (
                  <span key={i} className={cut ? "line-through text-slate-300" : "text-slate-800"}>
                    {w.text}{" "}
                  </span>
                );
              })
            ) : (
              <span className="whitespace-pre-wrap">{data?.transcript || <span className="text-slate-400">Trascrizione non disponibile.</span>}</span>
            )}
          </div>
        </div>
      </div>

      {/* Lista tagli con toggle */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800">Tagli proposti</h2>
          <span className="ml-auto text-xs text-slate-400">{segs.length} totali · {keptCount} mantenuti</span>
        </div>
        {segs.length === 0 ? (
          <div className="px-5 py-8 text-center text-slate-400 text-sm">Nessun taglio proposto: il registrato è già pulito.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {segs.map((s) => {
              const meta = TYPE_META[s.type] || TYPE_META.filler;
              const Icon = meta.icon;
              const off = disabled.has(s.id);
              const long = (s.end || 0) - (s.start || 0) > 3;
              const desc = s.type === "filler" ? `"${s.word || "—"}"` : s.type === "smart" ? (s.reason || "ripetizione/autocorrezione") : `pausa ${fmt((s.end || 0) - (s.start || 0))}`;
              return (
                <li key={s.id} className={`px-5 py-3 flex items-center gap-3 ${off ? "opacity-50" : ""}`}>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border ${meta.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-800 truncate">
                      <span className="font-medium">{meta.label}</span> · <span className="text-slate-500">{desc}</span>
                    </div>
                    <div className="text-xs text-slate-400">{fmt(s.start)} → {fmt(s.end)}</div>
                  </div>
                  {(s.type === "smart" || long) && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> controlla
                    </span>
                  )}
                  <button
                    onClick={() => toggle(s.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${off ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50" : "bg-slate-900 text-white border-slate-900 hover:opacity-90"}`}
                  >
                    {off ? "Tieni la parte" : "Taglia"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Approvazione */}
      <div className="mt-6 flex items-center justify-end gap-3">
        <span className="text-sm text-slate-500">Applicherò {keptCount} tagli ({fmt(savedS)} risparmiati).</span>
        <button
          onClick={approve}
          disabled={submitting}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Approva e monta
        </button>
      </div>
    </div>
  );
}

export default MasterclassReview;
