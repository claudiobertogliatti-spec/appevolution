import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2,
  Sparkles, Play, Calendar, LogOut
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
  // ─── BLOCCO 1: Posizionamento ──────────────────────────────────
  {
    id: "expertise",
    blocco: "Posizionamento",
    q: "Qual è la tua competenza principale?",
    tipo: "textarea",
    placeholder: "Es: coaching per imprenditori, nutrizione sportiva, marketing digitale, insegnamento lingue...",
    ai_tag: "core_expertise",
  },
  {
    id: "target",
    blocco: "Posizionamento",
    q: "Chi è il tuo cliente ideale?",
    tipo: "textarea",
    placeholder: "Es: liberi professionisti 30-50 anni che vogliono scalare online, mamme che cercano un secondo reddito...",
    ai_tag: "target_audience",
  },
  // ─── BLOCCO 2: Maturità ────────────────────────────────────────
  {
    id: "vendita_online",
    blocco: "Maturità",
    q: "Stai già vendendo prodotti o servizi online?",
    tipo: "radio",
    opzioni: [
      { value: "no",         label: "No, parto da zero" },
      { value: "inizio",     label: "Ho provato ma senza risultati costanti" },
      { value: "attivo",     label: "Sì, ho già clienti e fatturato ricorrente" },
      { value: "avanzato",   label: "Sì, fatturato >50k/anno dal digitale" },
    ],
    ai_tag: "digital_maturity",
  },
  {
    id: "audience_size",
    blocco: "Maturità",
    q: "Hai già un pubblico che ti segue?",
    tipo: "radio",
    opzioni: [
      { value: "nessuno",    label: "Non ancora" },
      { value: "piccolo",    label: "Meno di 1.000 follower/iscritti" },
      { value: "medio",      label: "1.000 – 10.000" },
      { value: "grande",     label: "Oltre 10.000" },
    ],
    ai_tag: "audience_size",
  },
  // ─── BLOCCO 3: Validazione ─────────────────────────────────────
  {
    id: "problema_risolto",
    blocco: "Validazione",
    q: "Qual è il problema concreto che risolvi per i tuoi clienti?",
    tipo: "textarea",
    placeholder: "Es: li aiuto a trovare i primi 10 clienti online in 90 giorni, oppure a perdere 10 kg senza diete drastiche...",
    ai_tag: "value_proposition",
  },
  // ─── BLOCCO 4: Obiettivo ───────────────────────────────────────
  {
    id: "obiettivo",
    blocco: "Obiettivo",
    q: "Cosa vuoi ottenere da questo percorso?",
    tipo: "radio",
    opzioni: [
      { value: "videocorso",     label: "Creare e lanciare un videocorso" },
      { value: "accademia",      label: "Costruire un'accademia digitale completa" },
      { value: "membership",     label: "Avviare una membership/community a pagamento" },
      { value: "scala_business", label: "Scalare un business già avviato con il digitale" },
      { value: "altro",          label: "Altro (specificare)" },
    ],
    ai_tag: "project_goal",
  },
];

