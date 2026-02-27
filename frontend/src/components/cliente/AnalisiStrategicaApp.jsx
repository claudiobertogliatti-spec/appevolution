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

  // Register and immediately go to payment
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
    try {
      // Register
      const regRes = await axios.post(`${API}/clienti/register`, formData);
      if (regRes.data.success) {
        const userData = { id: regRes.data.cliente_id, ...formData, has_paid: false, status: "registered" };
        localStorage.setItem("cliente_session", JSON.stringify(userData));
        
        // Immediately create checkout
        const checkoutRes = await axios.post(`${API}/clienti/create-checkout-session`, {
          cliente_id: regRes.data.cliente_id,
          email: formData.email,
          nome: formData.nome,
          cognome: formData.cognome
        });
        
        if (checkoutRes.data.checkout_url) {
          window.location.href = checkoutRes.data.checkout_url;
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Email già registrata. Effettua il login.");
        setIsLoginMode(true);
      } else {
        setError("Errore di registrazione");
      }
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
