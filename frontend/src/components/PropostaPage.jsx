import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

const FASI = [
  { num: 1, titolo: "Posizionamento", desc: "La tua identita di brand e nicchia" },
  { num: 2, titolo: "Masterclass", desc: "Il tuo primo strumento di acquisizione" },
  { num: 3, titolo: "Videocorso", desc: "Il prodotto principale che scala" },
  { num: 4, titolo: "Funnel", desc: "Il sistema automatico che porta clienti" },
  { num: 5, titolo: "Lancio", desc: "La campagna che genera i primi ricavi" },
  { num: 6, titolo: "Ottimizzazione", desc: "I numeri che migliorano ad ogni ciclo" },
  { num: 7, titolo: "Continuita", desc: "Il piano che mantiene tutto attivo" },
];

const TEAM = [
  { nome: "VALENTINA", ruolo: "Strategia e Onboarding", color: "#e94560" },
  { nome: "ANDREA", ruolo: "Produzione Contenuti", color: "#3b82f6" },
  { nome: "MARCO", ruolo: "Accountability", color: "#f59e0b" },
  { nome: "GAIA", ruolo: "Supporto Tecnico", color: "#10b981" },
  { nome: "STEFANIA", ruolo: "Coordinatrice", color: "#8b5cf6" },
  { nome: "CLAUDIO", ruolo: "Direzione", color: "#1a1a2e" },
];

const TESTIMONIANZE = [
  { testo: "In 3 mesi ho lanciato il mio primo videocorso e generato i primi ricavi online. Non pensavo fosse possibile cosi in fretta.", nome: "Marco R.", ruolo: "Business Coach" },
  { testo: "Il team mi ha guidato passo per passo. Non mi sono mai sentita sola nel processo. Professionalita e umanita.", nome: "Sara L.", ruolo: "Consulente Marketing" },
  { testo: "Avevo provato da solo per un anno senza risultati. Con Evolution PRO ho ottenuto piu in 2 mesi che in 12 mesi da solo.", nome: "Luca T.", ruolo: "Formatore" },
];

