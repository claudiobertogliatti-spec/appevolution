/**
 * Reparto Acquisizione — Editoriale (workspace caroselli AI, stile Swipeeza).
 *
 * Mese → obiettivi → contenuti, generati dall'AI, approvati mensilmente, pubblicati
 * su IG/FB/LinkedIn. Multi-brand (Ciak + un brand per partner: il motore è anche un
 * servizio extra vendibile ai partner).
 *
 * F2a: dati reali da /api/admin/ciak/editorial/{brands,contents}. La generazione AI
 * e il rendering delle slide arrivano in F2b/F2c. Nessun dato finto: se non ci sono
 * contenuti si mostra l'empty-state.
 */
import { useEffect, useMemo, useState } from "react";
import { Sparkles, Plus, LayoutGrid, BookOpen, Wand2, Images } from "lucide-react";
import { apiGet, apiPost } from "../api";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

const SECTIONS = [
  { id: "workspace", label: "Workspace", icon: LayoutGrid },
  { id: "brand", label: "Brand & knowledge", icon: BookOpen },
  { id: "crea", label: "Crea carosello", icon: Wand2 },
  { id: "galleria", label: "Galleria", icon: Images },
];

const YEAR = new Date().getFullYear();
const MONTHS = [
  { num: 8, label: "Ago" }, { num: 9, label: "Set" }, { num: 10, label: "Ott" },
  { num: 11, label: "Nov" }, { num: 12, label: "Dic" },
];
const MONTH_FULL = { 8: "agosto", 9: "settembre", 10: "ottobre", 11: "novembre", 12: "dicembre" };

const CHAN_LABEL = { ig: "IG", fb: "FB", linkedin: "in" };
const STATUS = {
  bozza: { label: "bozza", cls: "bg-slate-100 text-slate-600" },
  da_approvare: { label: "da approvare", cls: "bg-amber-50 text-amber-700" },
  approvato: { label: "approvato", cls: "bg-emerald-50 text-emerald-600" },
  in_coda: { label: "in coda", cls: "bg-blue-50 text-blue-700" },
  pubblicato: { label: "pubblicato", cls: "bg-blue-50 text-blue-700" },
  fallito: { label: "fallito", cls: "bg-red-50 text-red-600" },
};

function Stat({ k, v, h, tone }) {
  const color = tone === "amber" ? "text-amber-700" : tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{k}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{v}</div>
      <div className="text-[11px] text-slate-400 mt-1">{h}</div>
    </div>
  );
}

function ContentCard({ c }) {
  const st = STATUS[c.status] || STATUS.bozza;
  const chans = (c.channels || []).map((x) => CHAN_LABEL[x] || x).join(" + ");
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="aspect-square bg-slate-900 flex items-center justify-center p-4 relative">
        <span className="absolute top-2 left-2 text-[10px] font-semibold bg-white/15 text-white rounded-full px-2 py-0.5 capitalize">{c.format}</span>
        <span className="text-yellow-400 text-lg font-semibold text-center leading-tight line-clamp-3">{c.topic || c.caption || "Contenuto"}</span>
      </div>
      <div className="p-3">
        <div className="text-[12.5px] font-medium text-slate-900 leading-snug line-clamp-2">{c.caption || c.topic}</div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[11px] text-slate-400">{chans}{c.scheduled_date ? " · " + c.scheduled_date.slice(0, 10) : ""}</span>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${st.cls}`}>{st.label}</span>
        </div>
      </div>
    </div>
  );
}

