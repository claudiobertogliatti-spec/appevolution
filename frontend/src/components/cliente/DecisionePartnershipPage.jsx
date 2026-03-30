import React, { useState, useEffect } from "react";
import { 
  FileText, Download, CheckCircle, Upload, CreditCard, 
  Loader2, AlertCircle, ChevronRight, Shield, Clock,
  FileCheck, Building, Landmark, Copy, Check, X,
  Eye, Calendar, Star, ArrowRight, Sparkles, Lock
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// Configurazione sezioni
const SEZIONI = [
  { id: "analisi", label: "Analisi Strategica", icon: FileText, color: "#8B5CF6" },
  { id: "roadmap", label: "Roadmap Progetto", icon: Calendar, color: "#3B82F6" },
  { id: "proposta", label: "Proposta Partnership", icon: Star, color: "#F5C518" },
  { id: "contratto", label: "Contratto", icon: FileCheck, color: "#22C55E" },
  { id: "documenti", label: "I miei File", icon: Upload, color: "#F97316" },
  { id: "pagamento", label: "Pagamento", icon: CreditCard, color: "#10B981" }
];

// IBAN per bonifico
const IBAN_INFO = {
  intestatario: "Evolution PRO di Claudio Bertogliatti",
  iban: "IT60J3608105138261222222222",
  bic: "REVOLT21",
  banca: "Revolut",
  causale: "Partnership Evolution PRO - [NOME COGNOME]"
};

export function DecisionePartnershipPage({ user, onLogout, demoData }) {
  const [loading, setLoading] = useState(!demoData);
  const [data, setData] = useState(demoData || null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState("analisi");

  // Stati per azioni
  const [signingContract, setSigningContract] = useState(false);
  const [contractAccepted, setContractAccepted] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [uploadingRicevuta, setUploadingRicevuta] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [activatingPartnership, setActivatingPartnership] = useState(false);

  useEffect(() => {
    if (demoData) return;
    if (user?.id) {
      loadDecisioneData();
    }
  }, [user?.id]);

  const loadDecisioneData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/decisione/${user.id}`);
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setError("La fase decisione non è ancora attivata. L'admin deve attivare questa fase dopo la call strategica.");
        } else {
          setError(result.detail || "Errore nel caricamento dei dati");
        }
        return;
      }
      
      setData(result);
      setContractAccepted(result.contratto_firmato || false);
    } catch (e) {
      console.error("Error loading decisione data:", e);
      setError("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  };

  // Firma contratto
  const handleFirmaContratto = async () => {
    if (!contractAccepted) {
      alert("Devi accettare i termini del contratto");
      return;
    }
    
    setSigningContract(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/firma-contratto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          accettato: true,
          ip_address: null
        })
      });
      
      const result = await response.json();
      if (result.success) {
        await loadDecisioneData();
        setActiveSection("documenti");
      } else {
        alert(result.detail || "Errore nella firma del contratto");
      }
    } catch (e) {
      console.error("Error signing contract:", e);
      alert("Errore nella firma del contratto");
    } finally {
      setSigningContract(false);
    }
  };

  // Upload documento
  const handleUploadDocumento = async (tipo, file) => {
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo_documento", tipo);
      
      const response = await fetch(`${API}/api/flusso-analisi/upload-documento/${user.id}`, {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        await loadDecisioneData();
      } else {
        alert(result.detail || "Errore nel caricamento del documento");
      }
    } catch (e) {
      console.error("Error uploading document:", e);
      alert("Errore nel caricamento del documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Crea sessione Stripe
  const handlePagamentoStripe = async () => {
    setCreatingPayment(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/create-payment-session/${user.id}`, {
        method: "POST"
      });
      
      const result = await response.json();
      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        alert(result.detail || "Errore nella creazione del pagamento");
      }
    } catch (e) {
      console.error("Error creating payment:", e);
      alert("Errore nella creazione del pagamento");
    } finally {
      setCreatingPayment(false);
    }
  };

  // Copia IBAN
  const handleCopyIban = () => {
    navigator.clipboard.writeText(IBAN_INFO.iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  // Attiva partnership
  const handleAttivaPartnership = async () => {
    if (!data?.can_activate) {
      alert("Completa tutti i passaggi per attivare la partnership");
      return;
    }
    
    setActivatingPartnership(true);
    try {
      const response = await fetch(`${API}/api/flusso-analisi/attiva-partnership/${user.id}`, {
        method: "POST"
      });
      
      const result = await response.json();
      if (result.success) {
        alert("🎉 Partnership attivata con successo! Benvenuto in Evolution PRO!");
        window.location.href = "/partner/dashboard";
      } else {
        alert(result.detail || "Errore nell'attivazione della partnership");
      }
    } catch (e) {
      console.error("Error activating partnership:", e);
      alert("Errore nell'attivazione della partnership");
    } finally {
      setActivatingPartnership(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#F5C518" }} />
          <p style={{ color: "#5F6572" }}>Caricamento dati...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#FAFAF7" }}>
        <div className="max-w-md w-full p-8 rounded-2xl text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <Lock className="w-16 h-16 mx-auto mb-4" style={{ color: "#EF4444" }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: "#991B1B" }}>Accesso Non Disponibile</h2>
          <p className="text-sm mb-6" style={{ color: "#B91C1C" }}>{error}</p>
          <button
            onClick={() => window.location.href = "/dashboard-cliente"}
            className="px-6 py-3 rounded-xl font-medium transition-colors hover:opacity-90"
            style={{ background: "#EF4444", color: "#FFFFFF" }}
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ background: "#1E2128" }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#FFFFFF" }}>
                Decisione Partnership
              </h1>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                {data?.cliente?.nome} {data?.cliente?.cognome}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl" style={{ background: "#F5C51820" }}>
                <span className="text-sm font-bold" style={{ color: "#F5C518" }}>€2.790</span>
                <span className="text-xs ml-1" style={{ color: "#9CA3AF" }}>una tantum</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/10"
                  style={{ color: "#9CA3AF" }}
                >
                  Esci
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8 p-6 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: "#1E2128" }}>Il tuo percorso verso la Partnership</h3>
            <span className="text-sm" style={{ color: "#5F6572" }}>
              {data?.contratto_firmato && data?.pagamento_completato ? "Pronto per l'attivazione!" : "Completa tutti i passaggi"}
            </span>
          </div>
          <div className="flex gap-2">
            {SEZIONI.map((sezione, idx) => {
              const IconComponent = sezione.icon;
              const isActive = activeSection === sezione.id;
              let isCompleted = false;
              
              if (sezione.id === "analisi") isCompleted = true;
              if (sezione.id === "roadmap") isCompleted = true;
              if (sezione.id === "proposta") isCompleted = true;
              if (sezione.id === "contratto") isCompleted = data?.contratto_firmato;
              if (sezione.id === "documenti") isCompleted = data?.documenti?.length >= 2;
              if (sezione.id === "pagamento") isCompleted = data?.pagamento_completato;
              
              return (
                <button
                  key={sezione.id}
                  onClick={() => setActiveSection(sezione.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? "ring-2 ring-offset-2" : ""}`}
                  style={{ 
                    background: isCompleted ? `${sezione.color}20` : isActive ? sezione.color : "#ECEDEF",
                    color: isCompleted ? sezione.color : isActive ? "#FFFFFF" : "#5F6572",
                    ringColor: sezione.color
                  }}
                  data-testid={`tab-${sezione.id}`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : <IconComponent className="w-4 h-4" />}
                  <span className="hidden md:inline">{sezione.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SEZIONE: Analisi Strategica */}
            {activeSection === "analisi" && data?.analisi && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {data.analisi.titolo || "La tua Analisi Strategica"}
                      </h2>
                      <p className="text-sm text-white/70">
                        Documento preparato da Claudio Bertogliatti
                      </p>
                    </div>
                    <a
                      href={`${API}/api/flusso-analisi/analisi-pdf/${user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}
                      data-testid="btn-download-analisi"
                    >
                      <Download className="w-4 h-4" />
                      Scarica PDF
                    </a>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {Object.entries(data.analisi.sezioni || {}).map(([key, sezione]) => {
                    if (!sezione || typeof sezione !== "object") return null;
                    
                    // Rendering speciale per "costo_modello_attuale"
                    if (key === "costo_modello_attuale") {
                      return (
                        <div key={key} className="p-6 rounded-xl" style={{ background: "#FEF3C7", border: "2px solid #F59E0B" }}>
                          <h4 className="font-bold text-lg mb-3" style={{ color: "#B45309" }}>
                            {sezione.titolo || "Il vero costo di rimanere nel modello attuale"}
                          </h4>
                          <p className="text-sm leading-relaxed mb-4" style={{ color: "#92400E" }}>
                            {sezione.contenuto}
                          </p>
                          
                          {sezione.modello_attuale && (
                            <div className="p-4 rounded-lg mb-4" style={{ background: "rgba(255,255,255,0.7)" }}>
                              <h5 className="font-bold text-sm mb-2" style={{ color: "#B45309" }}>
                                {sezione.modello_attuale.titolo}
                              </h5>
                              <ul className="space-y-1 mb-2">
                                {sezione.modello_attuale.elementi?.map((el, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#92400E" }}>
                                    <span>•</span> {el}
                                  </li>
                                ))}
                              </ul>
                              <p className="text-sm font-medium" style={{ color: "#B45309" }}>
                                ⚠️ {sezione.modello_attuale.limite}
                              </p>
                            </div>
                          )}
                          
                          {sezione.obiettivo_accademia && (
                            <div className="p-4 rounded-lg" style={{ background: "#D1FAE5" }}>
                              <h5 className="font-bold text-sm mb-2" style={{ color: "#065F46" }}>
                                {sezione.obiettivo_accademia.titolo}
                              </h5>
                              <ul className="space-y-1">
                                {sezione.obiettivo_accademia.benefici?.map((ben, i) => (
                                  <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#047857" }}>
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" /> {ben}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Rendering speciale per "valutazione_fattibilita"
                    if (key === "valutazione_fattibilita") {
                      const potenzialeColors = {
                        "Basso": { bg: "#FEE2E2", color: "#DC2626", border: "#FECACA" },
                        "Medio": { bg: "#FEF3C7", color: "#D97706", border: "#FDE68A" },
                        "Alto": { bg: "#D1FAE5", color: "#059669", border: "#A7F3D0" },
                        "Molto Alto": { bg: "#DCFCE7", color: "#16A34A", border: "#86EFAC" }
                      };
                      const potenziale = sezione.livello_potenziale || "Medio";
                      const colors = potenzialeColors[potenziale] || potenzialeColors["Medio"];
                      
                      return (
                        <div key={key} className="p-6 rounded-xl" style={{ background: colors.bg, border: `2px solid ${colors.border}` }}>
                          <h4 className="font-bold text-lg mb-4" style={{ color: colors.color }}>
                            {sezione.titolo || "Esito del Check di Fattibilità"}
                          </h4>
                          
                          {/* Badge Livello Potenziale */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-4xl font-black" style={{ color: colors.color }}>
                                {sezione.punteggio}/10
                              </div>
                              <div className="text-xs font-medium" style={{ color: colors.color }}>Punteggio</div>
                            </div>
                            <div className="px-6 py-3 rounded-xl text-center" style={{ background: colors.color }}>
                              <div className="text-sm font-medium text-white/80">Potenziale Progetto</div>
                              <div className="text-xl font-black text-white">{potenziale}</div>
                            </div>
                          </div>
                          
                          {/* Esito */}
                          <div className="p-4 rounded-lg mb-4" style={{ background: "rgba(255,255,255,0.7)" }}>
                            <div className="font-bold mb-2" style={{ color: "#1E2128" }}>{sezione.esito}</div>
                            <p className="text-sm" style={{ color: "#5F6572" }}>{sezione.motivazione}</p>
                          </div>
                          
                          {/* Punti forza e Aree miglioramento */}
                          <div className="grid grid-cols-2 gap-4">
                            {sezione.punti_forza && (
                              <div className="p-3 rounded-lg" style={{ background: "#D1FAE5" }}>
                                <h5 className="font-bold text-xs uppercase mb-2" style={{ color: "#065F46" }}>Punti di Forza</h5>
                                <ul className="space-y-1">
                                  {sezione.punti_forza.map((pf, i) => (
                                    <li key={i} className="flex items-start gap-1 text-xs" style={{ color: "#047857" }}>
                                      <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {pf}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {sezione.aree_miglioramento && (
                              <div className="p-3 rounded-lg" style={{ background: "#FEF3C7" }}>
                                <h5 className="font-bold text-xs uppercase mb-2" style={{ color: "#B45309" }}>Aree di Miglioramento</h5>
                                <ul className="space-y-1">
                                  {sezione.aree_miglioramento.map((am, i) => (
                                    <li key={i} className="flex items-start gap-1 text-xs" style={{ color: "#D97706" }}>
                                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {am}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    // Rendering standard per le altre sezioni
                    return (
                      <div key={key} className="p-4 rounded-xl" style={{ background: "#FAFAF7" }}>
                        <h4 className="font-bold mb-2" style={{ color: "#8B5CF6" }}>
                          {sezione.titolo || key}
                        </h4>
                        <p className="text-sm leading-relaxed" style={{ color: "#1E2128" }}>
                          {sezione.contenuto}
                        </p>
                        {sezione.lista && (
                          <ul className="mt-3 space-y-1">
                            {sezione.lista.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#22C55E" }} />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {sezione.fasi && (
                          <ul className="mt-3 space-y-1">
                            {sezione.fasi.map((fase, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                                <span className="font-bold">{fase.nome || fase.fase}:</span> {fase.descrizione}
                              </li>
                            ))}
                          </ul>
                        )}
                        {sezione.moduli_suggeriti && (
                          <ul className="mt-3 space-y-1">
                            {sezione.moduli_suggeriti.map((mod, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5F6572" }}>
                                <span className="font-bold">{mod.nome}:</span> {mod.descrizione}
                              </li>
                            ))}
                          </ul>
                        )}
                        {sezione.punteggio && key !== "valutazione_fattibilita" && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-3xl font-black" style={{ color: "#8B5CF6" }}>{sezione.punteggio}</span>
                            <span className="text-lg" style={{ color: "#9CA3AF" }}>/10</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEZIONE: Roadmap */}
            {activeSection === "roadmap" && data?.analisi?.sezioni?.roadmap && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #3B82F6, #1D4ED8)" }}>
                  <h2 className="text-xl font-bold text-white">Roadmap del Progetto</h2>
                  <p className="text-sm text-white/70">Il percorso per creare la tua Accademia Digitale</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    {(data.analisi.sezioni.roadmap.fasi || []).map((fase, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ background: "#3B82F6" }}>
                            {idx + 1}
                          </div>
                          {idx < (data.analisi.sezioni.roadmap.fasi?.length || 0) - 1 && (
                            <div className="w-0.5 flex-1 my-2" style={{ background: "#ECEDEF" }} />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="p-4 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold" style={{ color: "#1D4ED8" }}>{fase.fase}</h4>
                              <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#DBEAFE", color: "#3B82F6" }}>
                                {fase.durata}
                              </span>
                            </div>
                            <p className="text-sm" style={{ color: "#1E40AF" }}>{fase.descrizione}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SEZIONE: Proposta Partnership */}
            {activeSection === "proposta" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #F5C518, #C4990A)" }}>
                  <h2 className="text-xl font-bold" style={{ color: "#1E2128" }}>Partnership Evolution PRO</h2>
                  <p className="text-sm" style={{ color: "#1E212880" }}>Il programma completo per la tua Accademia Digitale</p>
                </div>
                
                <div className="p-6">
                  <div className="text-center mb-8">
                    <div className="inline-block px-6 py-3 rounded-2xl mb-4" style={{ background: "#FFF8DC" }}>
                      <span className="text-4xl font-black" style={{ color: "#1E2128" }}>€2.790</span>
                      <span className="text-lg ml-2" style={{ color: "#5F6572" }}>una tantum</span>
                    </div>
                    <p className="text-sm" style={{ color: "#5F6572" }}>Pagamento unico, accesso completo per 12 mesi</p>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    {[
                      "Posizionamento strategico personalizzato",
                      "Creazione Masterclass di vendita",
                      "Sviluppo Videocorso completo (struttura + revisione)",
                      "Costruzione Funnel automatizzato",
                      "Sequenza email di vendita (6 email)",
                      "Supporto strategico per 12 mesi",
                      "Accesso alla piattaforma Evolution PRO OS",
                      "Call di allineamento mensili",
                      "Community partner esclusiva"
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F0FDF4" }}>
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#22C55E" }} />
                        <span className="text-sm font-medium" style={{ color: "#166534" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setActiveSection("contratto")}
                    className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02]"
                    style={{ background: "linear-gradient(135deg, #F5C518, #C4990A)", color: "#1E2128" }}
                    data-testid="btn-procedi-contratto"
                  >
                    Procedi con il Contratto <ArrowRight className="inline w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
            )}

            {/* SEZIONE: Contratto */}
            {activeSection === "contratto" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">Contratto di Partnership</h2>
                      <p className="text-sm text-white/70">Leggi e accetta i termini</p>
                    </div>
                    <a
                      href={`${API}/api/flusso-analisi/contratto-pdf/${user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors hover:opacity-90"
                      style={{ background: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}
                      data-testid="btn-download-contratto"
                    >
                      <Download className="w-4 h-4" />
                      Scarica PDF
                    </a>
                  </div>
                </div>
                
                <div className="p-6">
                  {data?.contratto_firmato ? (
                    <div className="text-center p-8 rounded-xl" style={{ background: "#F0FDF4" }}>
                      <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#22C55E" }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: "#166534" }}>Contratto Firmato</h3>
                      <p className="text-sm" style={{ color: "#22C55E" }}>
                        Hai accettato i termini il {new Date(data.contratto?.data_firma).toLocaleDateString("it-IT")}
                      </p>
                      <button
                        onClick={() => setActiveSection("documenti")}
                        className="mt-6 px-6 py-3 rounded-xl font-medium transition-colors hover:opacity-90"
                        style={{ background: "#22C55E", color: "#FFFFFF" }}
                      >
                        Continua con i Documenti <ArrowRight className="inline w-4 h-4 ml-2" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 p-4 rounded-xl" style={{ background: "#FAFAF7" }}>
                        <h4 className="font-bold mb-2" style={{ color: "#1E2128" }}>Punti Chiave del Contratto:</h4>
                        <ul className="space-y-2 text-sm" style={{ color: "#5F6572" }}>
                          <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>Durata: 12 mesi dalla data di attivazione</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>Corrispettivo: €2.790 una tantum</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>Proprietà intellettuale: i contenuti creati restano tuoi</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-1">•</span>
                            <span>Foro competente: Milano</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="mb-6">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contractAccepted}
                            onChange={(e) => setContractAccepted(e.target.checked)}
                            className="w-5 h-5 mt-0.5 rounded border-2 cursor-pointer"
                            style={{ accentColor: "#22C55E" }}
                            data-testid="checkbox-contratto"
                          />
                          <span className="text-sm" style={{ color: "#1E2128" }}>
                            Dichiaro di aver letto e accettato i termini e le condizioni del contratto di partnership Evolution PRO. 
                            Confermo che i dati forniti sono corretti e mi impegno a rispettare gli obblighi previsti.
                          </span>
                        </label>
                      </div>
                      
                      <button
                        onClick={handleFirmaContratto}
                        disabled={!contractAccepted || signingContract}
                        className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: contractAccepted ? "#22C55E" : "#9CA3AF", color: "#FFFFFF" }}
                        data-testid="btn-firma-contratto"
                      >
                        {signingContract ? (
                          <><Loader2 className="inline w-5 h-5 animate-spin mr-2" /> Firma in corso...</>
                        ) : (
                          <>Accetta e Firma il Contratto</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SEZIONE: I miei File */}
            {activeSection === "documenti" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}>
                  <h2 className="text-xl font-bold text-white">I miei File</h2>
                  <p className="text-sm text-white/70">Carica i documenti richiesti</p>
                </div>
                
                <div className="p-6 space-y-4">
                  {[
                    { tipo: "carta_identita", label: "Carta d'Identità", desc: "Fronte e retro in un unico file" },
                    { tipo: "codice_fiscale", label: "Codice Fiscale", desc: "Tessera sanitaria o documento" },
                    { tipo: "partita_iva", label: "Partita IVA (opzionale)", desc: "Se fatturi come azienda" }
                  ].map((doc) => {
                    const uploaded = data?.documenti?.find(d => d.tipo === doc.tipo);
                    return (
                      <div key={doc.tipo} className="p-4 rounded-xl" style={{ background: uploaded ? "#F0FDF4" : "#FAFAF7" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium" style={{ color: "#1E2128" }}>{doc.label}</h4>
                            <p className="text-xs" style={{ color: "#5F6572" }}>{doc.desc}</p>
                            {uploaded && (
                              <p className="text-xs mt-1" style={{ color: "#22C55E" }}>
                                <CheckCircle className="inline w-3 h-3 mr-1" />
                                Caricato: {uploaded.nome_file}
                              </p>
                            )}
                          </div>
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  handleUploadDocumento(doc.tipo, e.target.files[0]);
                                }
                              }}
                              className="hidden"
                              data-testid={`upload-${doc.tipo}`}
                            />
                            <span 
                              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                              style={{ background: uploaded ? "#22C55E" : "#F97316", color: "#FFFFFF" }}
                            >
                              {uploadingDoc ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : uploaded ? (
                                <><Check className="w-4 h-4" /> Sostituisci</>
                              ) : (
                                <><Upload className="w-4 h-4" /> Carica</>
                              )}
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                  
                  {data?.documenti?.length >= 2 && (
                    <button
                      onClick={() => setActiveSection("pagamento")}
                      className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02]"
                      style={{ background: "#F97316", color: "#FFFFFF" }}
                    >
                      Continua con il Pagamento <ArrowRight className="inline w-5 h-5 ml-2" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SEZIONE: Pagamento */}
            {activeSection === "pagamento" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
                <div className="p-6" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                  <h2 className="text-xl font-bold text-white">Pagamento Partnership</h2>
                  <p className="text-sm text-white/70">Scegli il metodo di pagamento</p>
                </div>
                
                <div className="p-6">
                  {data?.pagamento_completato ? (
                    <div className="text-center p-8 rounded-xl" style={{ background: "#F0FDF4" }}>
                      <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: "#22C55E" }} />
                      <h3 className="text-xl font-bold mb-2" style={{ color: "#166534" }}>Pagamento Completato</h3>
                      <p className="text-sm mb-6" style={{ color: "#22C55E" }}>
                        {data.pagamento?.metodo === "stripe" ? "Pagato con carta" : "Bonifico ricevuto"}
                      </p>
                      
                      {data.can_activate && (
                        <button
                          onClick={handleAttivaPartnership}
                          disabled={activatingPartnership}
                          className="px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50"
                          style={{ background: "linear-gradient(135deg, #F5C518, #C4990A)", color: "#1E2128" }}
                          data-testid="btn-attiva-partnership"
                        >
                          {activatingPartnership ? (
                            <><Loader2 className="inline w-5 h-5 animate-spin mr-2" /> Attivazione...</>
                          ) : (
                            <><Sparkles className="inline w-5 h-5 mr-2" /> Attiva la Partnership Evolution PRO</>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Carta di Credito */}
                      <div className="p-6 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                        <div className="flex items-center gap-3 mb-4">
                          <CreditCard className="w-6 h-6" style={{ color: "#3B82F6" }} />
                          <h4 className="font-bold" style={{ color: "#1D4ED8" }}>Carta di Credito/Debito</h4>
                        </div>
                        <p className="text-sm mb-4" style={{ color: "#1E40AF" }}>
                          Pagamento sicuro con Stripe. Accettiamo Visa, Mastercard, American Express.
                        </p>
                        <button
                          onClick={handlePagamentoStripe}
                          disabled={creatingPayment || !data?.contratto_firmato}
                          className="w-full py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: "#3B82F6", color: "#FFFFFF" }}
                          data-testid="btn-paga-stripe"
                        >
                          {creatingPayment ? (
                            <><Loader2 className="inline w-5 h-5 animate-spin mr-2" /> Preparazione...</>
                          ) : (
                            <>Paga €2.790 con Carta</>
                          )}
                        </button>
                        {!data?.contratto_firmato && (
                          <p className="text-xs mt-2 text-center" style={{ color: "#EF4444" }}>
                            Devi prima firmare il contratto
                          </p>
                        )}
                      </div>
                      
                      {/* Bonifico */}
                      <div className="p-6 rounded-xl" style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}>
                        <div className="flex items-center gap-3 mb-4">
                          <Landmark className="w-6 h-6" style={{ color: "#5F6572" }} />
                          <h4 className="font-bold" style={{ color: "#1E2128" }}>Bonifico Bancario</h4>
                        </div>
                        <p className="text-sm mb-4" style={{ color: "#5F6572" }}>
                          Effettua il bonifico e carica la ricevuta. L'attivazione avverrà dopo verifica.
                        </p>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                            <span className="text-sm" style={{ color: "#5F6572" }}>Intestatario:</span>
                            <span className="text-sm font-medium" style={{ color: "#1E2128" }}>{IBAN_INFO.intestatario}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                            <span className="text-sm" style={{ color: "#5F6572" }}>IBAN:</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-medium" style={{ color: "#1E2128" }}>{IBAN_INFO.iban}</span>
                              <button
                                onClick={handleCopyIban}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                              >
                                {copiedIban ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                            <span className="text-sm" style={{ color: "#5F6572" }}>BIC/SWIFT:</span>
                            <span className="text-sm font-medium" style={{ color: "#1E2128" }}>{IBAN_INFO.bic}</span>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "#FFFFFF" }}>
                            <span className="text-sm" style={{ color: "#5F6572" }}>Causale:</span>
                            <span className="text-sm font-medium" style={{ color: "#1E2128" }}>Partnership Evolution PRO - {data?.cliente?.nome} {data?.cliente?.cognome}</span>
                          </div>
                        </div>
                        
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUploadDocumento("ricevuta_bonifico", e.target.files[0]);
                              }
                            }}
                            className="hidden"
                            data-testid="upload-ricevuta"
                          />
                          <span 
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-colors hover:opacity-90"
                            style={{ background: "#ECEDEF", color: "#5F6572" }}
                          >
                            <Upload className="w-4 h-4" />
                            Carica Ricevuta Bonifico
                          </span>
                        </label>
                        
                        {data?.documenti?.find(d => d.tipo === "ricevuta_bonifico") && (
                          <p className="text-sm mt-2 text-center" style={{ color: "#22C55E" }}>
                            <CheckCircle className="inline w-4 h-4 mr-1" />
                            Ricevuta caricata - In attesa di verifica admin
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Checklist */}
            <div className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #ECEDEF" }}>
              <h3 className="font-bold mb-4" style={{ color: "#1E2128" }}>Checklist Attivazione</h3>
              <div className="space-y-3">
                {[
                  { label: "Analisi Strategica visualizzata", done: true },
                  { label: "Proposta Partnership letta", done: true },
                  { label: "Contratto firmato", done: data?.contratto_firmato },
                  { label: "Documenti caricati", done: data?.documenti?.length >= 2 },
                  { label: "Pagamento completato", done: data?.pagamento_completato }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.done ? (
                      <CheckCircle className="w-5 h-5" style={{ color: "#22C55E" }} />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#ECEDEF" }} />
                    )}
                    <span 
                      className="text-sm"
                      style={{ color: item.done ? "#22C55E" : "#5F6572" }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Finale */}
            {data?.can_activate && !data?.pagamento_completato && (
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #FFF8DC, #FEF3C7)", border: "2px solid #F5C518" }}>
                <Sparkles className="w-8 h-8 mb-3" style={{ color: "#C4990A" }} />
                <h3 className="font-bold mb-2" style={{ color: "#1E2128" }}>Quasi fatto!</h3>
                <p className="text-sm mb-4" style={{ color: "#5F6572" }}>
                  Completa il pagamento per attivare la tua Partnership Evolution PRO.
                </p>
                <button
                  onClick={() => setActiveSection("pagamento")}
                  className="w-full py-3 rounded-xl font-bold transition-all hover:scale-[1.02]"
                  style={{ background: "#F5C518", color: "#1E2128" }}
                >
                  Vai al Pagamento
                </button>
              </div>
            )}

            {/* Supporto */}
            <div className="rounded-2xl p-6" style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}>
              <h3 className="font-bold mb-2" style={{ color: "#1E2128" }}>Hai domande?</h3>
              <p className="text-sm mb-4" style={{ color: "#5F6572" }}>
                Scrivi a Claudio per qualsiasi dubbio sulla partnership.
              </p>
              <a
                href="mailto:claudio.bertogliatti@gmail.com"
                className="block text-center py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                style={{ background: "#ECEDEF", color: "#5F6572" }}
              >
                Contatta Claudio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DecisionePartnershipPage;
