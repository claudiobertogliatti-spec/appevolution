import React, { useState, useEffect, useCallback, useRef } from "react";
import { Eye, Copy, Save, CheckCircle, FileText, Globe, ChevronDown, ChevronUp, Palette, Video, AlertTriangle, Target, BookOpen, MessageSquare, DollarSign, HelpCircle, Flag, X, Sparkles } from "lucide-react";
import axios from "axios";

const API = (() => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('evolution-pro.it')) return '';
  return process.env.REACT_APP_BACKEND_URL || '';
})();

const SECTIONS = [
  { id: "partner", label: "1. Dati Partner", icon: Globe, fields: ["PARTNER_NOME","PARTNER_NICCHIA","PARTNER_BIO","PARTNER_FOTO_URL"] },
  { id: "brand", label: "2. Brand & Colori", icon: Palette, fields: ["COLORE_PRIMARIO","COLORE_SECONDARIO","COLORE_ACCENT","URGENCY_TEXT"] },
  { id: "hero", label: "3. Hero / Headline", icon: Target, fields: ["HEADLINE_PRINCIPALE","HEADLINE_SPAN","SOTTOTITOLO","CTA_TESTO_PRINCIPALE","CTA_LINK","SOTTO_CTA_TESTO"] },
  { id: "video", label: "4. Video VSL", icon: Video, fields: ["VIDEO_ID"] },
  { id: "problema", label: "5. Problema", icon: AlertTriangle, fields: ["PROBLEMA_HEADLINE","PROBLEMA_TESTO_1","PROBLEMA_TESTO_2","DOLORE_1","DOLORE_2","DOLORE_3","DOLORE_4"] },
  { id: "soluzione", label: "6. Soluzione", icon: CheckCircle, fields: ["SOLUZIONE_HEADLINE","SOLUZIONE_SPAN","SOLUZIONE_TESTO","STAT_1_NUMERO","STAT_1_TESTO","STAT_2_NUMERO","STAT_2_TESTO","STAT_3_NUMERO","STAT_3_TESTO"] },
  { id: "moduli", label: "7. Moduli Corso", icon: BookOpen, fields: ["CORSO_NOME","MODULO_1_TITOLO","MODULO_1_DESC","MODULO_2_TITOLO","MODULO_2_DESC","MODULO_3_TITOLO","MODULO_3_DESC","MODULO_4_TITOLO","MODULO_4_DESC","MODULO_5_TITOLO","MODULO_5_DESC"] },
  { id: "testimonianze", label: "8. Testimonianze", icon: MessageSquare, fields: ["TESTIMONIANZA_1_TESTO","TESTIMONIANZA_1_NOME","TESTIMONIANZA_1_RUOLO","TESTIMONIANZA_2_TESTO","TESTIMONIANZA_2_NOME","TESTIMONIANZA_2_RUOLO","TESTIMONIANZA_3_TESTO","TESTIMONIANZA_3_NOME","TESTIMONIANZA_3_RUOLO"] },
  { id: "pricing", label: "9. Pricing & Offerta", icon: DollarSign, fields: ["CORSO_PREZZO_ORIGINALE","CORSO_PREZZO","PREZZO_NOTE","INCLUSO_1","INCLUSO_2","INCLUSO_3","INCLUSO_4","INCLUSO_5","CTA_TESTO_OFFERTA","GARANZIA_TESTO"] },
  { id: "faq", label: "10. FAQ", icon: HelpCircle, fields: ["FAQ_1_DOMANDA","FAQ_1_RISPOSTA","FAQ_2_DOMANDA","FAQ_2_RISPOSTA","FAQ_3_DOMANDA","FAQ_3_RISPOSTA","FAQ_4_DOMANDA","FAQ_4_RISPOSTA"] },
  { id: "finale", label: "11. CTA Finale", icon: Flag, fields: ["CTA_FINALE_HEADLINE","CTA_FINALE_TESTO","ANNO","LINK_PRIVACY","LINK_TERMINI"] },
];

