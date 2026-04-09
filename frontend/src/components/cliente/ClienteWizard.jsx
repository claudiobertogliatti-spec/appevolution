import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2,
  Sparkles, Play, Calendar, LogOut, ChevronDown,
  Shield, Lock, FileText, PhoneCall, BadgeCheck
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

const C = {
  yellow: "#FFD24D", yellowDark: "#D4A017", dark: "#1A1F24",
  bg: "#FAFAF7", border: "#E8E4DC", muted: "#8B8680", green: "#10B981",
};

const WIZARD_STEPS = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Mini Quiz" },
  { id: 3, label: "Analisi" },
  { id: 4, label: "Pagamento" },
  { id: 5, label: "Conferma" },
  { id: 6, label: "Mini Corso" },
  { id: 7, label: "Call" },
];

const QUIZ_FIELDS = [
  // ─── ambito ──────────────────────────────────────────────────────
  {
    id: "ambito",
    q: "In quale ambito operi o vuoi operare?",
    tipo: "textarea",
    placeholder: "Es: coaching per imprenditori, nutrizione sportiva, marketing digitale, formazione finanziaria, fotografia professionale...",
  },
  // ─── target ──────────────────────────────────────────────────────
  {
    id: "target",
    q: "Chi è il tuo cliente ideale?",
    tipo: "textarea",
    placeholder: "Es: liberi professionisti 30-50 anni che vogliono scalare online, mamme lavoratrici che cercano un secondo reddito, PMI italiane con fatturato 200-500k...",
  },
  // ─── problema ────────────────────────────────────────────────────
  {
    id: "problema",
    q: "Quale problema concreto risolvi per i tuoi clienti?",
    tipo: "textarea",
    placeholder: "Es: aiuto a trovare i primi 10 clienti in 90 giorni, insegno a strutturare un business online partendo da zero, aiuto a perdere 10 kg con un metodo sostenibile...",
  },
  // ─── esperienza ──────────────────────────────────────────────────
  {
    id: "esperienza",
    q: "Da quanto tempo lavori in questo ambito?",
    tipo: "radio",
    opzioni: [
      { value: "meno_1",   label: "Meno di 1 anno" },
      { value: "1_3",      label: "1 – 3 anni" },
      { value: "3_5",      label: "3 – 5 anni" },
      { value: "oltre_5",  label: "Oltre 5 anni" },
    ],
  },
  // ─── pubblico + canale_principale (condizionale) ─────────────────
  {
    id: "pubblico",
    q: "Hai già un pubblico o una base clienti?",
    tipo: "radio",
    opzioni: [
      { value: "no",       label: "Non ancora, parto da zero" },
      { value: "piccolo",  label: "Sì, meno di 1.000 contatti/follower" },
      { value: "medio",    label: "Sì, tra 1.000 e 10.000" },
      { value: "grande",   label: "Sì, oltre 10.000" },
    ],
    condizionale: {
      mostraSe: ["piccolo", "medio", "grande"],
      campo: {
        id: "canale_principale",
        q: "Dove sei più attivo?",
        tipo: "select",
        opzioni: [
          { value: "instagram",   label: "Instagram" },
          { value: "youtube",     label: "YouTube" },
          { value: "linkedin",    label: "LinkedIn" },
          { value: "facebook",    label: "Facebook" },
          { value: "tiktok",      label: "TikTok" },
          { value: "newsletter",  label: "Newsletter / Email list" },
          { value: "blog",        label: "Blog / Sito web" },
          { value: "altro",       label: "Altro" },
        ],
      },
    },
  },
  // ─── vendite_online + vendite_dettaglio (condizionale) ──────────
  {
    id: "vendite_online",
    q: "Stai già vendendo prodotti o servizi online?",
    tipo: "radio",
    opzioni: [
      { value: "no",       label: "No, non ancora" },
      { value: "provato",  label: "Ho provato ma senza risultati costanti" },
      { value: "attivo",   label: "Sì, ho già clienti e fatturato ricorrente" },
      { value: "avanzato", label: "Sì, fatturato >50k/anno dal digitale" },
    ],
    condizionale: {
      mostraSe: ["provato", "attivo", "avanzato"],
      campo: {
        id: "vendite_dettaglio",
        q: "Cosa vendi e con quali risultati?",
        tipo: "textarea",
        placeholder: "Es: consulenze 1:1 a 150€/h, circa 4 clienti al mese. Oppure: ho un mini-corso a 47€ che vende 10 copie/mese...",
      },
    },
  },
  // ─── obiettivo ──────────────────────────────────────────────────
  {
    id: "obiettivo",
    q: "Qual è il tuo obiettivo principale con questo percorso?",
    tipo: "textarea",
    placeholder: "Es: lanciare il mio primo videocorso entro 3 mesi, costruire un'accademia digitale che generi 5k/mese, scalare il mio business di consulenza con prodotti digitali...",
  },
];

