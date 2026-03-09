import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ArrowRight, Clock, FileText, Target, Gift, Video, X, CheckCircle, Sparkles, Users, TrendingUp } from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

export function LoginPage({ onLogin }) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user } = response.data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user, access_token);
    } catch (err) {
      setError(err.response?.data?.detail || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }} data-testid="login-page">
      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black text-[#1E2128]">E</span>
            </div>
            <div>
              <div className="font-black text-base text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></div>
              <div className="text-[10px] font-medium text-[#9CA3AF]">Operating System</div>
            </div>
          </div>
          
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
            style={{ background: '#F5C518', color: '#1E2128' }}
            data-testid="open-login-btn"
          >
            Accedi
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
                   style={{ background: '#FEF9E7', color: '#C4990A', border: '1px solid #F5C518' }}>
                <Clock className="w-4 h-4" />
                Solo 4 progetti al mese
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-[#1E2128] leading-tight mb-6">
                Trasforma le tue competenze in un'{" "}
                <span style={{ color: '#F5C518' }}>Accademia Digitale</span>
              </h1>
              
              <p className="text-lg text-[#5F6572] mb-8 leading-relaxed">
                Il sistema operativo completo per creare, lanciare e scalare la tua accademia online. 
                Dall'idea al primo studente in 90 giorni.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 mb-10">
                <a 
                  href="/analisi-strategica" 
                  className="px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="cta-analisi"
                >
                  Richiedi l'Analisi Strategica <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-gray-100"
                  style={{ background: '#FFFFFF', color: '#1E2128', border: '1px solid #ECEDEF' }}
                  data-testid="cta-login"
                >
                  Sei già Partner? Accedi
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 text-sm text-[#9CA3AF]">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>20+ Partner attivi</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>€150k+ generati</span>
                </div>
              </div>
            </div>

            {/* Right: Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: FileText, title: "Dashboard Personalizzata", desc: "Gestisci tutto da un unico pannello", color: "#3B82F6" },
                { icon: Target, title: "Percorso Guidato", desc: "Step-by-step verso il lancio", color: "#8B5CF6" },
                { icon: Video, title: "Produzione Video", desc: "Assistenza professionale AI", color: "#EC4899" },
                { icon: Sparkles, title: "AI Assistant", desc: "VALENTINA ti guida 24/7", color: "#F5C518" }
              ].map((item, i) => (
                <div 
                  key={i} 
                  className="p-5 rounded-2xl transition-all hover:scale-105"
                  style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${item.color}15` }}
                  >
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <h3 className="font-bold text-[#1E2128] mb-1">{item.title}</h3>
                  <p className="text-xs text-[#9CA3AF]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black text-[#1E2128] mb-3">Come Funziona</h2>
            <p className="text-[#5F6572]">Un percorso strutturato in 10 fasi verso il tuo business digitale</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Analisi Strategica", desc: "Definiamo insieme la tua nicchia e il posizionamento" },
              { step: "02", title: "Struttura Corso", desc: "L'AI genera la struttura del tuo videocorso" },
              { step: "03", title: "Produzione Video", desc: "Ti guidiamo nella registrazione professionale" },
              { step: "04", title: "Lancio & Scala", desc: "Lancio assistito e strategie di crescita" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-xl"
                  style={{ background: '#FEF9E7', color: '#C4990A' }}
                >
                  {item.step}
                </div>
                <h3 className="font-bold text-[#1E2128] mb-2">{item.title}</h3>
                <p className="text-sm text-[#9CA3AF]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16" style={{ background: '#1E2128' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Users, value: "20+", label: "Partner Attivi" },
              { icon: TrendingUp, value: "€150k+", label: "Revenue Generato" },
              { icon: Gift, value: "90", label: "Giorni al Lancio" }
            ].map((item, i) => (
              <div key={i}>
                <item.icon className="w-8 h-8 mx-auto mb-3" style={{ color: '#F5C518' }} />
                <div className="text-4xl font-black text-white mb-1">{item.value}</div>
                <div className="text-sm text-[#9CA3AF]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-[#1E2128] mb-4">
            Pronto a Iniziare?
          </h2>
          <p className="text-[#5F6572] mb-8">
            Richiedi la tua analisi strategica gratuita e scopri come trasformare le tue competenze in un business digitale.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="/analisi-strategica" 
              className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
              style={{ background: '#F5C518', color: '#1E2128' }}
            >
              Inizia Ora <ArrowRight className="w-4 h-4" />
            </a>
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:bg-gray-100"
              style={{ background: '#FFFFFF', color: '#1E2128', border: '1px solid #ECEDEF' }}
            >
              Accedi al tuo Account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: '#ECEDEF' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-sm font-black text-[#1E2128]">E</span>
            </div>
            <span className="text-sm font-bold text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></span>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            © 2026 Evolution PRO. Tutti i diritti riservati.
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="login-modal-overlay">
          <div 
            className="w-full max-w-md p-6 rounded-2xl relative"
            style={{ background: '#FFFFFF' }}
            data-testid="login-modal"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100"
              data-testid="close-login-modal"
            >
              <X className="w-5 h-5 text-[#9CA3AF]" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#F5C518' }}>
                <span className="text-2xl font-black text-[#1E2128]">E</span>
              </div>
              <h2 className="text-xl font-bold text-[#1E2128] mb-1">Bentornato!</h2>
              <p className="text-sm text-[#9CA3AF]">Accedi al tuo account Evolution PRO</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#1E2128] mb-1">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="La tua email"
                    required
                    className="w-full p-3 pl-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="login-email"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[#1E2128] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="La tua password"
                    required
                    className="w-full p-3 pl-10 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="login-password"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-[#9CA3AF]" /> : <Eye className="w-4 h-4 text-[#9CA3AF]" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                  <AlertCircle className="w-4 h-4" />{error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                data-testid="login-submit"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Accedi<ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            {/* Footer */}
            <p className="text-xs text-center text-[#9CA3AF] mt-6">
              Problemi di accesso? <a href="mailto:assistenza@evolution-pro.it" className="font-semibold hover:underline" style={{ color: '#F5C518' }}>Contattaci</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;