const ALL_LP_FIELDS = SECTIONS.flatMap(s => s.fields);
const REQUIRED_FIELDS = ["PARTNER_NOME","HEADLINE_PRINCIPALE","CTA_TESTO_PRINCIPALE","CTA_LINK","CORSO_NOME","CORSO_PREZZO","INCLUSO_1"];

const FIELD_LABELS = {
  PARTNER_NOME:"Nome partner",PARTNER_NICCHIA:"Nicchia",PARTNER_BIO:"Bio",PARTNER_FOTO_URL:"URL foto",
  COLORE_PRIMARIO:"Colore primario",COLORE_SECONDARIO:"Colore secondario",COLORE_ACCENT:"Colore accent",URGENCY_TEXT:"Barra urgenza",
  HEADLINE_PRINCIPALE:"Headline principale",HEADLINE_SPAN:"Headline colorata",SOTTOTITOLO:"Sottotitolo",CTA_TESTO_PRINCIPALE:"Testo CTA",CTA_LINK:"Link CTA (checkout)",SOTTO_CTA_TESTO:"Sotto CTA",
  VIDEO_ID:"YouTube Video ID",
  PROBLEMA_HEADLINE:"Headline problema",PROBLEMA_TESTO_1:"Testo problema 1",PROBLEMA_TESTO_2:"Testo problema 2",
  DOLORE_1:"Dolore 1",DOLORE_2:"Dolore 2",DOLORE_3:"Dolore 3",DOLORE_4:"Dolore 4",
  SOLUZIONE_HEADLINE:"Headline soluzione",SOLUZIONE_SPAN:"Span colorato",SOLUZIONE_TESTO:"Testo soluzione",
  STAT_1_NUMERO:"Stat 1 numero",STAT_1_TESTO:"Stat 1 testo",STAT_2_NUMERO:"Stat 2 numero",STAT_2_TESTO:"Stat 2 testo",STAT_3_NUMERO:"Stat 3 numero",STAT_3_TESTO:"Stat 3 testo",
  CORSO_NOME:"Nome corso",
  MODULO_1_TITOLO:"Modulo 1 titolo",MODULO_1_DESC:"Modulo 1 desc",MODULO_2_TITOLO:"Modulo 2 titolo",MODULO_2_DESC:"Modulo 2 desc",
  MODULO_3_TITOLO:"Modulo 3 titolo",MODULO_3_DESC:"Modulo 3 desc",MODULO_4_TITOLO:"Modulo 4 titolo",MODULO_4_DESC:"Modulo 4 desc",
  MODULO_5_TITOLO:"Modulo 5 titolo",MODULO_5_DESC:"Modulo 5 desc",
  TESTIMONIANZA_1_TESTO:"Testimonianza 1",TESTIMONIANZA_1_NOME:"Nome 1",TESTIMONIANZA_1_RUOLO:"Ruolo 1",
  TESTIMONIANZA_2_TESTO:"Testimonianza 2",TESTIMONIANZA_2_NOME:"Nome 2",TESTIMONIANZA_2_RUOLO:"Ruolo 2",
  TESTIMONIANZA_3_TESTO:"Testimonianza 3",TESTIMONIANZA_3_NOME:"Nome 3",TESTIMONIANZA_3_RUOLO:"Ruolo 3",
  CORSO_PREZZO_ORIGINALE:"Prezzo originale",CORSO_PREZZO:"Prezzo attuale",PREZZO_NOTE:"Note prezzo",
  INCLUSO_1:"Incluso 1",INCLUSO_2:"Incluso 2",INCLUSO_3:"Incluso 3",INCLUSO_4:"Incluso 4",INCLUSO_5:"Incluso 5",
  CTA_TESTO_OFFERTA:"Testo CTA offerta",GARANZIA_TESTO:"Testo garanzia",
  FAQ_1_DOMANDA:"FAQ 1 domanda",FAQ_1_RISPOSTA:"FAQ 1 risposta",FAQ_2_DOMANDA:"FAQ 2 domanda",FAQ_2_RISPOSTA:"FAQ 2 risposta",
  FAQ_3_DOMANDA:"FAQ 3 domanda",FAQ_3_RISPOSTA:"FAQ 3 risposta",FAQ_4_DOMANDA:"FAQ 4 domanda",FAQ_4_RISPOSTA:"FAQ 4 risposta",
  CTA_FINALE_HEADLINE:"Headline finale",CTA_FINALE_TESTO:"Testo finale",ANNO:"Anno",LINK_PRIVACY:"Link Privacy",LINK_TERMINI:"Link Termini",
};

