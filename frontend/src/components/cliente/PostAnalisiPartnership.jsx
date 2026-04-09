import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Download, Headphones, ArrowRight, ArrowDown,
  CheckCircle, XCircle, Shield, CreditCard, Building2,
  PenLine, Loader2, MessageCircle, Send, ChevronDown,
  ChevronUp, Gift, Star, TrendingUp, Users, Zap,
  Target, BookOpen, Video, Megaphone, BarChart3, Copy, Check
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

const C = {
  yellow: "#FFD24D", yellowDark: "#D4A017", dark: "#1A1F24",
  bg: "#FAFAF7", white: "#FFFFFF", border: "#E8E4DC",
  muted: "#8B8680", green: "#10B981", red: "#EF4444",
  blue: "#3B82F6", purple: "#8B5CF6",
};

// ── Section wrapper ──────────────────────────────────────────────
function Section({ id, children, accent }) {
  return (
    <div data-testid={`section-${id}`} className="scroll-mt-8">
      {accent ? (
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: C.white, border: `1px solid ${C.border}` }}>
          {children}
        </div>
      ) : children}
    </div>
  );
}

// ── Contract Chat Sidebar ────────────────────────────────────────
function ContractChat({ userId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const token = localStorage.getItem("access_token");

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(m => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/contract/chat`, {
        partner_id: userId,
        message: userMsg,
        conversation_history: messages.slice(-6),
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(m => [...m, { role: "assistant", content: r.data.reply }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Errore di connessione. Riprova." }]);
    }
    setLoading(false);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!open) {
    return (
      <button data-testid="open-chat" onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-50 transition-transform hover:scale-110"
        style={{ background: C.yellow }}>
        <MessageCircle className="w-6 h-6" style={{ color: C.dark }} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
      style={{ background: C.white, border: `1px solid ${C.border}`, maxHeight: "60vh" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: C.dark }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: C.yellow }} />
          <span className="text-sm font-bold text-white">Assistente Contrattuale</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white text-lg font-bold">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]" style={{ background: C.bg }}>
        {messages.length === 0 && (
          <div className="text-center py-6">
            <MessageCircle className="w-8 h-8 mx-auto mb-2" style={{ color: C.border }} />
            <p className="text-sm" style={{ color: C.muted }}>Hai dubbi su un articolo del contratto? Chiedimi qui.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm"
              style={{
                background: m.role === "user" ? C.yellow : C.white,
                color: C.dark,
                border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-xl px-3 py-2 text-sm" style={{ background: C.white, border: `1px solid ${C.border}` }}><Loader2 className="w-4 h-4 animate-spin inline" /> ...</div></div>}
        <div ref={endRef} />
      </div>
      <div className="p-2 flex gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
        <input data-testid="chat-input" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Scrivi una domanda..."
          className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ border: `1px solid ${C.border}`, background: C.bg }} />
        <button data-testid="chat-send" onClick={send} disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: input.trim() ? C.yellow : C.border }}>
          <Send className="w-4 h-4" style={{ color: C.dark }} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export default function PostAnalisiPartnership({ user, adminPreview = false }) {
  const [analisi, setAnalisi] = useState(null);
  const [loadingAnalisi, setLoadingAnalisi] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [contractText, setContractText] = useState("");
  const [corrispettivo, setCorrispettivo] = useState(2790);
  const [confirmedArticles, setConfirmedArticles] = useState({});
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [bonificoData, setBonificoData] = useState(null);
  const [copiedIban, setCopiedIban] = useState(false);
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioAvailable, setAudioAvailable] = useState(false);

  const userId = user?.id || user?.user_id;
  const token = localStorage.getItem("access_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const nome = user?.nome || "Cliente";

  // ── Fetch data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoadingAnalisi(false); return; }
    const fetchAll = async () => {
      try {
        const [analisiRes, contractRes, audioRes] = await Promise.allSettled([
          axios.get(`${API}/api/cliente-analisi/output/${userId}`, { headers }),
          axios.get(`${API}/api/cliente-analisi/contract-text/${userId}`, { headers }),
          axios.get(`${API}/api/cliente-analisi/audio/${userId}`, { headers }),
        ]);
        if (analisiRes.status === "fulfilled") setAnalisi(analisiRes.value.data);
        if (contractRes.status === "fulfilled") {
          setContractText(contractRes.value.data.text || "");
          setCorrispettivo(contractRes.value.data.corrispettivo || 2790);
        }
        if (audioRes.status === "fulfilled" && audioRes.value.data?.available) {
          setAudioUrl(audioRes.value.data.url);
          setAudioAvailable(true);
        }
      } catch (e) { console.error("Fetch post-analisi:", e); }
      setLoadingAnalisi(false);
    };
    fetchAll();
  }, [userId]);

  // ── PDF Download ─────────────────────────────────────────────────
  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const r = await axios.get(`${API}/api/cliente-analisi/pdf/${userId}`, {
        headers, responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `EvolutionPRO_Analisi_${nome}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error("PDF download:", e); }
    setDownloadingPdf(false);
  };

  // ── Contract articles ────────────────────────────────────────────
  const IMPORTANT_ARTICLES = [3, 5, 7, 9, 11];
  // Match both "Art. X" and "ARTICOLO X" formats
  const articles = contractText.split(/(?=(?:Art\.\s*\d+|ARTICOLO\s+\d+))/).filter(a => a.trim());
  const allImportantConfirmed = IMPORTANT_ARTICLES.every(n => confirmedArticles[n]);

  // ── Sign ─────────────────────────────────────────────────────────
  const handleSign = async () => {
    if (!signatureName.trim() || !allImportantConfirmed) return;
    setSigning(true);
    try {
      const firma64 = btoa(unescape(encodeURIComponent(`FIRMA DIGITALE: ${signatureName} - ${new Date().toISOString()}`)));
      await axios.post(`${API}/api/cliente-analisi/partnership-firma`, {
        firma_base64: firma64,
        articoli_confermati: Object.keys(confirmedArticles).filter(k => confirmedArticles[k]).map(Number),
      }, { headers });
      setSigned(true);
    } catch (e) { console.error("Sign error:", e); }
    setSigning(false);
  };

  // ── Payment ──────────────────────────────────────────────────────
  const startStripeCheckout = async () => {
    setCheckingOut(true);
    try {
      const r = await axios.post(`${API}/api/cliente-analisi/partnership-checkout`, null, { headers });
      if (r.data?.checkout_url) { window.location.href = r.data.checkout_url; return; }
    } catch (e) { console.error("Stripe:", e); }
    setCheckingOut(false);
  };

  const selectBonifico = async () => {
    try {
      const r = await axios.post(`${API}/api/cliente-analisi/partnership-bonifico`, null, { headers });
      setBonificoData(r.data);
      setPaymentMethod("bonifico");
    } catch (e) { console.error("Bonifico:", e); }
  };

  const copyIban = () => {
    navigator.clipboard.writeText(bonificoData?.iban || "");
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  // ── Loading ──────────────────────────────────────────────────────
  if (loadingAnalisi) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellow }} />
      </div>
    );
  }

  const analisiData = analisi?.analisi || {};
  const scoring = analisi?.scoring || {};
  const corrStr = corrispettivo.toLocaleString("it-IT");

  return (
    <div data-testid="post-analisi-partnership" className="space-y-8 pb-12"
      style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* ═══ 1. RIPRENDIAMO DA DOVE CI SIAMO FERMATI ════════════════ */}
      <Section id="recap" accent>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${C.green}15` }}>
            <CheckCircle className="w-6 h-6" style={{ color: C.green }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: C.dark }}>
            Ciao {nome}, riprendiamo da dove ci siamo fermati.
          </h1>
        </div>
        <p className="text-base text-center leading-relaxed mb-4" style={{ color: C.muted }}>
          Durante la call abbiamo analizzato insieme la tua situazione e il potenziale
          del tuo progetto. Ecco un riepilogo di quello che è emerso.
        </p>
        {analisi?.quiz && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.yellowDark }}>Il tuo progetto</div>
            {analisi.quiz.ambito && <div className="text-sm"><strong style={{ color: C.dark }}>Ambito:</strong> <span style={{ color: C.muted }}>{analisi.quiz.ambito}</span></div>}
            {analisi.quiz.target && <div className="text-sm"><strong style={{ color: C.dark }}>Target:</strong> <span style={{ color: C.muted }}>{analisi.quiz.target}</span></div>}
            {analisi.quiz.problema && <div className="text-sm"><strong style={{ color: C.dark }}>Problema che risolvi:</strong> <span style={{ color: C.muted }}>{analisi.quiz.problema}</span></div>}
            {analisi.quiz.obiettivo && <div className="text-sm"><strong style={{ color: C.dark }}>Obiettivo:</strong> <span style={{ color: C.muted }}>{analisi.quiz.obiettivo}</span></div>}
          </div>
        )}
        {scoring?.score_totale != null && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: `${C.green}12`, color: C.green }}>
              <Star className="w-4 h-4" /> Punteggio di idoneità: {scoring.score_totale}/40 — {scoring.esito || "VALUTATO"}
            </span>
          </div>
        )}
      </Section>

      {/* ═══ 2. LA TUA ANALISI STRATEGICA ═══════════════════════════ */}
      <Section id="analisi" accent>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.blue}15` }}>
            <FileText className="w-5 h-5" style={{ color: C.blue }} />
          </div>
          <h2 className="text-xl font-black" style={{ color: C.dark }}>La tua Analisi Strategica</h2>
        </div>

        {/* Sintesi scritta */}
        {(analisiData.sintesi_progetto || analisiData.sintesi) && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.yellowDark }}>Sintesi</div>
            <p className="text-base leading-relaxed" style={{ color: C.muted }}>{analisiData.sintesi_progetto || analisiData.sintesi}</p>
          </div>
        )}
        {analisiData.diagnosi && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.blue }}>Diagnosi</div>
            <p className="text-base leading-relaxed" style={{ color: C.muted }}>{analisiData.diagnosi}</p>
          </div>
        )}
        {analisiData.punti_di_forza && Array.isArray(analisiData.punti_di_forza) && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.green }}>Punti di forza</div>
            <ul className="space-y-1">
              {analisiData.punti_di_forza.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-base" style={{ color: C.muted }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.green }} /> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analisiData.criticita && Array.isArray(analisiData.criticita) && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.red }}>Criticità</div>
            <ul className="space-y-1">
              {analisiData.criticita.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-base" style={{ color: C.muted }}>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.red }} /> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analisiData.direzione_consigliata && (
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.yellowDark }}>Direzione consigliata</div>
            <p className="text-base leading-relaxed" style={{ color: C.muted }}>{analisiData.direzione_consigliata}</p>
          </div>
        )}

        {/* Azioni: PDF + Audio */}
        <div className="space-y-4 mt-6">
          <div className="flex flex-wrap gap-3">
            <button data-testid="download-pdf-btn" onClick={downloadPdf} disabled={downloadingPdf}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:shadow-md"
              style={{ background: C.dark, color: C.white }}>
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Scarica Analisi PDF
            </button>
          </div>

          {/* Audio Player */}
          <div className="rounded-xl p-4" style={{ background: `${C.purple}06`, border: `1px solid ${C.purple}20` }}>
            <div className="flex items-center gap-2 mb-2">
              <Headphones className="w-4 h-4" style={{ color: C.purple }} />
              <span className="text-sm font-bold" style={{ color: C.purple }}>Sintesi Audio dell'Analisi</span>
            </div>
            {audioAvailable ? (
              <audio data-testid="audio-player" controls className="w-full" style={{ height: 40 }}>
                <source src={`${API}${audioUrl}`} type="audio/mpeg" />
                Il tuo browser non supporta il player audio.
              </audio>
            ) : (
              <p className="text-sm" style={{ color: C.muted }}>
                La sintesi audio è in fase di preparazione. Sarà disponibile a breve.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* ═══ 3. LA SITUAZIONE È QUESTA ══════════════════════════════ */}
      <Section id="situazione" accent>
        <h2 className="text-2xl sm:text-3xl font-black mb-5" style={{ color: C.dark }}>
          La situazione è questa.
        </h2>

        <p className="text-base leading-relaxed mb-4" style={{ color: C.muted }}>
          Durante la call abbiamo analizzato il tuo progetto in modo concreto.
        </p>

        <p className="text-base leading-relaxed mb-1" style={{ color: C.dark, fontWeight: 600 }}>
          Abbiamo visto:
        </p>
        <ul className="space-y-1.5 mb-5 pl-1">
          {[
            "dove si trova oggi",
            "cosa funziona",
            "cosa lo sta limitando",
            "e soprattutto cosa serve per farlo evolvere",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-base" style={{ color: C.muted }}>
              <span style={{ color: C.yellowDark }}>•</span> {item}
            </li>
          ))}
        </ul>

        <p className="text-base leading-relaxed mb-2" style={{ color: C.dark, fontWeight: 600 }}>
          Il punto chiave è questo:
        </p>
        <p className="text-lg leading-relaxed mb-5 font-bold" style={{ color: C.dark }}>
          <span role="img" aria-label="point">&#x1F449;</span> il tuo progetto ha potenziale, ma nella sua forma attuale non è strutturato per crescere in modo sostenibile.
        </p>

        <p className="text-base leading-relaxed mb-1" style={{ color: C.muted }}>
          Questo non è un problema di competenza.
        </p>
        <p className="text-base leading-relaxed mb-1" style={{ color: C.muted }}>
          È un problema di <strong style={{ color: C.dark }}>struttura</strong>.
        </p>
        <p className="text-base leading-relaxed mb-5" style={{ color: C.muted }}>
          Ed è esattamente su questo che abbiamo lavorato insieme nell'analisi.
        </p>

        {/* Micro-blocco evidenziato */}
        <div className="rounded-xl p-5 mb-5" style={{ background: `${C.yellow}10`, border: `1.5px solid ${C.yellow}50` }}>
          <p className="text-base font-bold mb-2" style={{ color: C.dark }}>In sintesi:</p>
          <ul className="space-y-1.5">
            {[
              "hai una base valida",
              "hai qualcosa da offrire",
              "ma manca un sistema che trasformi tutto questo in un risultato concreto",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-base" style={{ color: C.dark }}>
                <CheckCircle className="w-4 h-4 mt-1 flex-shrink-0" style={{ color: i < 2 ? C.green : C.yellowDark }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-base leading-relaxed mb-1" style={{ color: C.muted }}>
          Prima di prendere qualsiasi decisione, ti consigliamo di rivedere con attenzione i punti principali della tua analisi.
        </p>
        <p className="text-base leading-relaxed font-bold" style={{ color: C.dark }}>
          Qui sotto trovi tutto.
        </p>
      </Section>

      {/* ═══ 4. IL PERCORSO PARTNERSHIP ═════════════════════════════ */}
      <Section id="partnership" accent>
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-black" style={{ color: C.dark }}>
            Il percorso che costruiremo insieme
          </h2>
          <p className="text-base mt-3 leading-relaxed" style={{ color: C.muted }}>
            Quello che ti proponiamo non è un corso e non è una consulenza isolata.
          </p>
          <p className="text-base mt-2 leading-relaxed" style={{ color: C.muted }}>
            È un percorso guidato in cui lavoriamo insieme per trasformare la tua
            competenza in un sistema che genera risultati.
          </p>
          <p className="text-base mt-3 leading-relaxed" style={{ color: C.muted }}>
            Il punto non è "imparare come fare".<br />
            Il punto è <strong style={{ color: C.dark }}>costruire qualcosa che funzioni davvero</strong>.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: Target, title: "Partiamo dal posizionamento", desc: "Definiamo in modo preciso chi aiuti, con quale promessa e perché qualcuno dovrebbe scegliere te." },
            { icon: BookOpen, title: "Strutturiamo il tuo percorso formativo", desc: "Trasformiamo la tua competenza in un'accademia chiara, vendibile e scalabile." },
            { icon: Megaphone, title: "Costruiamo il sistema di vendita", desc: "Landing, email, checkout: tutto viene progettato per convertire." },
            { icon: BarChart3, title: "Attiviamo e ottimizziamo il sistema", desc: "Testiamo, misuriamo e miglioriamo per portare risultati concreti." },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${C.yellow}20` }}>
                <item.icon className="w-5 h-5" style={{ color: C.yellowDark }} />
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: C.dark }}>{item.title}</div>
                <div className="text-sm mt-0.5" style={{ color: C.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 5. PROCESSO OPERATIVO ══════════════════════════════════ */}
      <Section id="processo" accent>
        <div className="mb-2">
          <h2 className="text-xl font-black" style={{ color: C.dark }}>Come lavoreremo, in pratica</h2>
          <p className="text-base mt-2 leading-relaxed" style={{ color: C.muted }}>
            Ogni progetto segue un percorso preciso.<br />
            Non vai a tentativi: ogni fase ha un obiettivo chiaro.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { n: "01", label: "Allineamento iniziale", desc: "Definiamo le basi strategiche e impostiamo la direzione." },
            { n: "02", label: "Costruzione del contenuto", desc: "Ti guidiamo nella creazione del tuo videocorso, con struttura validata." },
            { n: "03", label: "Infrastruttura tecnica", desc: "Costruiamo il sistema che gestisce vendite, pagamenti e utenti." },
            { n: "04", label: "Attivazione e lancio", desc: "Testiamo il mercato e ottimizziamo il percorso." },
            { n: "05", label: "Supporto e monitoraggio", desc: "Ti seguiamo con controllo costante e feedback operativi." },
            { n: "06", label: "Ottimizzazione e crescita", desc: "Analizziamo i dati e miglioriamo per scalare." },
          ].map(s => (
            <div key={s.n} className="flex gap-3 p-3 rounded-xl" style={{ background: C.bg }}>
              <span className="text-lg font-black" style={{ color: `${C.yellow}90` }}>{s.n}</span>
              <div>
                <div className="text-sm font-bold" style={{ color: C.dark }}>{s.label}</div>
                <div className="text-xs" style={{ color: C.muted }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 6. COSA OTTIENI CONCRETAMENTE ══════════════════════════ */}
      <Section id="valore" accent>
        <div className="mb-4">
          <h2 className="text-xl font-black" style={{ color: C.dark }}>Cosa ottieni concretamente</h2>
          <p className="text-base mt-2 leading-relaxed" style={{ color: C.muted }}>
            Alla fine del percorso non avrai solo contenuti.<br />
            Avrai un <strong style={{ color: C.dark }}>sistema funzionante</strong>.
          </p>
        </div>
        <div className="space-y-3">
          {[
            "Un'accademia digitale strutturata e pronta per essere venduta",
            "Un sistema di vendita completo, progettato per convertire",
            "Un processo chiaro per acquisire clienti in modo continuativo",
            "Supporto strategico costante durante tutto il percorso",
            "Un'infrastruttura che puoi controllare e migliorare nel tempo",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: C.green }} />
              <span className="text-base" style={{ color: C.dark }}>{item}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 7. BONUS ═══════════════════════════════════════════════ */}
      <Section id="bonus" accent>
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.yellow}20` }}>
              <Gift className="w-5 h-5" style={{ color: C.yellowDark }} />
            </div>
            <h2 className="text-xl font-black" style={{ color: C.dark }}>Strumenti inclusi nel percorso</h2>
          </div>
          <p className="text-base leading-relaxed" style={{ color: C.muted }}>
            Per accelerare il processo, avrai accesso a risorse già pronte e testate.
          </p>
        </div>
        <div className="space-y-4">
          {[
            { title: "Template Funnel", desc: "Strutture già validate per landing, email e checkout." },
            { title: "Calendario contenuti AI", desc: "Linee guida per comunicare in modo coerente con il tuo progetto." },
            { title: "Brand Kit base", desc: "Elementi visivi essenziali per partire in modo professionale." },
            { title: "Accesso alla community", desc: "Confronto diretto con altri progetti in sviluppo." },
          ].map((b, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl" style={{ background: `${C.yellow}08`, border: `1px solid ${C.yellow}30` }}>
              <Gift className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: C.yellowDark }} />
              <div>
                <div className="text-base font-bold" style={{ color: C.dark }}>{b.title}</div>
                <div className="text-sm" style={{ color: C.muted }}>{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ 8. LA DECISIONE ════════════════════════════════════════ */}
      <Section id="decisione" accent>
        <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: C.dark }}>
          La scelta che hai davanti
        </h2>
        <p className="text-base leading-relaxed mb-2" style={{ color: C.muted }}>
          A questo punto, la situazione è semplice.
        </p>
        <p className="text-base leading-relaxed mb-6" style={{ color: C.muted }}>
          Non devi decidere se il progetto ha potenziale.<br />
          Devi decidere <strong style={{ color: C.dark }}>come svilupparlo</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Scenario 1: senza */}
          <div className="rounded-2xl p-5" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5" style={{ color: C.red }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: C.red }}>Continuare da solo</span>
            </div>
            <div className="space-y-3">
              {[
                "Devi costruire tutto da zero",
                "Rischi errori tecnici e strategici",
                "Tempi lunghi e risultati incerti",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: C.muted }}>
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: `${C.red}60` }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          {/* Scenario 2: con */}
          <div className="rounded-2xl p-5" style={{ background: `${C.green}06`, border: `2px solid ${C.green}40` }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" style={{ color: C.green }} />
              <span className="text-sm font-bold uppercase tracking-wider" style={{ color: C.green }}>Entrare in partnership</span>
            </div>
            <div className="space-y-3">
              {[
                "Hai una struttura già definita",
                "Lavori con un sistema guidato",
                "Riduci errori e acceleri il processo",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: C.dark }}>
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.green }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-base text-center leading-relaxed mt-6" style={{ color: C.muted }}>
          La differenza non è il progetto.<br />
          <strong style={{ color: C.dark }}>È il modo in cui viene costruito.</strong>
        </p>
      </Section>

      {/* ═══ 9. CONTRATTO ═══════════════════════════════════════════ */}
      <Section id="contratto" accent>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.dark}10` }}>
            <FileText className="w-5 h-5" style={{ color: C.dark }} />
          </div>
          <div>
            <h2 className="text-xl font-black" style={{ color: C.dark }}>Contratto di Partnership</h2>
            <p className="text-sm" style={{ color: C.muted }}>
              Prima di procedere, ti chiediamo di leggere con attenzione il contratto.
              Per qualsiasi dubbio, puoi utilizzare la chat di supporto.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {articles.map((art, i) => {
            // Match both "Art. X" and "ARTICOLO X" formats
            const match = art.match(/^(?:Art\.\s*(\d+)|ARTICOLO\s+(\d+))/);
            const artNum = match ? parseInt(match[1] || match[2]) : i + 1;
            const isImportant = IMPORTANT_ARTICLES.includes(artNum);
            const isExpanded = expandedArticle === i;
            const isConfirmed = confirmedArticles[artNum];

            // First line as title
            const lines = art.trim().split("\n");
            const title = lines[0]?.trim() || `Articolo ${artNum}`;
            const body = lines.slice(1).join("\n").trim();

            return (
              <div key={i} data-testid={`contract-art-${artNum}`}
                className="rounded-xl overflow-hidden transition-all"
                style={{
                  border: `1px solid ${isImportant ? (isConfirmed ? `${C.green}60` : `${C.yellow}80`) : C.border}`,
                  background: isImportant ? (isConfirmed ? `${C.green}04` : `${C.yellow}04`) : C.white,
                }}>
                <button onClick={() => setExpandedArticle(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left">
                  {isImportant && (
                    <Shield className="w-4 h-4 flex-shrink-0" style={{ color: isConfirmed ? C.green : C.yellowDark }} />
                  )}
                  <span className="text-sm font-bold flex-1" style={{ color: C.dark }}>{title}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: C.muted }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.muted }} />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: C.muted }}>{body}</p>
                    {isImportant && !isConfirmed && (
                      <button data-testid={`confirm-art-${artNum}`}
                        onClick={() => setConfirmedArticles(p => ({ ...p, [artNum]: true }))}
                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                        style={{ background: `${C.yellow}20`, color: C.yellowDark }}>
                        <CheckCircle className="w-4 h-4" />
                        Confermo di aver letto e compreso
                      </button>
                    )}
                    {isImportant && isConfirmed && (
                      <div className="mt-3 flex items-center gap-2 text-sm font-bold" style={{ color: C.green }}>
                        <CheckCircle className="w-4 h-4" /> Articolo confermato
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!allImportantConfirmed && articles.length > 0 && (
          <div className="mt-4 text-center text-sm" style={{ color: C.muted }}>
            <Shield className="w-4 h-4 inline mr-1" style={{ color: C.yellowDark }} />
            Conferma la lettura degli articoli evidenziati per procedere alla firma.
          </div>
        )}
      </Section>

      {/* ═══ 10. FIRMA ══════════════════════════════════════════════ */}
      <Section id="firma" accent>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${C.green}15` }}>
            <PenLine className="w-5 h-5" style={{ color: C.green }} />
          </div>
          <h2 className="text-xl font-black" style={{ color: C.dark }}>Conferma e firma</h2>
        </div>

        {signed ? (
          <div data-testid="firma-success" className="text-center py-6 rounded-xl" style={{ background: `${C.green}08` }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: C.green }} />
            <div className="text-lg font-black" style={{ color: C.dark }}>Contratto firmato con successo</div>
            <div className="text-sm mt-1" style={{ color: C.muted }}>Procedi al pagamento per attivare la Partnership.</div>
          </div>
        ) : (
          <div>
            <p className="text-base mb-4" style={{ color: C.muted }}>
              Per confermare l'attivazione della partnership, inserisci i tuoi dati e procedi con la firma digitale.
            </p>
            <input data-testid="signature-input" type="text" value={signatureName}
              onChange={e => setSignatureName(e.target.value)}
              placeholder="Nome e Cognome"
              disabled={!allImportantConfirmed}
              className="w-full rounded-xl px-4 py-3 text-lg font-bold text-center focus:outline-none focus:ring-2 mb-4"
              style={{
                border: `2px solid ${allImportantConfirmed ? C.yellow : C.border}`,
                background: allImportantConfirmed ? C.white : C.bg,
                color: C.dark,
                fontFamily: "'Georgia', serif", fontStyle: "italic",
              }} />
            <button data-testid="sign-btn" onClick={handleSign}
              disabled={!signatureName.trim() || !allImportantConfirmed || signing}
              className="w-full py-3.5 rounded-xl text-base font-black flex items-center justify-center gap-2 transition-all"
              style={{
                background: (signatureName.trim() && allImportantConfirmed) ? C.green : "#E5E7EB",
                color: (signatureName.trim() && allImportantConfirmed) ? C.white : "#9CA3AF",
                opacity: signing ? 0.6 : 1,
              }}>
              {signing && <Loader2 className="w-4 h-4 animate-spin" />}
              <PenLine className="w-4 h-4" />
              Firma il Contratto
            </button>
            {!allImportantConfirmed && (
              <p className="text-xs text-center mt-2" style={{ color: C.muted }}>
                Conferma prima la lettura degli articoli evidenziati nel contratto.
              </p>
            )}
          </div>
        )}
      </Section>

      {/* ═══ 11. PAGAMENTO ══════════════════════════════════════════ */}
      {signed && (
        <Section id="pagamento" accent>
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black" style={{ color: C.dark }}>
              Attiva la tua Partnership
            </h2>
            <div className="text-4xl font-black mt-2" style={{ color: C.dark }}>€{corrStr}</div>
            <p className="text-sm mt-1" style={{ color: C.muted }}>Investimento per 12 mesi di partnership operativa</p>
          </div>

          {!paymentMethod ? (
            <div className="space-y-3">
              <button data-testid="pay-stripe" onClick={startStripeCheckout} disabled={checkingOut}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-black transition-all hover:shadow-lg"
                style={{ background: "#1A65D6", color: C.white, opacity: checkingOut ? 0.7 : 1 }}>
                {checkingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Paga con Carta (Stripe)
              </button>
              <button data-testid="pay-bonifico" onClick={selectBonifico}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-bold transition-all"
                style={{ background: C.white, color: C.dark, border: `2px solid ${C.border}` }}>
                <Building2 className="w-5 h-5" />
                Paga con Bonifico Bancario
              </button>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                  <span className="text-xs font-bold" style={{ color: "#9CA3AF" }}>SSL Secured</span>
                </div>
                <div className="h-3 w-px" style={{ background: "#E5E7EB" }} />
                {["Visa", "Mastercard", "Stripe"].map(name => (
                  <span key={name} className="text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#F3F4F6", color: "#9CA3AF" }}>{name}</span>
                ))}
              </div>
            </div>
          ) : (
            <div data-testid="bonifico-details" className="rounded-xl p-5" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5" style={{ color: C.dark }} />
                <span className="text-base font-bold" style={{ color: C.dark }}>Dettagli Bonifico</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Beneficiario", value: bonificoData?.beneficiario },
                  { label: "Banca", value: bonificoData?.banca },
                  { label: "IBAN", value: bonificoData?.iban },
                  { label: "Importo", value: `€${corrStr}` },
                  { label: "Causale", value: bonificoData?.causale },
                ].map(row => (
                  <div key={row.label}>
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>{row.label}</div>
                    <div className="text-base font-bold mt-0.5" style={{ color: C.dark }}>{row.value}</div>
                  </div>
                ))}
              </div>
              <button onClick={copyIban}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                style={{ background: C.white, border: `1px solid ${C.border}`, color: C.dark }}>
                {copiedIban ? <Check className="w-4 h-4" style={{ color: C.green }} /> : <Copy className="w-4 h-4" />}
                {copiedIban ? "Copiato!" : "Copia IBAN"}
              </button>
              <p className="text-xs mt-3" style={{ color: C.muted }}>
                Dopo aver effettuato il bonifico, riceverai una conferma via email entro 24-48 ore lavorative.
              </p>
              <button onClick={() => setPaymentMethod(null)}
                className="mt-3 text-sm font-bold" style={{ color: C.blue }}>
                Torna alle opzioni di pagamento
              </button>
            </div>
          )}
        </Section>
      )}

      {/* Chat di supporto contrattuale */}
      <ContractChat userId={userId} />
    </div>
  );
}