export function AcquisizioneEditoriale({ onAuthExpired }) {
  const [section, setSection] = useState("workspace");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(null);
  const [data, setData] = useState({ contents: [], stats: { total: 0, month: 0, da_approvare: 0, pubblicati: 0 } });
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);

  const loadBrands = (selectId) => {
    return apiGet("/editorial/brands")
      .then((r) => {
        const list = r.brands || [];
        setBrands(list);
        setBrandId((cur) => selectId || cur || (list[0] && list[0].brand_id) || null);
      })
      .catch((e) => { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); });
  };

  useEffect(() => {
    loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewBrand = async () => {
    const name = window.prompt("Nome del nuovo brand (es. il partner)");
    if (!name || !name.trim()) return;
    try {
      const r = await apiPost("/editorial/brands", { name: name.trim() });
      await loadBrands(r.brand?.brand_id);
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    }
  };

  const loadContents = () => {
    const params = { year: YEAR, month };
    if (brandId) params.brand_id = brandId;
    return apiGet("/editorial/contents", params)
      .then((r) => setData({ contents: r.contents || [], stats: r.stats || {} }))
      .catch((e) => { if (e.message === "AUTH_EXPIRED") onAuthExpired?.(); });
  };

  useEffect(() => {
    loadContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, month]);

  const handleGenerate = async () => {
    if (!brandId || generating) return;
    setGenerating(true);
    try {
      await apiPost("/editorial/contents/generate", { brand_id: brandId, year: YEAR, month });
      await loadContents();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveMonth = async () => {
    if (!brandId || approving) return;
    setApproving(true);
    try {
      await apiPost("/editorial/contents/approve-month", { brand_id: brandId, year: YEAR, month });
      await loadContents();
    } catch (e) {
      if (e.message === "AUTH_EXPIRED") onAuthExpired?.();
    } finally {
      setApproving(false);
    }
  };

  const byObjective = useMemo(() => {
    const groups = {};
    for (const c of data.contents) {
      const k = c.objective || "Senza obiettivo";
      (groups[k] = groups[k] || []).push(c);
    }
    return Object.entries(groups);
  }, [data.contents]);

  const brandName = brands.find((b) => b.brand_id === brandId)?.name || "Ciak";
  const stats = data.stats || {};

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <AcquisizioneSubNav active="Editoriale" />

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Editoriale</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Crea i tuoi caroselli con l'AI, organizzali per mese e obiettivo, approvi in blocco
              e il motore li pubblica su Instagram, Facebook e LinkedIn.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleGenerate}
              disabled={generating || !brandId}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" /> {generating ? "Genero…" : "Genera il mese con AI"}
            </button>
            <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition">
              <Plus className="w-4 h-4" /> Crea carosello
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap items-center mt-4">
          {SECTIONS.map((s) => {
            const on = s.id === section;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-2 text-[13px] rounded-full px-3.5 py-2 transition ${
                  on ? "bg-slate-900 text-white font-semibold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {s.label}
              </button>
            );
          })}
          <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-slate-500">
            Brand:
            {brands.length ? (
              <select
                value={brandId || ""}
                onChange={(e) => setBrandId(e.target.value)}
                className="font-semibold text-slate-900 bg-slate-100 rounded-full px-3 py-1 border-0"
              >
                {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
              </select>
            ) : (
              <span className="font-semibold text-slate-900 bg-slate-100 rounded-full px-3 py-1">nessuno</span>
            )}
            <button onClick={handleNewBrand} className="text-slate-500 hover:text-slate-900">+ Nuovo brand</button>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat k="Contenuti totali" v={stats.total || 0} h="tutti i mesi" />
        <Stat k="Questo mese" v={stats.month || 0} h={MONTH_FULL[month] || ""} />
        <Stat k="Da approvare" v={stats.da_approvare || 0} h="aspettano il tuo ok" tone="amber" />
        <Stat k="Pubblicati" v={stats.pubblicati || 0} h="IG · FB · LinkedIn" tone="green" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {MONTHS.map((m) => (
            <button
              key={m.num}
              onClick={() => setMonth(m.num)}
              className={`text-sm rounded-lg px-4 py-2 whitespace-nowrap border transition ${
                m.num === month
                  ? "bg-yellow-400 text-slate-900 font-semibold border-yellow-400"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {byObjective.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-10 text-center">
            <Sparkles className="w-7 h-7 text-yellow-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 mt-3">Nessun contenuto per {MONTH_FULL[month]}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              Genera il piano del mese con l'AI (diviso per obiettivi), poi approvi e il motore pubblica.
              Oppure crea un singolo carosello.
            </p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || !brandId}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-5 py-2.5 hover:bg-yellow-300 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> {generating ? "Genero…" : `Genera ${MONTH_FULL[month]} con AI`}
              </button>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-5 py-2.5 hover:bg-slate-50 transition">
                <Plus className="w-4 h-4" /> Crea carosello
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            {byObjective.map(([obj, items]) => (
              <div key={obj}>
                <div className="flex items-center gap-2.5 mt-5 mb-3">
                  <span className="text-[15px] font-semibold text-slate-900">{obj}</span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">
                    {items.length} content{items.length === 1 ? "o" : "i"}
                  </span>
                </div>
                <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                  {items.map((c) => <ContentCard key={c.content_id} c={c} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(stats.da_approvare || 0) > 0 && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Approva {MONTH_FULL[month]}</div>
            <div className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              {stats.da_approvare} contenuti in attesa. Approva in blocco → il motore renderizza
              le slide e le mette in coda per la pubblicazione su IG/FB/LinkedIn (lun/mer/ven).
            </div>
          </div>
          <button
            onClick={handleApproveMonth}
            disabled={approving}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-5 py-2.5 hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {approving ? "Approvo…" : `Approva ${stats.da_approvare} contenuti`}
          </button>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Brand attivo: {brandName}. La generazione AI usa il modello Claude (Andrea); il rendering
        slide e la pubblicazione LinkedIn richiedono le chiavi in produzione.
      </p>
    </div>
  );
}

export default AcquisizioneEditoriale;
