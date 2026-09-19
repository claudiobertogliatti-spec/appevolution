/**
 * Reparto Acquisizione — Pipeline (GESTIONE contatti, "il motore").
 *
 * Qui si LAVORANO i contatti fatti entrare in Prospect: chi recuperare oggi,
 * come sta convertendo il funnel, e la lista dei contatti da contattare con
 * l'azione diretta "Contatta" (email 1:1 via Brevo, tracciata).
 *
 * Fonti reali:
 *  - /acquisizione-command-center → recuperi (priorities) + conversioni (funnel_stages)
 *  - /api/discovery/leads          → contatti outbound da lavorare
 *  - POST /leads/{id}/contatta     → invio email via Brevo + touch sul lead
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, PhoneCall, MousePointerClick, TrendingUp, Search, Send,
  CheckCircle2, ArrowRight, ExternalLink, Inbox,
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

function fmtDate(iso) {
  if (!iso) return null;
  try { return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }); }
  catch { return null; }
}

function scoreTone(s) {
  if (s >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s >= 60) return "bg-yellow-50 text-yellow-800 border-yellow-300";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

export function AcquisizionePipeline({ onAuthExpired }) {
  const [cc, setCc] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  // filtri lista
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fSource, setFSource] = useState("all");
  const [onlyTodo, setOnlyTodo] = useState(false);
  // compose contatto
  const [openId, setOpenId] = useState(null);
  const [compose, setCompose] = useState({ subject: "", html: "" });
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  const guard = (e) => { if (e?.message === "AUTH_EXPIRED") onAuthExpired?.(); };

  const loadLeads = async () => {
    try {
      const r = await adminFetch("/api/discovery/leads?limit=150");
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { guard({ message: r.status === 401 || r.status === 403 ? "AUTH_EXPIRED" : "" }); return; }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (e) { guard(e); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiGet("/acquisizione-command-center").then(setCc).catch(guard),
      loadLeads(),
    ]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priorities = cc?.priorities || {};
  const stages = cc?.funnel_stages || {};
  const bottleneck = (cc?.bottlenecks || [])[0];

  const buckets = [
    { key: "diagnostic_no_purchase", icon: Flame, tone: "text-red-600", label: "Analisi pronte senza call", hint: "I recuperi più vicini alla vendita." },
    { key: "purchased_no_call", icon: PhoneCall, tone: "text-yellow-600", label: "Hanno acquistato, manca la call", hint: "Fai prenotare la consegna." },
    { key: "clicked_no_purchase", icon: MousePointerClick, tone: "text-slate-500", label: "Hanno cliccato, non pagato", hint: "Ripescali con un promemoria." },
  ];
  const totRecuperi = buckets.reduce((n, b) => n + (priorities[b.key]?.length || 0), 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
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
  }, [leads, q, fStatus, fSource, onlyTodo]);

  const startContatta = (lead) => {
    if (openId === lead.id) { setOpenId(null); return; }
    setOpenId(lead.id);
    setSendMsg(null);
    const nome = (lead.display_name || "").split(" ")[0] || "";
    setCompose({
      subject: nome ? `Un'idea per te, ${nome}` : "Un'idea per la tua attività",
      html:
        `Ciao${nome ? " " + nome : ""},<br><br>` +
        `ho dato un'occhiata alla tua attività e credo ci sia un modo concreto per portarti più clienti dal digitale.<br><br>` +
        `Ti va se ti mando un'analisi gratuita, senza impegno?<br><br>` +
        `Un saluto,<br>Evolution PRO`,
    });
  };

  const sendContatta = async (lead) => {
    if (sending || !compose.subject.trim() || !compose.html.trim()) return;
    setSending(true); setSendMsg(null);
    try {
      const res = await apiPost(`/leads/${lead.id}/contatta`, { subject: compose.subject, html: compose.html });
      if (res?.configured === false) {
        setSendMsg({ err: true, text: "Brevo non è collegato: aggiungi la chiave BREVO_API_KEY per inviare." });
      } else if (res?.ok) {
        setSendMsg({ err: false, text: "Email inviata e registrata sul contatto." });
        setOpenId(null);
        loadLeads();
      } else {
        setSendMsg({ err: true, text: res?.error || "Invio non riuscito." });
      }
    } catch (e) { guard(e); setSendMsg({ err: true, text: "Errore di rete." }); }
    finally { setSending(false); }
  };

  const stageCells = [
    { label: "Lead", value: stages.leads },
    { label: "Questionario", value: stages.questionnaire_completed },
    { label: "Report", value: stages.report_ready },
    { label: "Call", value: stages.call_booked },
  ];

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-5xl">
      <AcquisizioneSubNav active="Pipeline" />

      {/* COSA LAVORARE OGGI */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Cosa lavorare oggi</h2>
          <span className="text-[12.5px] text-slate-500">{totRecuperi} recuperi in coda</span>
        </div>
        {totRecuperi === 0 && !loading ? (
          <div className="mt-3 text-sm text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Nessun recupero in coda. Concentrati sui nuovi contatti.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {buckets.map((b) => {
              const items = priorities[b.key] || [];
              const Icon = b.icon;
              return (
                <div key={b.key} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${b.tone}`} />
                    <span className="text-sm font-semibold text-slate-900">{b.label}</span>
                    <span className="ml-auto text-sm font-bold text-slate-900">{items.length}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{b.hint}</p>
                  <ul className="mt-3 space-y-1.5">
                    {items.slice(0, 4).map((it) => (
                      <li key={it.email} className="flex items-center gap-2 text-[13px]">
                        <Link to={`/admin/leads/${encodeURIComponent(it.email)}`} className="text-slate-700 hover:text-slate-900 truncate flex-1">
                          {it.nome}
                        </Link>
                        <Link to={`/admin/leads/${encodeURIComponent(it.email)}`} className="text-slate-400 hover:text-yellow-600 flex-shrink-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </li>
                    ))}
                    {items.length === 0 && <li className="text-[12.5px] text-slate-300">—</li>}
                    {items.length > 4 && <li className="text-[11px] text-slate-400">+{items.length - 4} altri</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CONVERSIONI */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-slate-900">Conversioni del mese</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 items-center gap-2 mt-4">
          {stageCells.map((c, i) => (
            <Fragment key={c.label}>
              <div className="text-center bg-slate-50 border border-slate-200 rounded-xl py-3">
                <div className="text-2xl font-bold text-slate-900 leading-none">{c.value ?? 0}</div>
                <div className="text-[11px] font-medium text-slate-500 mt-1">{c.label}</div>
              </div>
              {i < stageCells.length - 1 && (
                <div className="hidden md:flex justify-center text-slate-300">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        {bottleneck && (
          <div className="mt-4 text-[13px] text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <span className="font-semibold text-slate-900">{bottleneck.title}.</span> {bottleneck.message}
          </div>
        )}
      </section>

      {/* CONTATTI DA LAVORARE */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Contatti da lavorare</h2>
          <span className="text-[12.5px] text-slate-500">{filtered.length} di {leads.length}</span>
        </div>

        {/* filtri */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome, email, nicchia"
              className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-slate-400" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
            <option value="all">Tutti gli stati</option>
            <option value="discovered">Nuovo</option>
            <option value="contacted">Contattato</option>
            <option value="qualified">Qualificato</option>
            <option value="converted">Cliente</option>
          </select>
          <select value={fSource} onChange={(e) => setFSource(e.target.value)} className="text-[13px] border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
            <option value="all">Tutte le fonti</option>
            <option value="google_places">Google</option>
            <option value="manual">Manuale</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <button type="button" onClick={() => setOnlyTodo(!onlyTodo)}
            className={`text-[12.5px] rounded-lg px-3 py-2 border transition ${onlyTodo ? "bg-yellow-50 border-yellow-300 text-yellow-800 font-semibold" : "bg-white border-slate-200 text-slate-600"}`}>
            Solo da contattare
          </button>
        </div>

        {/* lista */}
        <div className="mt-4 divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Carico i contatti…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500 mt-2">Nessun contatto con questi filtri.</p>
              <Link to="/admin/acquisizione-prospect" className="text-[13px] font-semibold text-yellow-700 hover:underline mt-1 inline-block">
                Aggiungi contatti in Prospect →
              </Link>
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
                  <span className="text-[11px] text-slate-400 w-16 text-right">
                    {l.last_contacted_at ? fmtDate(l.last_contacted_at) : "mai"}
                  </span>
                  <button onClick={() => startContatta(l)} disabled={!l.email}
                    title={l.email ? "Invia email via Brevo" : "Aggiungi un'email al contatto per scrivergli"}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-900 bg-yellow-400 rounded-lg px-3 py-1.5 hover:bg-yellow-300 transition disabled:opacity-40">
                    <Send className="w-3.5 h-3.5" /> Contatta
                  </button>
                  <Link to="/admin/lead-manager" title="Apri nella gestione avanzata" className="text-slate-400 hover:text-slate-700">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                {openId === l.id && (
                  <div className="mt-3 ml-1 border-l-2 border-yellow-300 pl-4 space-y-2">
                    <input value={compose.subject} onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                      placeholder="Oggetto" className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400" />
                    <textarea value={compose.html} onChange={(e) => setCompose({ ...compose, html: e.target.value })} rows={5}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400 font-mono text-[12.5px]" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => sendContatta(l)} disabled={sending}
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 bg-yellow-400 rounded-lg px-4 py-2 hover:bg-yellow-300 transition disabled:opacity-50">
                        <Send className="w-3.5 h-3.5" /> {sending ? "Invio…" : "Invia a " + (l.email || "")}
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

      {/* approfondimenti — fuori dal flusso quotidiano */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-slate-500 px-1">
        <Link to="/admin/acquisizione-briefing" className="hover:text-slate-800">Briefing operativo & canali →</Link>
        <Link to="/admin/masterclass-analytics" className="hover:text-slate-800">Analisi dettagliata funnel →</Link>
        <Link to="/admin/lead-manager" className="hover:text-slate-800">Gestione avanzata contatti →</Link>
      </div>
    </div>
  );
}

export default AcquisizionePipeline;