const BLOCCHI_ORDINE = ["Posizionamento", "Maturità", "Validazione", "Obiettivo"];
const BLOCCHI_META = {
  Posizionamento: { colore: "#3B82F6", desc: "Definiamo chi sei e a chi ti rivolgi" },
  Maturità:       { colore: "#8B5CF6", desc: "Valutiamo il tuo punto di partenza" },
  Validazione:    { colore: "#10B981", desc: "Verifichiamo il valore della tua offerta" },
  Obiettivo:      { colore: "#F59E0B", desc: "Capiamo dove vuoi arrivare" },
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
      if (["IDONEO_PARTNERSHIP", "CALL_COMPLETATA"].includes(stato)) setStep(7);
      else if (["CALL_PRENOTATA", "IN_ATTESA_CALL"].includes(stato)) setStep(7);
      else if (["ANALISI_ATTIVATA"].includes(stato)) setStep(5);
      else if (["IN_ATTESA_PAGAMENTO_ANALISI", "QUESTIONARIO_COMPLETATO"].includes(stato)) setStep(3);
      else if (stato === "REGISTRATO") setStep(1);
      else setStep(1);

      // Check if payment was just completed (URL param)
      const params = new URLSearchParams(window.location.search);
      if (params.get("pagamento") === "successo") setStep(5);
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
      // Build structured JSON for AI pipeline
      const structured = {};
      QUIZ_FIELDS.forEach(f => {
        structured[f.ai_tag] = {
          domanda: f.q,
          risposta: quiz[f.id],
          tipo: f.tipo,
          blocco: f.blocco,
          ...(f.tipo === "radio" && {
            label: f.opzioni?.find(o => o.value === quiz[f.id])?.label || quiz[f.id],
          }),
          // Include "altro_testo" if user selected "altro" and typed something
          ...(quiz[f.id] === "altro" && quiz[`${f.id}_altro`] && {
            altro_testo: quiz[`${f.id}_altro`],
          }),
        };
      });
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

  const totalSteps = 7;
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
      <main className={`flex-1 px-6 ${step === 2 ? 'py-6' : `flex items-center justify-center ${adminPreview ? 'py-6' : 'py-10'}`}`}>
        <div className={`w-full ${step === 2 ? 'max-w-2xl mx-auto' : 'max-w-xl'}`}>
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
                  6 domande strutturate — le useremo per generare la tua analisi strategica
                </p>
              </div>

              {BLOCCHI_ORDINE.map(blocco => {
                const meta = BLOCCHI_META[blocco];
                const fields = QUIZ_FIELDS.filter(f => f.blocco === blocco);
                return (
                  <div key={blocco} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "white" }}>
                    {/* Blocco header */}
                    <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: `${meta.colore}08`, borderBottom: `1px solid ${C.border}` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: meta.colore }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.colore }}>{blocco}</span>
                      <span className="text-xs ml-1" style={{ color: C.muted }}>{meta.desc}</span>
                    </div>

                    {/* Domande del blocco */}
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
                              style={{ border: `1px solid ${C.border}`, minHeight: 72, background: C.bg, focusRingColor: C.yellow }}
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
                                    <input
                                      type="radio"
                                      name={f.id}
                                      value={opt.value}
                                      checked={selected}
                                      onChange={() => setQuiz(q => ({ ...q, [f.id]: opt.value }))}
                                      className="sr-only"
                                    />
                                    <span className="text-sm" style={{ color: selected ? C.dark : '#64748B', fontWeight: selected ? 600 : 400 }}>
                                      {opt.label}
                                    </span>
                                  </label>
                                );
                              })}
                              {/* Campo testo "Altro" se l'opzione lo prevede */}
                              {quiz[f.id] === "altro" && (
                                <textarea
                                  data-testid={`quiz-${f.id}-altro-testo`}
                                  value={quiz[`${f.id}_altro`] || ""}
                                  onChange={(e) => setQuiz(q => ({ ...q, [`${f.id}_altro`]: e.target.value }))}
                                  placeholder="Descrivici il tuo obiettivo..."
                                  className="w-full rounded-lg p-3 text-sm resize-none focus:outline-none mt-1"
                                  style={{ border: `1px solid ${C.border}`, background: C.bg }}
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

          {/* ── STEP 3: Pre-Payment ─────────────────────────── */}
          {step === 3 && (
            <div data-testid="step-pre-payment" className="text-center">
              <h1 className="text-2xl font-black mb-3" style={{ color: C.dark }}>
                Sei ad un passo dalla tua Analisi Strategica
              </h1>
              <p className="text-sm leading-relaxed mb-6 max-w-md mx-auto" style={{ color: C.muted }}>
                Sulla base delle informazioni che hai inserito, possiamo elaborare un'analisi
                strategica personalizzata del tuo progetto.
              </p>
              <div className="rounded-xl p-6 mb-6 text-left" style={{ background: "white", border: `1px solid ${C.border}` }}>
                <h3 className="font-bold text-sm mb-4" style={{ color: C.dark }}>Durante la videocall riceverai:</h3>
                {[
                  "Valutazione reale del tuo progetto",
                  "Punti di forza e criticità",
                  "Direzione strategica concreta",
                  "Possibilità di accesso alla partnership",
                ].map(item => (
                  <div key={item} className="flex items-start gap-2.5 mb-3">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: C.green }} />
                    <span className="text-sm" style={{ color: C.dark }}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-6 mb-6" style={{ background: `${C.yellow}15`, border: `1px solid ${C.yellow}40` }}>
                <div className="text-3xl font-black mb-1" style={{ color: C.dark }}>€67</div>
                <div className="text-xs font-bold" style={{ color: C.yellowDark }}>una tantum — Analisi Strategica Personalizzata</div>
              </div>
              <button
                data-testid="checkout-cta"
                onClick={() => setStep(4)}
                className="px-10 py-3.5 rounded-xl text-sm font-black"
                style={{ background: C.yellow, color: C.dark }}
              >
                Richiedi la tua Analisi Strategica <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          )}

          {/* ── STEP 4: Checkout Stripe ─────────────────────── */}
          {step === 4 && (
            <div data-testid="step-checkout" className="text-center">
              <h2 className="text-xl font-black mb-2" style={{ color: C.dark }}>Pagamento Analisi Strategica</h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>Verrai reindirizzato a Stripe per il pagamento sicuro</p>
              <div className="rounded-xl p-6 mb-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold" style={{ color: C.dark }}>Analisi Strategica Personalizzata</span>
                  <span className="text-lg font-black" style={{ color: C.dark }}>€67</span>
                </div>
                <div className="text-xs" style={{ color: C.muted }}>Pagamento sicuro con carta di credito/debito via Stripe</div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Indietro
                </button>
                <button
                  data-testid="pay-btn"
                  onClick={startCheckout}
                  disabled={checkingOut}
                  className="px-10 py-3.5 rounded-xl text-sm font-black flex items-center gap-2"
                  style={{ background: C.yellow, color: C.dark, opacity: checkingOut ? 0.6 : 1 }}
                >
                  {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Paga €67 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: Thank You ───────────────────────────── */}
          {step === 5 && (
            <div data-testid="step-thank-you" className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: `${C.green}15` }}>
                <CheckCircle className="w-8 h-8" style={{ color: C.green }} />
              </div>
              <h1 className="text-2xl font-black mb-2" style={{ color: C.dark }}>
                Richiesta completata correttamente
              </h1>
              <p className="text-sm mb-8" style={{ color: C.muted }}>
                Abbiamo ricevuto la tua richiesta. Ora puoi accedere ai prossimi step.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  data-testid="goto-minicorso"
                  onClick={() => setStep(6)}
                  className="rounded-xl p-5 text-center"
                  style={{ background: "white", border: `1px solid ${C.border}`, transition: "all 0.15s ease" }}
                >
                  <Play className="w-8 h-8 mx-auto mb-2" style={{ color: C.yellowDark }} />
                  <div className="text-sm font-bold" style={{ color: C.dark }}>Accedi al Mini Corso</div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>Preparati al meglio</div>
                </button>
                <button
                  data-testid="goto-calendar"
                  onClick={() => setStep(7)}
                  className="rounded-xl p-5 text-center"
                  style={{ background: "white", border: `1px solid ${C.border}`, transition: "all 0.15s ease" }}
                >
                  <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: C.yellowDark }} />
                  <div className="text-sm font-bold" style={{ color: C.dark }}>Prenota la Call</div>
                  <div className="text-xs mt-1" style={{ color: C.muted }}>Call Strategica con Claudio</div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 6: Mini Corso ──────────────────────────── */}
          {step === 6 && (
            <div data-testid="step-mini-corso">
              <h2 className="text-xl font-black mb-2 text-center" style={{ color: C.dark }}>Mini Corso Preparatorio</h2>
              <p className="text-sm mb-6 text-center" style={{ color: C.muted }}>Preparati al meglio per la call strategica</p>
              <div className="space-y-4">
                {[
                  { title: "Come funziona Evolution PRO", desc: "Il metodo in 7 fasi per creare la tua accademia digitale", dur: "8 min" },
                  { title: "Il Team al tuo fianco", desc: "5 agenti AI specializzati + Claudio e Antonella", dur: "5 min" },
                  { title: "Cosa aspettarti dalla Call", desc: "Come prepararti per ottenere il massimo", dur: "4 min" },
                ].map((v, i) => (
                  <div key={i} className="rounded-xl p-5 flex items-center gap-4" style={{ background: "white", border: `1px solid ${C.border}` }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${C.yellow}20` }}>
                      <Play className="w-5 h-5" style={{ color: C.yellowDark }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold" style={{ color: C.dark }}>{v.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: C.muted }}>{v.desc}</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: C.bg, color: C.muted }}>{v.dur}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(5)} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ color: C.muted }}>
                  <ArrowLeft className="w-4 h-4 inline mr-1" /> Indietro
                </button>
                <button
                  data-testid="goto-calendar-from-course"
                  onClick={() => setStep(7)}
                  className="px-8 py-2.5 rounded-xl text-sm font-black"
                  style={{ background: C.yellow, color: C.dark }}
                >
                  Prenota la Call <ArrowRight className="w-4 h-4 inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 7: Calendario Call ─────────────────────── */}
          {step === 7 && (
            <div data-testid="step-calendar" className="text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: C.yellowDark }} />
              <h2 className="text-xl font-black mb-2" style={{ color: C.dark }}>Prenota la tua Call Strategica</h2>
              <p className="text-sm mb-6" style={{ color: C.muted }}>
                Scegli il giorno e l'orario che preferisci per la call con Claudio
              </p>
              <div className="rounded-xl p-6 mb-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 mx-auto mb-4" style={{ color: "#E8E4DC" }} />
                  <p className="text-sm font-bold" style={{ color: C.dark }}>Sistema di prenotazione</p>
                  <p className="text-xs mt-1" style={{ color: C.muted }}>
                    Il calendario verrà integrato con Calendly o sistema interno
                  </p>
                  <button
                    data-testid="book-call-btn"
                    onClick={async () => {
                      try {
                        await axios.post(`${API}/api/cliente-analisi/call-prenotata`, null, { headers });
                      } catch (e) { console.error(e); }
                    }}
                    className="mt-4 px-8 py-3 rounded-xl text-sm font-black"
                    style={{ background: C.yellow, color: C.dark }}
                  >
                    Conferma Prenotazione
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(6)} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ color: C.muted }}>
                <ArrowLeft className="w-4 h-4 inline mr-1" /> Torna al Mini Corso
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
