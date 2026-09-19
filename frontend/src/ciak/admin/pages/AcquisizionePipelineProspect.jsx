/**
 * Reparto Acquisizione — Pipeline Prospect (pagina unica).
 *
 * Unisce INGRESSO e GESTIONE in una schermata sola (decisione Claudio 19/9):
 *  1. Ingresso — far entrare i lead: ricerca automatica (stato), ricerca manuale,
 *     aggiungi a mano, importa CSV.
 *  2. Gestione — lavorarli fino alla vendita: KPI, "da lavorare oggi" (recuperi con
 *     owner AI/team + azione), stato del funnel, lista contatti con "Contatta" (Brevo).
 *
 * Fonti reali: /acquisizione-command-center (priorità, funnel, autosearch),
 * /api/discovery/* (ricerca/inserimento/lista), POST /leads/{id}/contatta (Brevo).
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, UserPlus, Upload, RefreshCw, CheckCircle2, ArrowRight, ArrowDown,
  Flame, PhoneCall, MousePointerClick, TrendingUp, Send, ExternalLink, Inbox, Bot, User,
} from "lucide-react";
import { apiGet, apiPost, adminFetch } from "../api";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

const STATUS_LABELS = {
  discovered: "Nuovo", pending: "Nuovo", analyzing: "In analisi", scored: "Valutato",
  contacted: "Contattato", message_ready: "Msg pronto", message_sent: "Msg inviato",
  responded_positive: "Risposta +", responded_negative: "Risposta −",
  qualified: "Qualificato", converted: "Cliente", rejected: "Scartato",
};
const SOURCE_LABELS = {
  google_places: "Google", manual: "Manuale", instagram: "Instagram",
  linkedin: "LinkedIn", youtube: "YouTube", facebook: "Facebook", google: "Google",
};

function fmtDate(iso, withTime) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("it-IT",
      withTime ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" });
  } catch { return null; }
}
function scoreTone(s) {
  if (s >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s >= 60) return "bg-yellow-50 text-yellow-800 border-yellow-300";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

async function postJson(path, body) {
  const r = await adminFetch(path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}

export function AcquisizionePipelineProspect({ onAuthExpired }) {
  const [cc, setCc] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoSearch, setAutoSearch] = useState(undefined);

  // Ingresso — ricerca / aggiungi / importa
  const [q, setQ] = useState({ profession: "", city: "", all_italy: false, only_with_website: false, max_results: 50 });
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [lead, setLead] = useState({ display_name: "", email: "", phone: "", website_url: "", niche_detected: "", bio: "" });
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [importing, setImporting] = useState(false);

  // Gestione — filtri lista + contatto
  const [fq, setFq] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [compose, setCompose] = useState({ subject: "", html: "" });
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  const guard = (e) => { if (e?.message === "AUTH_EXPIRED") onAuthExpired?.(); };

  const loadCc = () =>
    apiGet("/acquisizione-command-center")
      .then((r) => { setCc(r); setAutoSearch(r.discovery_engine?.last_autosearch || null); })
      .catch(guard);

  const loadLeads = async () => {
    try {
      const r = await adminFetch("/api/discovery/leads?limit=150");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { if (r.status === 401 || r.status === 403) onAuthExpired?.(); return; }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (e) { guard(e); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCc(), loadLeads()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ingresso ────────────────────────────────────────────────────────────
  const runSearch = async () => {
    if (searching || !q.profession.trim() || (!q.city.trim() && !q.all_italy)) return;
    setSearching(true); setSearchMsg(null);
    try {
      const { ok, data } = await postJson("/api/discovery/search-places", {
        profession: q.profession.trim(), city: q.city.trim(),
        max_results: Number(q.max_results) || 50, all_italy: q.all_italy, only_with_website: q.only_with_website,
      });
      if (!ok) { setSearchMsg({ err: true, text: data.detail || "Errore nella ricerca." }); return; }
      const imp = data.new_leads ?? data.imported ?? 0;
      const skip = data.duplicates_skipped ?? data.skipped ?? 0;
      const hot = data.hot_leads ?? data.hot ?? 0;
      setSearchMsg({ err: false, text: `Trovati ${imp} nuovi${skip ? ` (${skip} già presenti)` : ""}${hot ? ` · ${hot} caldi` : ""}. Sono qui sotto, pronti da lavorare.` });
      loadLeads();
    } catch (e) { guard(e); setSearchMsg({ err: true, text: "Errore di rete." }); }
    finally { setSearching(false); }
  };

  const addLead = async () => {
    if (adding || !lead.email.trim()) return;
    setAdding(true); setAddMsg(null);
    try {
      const { ok, data } = await postJson("/api/discovery/import", { leads: [{ ...lead, source: "manual" }], auto_score: false });
      if (!ok) { setAddMsg({ err: true, text: data.detail || "Errore." }); return; }
      setAddMsg({ err: false, text: "Contatto aggiunto qui sotto." });
      setLead({ display_name: "", email: "", phone: "", website_url: "", niche_detected: "", bio: "" });
      loadLeads();
    } catch (e) { guard(e); setAddMsg({ err: true, text: "Errore di rete." }); }
    finally { setAdding(false); }
  };

  const importCsv = async (file) => {
    if (!file || importing) return;
    setImporting(true); setImportMsg(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await adminFetch("/api/discovery/import-csv", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { setImportMsg({ err: true, text: data.detail || "Errore import." }); return; }
      const imp = data.imported ?? data.total_imported ?? 0;
      setImportMsg({ err: false, text: `Importati ${imp} contatti.` });
      loadLeads();
    } catch (e) { guard(e); setImportMsg({ err: true, text: "Errore di rete." }); }
    finally { setImporting(false); }
  };

  // ── Gestione ────────────────────────────────────────────────────────────
  const priorities = cc?.priorities || {};
  const stages = cc?.funnel_stages || {};
  const funnel = cc?.funnel || {};

  const buckets = [
    { key: "diagnostic_no_purchase", icon: Flame, tone: "text-red-600", owner: "Carlo", label: "Analisi pronta, nessuna call", action: "Fai prenotare" },
    { key: "purchased_no_call", icon: PhoneCall, tone: "text-yellow-600", owner: "Gaia", label: "Acquistato, manca la call", action: "Fai prenotare" },
    { key: "clicked_no_purchase", icon: MousePointerClick, tone: "text-slate-500", owner: "Carlo", label: "Ha cliccato, non pagato", action: "Ripesca" },
  ];
  const todoRows = buckets.flatMap((b) =>
    (priorities[b.key] || []).slice(0, 4).map((it) => ({ ...it, bucket: b }))
  );

  const daContattare = useMemo(
    () => leads.filter((l) => !l.last_contacted_at && !["contacted", "converted", "rejected"].includes(l.status)).length,
    [leads]
  );
  const vicini = (priorities.diagnostic_no_purchase?.length || 0) + (priorities.purchased_no_call?.length || 0);

  const kpi = [
    { label: "In lavorazione", value: cc?.discovery_engine?.new_leads_total ?? leads.length, tone: "" },
    { label: "Da contattare", value: daContattare, tone: "" },
    { label: "Call prenotate", value: stages.call_booked ?? funnel.call_booked ?? 0, tone: "" },
    { label: "Vicini alla vendita", value: vicini, tone: "warn" },
  ];

  const stageCells = [
    { label: "Lead", value: stages.leads },
    { label: "Questionario", value: stages.questionnaire_completed },
    { label: "Report", value: stages.report_ready },
    { label: "Call", value: stages.call_booked },
    { label: "Chiuso", value: funnel.contracts_paid, good: true },
  ];

  const filtered = useMemo(() => {
    const needle = fq.trim().toLowerCase();
    return leads.filter((l) => {
      if (fStatus !== "all" && l.status !== fStatus) return false;
      if (fSource !== "all" && l.source !== fSource) return false;
      if (onlyTodo && (l.last_contacted_at || l.status === "contacted" || l.status === "converted")) return false;
      if (needle) {
        const hay = `${l.display_name || ""} ${l.email || ""} ${l.niche_detected || ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [leads, fq, fStatus, fSource, onlyTodo]);

  const startContatta = (l) => {
    if (openId === l.id) { setOpenId(null); return; }
    setOpenId(l.id); setSendMsg(null);
    const nome = (l.display_name || "").split(" ")[0] || "";
    setCompose({
      subject: nome ? `Un'idea per te, ${nome}` : "Un'idea per la tua attività",
      html: `Ciao${nome ? " " + nome : ""},<br><br>ho dato un'occhiata alla tua attività e credo ci sia un modo concreto per portarti più clienti dal digitale.<br><br>Ti va se ti mando un'analisi gratuita, senza impegno?<br><br>Un saluto,<br>Evolution PRO`,
    });
  };
  const sendContatta = async (l) => {
    if (sending || !compose.subject.trim() || !compose.html.trim()) return;
    setSending(true); setSendMsg(null);
    try {
      const res = await apiPost(`/leads/${l.id}/contatta`, { subject: compose.subject, html: compose.html });
      if (res?.configured === false) setSendMsg({ err: true, text: "Brevo non è collegato: aggiungi BREVO_API_KEY per inviare." });
      else if (res?.ok) { setSendMsg({ err: false, text: "Email inviata e registrata sul contatto." }); setOpenId(null); loadLeads(); }
      else setSendMsg({ err: true, text: res?.error || "Invio non riuscito." });
    } catch (e) { guard(e); setSendMsg({ err: true, text: "Errore di rete." }); }
    finally { setSending(false); }
  };

  const input = "w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400";
  const Msg = ({ m }) => m ? (
    <div className={`mt-3 text-sm flex items-center gap-2 ${m.err ? "text-red-600" : "text-emerald-600"}`}>
      {!m.err && <CheckCircle2 className="w-4 h-4" />}{m.text}
    </div>
  ) : null;
  const OwnerChip = ({ name }) => {
    const ai = name === "Carlo" || name === "Gaia";
    return (
      <span className={`text-[11px] rounded-md px-2 py-1 inline-flex items-center gap-1 flex-shrink-0 ${ai ? "bg-yellow-50 text-yellow-800 border border-yellow-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
        {ai ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}{name}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-5xl">
      <AcquisizioneSubNav active="Pipeline Prospect" />

      {/* ═══ INGRESSO ═══ */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Fai entrare i contatti</h2>
        </div>

        {autoSearch !== undefined && (
          <div className={`mt-3 flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-[13px] ${autoSearch ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
            <RefreshCw className={`w-4 h-4 flex-shrink-0 ${autoSearch ? "text-emerald-600" : "text-slate-400"}`} />
            {autoSearch ? (
              <span><span className="font-semibold">Ricerca automatica attiva</span> — ultima: +{autoSearch.new_leads ?? 0} lead{autoSearch.executed_at ? ` il ${fmtDate(autoSearch.executed_at, true)}` : ""}{typeof autoSearch.hot_leads === "number" && autoSearch.hot_leads > 0 ? ` · ${autoSearch.hot_leads} caldi` : ""}.</span>
            ) : (
              <span>Ricerca automatica non ancora attiva. Porta ~20 lead/giorno quando viene abilitata.</span>
            )}
          </div>
        )}

        {/* ricerca manuale */}
        <div className="mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input className={input} placeholder="Professione — es. business coach" value={q.profession} onChange={(e) => setQ({ ...q, profession: e.target.value })} />
            <input className={input} placeholder="Città — es. Milano" value={q.city} onChange={(e) => setQ({ ...q, city: e.target.value })} disabled={q.all_italy} />
          </div>
          <div className="flex gap-2 flex-wrap mt-3 items-center">
            <button type="button" onClick={() => setQ({ ...q, all_italy: !q.all_italy })}
              className={`text-[12.5px] rounded-full px-3.5 py-1.5 border transition ${q.all_italy ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>Tutta Italia</button>
            <button type="button" onClick={() => setQ({ ...q, only_with_website: !q.only_with_website })}
              className={`text-[12.5px] rounded-full px-3.5 py-1.5 border transition ${q.only_with_website ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>Solo con sito</button>
            <select className="text-[12.5px] rounded-full px-3 py-1.5 border border-slate-200 text-slate-600" value={q.max_results} onChange={(e) => setQ({ ...q, max_results: e.target.value })}>
              <option value={20}>Max 20</option><option value={50}>Max 50</option><option value={100}>Max 100</option>
            </select>
            <button onClick={runSearch} disabled={searching || !q.profession.trim() || (!q.city.trim() && !q.all_italy)}
              className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-5 py-2.5 hover:bg-yellow-300 transition disabled:opacity-50">
              <Search className="w-4 h-4" /> {searching ? "Cerco…" : "Cerca ora"}
            </button>
          </div>
          <Msg m={searchMsg} />
        </div>

        {/* aggiungi + importa */}
        <div className="mt-4 flex flex-wrap gap-3">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition"><UserPlus className="w-4 h-4" /> Aggiungi a mano</button>
          ) : (
            <div className="w-full border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="grid md:grid-cols-2 gap-2">
                <input className={input} placeholder="Nome" value={lead.display_name} onChange={(e) => setLead({ ...lead, display_name: e.target.value })} />
                <input className={input} placeholder="Email *" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} />
                <input className={input} placeholder="Telefono" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
                <input className={input} placeholder="Nicchia" value={lead.niche_detected} onChange={(e) => setLead({ ...lead, niche_detected: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addLead} disabled={adding || !lead.email.trim()} className="text-sm font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition disabled:opacity-50">{adding ? "Salvo…" : "Salva"}</button>
                <button onClick={() => setShowAdd(false)} className="text-sm font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition">Chiudi</button>
              </div>
              <Msg m={addMsg} />
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition cursor-pointer">
            <Upload className="w-4 h-4" /> {importing ? "Importo…" : "Importa CSV"}
            <input type="file" accept=".csv" className="hidden" disabled={importing} onChange={(e) => importCsv(e.target.files?.[0])} />
          </label>
        </div>
        <Msg m={importMsg} />
      </section>

      <div className="flex items-center gap-2 pl-1">
        <ArrowDown className="w-4 h-4 text-slate-400" />
        <span className="text-[13px] text-slate-400">gli stessi contatti, ora si lavorano fino alla vendita</span>
      </div>

      {/* ═══ GESTIONE ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpi.map((k) => (
          <div key={k.label} className={`rounded-2xl px-4 py-3 ${k.tone === "warn" ? "bg-yellow-50 border border-yellow-200" : "bg-white border border-slate-200"}`}>
            <div className={`text-[12px] ${k.tone === "warn" ? "text-yellow-700" : "text-slate-500"}`}>{k.label}</div>
            <div className={`text-2xl font-bold leading-none mt-1 ${k.tone === "warn" ? "text-yellow-700" : "text-slate-900"}`}>{k.value ?? 0}</div>
          </div>
        ))}
      </div>

      {/* da lavorare oggi */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-slate-900">Da lavorare oggi</h2>
          <span className="ml-auto text-[12.5px] text-slate-500">{todoRows.length} in coda</span>
        </div>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-400">Carico…</div>
        ) : todoRows.length === 0 ? (
          <div className="mt-3 text-sm text-emerald-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Niente in coda. Concentrati sui nuovi contatti qui sotto.</div>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {todoRows.map((it, i) => {
              const B = it.bucket;
              return (
                <div key={`${it.email}-${i}`} className="py-3 flex items-center gap-3 flex-wrap">
                  <B.icon className={`w-4 h-4 flex-shrink-0 ${B.tone}`} />
                  <div className="flex-1 min-w-[150px]">
                    <div className="text-sm font-semibold text-slate-900 truncate">{it.nome}</div>
                    <div className="text-[12px] text-slate-500 truncate">{B.label}</div>
                  </div>
                  <OwnerChip name={B.owner} />
                  <Link to={`/admin/leads/${encodeURIComponent(it.email)}`}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900 bg-yellow-400 rounded-lg px-3 py-1.5 hover:bg-yellow-300 transition">
                    {B.action} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* stato del funnel */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Dove sono i lead adesso</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-9 items-center gap-2">
          {stageCells.map((c, i) => (
            <Fragment key={c.label}>
              <div className={`text-center rounded-xl py-3 ${c.good ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
                <div className={`text-xl font-bold leading-none ${c.good ? "text-emerald-700" : "text-slate-900"}`}>{c.value ?? 0}</div>
                <div className={`text-[11px] font-medium mt-1 ${c.good ? "text-emerald-700" : "text-slate-500"}`}>{c.label}</div>
              </div>
              {i < stageCells.length - 1 && <div className="hidden md:flex justify-center text-slate-300"><ArrowRight className="w-4 h-4" /></div>}
            </Fragment>
          ))}
        </div>
      </section>

      {/* lista contatti */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Contatti da lavorare</h2>
          <span className="text-[12.5px] text-slate-500">{filtered.length} di {leads.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Cerca nome, email, nicchia"
              className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-slate-400" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
            <option value="all">Tutti gli stati</option><option value="discovered">Nuovo</option><option value="contacted">Contattato</option><option value="qualified">Qualificato</option><option value="converted">Cliente</option>
          </select>
          <select value={fSource} onChange={(e) => setFSource(e.target.value)} className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
            <option value="all">Tutte le fonti</option><option value="google_places">Google</option><option value="manual">Manuale</option><option value="instagram">Instagram</option><option value="linkedin">LinkedIn</option>
          </select>
          <button type="button" onClick={() => setOnlyTodo(!onlyTodo)}
            className={`text-[12.5px] rounded-lg px-3 py-2 border transition ${onlyTodo ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>Solo da contattare</button>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carico i contatti…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-2">Nessun contatto con questi filtri. Falli entrare qui sopra.</p>
            </div>
          ) : (
            filtered.map((l) => (
              <div key={l.id} className="py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-sm font-semibold text-slate-900 truncate">{l.display_name || l.email || "—"}</div>
                    <div className="text-[12px] text-slate-500 truncate">{l.email || l.business_phone || l.phone || "senza email"}{l.niche_detected ? ` · ${l.niche_detected}` : ""}</div>
                  </div>
                  <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{SOURCE_LABELS[l.source] || l.source || "—"}</span>
                  {typeof l.score_total === "number" && l.score_total > 0 && (
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 border ${scoreTone(l.score_total)}`}>{l.score_total}</span>
                  )}
                  <span className="text-[11px] font-medium text-slate-600 w-20 text-center">{STATUS_LABELS[l.status] || "—"}</span>
                  <span className="text-[11px] text-slate-400 w-16 text-right">{l.last_contacted_at ? fmtDate(l.last_contacted_at) : "mai"}</span>
                  <button onClick={() => startContatta(l)} disabled={!l.email}
                    title={l.email ? "Invia email via Brevo" : "Aggiungi un'email al contatto per scrivergli"}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900 bg-yellow-400 rounded-lg px-3 py-1.5 hover:bg-yellow-300 transition disabled:opacity-40">
                    <Send className="w-3.5 h-3.5" /> Contatta
                  </button>
                  <Link to="/admin/lead-manager" title="Apri nella gestione avanzata" className="text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></Link>
                </div>

                {openId === l.id && (
                  <div className="mt-3 ml-1 border-l-2 border-yellow-300 pl-4 space-y-2">
                    <input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })} placeholder="Oggetto"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400" />
                    <textarea value={compose.html} onChange={(e) => setCompose({ ...compose, html: e.target.value })} rows={5}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400 font-mono text-[12.5px]" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => sendContatta(l)} disabled={sending}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" /> {sending ? "Invio…" : `Invia a ${l.email || ""}`}
                      </button>
                      <button onClick={() => setOpenId(null)} className="text-[13px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50 transition">Annulla</button>
                      <span className="text-[11px] text-slate-400">Email 1:1 via Brevo, tracciata sul contatto.</span>
                    </div>
                    {sendMsg && (
                      <div className={`text-[13px] flex items-center gap-2 ${sendMsg.err ? "text-red-600" : "text-emerald-600"}`}>
                        {!sendMsg.err && <CheckCircle2 className="w-4 h-4" />}{sendMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-slate-500 px-1">
        <Link to="/admin/acquisizione-briefing" className="hover:text-slate-800">Briefing operativo & canali →</Link>
        <Link to="/admin/masterclass-analytics" className="hover:text-slate-800">Analisi dettagliata funnel →</Link>
        <Link to="/admin/lead-manager" className="hover:text-slate-800">Gestione avanzata contatti →</Link>
      </div>
    </div>
  );
}

export default AcquisizionePipelineProspect;
