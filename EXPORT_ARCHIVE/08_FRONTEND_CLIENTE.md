# PARTE 8: FRONTEND CLIENTE COMPONENTS (Funnel Analisi Strategica)

## 📁 /app/frontend/src/components/cliente/AnalisiStrategicaApp.jsx
```jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../utils/api-config";
import { 
  User, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertTriangle,
  CheckCircle, Target, Clock, Gift, Briefcase, TrendingUp, Lightbulb,
  Zap, CreditCard, Check, ArrowLeft, LogOut, FileText, Video, Phone
} from "lucide-react";

// Questions
const QUESTIONS = [
  { id: "attivita", question: "Raccontaci brevemente la tua attività, il tuo ruolo e da quanto tempo lavori in questo ambito.", type: "textarea", placeholder: "Descrivi la tua attività...", icon: Briefcase },
  { id: "guadagno", question: "Come guadagni principalmente oggi?", type: "radio", options: ["Consulenze / sessioni 1:1", "Servizi a progetto", "Corsi o formazione in presenza", "Corsi online / prodotti digitali"], icon: TrendingUp },
  { id: "difficolta", question: "Qual è la difficoltà principale che stai vivendo in questo momento?", type: "radio", options: ["Guadagno limitato dal mio tempo", "Agenda piena ma entrate instabili", "Difficoltà ad acquisire nuovi clienti", "Scarsa presenza online", "Confusione su come crescere"], icon: Target },
  { id: "prodotto_digitale", question: "Hai mai pensato di trasformare le tue competenze in un prodotto digitale?", type: "radio", options: ["Sì, ma non so da dove iniziare", "Sì, ci ho provato senza risultati", "Ci sto pensando ora seriamente", "No, ma sono curioso di capire se ha senso"], icon: Lightbulb },
  { id: "tipo_prodotto", question: "Che tipo di prodotto ti incuriosisce di più?", type: "radio", options: ["Videocorso", "eBook / guida pratica", "Percorso misto (video + supporto)", "Non lo so ancora"], icon: Zap },
  { id: "tecnologia", question: "Quanto ti senti a tuo agio con strumenti digitali e tecnologia?", type: "scale", options: ["Per niente", "Poco", "Abbastanza", "Molto"], icon: Zap },
  { id: "investimento", question: "Se trovassi un progetto sensato, saresti disposto a investire?", type: "radio", options: ["Sì, se vedo chiarezza e senso", "Sì, ma con cautela", "Dipende dall'investimento", "Al momento no"], icon: CreditCard },
  { id: "aspettative", question: "Cosa ti aspetti da questa Valutazione Strategica?", type: "textarea", placeholder: "Scrivilo liberamente: chiarezza, conferme, una direzione...", icon: Target }
];

export function AnalisiStrategicaApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    nome: "", cognome: "", email: "", telefono: "", password: ""
  });
  
  // Questionnaire
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savingAnswers, setSavingAnswers] = useState(false);

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem("cliente_session");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setUser(data);
        setIsLoggedIn(true);
        if (data.questionnaire) setAnswers(data.questionnaire);
      } catch (e) {
        localStorage.removeItem("cliente_session");
      }
    }
    
    // Check payment return
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      verifyPayment(params.get("session_id"));
    }
  }, []);

  const verifyPayment = async (sessionId) => {
    try {
      const res = await axios.post(`${API}/clienti/verify-payment`, { session_id: sessionId });
      if (res.data.success) {
        const updated = { ...user, has_paid: true, status: "pending" };
        setUser(updated);
        localStorage.setItem("cliente_session", JSON.stringify(updated));
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch (e) {
      console.error("Payment verification error:", e);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  // Register and go directly to Stripe checkout
  const handleRegisterAndPay = async (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.cognome || !formData.email || !formData.telefono || !formData.password) {
      setError("Compila tutti i campi");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password minimo 6 caratteri");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Step 1: Register
      const regRes = await axios.post(`${API}/clienti/register`, formData);
      if (regRes.data.success) {
        const clienteId = regRes.data.cliente_id;
        const userData = { id: clienteId, ...formData, has_paid: false, status: "registered" };
        localStorage.setItem("cliente_session", JSON.stringify(userData));
        
        // Step 2: Create Stripe checkout and redirect immediately
        try {
          const checkoutRes = await axios.post(`${API}/clienti/create-checkout-session`, {
            cliente_id: clienteId,
            email: formData.email,
            nome: formData.nome,
            cognome: formData.cognome
          });
          
          if (checkoutRes.data.checkout_url) {
            window.location.href = checkoutRes.data.checkout_url;
            return; // Don't setLoading(false) - we're redirecting
          } else {
            // Fallback: show payment page if no checkout URL
            setUser(userData);
            setIsLoggedIn(true);
          }
        } catch (stripeErr) {
          console.error("Stripe error:", stripeErr);
          // Stripe failed but registration succeeded - show payment page
          setUser(userData);
          setIsLoggedIn(true);
          setError("Impossibile avviare il pagamento. Riprova.");
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Email già registrata. Effettua il login.");
        setIsLoginMode(true);
      } else {
        setError(err.response?.data?.detail || "Errore di registrazione");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError("Inserisci email e password");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/clienti/login`, { email: formData.email, password: formData.password });
      if (res.data.success) {
        setUser(res.data.cliente);
        setIsLoggedIn(true);
        localStorage.setItem("cliente_session", JSON.stringify(res.data.cliente));
        if (res.data.cliente.questionnaire) setAnswers(res.data.cliente.questionnaire);
      }
    } catch (err) {
      setError(err.response?.status === 404 ? "Email non trovata" : err.response?.status === 401 ? "Password errata" : "Errore di login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cliente_session");
    setUser(null);
    setIsLoggedIn(false);
    setAnswers({});
    setCurrentQuestion(0);
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const handleSaveQuestionnaire = async () => {
    const unanswered = QUESTIONS.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Rispondi a tutte le domande (mancano ${unanswered.length})`);
      return;
    }

    setSavingAnswers(true);
    try {
      await axios.post(`${API}/clienti/${user.id}/questionnaire`, { answers });
      const updated = { ...user, questionnaire: answers };
      setUser(updated);
      localStorage.setItem("cliente_session", JSON.stringify(updated));
      setError("");
      alert("✅ Questionario salvato! Ti contatteremo entro 48h per la videocall.");
    } catch (err) {
      setError("Errore nel salvataggio. Riprova.");
    } finally {
      setSavingAnswers(false);
    }
  };

  // ============ RENDER LOGIN/REGISTER PAGE ============
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        {/* Header */}
        <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black text-[#1E2128]">E</span>
            </div>
            <div>
              <div className="font-black text-base text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></div>
              <div className="text-[10px] font-medium text-[#9CA3AF]">Analisi Strategica</div>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: Info */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
                   style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
                <Clock className="w-4 h-4" />
                Solo 4 progetti al mese
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-[#1E2128] leading-tight mb-4">
                Verifica se il tuo Progetto è pronto per diventare un'{" "}
                <span style={{ color: '#F5C518' }}>Accademia Digitale</span>
              </h1>
              
              <p className="text-base text-[#5F6572] mb-6">
                Analisi Strategica selettiva per Professionisti che vogliono costruire un Asset Digitale serio.
              </p>

              {/* What you get */}
              <div className="space-y-3">
                {[
                  { icon: FileText, text: "Analisi profilo e posizionamento" },
                  { icon: Target, text: "Valutazione reale del mercato" },
                  { icon: Video, text: "Videocall personalizzata entro 48h" },
                  { icon: Gift, text: "7 Bonus formativi inclusi" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-[#1E2128]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEF9E7' }}>
                      <item.icon className="w-4 h-4 text-[#F5C518]" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form */}
            <div className="p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setIsLoginMode(false)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isLoginMode ? 'bg-[#F5C518] text-black' : 'bg-[#FAFAF7] text-[#9CA3AF]'}`}>
                  Registrati
                </button>
                <button onClick={() => setIsLoginMode(true)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isLoginMode ? 'bg-[#F5C518] text-black' : 'bg-[#FAFAF7] text-[#9CA3AF]'}`}>
                  Accedi
                </button>
              </div>

              <form onSubmit={isLoginMode ? handleLogin : handleRegisterAndPay} className="space-y-4">
                {!isLoginMode && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome"
                        className="p-3 rounded-xl text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
                      <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} placeholder="Cognome"
                        className="p-3 rounded-xl text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
                    </div>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Telefono"
                      className="w-full p-3 rounded-xl text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
                  </>
                )}
                
                <div className="relative">
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email"
                    className="w-full p-3 pl-10 rounded-xl text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                </div>

                <div className="relative">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} 
                    placeholder={isLoginMode ? "Password" : "Password (min 6 caratteri)"}
                    className="w-full p-3 pl-10 pr-10 rounded-xl text-sm" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showPassword ? <EyeOff className="w-4 h-4 text-[#9CA3AF]" /> : <Eye className="w-4 h-4 text-[#9CA3AF]" />}
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    <AlertTriangle className="w-4 h-4" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                    isLoginMode ? <>Accedi<ArrowRight className="w-4 h-4" /></> : 
                    <>Acquista e Registrati — €67<CreditCard className="w-4 h-4" /></>}
                </button>
                
                {!isLoginMode && (
                  <p className="text-xs text-center text-[#9CA3AF]">
                    Pagamento sicuro con Stripe
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ LOGGED IN BUT NOT PAID - REDIRECT TO PAYMENT ============
  if (!user?.has_paid) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
                <span className="text-lg font-black text-[#1E2128]">E</span>
              </div>
              <span className="font-black text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></span>
            </div>
            <button onClick={handleLogout} className="text-sm text-[#9CA3AF] hover:text-[#1E2128] flex items-center gap-1">
              <LogOut className="w-4 h-4" />Esci
            </button>
          </div>
        </header>

        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#FEF9E7' }}>
            <CreditCard className="w-8 h-8 text-[#F5C518]" />
          </div>
          <h1 className="text-xl font-bold text-[#1E2128] mb-2">Completa il pagamento</h1>
          <p className="text-sm text-[#5F6572] mb-6">
            Ciao {user?.nome}, per accedere al questionario devi completare il pagamento di €67.
          </p>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await axios.post(`${API}/clienti/create-checkout-session`, {
                  cliente_id: user.id,
                  email: user.email,
                  nome: user.nome,
                  cognome: user.cognome
                });
                if (res.data.checkout_url) {
                  window.location.href = res.data.checkout_url;
                }
              } catch (e) {
                setError("Errore. Riprova.");
              }
              setLoading(false);
            }}
            disabled={loading}
            className="px-8 py-3 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] flex items-center justify-center gap-2 mx-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Paga €67<ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    );
  }

  // ============ PAID - QUESTIONNAIRE ALREADY COMPLETED ============
  if (user?.questionnaire && Object.keys(user.questionnaire).length === QUESTIONS.length) {
    return (
      <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
        <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
                <span className="text-lg font-black text-[#1E2128]">E</span>
              </div>
              <span className="font-black text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#9CA3AF]">Ciao, <span className="text-[#1E2128] font-semibold">{user.nome}</span></span>
              <button onClick={handleLogout} className="text-sm text-[#9CA3AF] hover:text-[#1E2128]"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#D1FAE5' }}>
            <CheckCircle className="w-10 h-10 text-[#059669]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E2128] mb-4">Questionario completato!</h1>
          <p className="text-[#5F6572] mb-8">
            Grazie {user.nome}! Riceverai un'email con il link per prenotare la tua <strong>videocall di Analisi Strategica</strong> entro 48 ore.
          </p>
          <div className="p-6 rounded-xl text-left" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <h3 className="font-bold text-[#1E2128] mb-3">Cosa succede ora:</h3>
            <ul className="space-y-2 text-sm text-[#5F6572]">
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#059669] mt-0.5" />Analizziamo le tue risposte</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#059669] mt-0.5" />Ti contattiamo per fissare la videocall</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#059669] mt-0.5" />Durante la call ricevi l'Analisi completa</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-[#059669] mt-0.5" />Accedi ai 7 Bonus formativi</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ============ PAID - SHOW QUESTIONNAIRE ============
  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const allAnswered = QUESTIONS.every(q => answers[q.id]);

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black text-[#1E2128]">E</span>
            </div>
            <span className="font-black text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9CA3AF]">Ciao, <span className="text-[#1E2128] font-semibold">{user?.nome}</span></span>
            <button onClick={handleLogout} className="text-sm text-[#9CA3AF] hover:text-[#1E2128]"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="p-6 rounded-2xl mb-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <h1 className="text-xl font-bold text-[#1E2128] mb-2">Completa il Questionario</h1>
          <p className="text-sm text-[#5F6572]">
            Rispondi a queste domande per permetterci di preparare la tua Analisi Strategica personalizzata.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-[#9CA3AF] mb-2">
            <span>Domanda {currentQuestion + 1} di {QUESTIONS.length}</span>
            <span>{Math.round(progress)}% completato</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: '#ECEDEF' }}>
            <div className="h-full bg-[#F5C518] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div className="p-6 rounded-2xl mb-6" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#FEF9E7' }}>
              <question.icon className="w-6 h-6 text-[#F5C518]" />
            </div>
            <h2 className="text-lg font-bold text-[#1E2128] flex-1">{question.question}</h2>
          </div>

          {question.type === "textarea" && (
            <textarea value={answers[question.id] || ""} onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder={question.placeholder} rows={4}
              className="w-full p-4 rounded-xl text-sm resize-none" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} />
          )}

          {question.type === "radio" && (
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswerChange(question.id, opt)}
                  className="w-full p-4 rounded-xl text-left flex items-center gap-3 transition-all text-sm"
                  style={{ background: answers[question.id] === opt ? '#FEF9E7' : '#FAFAF7', border: answers[question.id] === opt ? '2px solid #F5C518' : '1px solid #ECEDEF' }}>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: answers[question.id] === opt ? '#F5C518' : '#9CA3AF', background: answers[question.id] === opt ? '#F5C518' : 'transparent' }}>
                    {answers[question.id] === opt && <Check className="w-3 h-3 text-black" />}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {question.type === "scale" && (
            <div className="grid grid-cols-4 gap-2">
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => handleAnswerChange(question.id, opt)}
                  className="p-4 rounded-xl text-center transition-all"
                  style={{ background: answers[question.id] === opt ? '#FEF9E7' : '#FAFAF7', border: answers[question.id] === opt ? '2px solid #F5C518' : '1px solid #ECEDEF' }}>
                  <div className="text-2xl mb-1">{["😕", "🤔", "🙂", "😃"][i]}</div>
                  <span className="text-xs text-[#5F6572]">{opt}</span>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#5F6572] flex items-center gap-2 disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" />Precedente
            </button>
            {currentQuestion < QUESTIONS.length - 1 && (
              <button onClick={() => setCurrentQuestion(currentQuestion + 1)} disabled={!answers[question.id]}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#F5C518] text-black flex items-center gap-2 disabled:opacity-30">
                Successiva<ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question dots */}
        <div className="flex justify-center gap-2 mb-8">
          {QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => setCurrentQuestion(i)}
              className={`w-3 h-3 rounded-full transition-all ${i === currentQuestion ? 'bg-[#F5C518] scale-125' : answers[q.id] ? 'bg-[#10B981]' : 'bg-[#ECEDEF]'}`} />
          ))}
        </div>

        {/* Submit */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm mb-4" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <AlertTriangle className="w-4 h-4" />{error}
          </div>
        )}

        <button onClick={handleSaveQuestionnaire} disabled={!allAnswered || savingAnswers}
          className="w-full py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black flex items-center justify-center gap-3 disabled:opacity-50">
          {savingAnswers ? <><Loader2 className="w-5 h-5 animate-spin" />Salvataggio...</> : 
           <>Invia Questionario<CheckCircle className="w-5 h-5" /></>}
        </button>
      </div>
    </div>
  );
}

export default AnalisiStrategicaApp;
```

## 📁 /app/frontend/src/components/cliente/AnalisiStrategicaLanding.jsx
```jsx
import React, { useState } from "react";
import { 
  CheckCircle, ArrowRight, Target, Layers, TrendingUp, 
  Clock, Users, AlertTriangle, Gift, Star, Shield, Zap, 
  BookOpen, Megaphone, Rocket, X
} from "lucide-react";

// Bonus data
const BONUS_LIST = [
  { id: 1, title: "Il Blueprint che Evita il 90% dei Corsi che Non Vendono", icon: Target, color: "#F5C518" },
  { id: 2, title: "Come Scegliere gli Argomenti che Vendono", icon: BookOpen, color: "#10B981" },
  { id: 3, title: "Durata delle Lezioni: la Scelta che Influenza le Vendite", icon: Clock, color: "#3B82F6" },
  { id: 4, title: "Funnel di Vendita: la Struttura Minima Indispensabile", icon: Rocket, color: "#8B5CF6" },
  { id: 5, title: "ADV: Quando Funzionano Davvero", icon: Megaphone, color: "#EF4444" },
  { id: 6, title: "Profili Social: Funzione Reale (Non Estetica)", icon: Users, color: "#EC4899" },
  { id: 7, title: "Perché Evitare di Fare Tutto Questo da Soli", icon: Shield, color: "#F97316" },
];

export function AnalisiStrategicaLanding({ onStartAnalisi }) {
  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black text-[#1E2128]">E</span>
            </div>
            <div>
              <div className="font-black text-base text-[#1E2128]">
                Evolution<span style={{ color: '#F5C518' }}>PRO</span>
              </div>
              <div className="text-[10px] font-medium text-[#9CA3AF]">Analisi Strategica</div>
            </div>
          </div>
          <button 
            onClick={onStartAnalisi}
            className="px-5 py-2 rounded-lg font-bold text-sm bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all"
          >
            Inizia Ora
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
               style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
            <Clock className="w-4 h-4" />
            Solo 4 progetti al mese
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#1E2128] leading-tight mb-6">
            Verifica se il tuo Progetto è pronto per diventare un'{" "}
            <span style={{ color: '#F5C518' }}>Accademia Digitale</span> che vende
          </h1>
          
          <p className="text-base md:text-lg text-[#5F6572] max-w-2xl mx-auto mb-10">
            Analisi Strategica selettiva per Professionisti che vogliono costruire un Asset Digitale serio, 
            non "provare a vedere come va".
          </p>

          <button 
            onClick={onStartAnalisi}
            className="px-8 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all inline-flex items-center gap-3 shadow-lg"
            style={{ boxShadow: '0 4px 20px rgba(245,197,24,0.3)' }}
            data-testid="cta-start-analisi"
          >
            Voglio fare l'Analisi — €67
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <p className="text-xs text-[#9CA3AF] mt-4">
            <span className="line-through">€147</span> → Videocall entro 48h + 7 Bonus inclusi
          </p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-8">
            Se in questo momento...
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Guadagni solo quando sei presente",
              "Sai di avere competenze di valore ma non riesci a venderle online",
              "Hai provato marketing, corsi o strategie che non hanno portato risultati",
              "Senti che il problema non è 'sapere di più', ma avere una struttura"
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <AlertTriangle className="w-5 h-5 text-[#F5C518] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#5F6572]">{item}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg font-bold mt-8" style={{ color: '#C4990A' }}>
            ...allora il problema non sei tu, ma il Modello di Business che utilizzi.
          </p>
        </div>
      </section>

      {/* About Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 p-8 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0" 
                 style={{ background: 'linear-gradient(135deg, #F5C518 0%, #c49a12 100%)' }}>
              <span className="text-3xl font-black text-black">CB</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#1E2128] mb-2">Sono Claudio Bertogliatti</h3>
              <p className="text-sm text-[#5F6572] leading-relaxed">
                Founder di Evolution PRO, Creatore del Metodo E.V.O. ed esperto in Marketing a risposta diretta da +20 anni.
                Non vendo semplici corsi: aiuto coach, formatori e professionisti a costruire asset che generano vendite nel tempo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-8">
            Cosa facciamo per te
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "VALUTAZIONE", desc: "Valutiamo se e come le tue competenze possono funzionare online.", color: "#F5C518" },
              { icon: Layers, title: "STRUTTURA", desc: "Costruiamo insieme l'asset digitale più adatto al tuo profilo.", color: "#10B981" },
              { icon: TrendingUp, title: "CRESCITA", desc: "Ti aiutiamo a vendere nel tempo senza dipendere dal tuo tempo.", color: "#3B82F6" }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl text-center" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${item.color}15` }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <h3 className="font-bold text-[#1E2128] mb-2">{item.title}</h3>
                <p className="text-sm text-[#5F6572]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analysis Details */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] text-center mb-2">
            Il primo passo: Analisi Strategica
          </h2>
          <p className="text-center text-sm text-[#9CA3AF] mb-8">
            Per evitare errori prima di investire tempo, denaro ed energie.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {["Analisi profilo e posizionamento", "Valutazione reale del mercato", "Scelta dell'asset più sensato", "Tempistiche e prossimi passi"].map((item, i) => (
              <div key={i} className="p-4 rounded-xl flex items-center gap-3" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
                <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <p className="text-sm text-[#1E2128]">{item}</p>
              </div>
            ))}
          </div>

          {/* Outcomes */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl text-center" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <p className="font-bold text-[#DC2626]">🔴 Non adatto</p>
              <p className="text-xs text-[#7F1D1D] mt-1">Eviti mesi di errori</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p className="font-bold text-[#D97706]">🟡 Adatto ma non ora</p>
              <p className="text-xs text-[#92400E] mt-1">Ricevi una roadmap</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
              <p className="font-bold text-[#059669]">🟢 Adatto</p>
              <p className="text-xs text-[#065F46] mt-1">Accesso alla Partnership</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-8" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="p-6 rounded-2xl" style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
            <p className="text-center text-[#1E2128]">
              Negli ultimi mesi <span className="font-bold" style={{ color: '#C4990A' }}>oltre il 30%</span> dei progetti analizzati non è stato ammesso alla Partnership.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12" id="pricing">
        <div className="max-w-md mx-auto px-6">
          <div className="p-8 rounded-2xl text-center relative overflow-hidden" style={{ background: '#FFFFFF', border: '2px solid #F5C518' }}>
            <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-xs font-bold" style={{ background: '#F5C518', color: '#1E2128' }}>
              SCONTO 55%
            </div>
            
            <h3 className="text-lg font-bold text-[#1E2128] mb-1">Analisi Strategica Personalizzata</h3>
            <p className="text-sm text-[#9CA3AF] mb-6">+ 7 Bonus formativi inclusi</p>
            
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="text-xl text-[#9CA3AF] line-through">€147</span>
              <span className="text-4xl font-black" style={{ color: '#F5C518' }}>€67</span>
            </div>
            
            <button 
              onClick={onStartAnalisi}
              className="w-full py-4 rounded-xl font-bold text-base bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all flex items-center justify-center gap-2"
              data-testid="cta-pricing"
            >
              Inizia l'Analisi Strategica
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <p className="text-xs text-[#9CA3AF] mt-4">
              Riceverai l'analisi in videocall entro 48h
            </p>
          </div>
        </div>
      </section>

      {/* Bonus Section */}
      <section className="py-12" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4"
                 style={{ background: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <Gift className="w-4 h-4" />
              GRATIS — Inclusi nell'Analisi
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1E2128]">7 Bonus Formativi</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            {BONUS_LIST.map((bonus) => (
              <div key={bonus.id} className="p-4 rounded-xl flex items-center gap-4" style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${bonus.color}15` }}>
                  <bonus.icon className="w-5 h-5" style={{ color: bonus.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#9CA3AF]">BONUS #{bonus.id}</p>
                  <p className="text-sm font-semibold text-[#1E2128] truncate">{bonus.title}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: '#D1FAE5', color: '#059669' }}>GRATIS</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Who */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-xl font-bold text-[#1E2128] text-center mb-8">Per chi è questa Valutazione</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl" style={{ background: '#D1FAE5', border: '1px solid #A7F3D0' }}>
              <h3 className="font-bold text-[#059669] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Per professionisti che:
              </h3>
              <ul className="space-y-2 text-sm text-[#065F46]">
                {["Hanno competenze reali, non teoriche", "Hanno già lavorato con clienti", "Sentono il limite del 'guadagno solo se sono presente'", "Cercano struttura, metodo e direzione"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span>✓</span>{t}</li>
                ))}
              </ul>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <h3 className="font-bold text-[#DC2626] mb-4 flex items-center gap-2">
                <X className="w-5 h-5" />
                Non è adatta se:
              </h3>
              <ul className="space-y-2 text-sm text-[#7F1D1D]">
                {["Vuoi 'provare a vedere come va'", "Non sei disposto a investire", "Cerchi motivazione o ispirazione", "Pensi di delegare tutto senza metterti in gioco"].map((t, i) => (
                  <li key={i} className="flex items-start gap-2"><span>✗</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12" style={{ background: '#FEF9E7' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-lg md:text-xl font-bold text-[#1E2128] mb-6">
            IL VERO RISCHIO NON È SPENDERE €67<br />
            <span style={{ color: '#C4990A' }}>MA CONTINUARE SENZA DIREZIONE</span>
          </p>
          
          <button 
            onClick={onStartAnalisi}
            className="px-10 py-4 rounded-xl font-bold text-lg bg-[#F5C518] text-black hover:bg-[#e0b115] transition-all inline-flex items-center gap-3"
            data-testid="cta-final"
          >
            Fai Chiarezza Adesso — €67
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-[#5F6572]">Trasformiamo competenze in asset digitali con metodo e serietà</p>
          <p className="text-xs text-[#9CA3AF] mt-2">Privacy Policy | Condizioni di Vendita</p>
        </div>
      </footer>
    </div>
  );
}

export default AnalisiStrategicaLanding;
```

## 📁 /app/frontend/src/components/cliente/AnalisiRegistrazione.jsx
```jsx
import React, { useState } from "react";
import { User, Mail, Lock, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

export function AnalisiRegistrazione({ onComplete, onBack }) {
  const [formData, setFormData] = useState({ nome: "", cognome: "", email: "", telefono: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validateForm = () => {
    if (!formData.nome.trim()) return "Inserisci il tuo nome";
    if (!formData.cognome.trim()) return "Inserisci il tuo cognome";
    if (!formData.email.trim()) return "Inserisci la tua email";
    if (!/\S+@\S+\.\S+/.test(formData.email)) return "Email non valida";
    if (!formData.telefono.trim()) return "Inserisci il tuo telefono";
    if (formData.password.length < 6) return "Password minimo 6 caratteri";
    if (formData.password !== formData.confirmPassword) return "Le password non coincidono";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/clienti/register`, {
        nome: formData.nome, cognome: formData.cognome, email: formData.email,
        telefono: formData.telefono, password: formData.password
      });
      if (res.data.success) {
        onComplete({ id: res.data.cliente_id, nome: formData.nome, cognome: formData.cognome, email: formData.email, telefono: formData.telefono });
      } else {
        setError(res.data.message || "Errore durante la registrazione");
      }
    } catch (err) {
      setError(err.response?.status === 409 ? "Email già registrata. Effettua il login." : (err.response?.data?.detail || "Errore di connessione."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAFAF7' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF9E7', border: '1px solid #F5C518' }}>
            <User className="w-8 h-8 text-[#F5C518]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E2128] mb-2">Crea il tuo Account</h1>
          <p className="text-sm text-[#9CA3AF]">Per procedere con l'Analisi Strategica</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E2128] mb-1">Nome</label>
              <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Mario"
                className="w-full p-3 rounded-xl text-sm focus:outline-none" 
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-nome" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E2128] mb-1">Cognome</label>
              <input type="text" name="cognome" value={formData.cognome} onChange={handleChange} placeholder="Rossi"
                className="w-full p-3 rounded-xl text-sm focus:outline-none" 
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-cognome" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2128] mb-1">Email</label>
            <div className="relative">
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="mario@email.com"
                className="w-full p-3 pl-11 rounded-xl text-sm focus:outline-none" 
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-email" />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2128] mb-1">Telefono</label>
            <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="+39 333 1234567"
              className="w-full p-3 rounded-xl text-sm focus:outline-none" 
              style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-telefono" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2128] mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Minimo 6 caratteri"
                className="w-full p-3 pl-11 pr-11 rounded-xl text-sm focus:outline-none" 
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-password" />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E2128] mb-1">Conferma Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Ripeti la password"
                className="w-full p-3 pl-11 rounded-xl text-sm focus:outline-none" 
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid="input-confirm-password" />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-[#5F6572] transition-colors flex items-center justify-center gap-2"
              style={{ border: '1px solid #ECEDEF' }}>
              <ArrowLeft className="w-4 h-4" />Indietro
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="btn-register">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Registrazione...</> : <>Continua<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </form>

        <p className="text-xs text-[#9CA3AF] text-center mt-6">
          Registrandoti accetti i nostri <a href="#" className="text-[#F5C518] hover:underline">Termini</a> e <a href="#" className="text-[#F5C518] hover:underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}

export default AnalisiRegistrazione;
```

## 📁 /app/frontend/src/components/cliente/AnalisiQuestionario.jsx
```jsx
import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Briefcase, TrendingUp, Target, Lightbulb, Zap, CreditCard, Loader2 } from "lucide-react";

const QUESTIONS = [
  { id: "attivita", question: "Raccontaci brevemente la tua attività, il tuo ruolo e da quanto tempo lavori in questo ambito.", type: "textarea", placeholder: "Descrivi la tua attività, il tuo ruolo e la tua esperienza...", icon: Briefcase },
  { id: "guadagno", question: "Come guadagni principalmente oggi?", type: "radio", options: ["Consulenze / sessioni 1:1", "Servizi a progetto", "Corsi o formazione in presenza", "Corsi online / prodotti digitali"], icon: TrendingUp },
  { id: "difficolta", question: "Qual è la difficoltà principale che stai vivendo in questo momento?", type: "radio", options: ["Guadagno limitato dal mio tempo", "Agenda piena ma entrate instabili", "Difficoltà ad acquisire nuovi clienti", "Scarsa presenza online", "Confusione su come crescere"], icon: Target },
  { id: "prodotto_digitale", question: "Hai mai pensato di trasformare le tue competenze in un prodotto digitale?", type: "radio", options: ["Sì, ma non so da dove iniziare", "Sì, ci ho provato senza risultati", "Ci sto pensando ora seriamente", "No, ma sono curioso di capire se ha senso"], icon: Lightbulb },
  { id: "tipo_prodotto", question: "Che tipo di prodotto ti incuriosisce di più (anche solo come idea)?", type: "radio", options: ["Videocorso", "eBook / guida pratica", "Percorso misto (video + supporto)", "Non lo so ancora"], icon: Zap },
  { id: "tecnologia", question: "Quanto ti senti a tuo agio con strumenti digitali e tecnologia?", type: "scale", options: ["Per niente", "Poco", "Abbastanza", "Molto"], icon: Zap },
  { id: "investimento", question: "Se trovassi un progetto sensato e guidato, saresti disposto a investire per costruirlo?", type: "radio", options: ["Sì, se vedo chiarezza e senso", "Sì, ma con cautela", "Dipende dall'investimento", "Al momento no"], icon: CreditCard },
  { id: "aspettative", question: "Cosa ti aspetti davvero da questa Valutazione Strategica?", type: "textarea", placeholder: "Scrivilo liberamente: chiarezza, conferme, una direzione, capire se fermarti o andare avanti…", icon: Target }
];

export function AnalisiQuestionario({ userData, onComplete, onBack, isProcessingPayment }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const currentAnswer = answers[question.id] || "";
  const canProceed = currentAnswer.length > 0;

  const handleNext = () => {
    if (!canProceed) return;
    if (isLastStep) { onComplete(answers); } else { setCurrentStep(currentStep + 1); }
  };

  const handlePrev = () => {
    if (currentStep > 0) { setCurrentStep(currentStep - 1); } else { onBack(); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#FAFAF7' }}>
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-[#9CA3AF] mb-2">
            <span>Domanda {currentStep + 1} di {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#ECEDEF' }}>
            <div className="h-full bg-[#F5C518] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ background: '#FEF9E7' }}>
            <question.icon className="w-7 h-7 text-[#F5C518]" />
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-[#1E2128] mb-6">{question.question}</h2>

          <div className="mb-8">
            {question.type === "textarea" && (
              <textarea value={currentAnswer} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                placeholder={question.placeholder} rows={5}
                className="w-full p-4 rounded-xl text-sm focus:outline-none resize-none"
                style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }} data-testid={`question-${question.id}`} />
            )}

            {question.type === "radio" && (
              <div className="space-y-3">
                {question.options.map((option, i) => (
                  <button key={i} onClick={() => setAnswers({ ...answers, [question.id]: option })}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3`}
                    style={{ 
                      background: currentAnswer === option ? '#FEF9E7' : '#FAFAF7',
                      border: currentAnswer === option ? '2px solid #F5C518' : '1px solid #ECEDEF'
                    }} data-testid={`option-${i}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0`}
                      style={{ borderColor: currentAnswer === option ? '#F5C518' : '#9CA3AF', background: currentAnswer === option ? '#F5C518' : 'transparent' }}>
                      {currentAnswer === option && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-sm text-[#1E2128]">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {question.type === "scale" && (
              <div className="grid grid-cols-4 gap-2">
                {question.options.map((option, i) => (
                  <button key={i} onClick={() => setAnswers({ ...answers, [question.id]: option })}
                    className="p-4 rounded-xl text-center transition-all"
                    style={{ 
                      background: currentAnswer === option ? '#FEF9E7' : '#FAFAF7',
                      border: currentAnswer === option ? '2px solid #F5C518' : '1px solid #ECEDEF'
                    }} data-testid={`scale-${i}`}>
                    <div className="text-2xl mb-1">{["😕", "🤔", "🙂", "😃"][i]}</div>
                    <span className="text-xs text-[#5F6572]">{option}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={handlePrev} className="px-6 py-3 rounded-xl font-semibold text-[#5F6572] hover:text-[#1E2128] transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />Indietro
            </button>

            <button onClick={handleNext} disabled={!canProceed || isProcessingPayment}
              className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canProceed && !isProcessingPayment ? 'bg-[#F5C518] text-black hover:bg-[#e0b115]' : 'bg-[#ECEDEF] text-[#9CA3AF] cursor-not-allowed'}`}
              data-testid="btn-next">
              {isProcessingPayment ? <><Loader2 className="w-4 h-4 animate-spin" />Elaborazione...</> : 
               isLastStep ? <>Procedi al Pagamento<CreditCard className="w-4 h-4" /></> : <>Continua<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {userData && <div className="mt-4 text-center text-sm text-[#9CA3AF]">Registrato come: {userData.email}</div>}
      </div>
    </div>
  );
}

export default AnalisiQuestionario;
```