const COLOR_FIELDS = ["COLORE_PRIMARIO","COLORE_SECONDARIO","COLORE_ACCENT"];
const TEXTAREA_FIELDS = ["PARTNER_BIO","SOTTOTITOLO","PROBLEMA_TESTO_1","PROBLEMA_TESTO_2","SOLUZIONE_TESTO","TESTIMONIANZA_1_TESTO","TESTIMONIANZA_2_TESTO","TESTIMONIANZA_3_TESTO","FAQ_1_RISPOSTA","FAQ_2_RISPOSTA","FAQ_3_RISPOSTA","FAQ_4_RISPOSTA","CTA_FINALE_TESTO","GARANZIA_TESTO"];

const CHECKLIST = [
  "Tutti i campi obbligatori compilati",
  "Video VSL caricato su YouTube",
  "Link checkout Systeme attivo e testato",
  "Foto profilo partner caricata",
  "Prezzo coerente con Systeme",
  "Documenti legali generati e pubblicati",
  "Test acquisto con email reale completato",
  "Visualizzazione mobile verificata",
];

const LEGAL_FIELDS = [
  { key: "titolare_nome", label: "Nome titolare" },
  { key: "titolare_cognome", label: "Cognome titolare" },
  { key: "piva", label: "P.IVA" },
  { key: "codice_fiscale", label: "Codice Fiscale" },
  { key: "indirizzo", label: "Indirizzo sede" },
  { key: "citta", label: "Città" },
  { key: "cap", label: "CAP" },
  { key: "email_legale", label: "Email legale" },
  { key: "sito_url", label: "URL sito / landing" },
  { key: "nome_sito", label: "Nome sito / brand" },
];

