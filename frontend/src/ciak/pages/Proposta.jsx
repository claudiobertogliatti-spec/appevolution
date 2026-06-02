/**
 * Ciak.io /proposta/:token — Proposta Partnership Evolution PRO.
 *
 * FASE 1 della migrazione Evolution → Ciak ("A con confine Ciak", lock 14/5/2026):
 * il customer journey post-call vive dentro il mondo Ciak. Questo è il porting
 * di frontend/src/components/PropostaPage.jsx — stesso flusso funzionale e stessi
 * endpoint backend (intoccati), re-skin palette slate/yellow + re-tono Ciak.
 *
 * Differenze vs versione Evolution (per coerenza col brand framework Ciak):
 *  - rimosse le frasi vietate (es. "si vende mentre dormi")
 *  - rimossi i testimonial generici/fake (framework Ciak: no testimonial fake)
 *  - tono "continuazione della sessione strategica", non "ora ti vendo"
 *  - palette slate-900 / yellow-400 / gray-200, Poppins
 *
 * Flusso: proposta → contratto (firma canvas) → pagamento (Stripe/bonifico)
 *         → documenti (pre-onboarding) → conferma.
 * Endpoint backend (condivisi con Evolution, NON modificati):
 *  GET  /api/proposta/:token
 *  POST /api/proposta/:token/accetta | /firma-contratto | /pagamento-stripe
 *       /conferma-stripe | /scelta-bonifico | /upload-distinta | /upload-documenti
 *  GET  /api/contract/text/:partner_id
 *  POST /api/contract/chat (assistente contrattuale floating, Haiku 4.5)
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";

const FASI = [
  { num: 1, titolo: "Posizionamento", desc: "La tua identità di autorità: chi sei, per chi, e perché sei il riferimento" },
  { num: 2, titolo: "Masterclass", desc: "Il contenuto che dimostra la tua competenza e attira il pubblico giusto" },
  { num: 3, titolo: "Videocorso", desc: "Il prodotto che trasforma la tua competenza in un asset che vende" },
  { num: 4, titolo: "Funnel", desc: "L'ecosistema che porta le persone dal primo contatto alla vendita" },
  { num: 5, titolo: "Lancio", desc: "La campagna che genera i primi ricavi e ti rende visibile sul mercato" },
  { num: 6, titolo: "Ottimizzazione", desc: "I numeri che migliorano ad ogni ciclo: vendite e posizionamento insieme" },
  { num: 7, titolo: "Continuità", desc: "Il piano che mantiene attivo l'ecosistema e consolida la tua autorità" },
];

const TEAM = [
  { nome: "VALENTINA", ruolo: "Strategia e Onboarding" },
  { nome: "ANDREA", ruolo: "Produzione Contenuti" },
  { nome: "MARCO", ruolo: "Accountability" },
  { nome: "GAIA", ruolo: "Supporto Tecnico" },
  { nome: "STEFANIA", ruolo: "Coordinatrice" },
  { nome: "CLAUDIO", ruolo: "Direzione" },
];

export function CiakProposta() {
  const { token } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const [proposta, setProposta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("proposta"); // proposta → contratto → pagamento → documenti → conferma
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bonifico, setBonifico] = useState(null);
  const [stripeConfirming, setStripeConfirming] = useState(false);
  const [partnerAttivato, setPartnerAttivato] = useState(false);
  const contractRef = useRef(null);
  const paymentRef = useRef(null);

  useEffect(() => {
    fetchProposta();
    const pg = searchParams.get("pagamento");
    const sid = searchParams.get("session_id");
    if (pg === "successo" && sid) {
      confirmStripePayment(sid);
    } else if (pg === "annullato") {
      toast.error("Pagamento annullato. Puoi riprovare.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const confirmStripePayment = async (sessionId) => {
    setStripeConfirming(true);
    setStep("documenti");
    try {
      const res = await fetch(`/api/proposta/${token}/conferma-stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setPartnerAttivato(true);
        toast.success("Pagamento confermato.");
      } else {
        toast.success("Pagamento ricevuto. Verrà confermato a breve.");
      }
    } catch (e) {
      toast.success("Pagamento ricevuto. Stiamo elaborando la conferma.");
    }
    setStripeConfirming(false);
  };

  const fetchProposta = async () => {
    try {
      const res = await fetch(`/api/proposta/${token}`);
      if (res.status === 404) { setError("not_found"); setLoading(false); return; }
      if (res.status === 410) { setError("scaduta"); setLoading(false); return; }
      if (!res.ok) throw new Error("Errore caricamento");
      const data = await res.json();
      setProposta(data);
      if (data.pagamento_completato) setStep("conferma");
      else if (data.contratto_firmato_at) setStep("pagamento");
      else if (data.accettato_at) setStep("contratto");
    } catch (e) {
      setError("generic");
    } finally {
      setLoading(false);
    }
  };

  const handleAccetta = async () => {
    try {
      await fetch(`/api/proposta/${token}/accetta`, { method: "POST" });
      setStep("contratto");
      setProposta((p) => ({ ...p, accettato_at: new Date().toISOString() }));
      setTimeout(() => contractRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (e) {
      toast.error("Errore nell'accettazione");
    }
  };

  const handleFirma = async (signatureBase64) => {
    try {
      const res = await fetch(`/api/proposta/${token}/firma-contratto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_base64: signatureBase64,
          clausole_vessatorie_approved: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProposta((p) => ({ ...p, contratto_firmato_at: data.signed_at }));
        setStep("pagamento");
        toast.success("Contratto firmato. Riceverai una copia via email.");
        setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    } catch (e) {
      toast.error("Errore nella firma");
    }
  };

  const handleStripe = async () => {
    try {
      const res = await fetch(`/api/proposta/${token}/pagamento-stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {
      toast.error("Errore avvio pagamento");
    }
  };

  const handleBonifico = async () => {
    try {
      const res = await fetch(`/api/proposta/${token}/scelta-bonifico`, { method: "POST" });
      const data = await res.json();
      setBonifico(data);
      setPaymentMethod("bonifico");
    } catch (e) {
      toast.error("Errore");
    }
  };

  const handleUploadDistinta = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/proposta/${token}/upload-distinta`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success("Distinta caricata. Verificheremo il pagamento.");
        setStep("documenti");
      }
    } catch (e) {
      toast.error("Errore upload");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocumenti = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/proposta/${token}/upload-documenti`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success("Documenti caricati. Registrazione completata.");
        setStep("conferma");
      }
    } catch (e) {
      toast.error("Errore upload documenti");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (error === "not_found" || error === "scaduta") return <ErrorScreen type={error} />;
  if (error) return <ErrorScreen type="generic" />;
  if (!proposta) return null;

  const corrispettivo = proposta.contract_params?.corrispettivo || 2790;
  const corrisFormat = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(corrispettivo);

  return (
    <>
      <CiakHeader />
      <ProgressBar step={step} />

      {/* HERO — tono "continuazione della sessione strategica" */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-4xl px-6 pt-16 pb-20">
          <p className="text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-4">
            Partnership Evolution PRO
          </p>
          <h1 className="text-3xl md:text-5xl font-semibold leading-[1.15] mb-6">
            Dopo la sessione strategica, questa è la proposta per costruire l'ecosistema che ti rende il riferimento del tuo mercato.
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
            La Partnership è il passaggio in cui il team Evolution costruisce con te — fase per
            fase — l'ecosistema di marketing che trasforma la tua competenza in autorevolezza
            riconosciuta e in vendite costanti.
            Non un corso da seguire da solo: un percorso strutturato, con un team dedicato, che ti
            porta a possedere la tua posizione sul mercato.
          </p>
          <p className="mt-6 text-base md:text-lg font-medium text-yellow-400">
            Online in 21 giorni. Il riferimento del tuo mercato in 12 mesi.
          </p>
        </div>
      </section>

      {/* ANALISI PERSONALIZZATA — emersa dalla call */}
      {(proposta.analisi_posizionamento || proposta.analisi_punti_forza?.length > 0) && (
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="border-l-4 border-yellow-400 pl-6 py-2">
              <p className="text-lg font-medium text-slate-900 mb-4">
                {proposta.prospect_nome}, durante la sessione strategica abbiamo identificato:
              </p>
              {proposta.analisi_posizionamento && (
                <p className="text-slate-700 mb-3 leading-relaxed">{proposta.analisi_posizionamento}</p>
              )}
              {proposta.analisi_punti_forza?.length > 0 && (
                <ul className="space-y-2 mb-4">
                  {proposta.analisi_punti_forza.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-700">
                      <span className="text-yellow-500 font-bold mt-0.5">•</span> {p}
                    </li>
                  ))}
                </ul>
              )}
              {proposta.analisi_pdf_url && (
                <a
                  href={proposta.analisi_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-slate-900 font-medium underline hover:text-yellow-600 transition"
                >
                  Scarica l'analisi strategica completa
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* COSA SUCCEDE ADESSO */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-8 leading-tight">
            Cosa succede adesso
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "1", title: "Firma il contratto", desc: "Rivedi i termini e firma digitalmente in meno di due minuti." },
              { num: "2", title: "Completa il pagamento", desc: "Carta o bonifico bancario — scegli tu." },
              { num: "3", title: "Parte il percorso", desc: "Il team ti contatta entro 24 ore e inizia la Fase 1." },
            ].map((c) => (
              <div key={c.num} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold mb-4">
                  {c.num}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{c.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IL PERCORSO — 7 FASI */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2 leading-tight">
            Il percorso — 7 fasi
          </h2>
          <p className="text-slate-500 mb-10">
            Dalla tua identità di autorità fino a un ecosistema di marketing che vende e ti posiziona sul mercato.
          </p>
          <div className="relative">
            <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gray-200" />
            {FASI.map((f) => (
              <div key={f.num} className="relative flex items-start gap-5 mb-7 last:mb-0">
                <div className="relative z-10 w-9 h-9 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold flex-shrink-0">
                  {f.num}
                </div>
                <div className="pt-1">
                  <h3 className="font-semibold text-slate-900">{f.titolo}</h3>
                  <p className="text-slate-600 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IL TEAM */}
      <section className="bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2 leading-tight">
            Non un tutor. Un team.
          </h2>
          <p className="text-slate-500 mb-8">Sei professionisti dedicati al percorso.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEAM.map((t) => (
              <div key={t.nome} className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="w-11 h-11 rounded-full bg-slate-900 text-yellow-400 flex items-center justify-center font-semibold mb-3">
                  {t.nome[0]}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{t.nome}</h3>
                <p className="text-slate-500 text-xs">{t.ruolo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* L'INVESTIMENTO */}
      <section className="bg-white">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl overflow-hidden">
            <div className="h-1 bg-yellow-400" />
            <div className="p-8 text-center">
              <h2 className="text-lg font-semibold mb-2">Partnership Evolution PRO</h2>
              <p className="text-4xl font-semibold mb-1">{corrisFormat}</p>
              <p className="text-slate-400 text-sm mb-6">IVA inclusa</p>
              <div className="text-left space-y-3">
                {[
                  "Tutte e 7 le fasi: dal posizionamento all'ecosistema che vende",
                  "Supporto diretto del team completo",
                  "Accesso alla piattaforma Evolution PRO",
                  "Strumenti AI inclusi",
                  "Piano di continuità post-lancio",
                ].map((v, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-200 text-sm">
                    <span className="text-yellow-400 flex-shrink-0">✓</span>
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA PRINCIPALE */}
      {step === "proposta" && (
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 pb-20 text-center">
            <button
              onClick={handleAccetta}
              className="px-10 py-4 rounded-lg bg-yellow-400 text-slate-900 font-semibold hover:bg-yellow-300 transition"
            >
              Accetta la proposta e firma il contratto
            </button>
            <p className="text-slate-400 text-sm mt-3">
              Dopo la firma scegli come pagare. Il team ti contatta entro 24 ore.
            </p>
          </div>
        </section>
      )}

      {/* CONTRATTO INLINE */}
      {(step === "contratto" || step === "pagamento" || step === "documenti" || step === "conferma") && (
        <section ref={contractRef} className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <ContrattoInline
              proposta={proposta}
              onFirma={handleFirma}
              firmato={!!proposta.contratto_firmato_at}
            />
          </div>
        </section>
      )}

      {/* PAGAMENTO */}
      {step === "pagamento" && (
        <section ref={paymentRef} className="bg-white">
          <div className="mx-auto max-w-2xl px-6 py-12">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
              Contratto firmato — ora completa il pagamento
            </h2>
            <p className="text-slate-600 mb-8">Scegli come pagare:</p>

            <div className="space-y-3">
              <button
                onClick={handleStripe}
                className="w-full bg-slate-900 text-yellow-400 font-semibold py-4 px-6 rounded-lg hover:bg-slate-800 transition"
              >
                Paga con carta — sicuro e immediato
              </button>
              <button
                onClick={handleBonifico}
                className="w-full bg-white text-slate-800 font-semibold py-4 px-6 rounded-lg border border-gray-300 hover:border-slate-400 transition"
              >
                Paga con bonifico bancario
              </button>
            </div>

            {paymentMethod === "bonifico" && bonifico && (
              <div className="mt-6 bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-slate-900 mb-4">Coordinate bancarie</h3>
                <div className="space-y-1 text-sm">
                  <Row label="Beneficiario" value={bonifico.beneficiario} />
                  {bonifico.indirizzo_beneficiario && <Row label="Indirizzo" value={bonifico.indirizzo_beneficiario} />}
                  <Row label="Banca" value={bonifico.banca} />
                  {bonifico.paese_banca && <Row label="Paese banca" value={bonifico.paese_banca} />}
                  <Row label="IBAN" value={bonifico.iban} mono />
                  {bonifico.bic && <Row label="BIC/SWIFT" value={bonifico.bic} mono />}
                  <Row label="Causale" value={bonifico.causale} />
                  <Row label="Importo" value={corrisFormat} />
                </div>
                <div className="mt-6">
                  <label className="block cursor-pointer">
                    <span className="inline-flex items-center gap-2 bg-slate-900 text-yellow-400 px-5 py-2.5 rounded-lg hover:bg-slate-800 transition text-sm font-medium">
                      {uploading ? "Caricamento…" : "Carica distinta pagamento"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleUploadDistinta}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* UPLOAD DOCUMENTI — pre-onboarding */}
      {step === "documenti" && (
        <section className="bg-white">
          <div className="mx-auto max-w-2xl px-6 py-12">
            {stripeConfirming ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto mb-5 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
                <h2 className="text-xl font-semibold text-slate-900 mb-1">
                  Stiamo confermando il pagamento…
                </h2>
                <p className="text-slate-500">Attendi qualche secondo.</p>
              </div>
            ) : (
              <DocumentiUpload onUpload={handleUploadDocumenti} uploading={uploading} />
            )}
          </div>
        </section>
      )}

      {/* CONFERMA FINALE */}
      {step === "conferma" && (
        <section className="bg-white">
          <div className="mx-auto max-w-2xl px-6 py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-yellow-400 flex items-center justify-center text-slate-900 text-2xl font-semibold">
              ✓
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-6 leading-tight">
              Sei ufficialmente un partner Evolution PRO.
            </h2>
            <div className="text-left bg-gray-50 rounded-2xl p-6 space-y-3 text-slate-700 border border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 font-semibold">1.</span> Riceverai una email con il contratto firmato in allegato.
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 font-semibold">2.</span> Valentina ti contatterà nelle prossime 24 ore.
              </div>
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 font-semibold">3.</span> Riceverai le credenziali di accesso alla piattaforma.
              </div>
            </div>
            {partnerAttivato && (
              <a
                href="https://www.ciak.io/partner"
                className="inline-block mt-6 px-8 py-3 rounded-lg bg-slate-900 text-yellow-400 font-semibold hover:bg-slate-800 transition"
              >
                Accedi alla tua area partner
              </a>
            )}
          </div>
        </section>
      )}

      {step !== "conferma" && proposta?.partner_id && (
        <ContractChat partnerId={proposta.partner_id} />
      )}

      <CiakFooter />
    </>
  );
}

/* ── Sub-componenti ─────────────────────────────────────────────── */

/**
 * Floating chatbot di assistenza contrattuale per il flusso pre-pagamento.
 * Backend: POST /api/contract/chat (Claude Haiku 4.5, FAQ pre-cablate su
 * LLC americana, Revolut, reverse charge, rimborso, esclusiva, €2.790+10%).
 * Endpoint pubblico, non richiede auth — usa partner_id dalla proposta.
 */
function ContractChat({ partnerId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const r = await fetch(`/api/contract/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          message: text,
          conversation_history: messages.slice(-6),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            data.reply ||
            "Non sono riuscita a rispondere. Scrivi a assistenza@evolution-pro.it",
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Errore di connessione. Riprova tra qualche secondo o scrivi a assistenza@evolution-pro.it",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const faqSuggestions = [
    "Cos'è una LLC americana?",
    "Perché il pagamento va su Revolut?",
    "Cosa significa reverse charge?",
    "Posso avere un rimborso?",
    "In cosa consiste l'esclusiva?",
    "Pago €2.790 E il 10%?",
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-yellow-400 text-slate-900 shadow-2xl z-50 flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Apri assistente contrattuale"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 flex flex-col" style={{ maxHeight: "70vh" }}>
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Assistente Contrattuale</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/70 hover:text-white text-xl leading-none"
          aria-label="Chiudi"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 min-h-[240px]">
        {messages.length === 0 && (
          <div className="py-2">
            <p className="text-xs text-center text-slate-500 mb-3">
              Domande frequenti — clicca per la risposta:
            </p>
            <div className="flex flex-col gap-1.5">
              {faqSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-slate-700 hover:border-yellow-400 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-yellow-400 text-slate-900"
                  : "bg-white text-slate-800 border border-gray-200"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 text-sm bg-white border border-gray-200 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Sto pensando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-2 flex gap-2 border-t border-gray-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Scrivi una domanda…"
          className="flex-1 rounded-lg px-3 py-2 text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-yellow-400"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-lg bg-yellow-400 text-slate-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Invia"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ProgressBar({ step }) {
  const steps = ["proposta", "contratto", "pagamento", "documenti", "conferma"];
  const labels = ["Proposta", "Contratto", "Pagamento", "Documenti", "Completato"];
  const idx = steps.indexOf(step);
  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="mx-auto max-w-4xl px-6 py-3 flex items-center justify-end">
        <div className="hidden sm:flex items-center gap-1">
          {labels.map((l, i) => (
            <div key={l} className="flex items-center">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  i <= idx ? "bg-slate-900 text-yellow-400" : "bg-gray-100 text-slate-400"
                }`}
              >
                {l}
              </span>
              {i < labels.length - 1 && (
                <div className={`w-5 h-0.5 ${i < idx ? "bg-slate-900" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-200 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className={`font-medium text-slate-900 ${mono ? "font-mono tracking-wide" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function ContrattoInline({ proposta, onFirma, firmato }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [contractText, setContractText] = useState("");

  useEffect(() => {
    fetch(`/api/contract/text/${proposta.partner_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.html) setContractText(d.html);
      })
      .catch(() => {});
  }, [proposta.partner_id]);

  const coords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top,
    };
  };

  const startDraw = (e) => {
    if (firmato) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = coords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing || firmato) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = coords(e, canvas);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0F172A";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDraw = () => setDrawing(false);
  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const submitFirma = () => {
    onFirma(canvasRef.current.toDataURL("image/png"));
  };

  if (firmato) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
        <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-yellow-400 flex items-center justify-center text-slate-900 font-semibold">
          ✓
        </div>
        <p className="font-semibold text-slate-900">Contratto firmato</p>
        <p className="text-slate-500 text-sm">
          Firmato il {new Date(proposta.contratto_firmato_at).toLocaleDateString("it-IT")}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-slate-900 text-white px-6 py-4">
        <h2 className="font-semibold text-lg">Contratto di Partnership</h2>
        <p className="text-slate-400 text-sm">Leggi attentamente e firma in basso.</p>
      </div>
      <div
        className="p-6 max-h-[500px] overflow-y-auto text-sm leading-relaxed text-slate-700"
        dangerouslySetInnerHTML={{ __html: contractText || "<p>Caricamento testo contratto…</p>" }}
      />
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300"
          />
          <span className="text-sm text-slate-700">
            Dichiaro di aver letto e accettato le clausole vessatorie ai sensi degli artt. 1341 e
            1342 c.c.
          </span>
        </label>
        <p className="text-sm text-slate-500 mb-3">Firma qui sotto:</p>
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
          {!hasSigned && (
            <p className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none">
              Disegna la tua firma
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={submitFirma}
            disabled={!hasSigned || !accepted}
            className="bg-yellow-400 text-slate-900 font-semibold px-8 py-3 rounded-lg hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Firma il contratto
          </button>
          <button onClick={clearSig} className="text-slate-500 hover:text-slate-700 text-sm">
            Cancella firma
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentiUpload({ onUpload, uploading }) {
  const [files, setFiles] = useState([]);
  const handleFile = (e, idx) => {
    const f = e.target.files[0];
    if (!f) return;
    setFiles((prev) => {
      const n = [...prev];
      n[idx] = f;
      return n;
    });
  };
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">Documenti necessari</h2>
      <p className="text-slate-600 mb-6">
        Carica un documento di identità valido (carta d'identità o passaporto):
      </p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {["Fronte", "Retro"].map((label, i) => (
          <label
            key={label}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center cursor-pointer hover:border-slate-400 transition"
          >
            <p className="text-sm font-medium text-slate-700">
              {files[i] ? files[i].name : label}
            </p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF — max 5MB</p>
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => handleFile(e, i)}
            />
          </label>
        ))}
      </div>
      <button
        onClick={() => onUpload(files.filter(Boolean))}
        disabled={files.filter(Boolean).length === 0 || uploading}
        className="w-full bg-slate-900 text-yellow-400 font-semibold py-3 rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        {uploading ? "Caricamento…" : "Completa la registrazione"}
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <>
      <CiakHeader />
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <div className="w-10 h-10 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
      </div>
      <CiakFooter />
    </>
  );
}

function ErrorScreen({ type }) {
  return (
    <>
      <CiakHeader />
      <div className="min-h-[60vh] flex items-center justify-center bg-white">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {type === "scaduta" ? "Proposta scaduta" : "Link non valido"}
          </h2>
          <p className="text-slate-500">
            {type === "scaduta"
              ? "Questa proposta è scaduta. Scrivi a assistenza@evolution-pro.it per un nuovo link."
              : "Questo link non è più valido. Scrivi a assistenza@evolution-pro.it per ricevere un nuovo link."}
          </p>
        </div>
      </div>
      <CiakFooter />
    </>
  );
}