const BLOCCHI_ORDINE = ["Il tuo progetto", "La tua esperienza", "Il tuo obiettivo"];
const BLOCCHI_META = {
  "Il tuo progetto":    { colore: "#3B82F6", desc: "Definiamo chi sei e cosa offri",       campi: ["ambito", "target", "problema"] },
  "La tua esperienza":  { colore: "#8B5CF6", desc: "Valutiamo il tuo punto di partenza",   campi: ["esperienza", "pubblico", "vendite_online"] },
  "Il tuo obiettivo":   { colore: "#F59E0B", desc: "Capiamo dove vuoi arrivare",           campi: ["obiettivo"] },
};

// ── Progress Bar ─────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div data-testid="wizard-progress" className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: done ? C.green : active ? C.yellow : "#E8E4DC",
                color: done ? "white" : active ? C.dark : C.muted,
                transition: "all 0.3s ease",
              }}
            >
              {done ? <CheckCircle className="w-4 h-4" /> : step}
            </div>
            {i < total - 1 && (
              <div className="w-8 h-0.5" style={{ background: step < current ? C.green : "#E8E4DC" }} />
            )}
          </React.Fragment>
        );
      })}
      <span className="ml-3 text-xs font-bold" style={{ color: C.muted }}>
        Step {current} di {total}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN WIZARD