export default function PropostaPage({ token }) {
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
    // Check return from Stripe
    const pg = searchParams.get("pagamento");
    const sid = searchParams.get("session_id");
    if (pg === "successo" && sid) {
      // Call backend to confirm payment + promote to partner
      confirmStripePayment(sid);
    } else if (pg === "annullato") {
      toast.error("Pagamento annullato. Puoi riprovare.");
    }
  }, [token]);

  const confirmStripePayment = async (sessionId) => {
    setStripeConfirming(true);
    setStep("documenti");
    try {
      const res = await fetch(`${API}/api/proposta/${token}/conferma-stripe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      const data = await res.json();
      if (data.success) {
        setPartnerAttivato(true);
        toast.success("Pagamento confermato! Benvenuto in Evolution PRO!");
        // Aggiorna l'utente in localStorage se loggato
        try {
          const user = JSON.parse(localStorage.getItem("user") || "{}");
          if (user.id || user.user_id) {
            user.role = "partner";
            user.partnership_pagata = true;
            localStorage.setItem("user", JSON.stringify(user));
          }
        } catch(e) {}
      } else {
        toast.success("Pagamento ricevuto! Verrà confermato a breve.");
      }
    } catch (e) {
      console.error("Conferma stripe error:", e);
      // Non bloccare il flusso anche se il backend fallisce
      toast.success("Pagamento ricevuto! Stiamo elaborando la conferma.");
    }
    setStripeConfirming(false);
  };

  const fetchProposta = async () => {
    try {
      const res = await fetch(`${API}/api/proposta/${token}`);
      if (res.status === 404) { setError("not_found"); setLoading(false); return; }
      if (res.status === 410) { setError("scaduta"); setLoading(false); return; }
      if (!res.ok) throw new Error("Errore caricamento");
      const data = await res.json();
      setProposta(data);

      // Determine current step based on state
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
      await fetch(`${API}/api/proposta/${token}/accetta`, { method: "POST" });
      setStep("contratto");
      setProposta(p => ({ ...p, accettato_at: new Date().toISOString() }));
      setTimeout(() => contractRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    } catch (e) {
      toast.error("Errore nell'accettazione");
    }
  };

  const handleFirma = async (signatureBase64) => {
    try {
      const res = await fetch(`${API}/api/proposta/${token}/firma-contratto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_base64: signatureBase64,
          clausole_vessatorie_approved: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProposta(p => ({ ...p, contratto_firmato_at: data.signed_at }));
        setStep("pagamento");
        toast.success("Contratto firmato! Riceverai una copia via email.");
        setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
      }
    } catch (e) {
      toast.error("Errore nella firma");
    }
  };

  const handleStripe = async () => {
    try {
      const res = await fetch(`${API}/api/proposta/${token}/pagamento-stripe`, {
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
      const res = await fetch(`${API}/api/proposta/${token}/scelta-bonifico`, { method: "POST" });
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
      const res = await fetch(`${API}/api/proposta/${token}/upload-distinta`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success("Distinta caricata! Verificheremo il pagamento.");
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
      files.forEach(f => fd.append("files", f));
      const res = await fetch(`${API}/api/proposta/${token}/upload-documenti`, { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        toast.success("Documenti caricati! Registrazione completata.");
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
    <div className="min-h-screen bg-white" data-testid="proposta-page">
      {/* Progress Bar */}
      <ProgressBar step={step} />

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)" }}>
        <div className="max-w-[860px] mx-auto px-6 py-20 md:py-28 text-white">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6" data-testid="hero-title">
            Hai la competenza.<br />Manca solo il sistema per monetizzarla.
          </h1>
          <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-[700px]">
            Evolution PRO costruisce con te — passo dopo passo — il business online che trasforma quello che sai in revenue ricorrente.
            Con un team dedicato. Senza lasciartelo fare da solo.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10" style={{ background: "radial-gradient(circle at 70% 30%, rgba(233,69,96,0.4), transparent 60%)" }} />
      </section>

      {/* ANALISI PERSONALIZZATA */}
      {(proposta.analisi_posizionamento || proposta.analisi_punti_forza?.length > 0) && (
        <section className="max-w-[860px] mx-auto px-6 py-12">
          <div className="bg-[#f0f4ff] border-l-4 border-[#1a1a2e] rounded-r-xl p-8" data-testid="analisi-section">
            <p className="text-lg font-medium text-gray-900 mb-4">
              {proposta.prospect_nome}, nella nostra call abbiamo identificato:
            </p>
            {proposta.analisi_posizionamento && (
              <p className="text-gray-700 mb-3">{proposta.analisi_posizionamento}</p>
            )}
            {proposta.analisi_punti_forza?.length > 0 && (
              <ul className="space-y-2 mb-4">
                {proposta.analisi_punti_forza.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-[#1a1a2e] font-bold mt-0.5">•</span> {p}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-gray-900 font-semibold">Il quadro e chiaro. Il momento e adesso.</p>
            {proposta.analisi_pdf_url && (
              <a href={proposta.analisi_pdf_url} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-4 text-[#1a1a2e] font-medium underline hover:text-[#e94560] transition-colors"
                data-testid="download-analisi-btn">
                Scarica la tua Analisi Strategica completa
              </a>
            )}
          </div>
        </section>
      )}

      {/* PAS - Il Problema */}
      <section className="max-w-[860px] mx-auto px-6 py-12">
        <div className="max-w-[700px]">
          <p className="text-lg text-gray-800 leading-relaxed mb-4">
            Sai gia cosa fare nel tuo campo. Hai anni di esperienza, clienti soddisfatti, risultati reali.
          </p>
          <p className="text-lg text-gray-800 leading-relaxed mb-4">
            Eppure a fine mese i numeri non rispecchiano quello che vali.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            Il problema non sei tu. E che nessuno ti ha mai dato un sistema strutturato per trasformare la tua competenza in un prodotto che si vende mentre dormi.
          </p>
          <p className="text-lg text-gray-900 font-semibold">
            Puoi continuare a vendere ore. Oppure costruire qualcosa che scala.
          </p>
        </div>
      </section>

      {/* COSA SUCCEDE ADESSO - 3 Card */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-[860px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8">Cosa succede adesso</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: "1", title: "Firma il contratto", desc: "Rivedi i termini e firma digitalmente in meno di 2 minuti." },
              { num: "2", title: "Completa il pagamento", desc: "Carta di credito o bonifico bancario — scegli tu." },
              { num: "3", title: "Accesso immediato", desc: "Il team ti contatta entro 24 ore. Parte il tuo percorso." },
            ].map((c) => (
              <div key={c.num} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-bold text-lg mb-4">{c.num}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-gray-600 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IL PERCORSO - 7 Fasi Timeline */}
      <section className="max-w-[860px] mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-10">Il percorso — 7 fasi</h2>
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />
          {FASI.map((f) => (
            <div key={f.num} className="relative flex items-start gap-6 mb-8">
              <div className="relative z-10 w-10 h-10 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center font-bold flex-shrink-0">{f.num}</div>
              <div>
                <h3 className="font-semibold text-gray-900">{f.titolo}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IL TEAM */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-[860px] mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Non hai un tutor. Hai un team.</h2>
          <p className="text-gray-500 mb-8">6 professionisti dedicati al tuo successo</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TEAM.map((t) => (
              <div key={t.nome} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-3" style={{ backgroundColor: t.color }}>
                  {t.nome[0]}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{t.nome}</h3>
                <p className="text-gray-500 text-xs">{t.ruolo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIANZE */}
      <section className="max-w-[860px] mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-8">Cosa dicono i partner</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIANZE.map((t, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <p className="text-gray-700 italic mb-4 text-sm leading-relaxed">"{t.testo}"</p>
              <p className="font-semibold text-gray-900 text-sm">{t.nome}</p>
              <p className="text-gray-500 text-xs">{t.ruolo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* L'INVESTIMENTO */}
      <section className="max-w-[860px] mx-auto px-6 py-16">
        <div className="max-w-[500px] mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden" data-testid="investimento-box">
          <div className="h-1 bg-[#1a1a2e]" />
          <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Partnership Evolution PRO</h2>
            <p className="text-4xl font-bold text-[#1a1a2e] mb-1">{corrisFormat}</p>
            <p className="text-gray-500 text-sm mb-6">IVA inclusa</p>
            <div className="text-left space-y-3">
              {["Tutte e 7 le fasi del percorso", "Supporto diretto del team completo", "Accesso alla piattaforma Evolution PRO", "Strumenti AI inclusi", "Piano di continuita post-lancio"].map((v, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-700 text-sm">
                  <svg className="w-5 h-5 text-[#10b981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA PRINCIPALE */}
      {step === "proposta" && (
        <section className="max-w-[860px] mx-auto px-6 pb-20 text-center">
          <button onClick={handleAccetta}
            className="bg-[#e94560] hover:bg-[#d63852] text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            data-testid="accetta-proposta-btn">
            Accetta la proposta e firma il contratto
          </button>
          <p className="text-gray-400 text-sm mt-3">Dopo la firma scegli come pagare. Il team ti contatta entro 24 ore.</p>
        </section>
      )}

      {/* CONTRATTO INLINE */}
      {(step === "contratto" || step === "pagamento" || step === "documenti" || step === "conferma") && (
        <section ref={contractRef} className="max-w-[860px] mx-auto px-6 py-12" data-testid="contratto-section">
          <ContrattoInline
            token={token}
            proposta={proposta}
            onFirma={handleFirma}
            firmato={!!proposta.contratto_firmato_at}
          />
        </section>
      )}

      {/* PAGAMENTO */}
      {(step === "pagamento") && (
        <section ref={paymentRef} className="max-w-[860px] mx-auto px-6 py-12" data-testid="pagamento-section">
          <div className="max-w-[600px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <svg className="w-7 h-7 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <h2 className="text-xl font-bold text-gray-900">Contratto firmato — ora completa il pagamento</h2>
            </div>
            <p className="text-gray-600 mb-8">Scegli come pagare:</p>

            <div className="space-y-4">
              <button onClick={handleStripe}
                className="w-full bg-[#1a1a2e] hover:bg-[#2d2d44] text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
                data-testid="paga-stripe-btn">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                Paga con carta — sicuro e immediato
              </button>

              <button onClick={handleBonifico}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-xl border-2 border-gray-200 flex items-center justify-center gap-3 transition-colors"
                data-testid="paga-bonifico-btn">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Paga con bonifico bancario
              </button>
            </div>

            {/* Dettagli Bonifico */}
            {paymentMethod === "bonifico" && bonifico && (
              <div className="mt-6 bg-[#f0f4ff] rounded-xl p-6 border border-blue-100" data-testid="bonifico-details">
                <h3 className="font-semibold text-gray-900 mb-4">Coordinate bancarie</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Beneficiario" value={bonifico.beneficiario} />
                  <Row label="Banca" value={bonifico.banca} />
                  <Row label="IBAN" value={bonifico.iban} mono />
                  <Row label="Causale" value={bonifico.causale} />
                  <Row label="Importo" value={corrisFormat} />
                </div>
                <div className="mt-6">
                  <label className="block cursor-pointer">
                    <span className="inline-flex items-center gap-2 bg-[#1a1a2e] text-white px-5 py-2.5 rounded-lg hover:bg-[#2d2d44] transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      {uploading ? "Caricamento..." : "Carica distinta pagamento"}
                    </span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadDistinta} disabled={uploading} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* UPLOAD DOCUMENTI */}
      {step === "documenti" && (
        <section className="max-w-[860px] mx-auto px-6 py-12" data-testid="documenti-section">
          {stripeConfirming ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FFD24D]/20 flex items-center justify-center">
                <svg className="w-8 h-8 animate-spin text-[#D4A017]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Stiamo confermando il tuo pagamento...</h2>
              <p className="text-gray-500">Attendere qualche secondo</p>
            </div>
          ) : (
            <DocumentiUpload onUpload={handleUploadDocumenti} uploading={uploading} prospectNome={proposta.prospect_nome} />
          )}
        </section>
      )}

      {/* CONFERMA FINALE */}
      {step === "conferma" && (
        <section className="max-w-[860px] mx-auto px-6 py-16" data-testid="conferma-section">
          <div className="max-w-[600px] mx-auto text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#10b981]/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Perfetto — sei ufficialmente un partner Evolution PRO</h2>
            <div className="text-left bg-gray-50 rounded-xl p-6 space-y-4 text-gray-700">
              <div className="flex items-start gap-3"><span className="text-[#1a1a2e] font-bold">1.</span> Riceverai una email con il contratto firmato in allegato</div>
              <div className="flex items-start gap-3"><span className="text-[#1a1a2e] font-bold">2.</span> VALENTINA ti contatterà nelle prossime 24 ore</div>
              <div className="flex items-start gap-3"><span className="text-[#1a1a2e] font-bold">3.</span> Riceverai le credenziali di accesso alla piattaforma</div>
            </div>
            {partnerAttivato && (
              <button
                data-testid="go-to-dashboard"
                onClick={() => window.location.href = "/"}
                className="mt-6 px-8 py-3 rounded-xl text-sm font-bold"
                style={{ background: "#FFD24D", color: "#1A1F24" }}
              >
                Accedi alla tua Dashboard
              </button>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-[860px] mx-auto px-6 text-center text-gray-400 text-sm">
          <p>Evolution PRO LLC — 8 The Green, Ste A, Dover, DE 19901, USA</p>
          <p className="mt-1">info@evolution-pro.it</p>
        </div>
      </footer>
    </div>
  );
}


/* ── Sub-components ─────────────────────────────── */

function ProgressBar({ step }) {
  const steps = ["proposta", "contratto", "pagamento", "documenti", "conferma"];
  const labels = ["Proposta", "Contratto", "Pagamento", "Documenti", "Completato"];
  const idx = steps.indexOf(step);
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-[860px] mx-auto px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-[#1a1a2e] text-lg">Evolution PRO</span>
        <div className="hidden sm:flex items-center gap-1">
          {labels.map((l, i) => (
            <div key={l} className="flex items-center">
              <span className={`text-xs px-2 py-1 rounded-full ${i <= idx ? "bg-[#1a1a2e] text-white" : "bg-gray-100 text-gray-400"}`}>{l}</span>
              {i < labels.length - 1 && <div className={`w-6 h-0.5 ${i < idx ? "bg-[#1a1a2e]" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-gray-900 ${mono ? "font-mono tracking-wide" : ""}`}>{value}</span>
    </div>
  );
}

function ContrattoInline({ token, proposta, onFirma, firmato }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [contractText, setContractText] = useState("");

  useEffect(() => {
    fetch(`${API}/api/contract/text/${proposta.partner_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.html) setContractText(d.html); })
      .catch(() => {});
  }, [proposta.partner_id]);

  const startDraw = (e) => {
    if (firmato) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing || firmato) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a2e";
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
    const sig = canvasRef.current.toDataURL("image/png");
    onFirma(sig);
  };

  if (firmato) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        <p className="font-semibold text-green-800">Contratto firmato</p>
        <p className="text-green-600 text-sm">Firmato il {new Date(proposta.contratto_firmato_at).toLocaleDateString("it-IT")}</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-[#1a1a2e] text-white px-6 py-4">
        <h2 className="font-bold text-lg">Contratto di Partnership</h2>
        <p className="text-gray-400 text-sm">Leggi attentamente e firma in basso</p>
      </div>
      <div className="p-6 max-h-[500px] overflow-y-auto text-sm leading-relaxed text-gray-700"
        dangerouslySetInnerHTML={{ __html: contractText || "<p>Caricamento testo contratto...</p>" }} />
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1a1a2e] focus:ring-[#1a1a2e]"
            data-testid="clausole-checkbox" />
          <span className="text-sm text-gray-700">
            Dichiaro di aver letto e accettato le clausole vessatorie ai sensi degli artt. 1341 e 1342 c.c.
          </span>
        </label>
        <p className="text-sm text-gray-500 mb-3">Firma qui sotto:</p>
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <canvas ref={canvasRef} width={400} height={150}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
          {!hasSigned && <p className="absolute inset-0 flex items-center justify-center text-gray-300 pointer-events-none">Disegna la tua firma</p>}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={submitFirma} disabled={!hasSigned || !accepted}
            className="bg-[#e94560] hover:bg-[#d63852] disabled:bg-gray-300 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            data-testid="firma-contratto-btn">
            Firma il contratto
          </button>
          <button onClick={clearSig} className="text-gray-500 hover:text-gray-700 text-sm">Cancella firma</button>
        </div>
      </div>
    </div>
  );
}

function DocumentiUpload({ onUpload, uploading, prospectNome }) {
  const [files, setFiles] = useState([]);
  const handleFile = (e, idx) => {
    const f = e.target.files[0];
    if (!f) return;
    setFiles(prev => {
      const n = [...prev];
      n[idx] = f;
      return n;
    });
  };
  return (
    <div className="max-w-[600px] mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Documenti necessari</h2>
      <p className="text-gray-600 mb-6">Carica un documento di identita valido (carta d'identita o passaporto):</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {["Fronte", "Retro"].map((label, i) => (
          <label key={label} className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-[#1a1a2e] transition-colors">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="text-sm font-medium text-gray-700">{files[i] ? files[i].name : label}</p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max 5MB</p>
            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={e => handleFile(e, i)} />
          </label>
        ))}
      </div>
      <button onClick={() => onUpload(files.filter(Boolean))} disabled={files.filter(Boolean).length === 0 || uploading}
        className="w-full bg-[#10b981] hover:bg-[#059669] disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition-colors"
        data-testid="completa-registrazione-btn">
        {uploading ? "Caricamento..." : "Completa la registrazione"}
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1a1a2e]" />
    </div>
  );
}

function ErrorScreen({ type }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {type === "scaduta" ? "Proposta scaduta" : "Link non valido"}
        </h2>
        <p className="text-gray-500">
          {type === "scaduta"
            ? "Questa proposta e scaduta. Contatta info@evolution-pro.it per un nuovo link."
            : "Questo link non e piu valido. Scrivi a info@evolution-pro.it per ricevere un nuovo link."}
        </p>
      </div>
    </div>
  );
}