const StatoBadge = ({ stato }) => {
  const map = {
    bozza: { bg: "bg-yellow-100 text-yellow-800", t: "Bozza" },
    pronta: { bg: "bg-green-100 text-green-800", t: "Pronta" },
    pubblicata: { bg: "bg-blue-100 text-blue-800", t: "Pubblicata" },
    non_generato: { bg: "bg-gray-100 text-gray-600", t: "Non generato" },
    generato: { bg: "bg-green-100 text-green-800", t: "Generato" },
  };
  const s = map[stato] || map.bozza;
  return <span data-testid={`badge-stato-${stato}`} className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.bg}`}>{s.t}</span>;
};

// ═══════════ LANDING PAGE TAB ═══════════
function LandingPageTab({ partnerId }) {
  const [form, setForm] = useState({});
  const [stato, setStato] = useState("bozza");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [openSection, setOpenSection] = useState("partner");
  const [checks, setChecks] = useState(Array(8).fill(false));
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/partner-journey/funnel/${partnerId}/landing-page`).then(r => {
      const merged = { ...r.data.prefill, ...r.data.dati };
      setForm(merged);
      setStato(r.data.stato);
      setHtml(r.data.html_generato || "");
    }).catch(() => {});
  }, [partnerId]);

  const filledCount = ALL_LP_FIELDS.filter(f => form[f]?.trim()).length;
  const progress = Math.round((filledCount / ALL_LP_FIELDS.length) * 100);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const generateWithAI = async () => {
    setAiLoading(true);
    try {
      const r = await axios.post(`${API}/api/partner-journey/funnel/${partnerId}/genera-ai`);
      if (r.data.success && r.data.campi) {
        setForm(prev => ({ ...prev, ...r.data.campi }));
        setOpenSection("hero");
        showToast("Copy generato con AI! Controlla e personalizza i campi.");
      }
    } catch (e) {
      showToast(e.response?.data?.detail || "Errore nella generazione AI");
    }
    setAiLoading(false);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/partner-journey/funnel/${partnerId}/landing-page`, { dati: form, genera_html: false, stato: "bozza" });
      setStato("bozza");
      showToast("Bozza salvata");
    } catch { showToast("Errore nel salvataggio"); }
    setSaving(false);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/partner-journey/funnel/${partnerId}/landing-page`, { dati: form, genera_html: true });
      setHtml(r.data.html_generato);
      setStato("pronta");
      showToast("Landing page generata!");
    } catch { showToast("Errore nella generazione"); }
    setLoading(false);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    showToast("HTML copiato!");
    setTimeout(() => setCopied(false), 2000);
  };

  const preview = () => {
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const markPublished = async () => {
    await axios.post(`${API}/api/partner-journey/funnel/${partnerId}/landing-page`, { dati: form, genera_html: false, stato: "pubblicata" });
    setStato("pubblicata");
    showToast("Stato aggiornato: Pubblicata");
  };

  return (
    <div className="space-y-5" data-testid="landing-page-tab">
      {toast && <div className="fixed top-4 right-4 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg animate-fade-in">{toast}</div>}

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-[#1a1a2e]">Compilazione: {filledCount}/{ALL_LP_FIELDS.length} campi</span>
          <div className="flex items-center gap-2">
            <StatoBadge stato={stato} />
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? '#22c55e' : '#e94560' }} />
        </div>
      </div>

      {/* Genera con AI */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-white text-sm font-bold">Genera copy con AI</p>
          <p className="text-gray-400 text-xs mt-0.5">Claude compila automaticamente tutti i campi di testo partendo dal profilo partner</p>
        </div>
        <button
          onClick={generateWithAI}
          disabled={aiLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#e94560] text-white rounded-lg text-sm font-bold hover:bg-[#d63d56] transition disabled:opacity-50 whitespace-nowrap"
          data-testid="btn-genera-ai"
        >
          <Sparkles size={14} />
          {aiLoading ? "Generazione AI..." : "Genera con AI"}
        </button>
      </div>

      {/* Form sections */}
      <div className="space-y-2">
        {SECTIONS.map(sec => {
          const Icon = sec.icon;
          const sectionFilled = sec.fields.filter(f => form[f]?.trim()).length;
          const isOpen = openSection === sec.id;
          return (
            <div key={sec.id} className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden">
              <button onClick={() => setOpenSection(isOpen ? null : sec.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition" data-testid={`section-${sec.id}`}>
                <Icon size={16} className="text-[#e94560]" />
                <span className="text-sm font-bold text-[#1a1a2e] flex-1 text-left">{sec.label}</span>
                <span className="text-xs text-gray-400">{sectionFilled}/{sec.fields.length}</span>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sec.fields.map(f => (
                    <div key={f} className={TEXTAREA_FIELDS.includes(f) ? "md:col-span-2" : ""}>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">
                        {FIELD_LABELS[f] || f}
                        {REQUIRED_FIELDS.includes(f) && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {COLOR_FIELDS.includes(f) ? (
                        <div className="flex gap-2 items-center">
                          <input type="color" value={form[f] || "#1a1a2e"} onChange={e => update(f, e.target.value)} className="w-10 h-8 rounded border cursor-pointer" />
                          <input type="text" value={form[f] || ""} onChange={e => update(f, e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] outline-none" placeholder="#1a1a2e" />
                        </div>
                      ) : TEXTAREA_FIELDS.includes(f) ? (
                        <textarea value={form[f] || ""} onChange={e => update(f, e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] outline-none resize-none" placeholder={FIELD_LABELS[f]} />
                      ) : (
                        <input type="text" value={form[f] || ""} onChange={e => update(f, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] outline-none" placeholder={FIELD_LABELS[f]} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checklist pre-pubblicazione */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] p-4">
        <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">Checklist pre-pubblicazione</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CHECKLIST.map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1.5 rounded" data-testid={`checklist-${i}`}>
              <input type="checkbox" checked={checks[i]} onChange={() => setChecks(p => { const n = [...p]; n[i] = !n[i]; return n; })} className="accent-[#e94560] w-3.5 h-3.5" />
              <span className={checks[i] ? "text-gray-700" : "text-gray-500"}>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition disabled:opacity-50" data-testid="btn-save-draft">
          <Save size={14} /> {saving ? "Salvataggio..." : "Salva Bozza"}
        </button>
        <button onClick={generate} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-[#e94560] text-white rounded-lg text-sm font-bold hover:bg-[#d63d56] transition disabled:opacity-50" data-testid="btn-generate">
          <Eye size={14} /> {loading ? "Generazione..." : "Genera e Anteprima"}
        </button>
        {html && (
          <>
            <button onClick={preview} className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-bold hover:bg-[#2d2d44] transition" data-testid="btn-preview">
              <Eye size={14} /> Apri Anteprima
            </button>
            <button onClick={copyHtml} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition" data-testid="btn-copy-html">
              <Copy size={14} /> {copied ? "Copiato!" : "Copia HTML"}
            </button>
            {stato !== "pubblicata" && (
              <button onClick={markPublished} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition" data-testid="btn-mark-published">
                <CheckCircle size={14} /> Segna come Pubblicata
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════ DOCUMENTI LEGALI TAB ═══════════
function DocumentiLegaliTab({ partnerId }) {
  const [form, setForm] = useState({});
  const [docs, setDocs] = useState({ cookie: "", privacy: "", condizioni: "" });
  const [stato, setStato] = useState("non_generato");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [copiedDoc, setCopiedDoc] = useState("");

  useEffect(() => {
    axios.get(`${API}/api/partner-journey/funnel/${partnerId}/documenti-legali`).then(r => {
      const merged = { ...r.data.prefill, ...r.data.dati };
      setForm(merged);
      setStato(r.data.stato);
      setDocs({
        cookie: r.data.cookie_policy_html || "",
        privacy: r.data.privacy_policy_html || "",
        condizioni: r.data.condizioni_vendita_html || "",
      });
    }).catch(() => {});
  }, [partnerId]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const generate = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/api/partner-journey/funnel/${partnerId}/documenti-legali`, { dati: form, genera: true });
      setDocs({ cookie: r.data.cookie_policy_html, privacy: r.data.privacy_policy_html, condizioni: r.data.condizioni_vendita_html });
      setStato("generato");
      showToast("Documenti generati!");
    } catch { showToast("Errore nella generazione"); }
    setLoading(false);
  };

  const copyDoc = (html, name) => {
    navigator.clipboard.writeText(html);
    setCopiedDoc(name);
    showToast(`${name} copiato!`);
    setTimeout(() => setCopiedDoc(""), 2000);
  };

  const previewDoc = (html) => {
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
  };

  const DOC_LIST = [
    { key: "cookie", label: "Cookie Policy", html: docs.cookie },
    { key: "privacy", label: "Privacy Policy", html: docs.privacy },
    { key: "condizioni", label: "Condizioni di Vendita", html: docs.condizioni },
  ];

  return (
    <div className="space-y-5" data-testid="documenti-legali-tab">
      {toast && <div className="fixed top-4 right-4 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg text-sm font-medium z-50 shadow-lg">{toast}</div>}

      {/* Form */}
      <div className="bg-white rounded-xl border border-[#e8e8e8] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#1a1a2e]">Dati Legali</h3>
          <StatoBadge stato={stato} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {LEGAL_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
              <input type="text" value={form[f.key] || ""} onChange={e => update(f.key, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#e94560] focus:border-[#e94560] outline-none" placeholder={f.label} data-testid={`legal-field-${f.key}`} />
            </div>
          ))}
        </div>
        <button onClick={generate} disabled={loading} className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#e94560] text-white rounded-lg text-sm font-bold hover:bg-[#d63d56] transition disabled:opacity-50" data-testid="btn-generate-legal">
          <FileText size={14} /> {loading ? "Generazione..." : "Genera tutti e 3 i documenti"}
        </button>
      </div>

      {/* Generated documents */}
      {stato !== "non_generato" && (
        <div className="space-y-3">
          {DOC_LIST.map(doc => (
            <div key={doc.key} className="bg-white rounded-xl border border-[#e8e8e8] p-4 flex items-center justify-between" data-testid={`doc-card-${doc.key}`}>
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-[#e94560]" />
                <span className="text-sm font-bold text-[#1a1a2e]">{doc.label}</span>
                {doc.html && <span className="text-xs text-green-600 font-medium">Generato</span>}
              </div>
              {doc.html && (
                <div className="flex gap-2">
                  <button onClick={() => previewDoc(doc.html)} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition" data-testid={`btn-preview-${doc.key}`}>
                    <Eye size={12} className="inline mr-1" /> Anteprima
                  </button>
                  <button onClick={() => copyDoc(doc.html, doc.label)} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 transition" data-testid={`btn-copy-${doc.key}`}>
                    <Copy size={12} className="inline mr-1" /> {copiedDoc === doc.label ? "Copiato!" : "Copia HTML"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════ MAIN COMPONENT ═══════════
export default function FunnelBuilder({ partners }) {
  const [tab, setTab] = useState("landing");
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter partners in F4+
  const eligible = (partners || []).filter(p => {
    const phase = parseInt((p.phase || "F0").replace("F", ""));
    return phase >= 4;
  });

  const filtered = eligible.filter(p => (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (!selectedPartner) {
    return (
      <div className="max-w-2xl mx-auto py-8" data-testid="funnel-partner-selector">
        <h2 className="text-xl font-extrabold text-[#1a1a2e] mb-1">Funnel Builder — Fase 4</h2>
        <p className="text-sm text-gray-500 mb-6">Seleziona un partner in Fase 4+ per iniziare</p>
        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cerca partner..." className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#e94560] outline-none" data-testid="partner-search" />
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nessun partner in Fase 4 o superiore{searchTerm ? ` per "${searchTerm}"` : ""}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button key={p.id} onClick={() => setSelectedPartner(p)} className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-[#e94560] transition text-left" data-testid={`select-partner-${p.id}`}>
                <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-xs font-bold">{(p.name || "?")[0]}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#1a1a2e]">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.niche || p.nicchia || "—"} · {p.phase}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#e94560]/10 text-[#e94560] font-bold">{p.phase}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" data-testid="funnel-builder">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedPartner(null)} className="text-xs text-gray-400 hover:text-[#e94560]">&larr; Torna alla lista</button>
          </div>
          <h2 className="text-lg font-extrabold text-[#1a1a2e]">{selectedPartner.name} — Funnel Builder</h2>
          <p className="text-xs text-gray-400">{selectedPartner.phase} · {selectedPartner.niche || selectedPartner.nicchia || "—"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setTab("landing")} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition ${tab === "landing" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-landing">
          <Globe size={14} className="inline mr-1.5" /> Landing Page
        </button>
        <button onClick={() => setTab("legali")} className={`flex-1 px-4 py-2 rounded-md text-sm font-bold transition ${tab === "legali" ? "bg-white text-[#1a1a2e] shadow-sm" : "text-gray-500 hover:text-gray-700"}`} data-testid="tab-legali">
          <FileText size={14} className="inline mr-1.5" /> Documenti Legali
        </button>
      </div>

      {/* Content */}
      {tab === "landing" ? <LandingPageTab partnerId={selectedPartner.id} /> : <DocumentiLegaliTab partnerId={selectedPartner.id} />}
    </div>
  );
}