// ══════════════════════════════════════════════════════════════════
export default function ClienteWizard({ user, onLogout, onPartnerAttivato, adminPreview = false, forcedStep = null }) {
  const [step, setStep] = useState(forcedStep || 1);
  const [loading, setLoading] = useState(!forcedStep);
  const [quiz, setQuiz] = useState({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const token = localStorage.getItem("access_token");
  const userId = user?.id || user?.user_id;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // ── Sync forcedStep from sidebar (admin preview) ────────────────
  useEffect(() => {
    if (forcedStep != null) setStep(forcedStep);
  }, [forcedStep]);

  // ── Determine step from user status ────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (forcedStep != null) return;           // admin-preview: sidebar controlla lo step
    if (!userId) { setLoading(false); return; }
    try {
      const r = await axios.get(`${API}/api/cliente-analisi/stato/${userId}`);
      const stato = r.data?.stato_cliente || "REGISTRATO";
      
      if (["CONVERTITO_PARTNER", "ATTIVAZIONE_PARTNERSHIP"].includes(stato)) {
        if (onPartnerAttivato) onPartnerAttivato();
        return;
      }
      if (["IDONEO_PARTNERSHIP", "CALL_COMPLETATA", "CALL_PRENOTATA", "IN_ATTESA_CALL", "ANALISI_ATTIVATA"].includes(stato)) setStep(4);
      else if (["IN_ATTESA_PAGAMENTO_ANALISI", "QUESTIONARIO_COMPLETATO"].includes(stato)) setStep(3);
      else if (stato === "REGISTRATO") setStep(1);
      else setStep(1);

      // Check if payment was just completed (URL param)
      const params = new URLSearchParams(window.location.search);
      if (params.get("pagamento") === "successo") setStep(4);
    } catch (e) {
      console.error("Status fetch:", e);
    }
    setLoading(false);
  }, [userId, onPartnerAttivato]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Submit mini quiz ───────────────────────────────────────────
  const isQuizComplete = () => QUIZ_FIELDS.every(f => {
    const val = quiz[f.id];
    if (f.tipo === "radio") return !!val;
    return val?.trim?.()?.length > 0;
  });

  const submitQuiz = async () => {
    if (!isQuizComplete()) return;
    setSubmittingQuiz(true);
    try {
      // Build flat structured JSON matching the DB schema
      const structured = {
        ambito: quiz.ambito || "",
        target: quiz.target || "",
        problema: quiz.problema || "",
        esperienza: quiz.esperienza || "",
        pubblico: quiz.pubblico || "",
        canale_principale: quiz.canale_principale || "",
        vendite_online: quiz.vendite_online || "",
        vendite_dettaglio: quiz.vendite_dettaglio || "",
        obiettivo: quiz.obiettivo || "",
      };
      await axios.post(`${API}/api/cliente-analisi/mini-quiz`, { risposte: structured }, { headers });
      setStep(3);
    } catch (e) { console.error("Quiz submit:", e); }
    setSubmittingQuiz(false);
  };

  // ── Start Stripe checkout ──────────────────────────────────────
  const startCheckout = async () => {
    setCheckingOut(true);
    try {
      const r = await axios.post(`${API}/api/cliente-analisi/checkout`, null, {
        params: { user_id: userId, email: user?.email }
      });
      if (r.data?.checkout_url) {
        window.location.href = r.data.checkout_url;
        return;
      }
    } catch (e) { console.error("Checkout:", e); }
    setCheckingOut(false);
  };

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: C.yellow }} />
      </div>
    );
  }

  const totalSteps = 4;
  const displayStep = Math.min(step, totalSteps);

  return (
    <div data-testid="cliente-wizard" className={adminPreview ? "flex flex-col" : "min-h-screen flex flex-col"} style={{ background: C.bg }}>
      {/* Header — solo per il cliente reale, non per la preview admin */}
      {!adminPreview && (
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: C.yellow }}>
            <span className="text-base font-black" style={{ color: C.dark }}>E</span>
          </div>
          <div>
            <span className="font-black text-sm" style={{ color: C.dark }}>Evolution</span>
            <span className="font-black text-sm" style={{ color: C.yellowDark }}>Pro</span>
          </div>
        </div>
        {onLogout && (
          <button
            data-testid="wizard-logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ border: `1px solid ${C.border}`, color: C.muted }}
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        )}
      </header>
      )}

      {/* Content */}
      <main className={`flex-1 px-6 ${(step === 2 || step === 4) ? 'py-6' : `flex items-center justify-center ${adminPreview ? 'py-6' : 'py-10'}`}`}>
        <div className={`w-full ${(step === 2 || step === 4) ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}>
          <ProgressBar current={displayStep} total={totalSteps} />

          {/* ── STEP 1: Welcome ─────────────────────────────── */}
          {step === 1 && (
            <div data-testid="step-welcome" className="text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: `${C.yellow}25` }}>
                <Sparkles className="w-8 h-8" style={{ color: C.yellowDark }} />
              </div>
              <h1 className="text-2xl font-black mb-3" style={{ color: C.dark }}>
                Benvenuto in Evolution PRO
              </h1>
              <p className="text-sm leading-relaxed mb-4 max-w-md mx-auto" style={{ color: C.muted }}>
                Se sei qui è perché vuoi capire se la tua competenza può trasformarsi
                in un progetto digitale serio e sostenibile.
              </p>
              <p className="text-sm leading-relaxed mb-4 max-w-md mx-auto" style={{ color: C.muted }}>
                Prima di procedere, ti chiediamo di compilare un breve questionario.<br />
                Ci serve per raccogliere le informazioni essenziali sul tuo progetto
                e preparare un'analisi strategica realmente utile, personalizzata sul tuo caso.
              </p>
              <p className="text-sm leading-relaxed mb-2 max-w-md mx-auto" style={{ color: C.muted }}>
                In questo modo potremo valutare con maggiore precisione:
              </p>
              <ul className="text-sm leading-relaxed mb-4 max-w-md mx-auto text-left inline-block" style={{ color: C.muted }}>
                <li className="flex items-start gap-2 mb-1"><span style={{ color: C.yellowDark }}>•</span> il tuo posizionamento,</li>
                <li className="flex items-start gap-2 mb-1"><span style={{ color: C.yellowDark }}>•</span> il problema che risolvi,</li>
                <li className="flex items-start gap-2 mb-1"><span style={{ color: C.yellowDark }}>•</span> il potenziale del progetto,</li>
                <li className="flex items-start gap-2"><span style={{ color: C.yellowDark }}>•</span> l'eventuale accesso alla partnership.</li>
              </ul>
              <p className="text-xs font-bold mb-8 max-w-md mx-auto" style={{ color: C.muted }}>
                Tempo richiesto: circa 5 minuti.
              </p>
              <button
                data-testid="welcome-cta"
                onClick={() => setStep(2)}
                className="px-10 py-3.5 rounded-xl text-sm font-black"
                style={{ background: C.yellow, color: C.dark, transition: "all 0.15s ease" }}
              >
                Inizia il questionario <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          )}

          {/* ── STEP 2: Mini Quiz ───────────────────────────── */}
          {step === 2 && (
            <div data-testid="step-mini-quiz" className="w-full max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-2">
                <h2 className="text-xl font-black" style={{ color: C.dark }}>Raccontaci del tuo progetto</h2>
                <p className="text-sm mt-1" style={{ color: C.muted }}>
                  Queste risposte alimentano la tua analisi strategica personalizzata
                </p>
              </div>

              {BLOCCHI_ORDINE.map(blocco => {
                const meta = BLOCCHI_META[blocco];
                const fields = QUIZ_FIELDS.filter(f => meta.campi.includes(f.id));
                return (
                  <div key={blocco} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "white" }}>
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `${meta.colore}08`, borderBottom: `1px solid ${C.border}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: meta.colore }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.colore }}>{blocco}</span>
                      <span className="text-xs ml-1" style={{ color: C.muted }}>{meta.desc}</span>
                    </div>

                    <div className="p-4 space-y-5">
                      {fields.map(f => (
                        <div key={f.id}>
                          <label className="text-sm font-bold block mb-2" style={{ color: C.dark }}>{f.q}</label>

                          {f.tipo === "textarea" && (
                            <textarea
                              data-testid={`quiz-${f.id}`}
                              value={quiz[f.id] || ""}
                              onChange={(e) => setQuiz(q => ({ ...q, [f.id]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2"
                              style={{ border: `1px solid ${C.border}`, minHeight: 72, background: C.bg }}
                              rows={3}
                            />
                          )}

                          {f.tipo === "radio" && (
                            <div className="space-y-2">
                              {f.opzioni.map(opt => {
                                const selected = quiz[f.id] === opt.value;
                                return (
                                  <label
                                    key={opt.value}
                                    data-testid={`quiz-${f.id}-${opt.value}`}
                                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer transition-all"
                                    style={{
                                      border: `1.5px solid ${selected ? C.yellow : C.border}`,
                                      background: selected ? `${C.yellow}12` : "transparent",
                                    }}
                                  >
                                    <div
                                      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                                      style={{ border: `2px solid ${selected ? C.yellowDark : '#CBD5E1'}` }}
                                    >
                                      {selected && <div className="w-2 h-2 rounded-full" style={{ background: C.yellowDark }} />}
                                    </div>
                                    <input type="radio" name={f.id} value={opt.value} checked={selected}
                                      onChange={() => setQuiz(q => ({ ...q, [f.id]: opt.value }))}
                                      className="sr-only"
                                    />
                                    <span className="text-sm" style={{ color: selected ? C.dark : '#64748B', fontWeight: selected ? 600 : 400 }}>
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Campo condizionale (select o textarea) */}
                          {f.condizionale && f.condizionale.mostraSe.includes(quiz[f.id]) && (
                            <div className="mt-3 pl-4" style={{ borderLeft: `2px solid ${C.yellow}` }}>
                              <label className="text-sm font-bold block mb-2" style={{ color: C.dark }}>
                                {f.condizionale.campo.q}
                              </label>
                              {f.condizionale.campo.tipo === "select" && (
                                <div className="relative">
                                  <select
                                    data-testid={`quiz-${f.condizionale.campo.id}`}
                                    value={quiz[f.condizionale.campo.id] || ""}
                                    onChange={(e) => setQuiz(q => ({ ...q, [f.condizionale.campo.id]: e.target.value }))}
                                    className="w-full rounded-lg p-3 text-sm appearance-none focus:outline-none focus:ring-2 pr-10"
                                    style={{ border: `1px solid ${C.border}`, background: C.bg }}
                                  >
                                    <option value="">Seleziona...</option>
                                    {f.condizionale.campo.opzioni.map(o => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 pointer-events-none" style={{ color: C.muted }} />
                                </div>
                              )}
                              {f.condizionale.campo.tipo === "textarea" && (
                                <textarea
                                  data-testid={`quiz-${f.condizionale.campo.id}`}
                                  value={quiz[f.condizionale.campo.id] || ""}
                                  onChange={(e) => setQuiz(q => ({ ...q, [f.condizionale.campo.id]: e.target.value }))}
                                  placeholder={f.condizionale.campo.placeholder}
                                  className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2"
                                  style={{ border: `1px solid ${C.border}`, minHeight: 60, background: C.bg }}
                                  rows={2}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Indietro
                </button>
                <button
                  data-testid="quiz-submit"
                  onClick={submitQuiz}
                  disabled={!isQuizComplete() || submittingQuiz}
                  className="px-8 py-2.5 rounded-xl text-sm font-black flex items-center gap-2"
                  style={{
                    background: isQuizComplete() ? C.yellow : "#E8E4DC",
                    color: C.dark, opacity: submittingQuiz ? 0.6 : 1,
                  }}
                >
                  {submittingQuiz && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continua <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Checkout Analisi Strategica (€67) ──── */}
          {step === 3 && (
            <div data-testid="step-checkout" className="w-full max-w-lg mx-auto">

              {/* Mini-header riepilogo blocchi questionario */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[
                  { label: "Progetto", color: "#3B82F6" },
                  { label: "Esperienza", color: "#8B5CF6" },
                  { label: "Obiettivo", color: "#F59E0B" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ background: `${b.color}12`, border: `1px solid ${b.color}30` }}>
                    <CheckCircle className="w-3 h-3" style={{ color: b.color }} />
                    <span className="text-[10px] font-bold" style={{ color: b.color }}>{b.label}</span>
                  </div>
                ))}
              </div>

              {/* Hero */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black leading-tight mb-2" style={{ color: C.dark }}>
                  Sei ad un passo dalla tua<br />Analisi Strategica
                </h1>
                <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: C.muted }}>
                  Il tuo punteggio di idoneità è stato elaborato. Sblocca il report
                  completo e prenota il tuo posto nel programma.
                </p>
              </div>

              {/* Value Stack Card */}
              <div className="rounded-xl p-5 mb-5" style={{ background: "white", border: `1px solid ${C.border}` }}>
                <div className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: C.yellowDark }}>
                  Cosa è incluso
                </div>
                <div className="space-y-4">
                  {[
                    {
                      icon: FileText, title: "Analisi Strategica AI-Driven",
                      desc: "Report di 5 sezioni generato su dati deterministici, personalizzato sul tuo caso.",
                    },
                    {
                      icon: PhoneCall, title: "Script Call Personalizzato",
                      desc: "6 sezioni pronte per la tua videocall strategica con Claudio.",
                    },
                    {
                      icon: BadgeCheck, title: "Verifica Idoneità Partnership",
                      desc: "Validazione ufficiale per l'accesso al contratto da €2.790.",
                    },
                  ].map(v => (
                    <div key={v.title} className="flex gap-3">
                      <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: `${C.green}15` }}>
                        <v.icon className="w-4 h-4" style={{ color: C.green }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold" style={{ color: C.dark }}>{v.title}</div>
                        <div className="text-xs leading-relaxed" style={{ color: C.muted }}>{v.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Block */}
              <div className="rounded-xl p-6 text-center mb-2"
                style={{ background: `${C.yellow}12`, border: `1.5px solid ${C.yellow}50` }}>
                <div className="text-4xl font-black tracking-tight" style={{ color: C.dark }}>€67</div>
                <div className="text-xs font-bold mt-1" style={{ color: C.yellowDark }}>
                  Investimento unico (IVA inclusa se applicabile)
                </div>
                <div className="text-[11px] mt-2 italic" style={{ color: C.muted }}>
                  Questo importo verrà scalato dal costo della partnership in caso di esito positivo.
                </div>
              </div>

              {/* CTA */}
              <button
                data-testid="checkout-cta"
                onClick={startCheckout}
                disabled={checkingOut}
                className="w-full py-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:brightness-105 active:scale-[0.98]"
                style={{ background: "#1A65D6", color: "white", opacity: checkingOut ? 0.7 : 1 }}
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparazione del gateway sicuro di pagamento...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Richiedi la tua Analisi Strategica
                  </>
                )}
              </button>

              {/* Trust Signals */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
                  <span className="text-[10px] font-bold" style={{ color: "#9CA3AF" }}>SSL Secured</span>
                </div>
                <div className="h-3 w-px" style={{ background: "#E5E7EB" }} />
                <div className="flex items-center gap-2">
                  {["Visa", "Mastercard", "Stripe"].map(name => (
                    <span key={name} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: "#F3F4F6", color: "#9CA3AF" }}>{name}</span>
                  ))}
                </div>
              </div>

              {/* Back + Support */}
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(2)} className="text-sm font-bold" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Indietro
                </button>
                <a href="mailto:stefania@evolution-pro.it" className="text-[11px] underline" style={{ color: "#9CA3AF" }}>
                  Problemi con il pagamento? Contatta Stefania
                </a>
              </div>
            </div>
          )}
          {/* ── STEP 4: Conferma & Onboarding ────────────────── */}
          {step === 4 && (() => {
            // Generate available dates (next 14 weekdays)
            const availableDates = [];
            const today = new Date();
            let d = new Date(today);
            d.setDate(d.getDate() + 1);
            while (availableDates.length < 14) {
              if (d.getDay() !== 0 && d.getDay() !== 6) {
                availableDates.push(new Date(d));
              }
              d.setDate(d.getDate() + 1);
            }
            const timeSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

            const formatDate = (dt) => dt.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
            const formatDateISO = (dt) => dt.toISOString().split("T")[0];

            const confirmBooking = async () => {
              if (!selectedDate || !selectedTime) return;
              setBookingLoading(true);
              try {
                await axios.post(`${API}/api/cliente-analisi/call-prenotata`, {
                  data: formatDateISO(selectedDate),
                  ora: selectedTime,
                }, { headers });
                setBookingConfirmed(true);
              } catch (e) { console.error("Booking error:", e); }
              setBookingLoading(false);
            };

            return (
              <div data-testid="step-onboarding" className="w-full max-w-2xl mx-auto space-y-6">

                {/* Progress bar visiva: Richiesta ✔ → Formazione & Booking 🟢 → Analisi ⚪ */}
                <div className="flex items-center justify-center gap-3 mb-2">
                  {[
                    { label: "Richiesta", done: true },
                    { label: "Formazione & Booking", active: true },
                    { label: "Analisi Strategica", pending: true },
                  ].map((s, i) => (
                    <React.Fragment key={s.label}>
                      {i > 0 && <div className="w-8 h-px" style={{ background: s.done || s.active ? C.green : "#E5E7EB" }} />}
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                          style={{
                            background: s.done ? C.green : s.active ? `${C.green}20` : "#F3F4F6",
                            color: s.done ? "white" : s.active ? C.green : "#9CA3AF",
                            border: s.active ? `1.5px solid ${C.green}` : "none",
                          }}>
                          {s.done ? <CheckCircle className="w-3 h-3" /> : (i + 1)}
                        </div>
                        <span className="text-[11px] font-bold" style={{ color: s.active ? C.green : s.done ? C.dark : "#9CA3AF" }}>
                          {s.label}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Hero */}
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: `${C.green}15` }}>
                    <CheckCircle className="w-7 h-7" style={{ color: C.green }} />
                  </div>
                  <h1 className="text-2xl font-black" style={{ color: C.dark }}>
                    Ottimo lavoro! La tua Analisi Strategica è in fase di generazione.
                  </h1>
                  <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: C.muted }}>
                    Per massimizzare il valore della nostra futura videocall, segui questi due step obbligatori.
                  </p>
                </div>

                {/* STEP 1: Mini-Corso */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "white" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${C.yellow}10`, borderBottom: `1px solid ${C.border}` }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: C.yellow, color: C.dark }}>1</div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.yellowDark }}>Formazione — Mini Corso Preparatorio</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm mb-4" style={{ color: C.muted }}>
                      Guarda questo breve video introduttivo. Ti spiegherà come leggere i dati della tua analisi
                      e come prepararti alla partnership.
                    </p>
                    <div className="space-y-3">
                      {[
                        { title: "Come funziona Evolution PRO", desc: "Il metodo in 7 fasi per creare la tua accademia digitale", dur: "8 min" },
                        { title: "Il Team al tuo fianco", desc: "5 agenti AI specializzati + Claudio e Antonella", dur: "5 min" },
                        { title: "Cosa aspettarti dalla Call", desc: "Come prepararti per ottenere il massimo", dur: "4 min" },
                      ].map((v, i) => (
                        <div key={i} data-testid={`minicorso-video-${i}`}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-sm"
                          style={{ border: `1px solid ${C.border}` }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${C.yellow}20` }}>
                            <Play className="w-4 h-4" style={{ color: C.yellowDark }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold" style={{ color: C.dark }}>{v.title}</div>
                            <div className="text-xs" style={{ color: C.muted }}>{v.desc}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md flex-shrink-0"
                            style={{ background: C.bg, color: C.muted }}>{v.dur}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* STEP 2: Booking Videocall */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "white" }}>
                  <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${C.green}08`, borderBottom: `1px solid ${C.border}` }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: C.green, color: "white" }}>2</div>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.green }}>Prenotazione — Videocall Strategica</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm mb-4" style={{ color: C.muted }}>
                      Scegli il momento migliore per la tua call di consegna. Durante questo incontro,
                      Claudio analizzerà con te i risultati e valuterà l'accesso alla Partnership da €2.790.
                    </p>

                    {bookingConfirmed ? (
                      <div data-testid="booking-confirmed" className="rounded-xl p-5 text-center" style={{ background: `${C.green}08`, border: `1px solid ${C.green}25` }}>
                        <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: C.green }} />
                        <div className="text-sm font-black" style={{ color: C.dark }}>Call prenotata con successo!</div>
                        <div className="text-sm mt-1" style={{ color: C.muted }}>
                          {selectedDate && formatDate(selectedDate)} alle {selectedTime}
                        </div>
                        <div className="text-xs mt-2" style={{ color: C.muted }}>
                          Riceverai una mail di conferma con il link alla videocall.
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Date picker */}
                        <div className="mb-4">
                          <div className="text-xs font-bold mb-2" style={{ color: C.dark }}>Scegli una data</div>
                          <div className="flex flex-wrap gap-2">
                            {availableDates.slice(0, 10).map(dt => {
                              const sel = selectedDate && formatDateISO(selectedDate) === formatDateISO(dt);
                              return (
                                <button key={formatDateISO(dt)} data-testid={`date-${formatDateISO(dt)}`}
                                  onClick={() => { setSelectedDate(dt); setSelectedTime(null); }}
                                  className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                                  style={{
                                    border: `1.5px solid ${sel ? C.green : C.border}`,
                                    background: sel ? `${C.green}12` : "transparent",
                                    color: sel ? C.green : "#64748B",
                                  }}>
                                  {formatDate(dt)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time slots */}
                        {selectedDate && (
                          <div className="mb-4">
                            <div className="text-xs font-bold mb-2" style={{ color: C.dark }}>Scegli un orario</div>
                            <div className="grid grid-cols-3 gap-2">
                              {timeSlots.map(t => {
                                const sel = selectedTime === t;
                                return (
                                  <button key={t} data-testid={`time-${t}`}
                                    onClick={() => setSelectedTime(t)}
                                    className="py-2.5 rounded-lg text-sm font-bold transition-all"
                                    style={{
                                      border: `1.5px solid ${sel ? C.green : C.border}`,
                                      background: sel ? `${C.green}12` : "transparent",
                                      color: sel ? C.green : "#64748B",
                                    }}>
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Confirm */}
                        <button
                          data-testid="confirm-booking-btn"
                          onClick={confirmBooking}
                          disabled={!selectedDate || !selectedTime || bookingLoading}
                          className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
                          style={{
                            background: (selectedDate && selectedTime) ? C.green : "#E5E7EB",
                            color: (selectedDate && selectedTime) ? "white" : "#9CA3AF",
                            opacity: bookingLoading ? 0.6 : 1,
                          }}>
                          {bookingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          <Calendar className="w-4 h-4" />
                          Conferma Prenotazione
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
