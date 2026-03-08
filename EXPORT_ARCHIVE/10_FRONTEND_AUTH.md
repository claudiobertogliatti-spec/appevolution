# PARTE 10: FRONTEND AUTH COMPONENTS

## 📁 /app/frontend/src/components/auth/LoginPage.jsx
```jsx
import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, ArrowRight, Clock, FileText, Target, Gift, Video } from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

export function LoginPage({ onLogin }) {
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
      <header className="border-b" style={{ borderColor: '#ECEDEF', background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
            <span className="text-lg font-black text-[#1E2128]">E</span>
          </div>
          <div>
            <div className="font-black text-base text-[#1E2128]">Evolution<span style={{ color: '#F5C518' }}>PRO</span></div>
            <div className="text-[10px] font-medium text-[#9CA3AF]">Operating System</div>
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
              Trasforma le tue competenze in un'{" "}
              <span style={{ color: '#F5C518' }}>Accademia Digitale</span>
            </h1>
            
            <p className="text-base text-[#5F6572] mb-8">
              Accedi alla piattaforma per gestire il tuo percorso di partnership e creare il tuo asset digitale.
            </p>

            {/* Features */}
            <div className="space-y-3">
              {[
                { icon: FileText, text: "Dashboard personalizzata" },
                { icon: Target, text: "Percorso guidato step-by-step" },
                { icon: Video, text: "Produzione video professionale" },
                { icon: Gift, text: "Risorse e bonus esclusivi" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[#1E2128]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEF9E7' }}>
                    <item.icon className="w-4 h-4 text-[#F5C518]" />
                  </div>
                  {item.text}
                </div>
              ))}
            </div>

            {/* Link to Analisi */}
            <div className="mt-8 p-4 rounded-xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
              <p className="text-sm text-[#5F6572] mb-2">Non sei ancora Partner?</p>
              <a href="/analisi-strategica" className="text-sm font-bold flex items-center gap-2 hover:underline" style={{ color: '#F5C518' }}>
                Richiedi l'Analisi Strategica <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="p-6 rounded-2xl" style={{ background: '#FFFFFF', border: '1px solid #ECEDEF' }}>
            <h2 className="text-xl font-bold text-[#1E2128] mb-1">Bentornato!</h2>
            <p className="text-sm text-[#9CA3AF] mb-6">Accedi al tuo account Evolution PRO</p>

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
                    className="w-full p-3 pl-10 rounded-xl text-sm focus:outline-none"
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
                    className="w-full p-3 pl-10 pr-10 rounded-xl text-sm focus:outline-none"
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
                className="w-full py-3.5 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] flex items-center justify-center gap-2 disabled:opacity-50"
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
      </div>
    </div>
  );
}

export default LoginPage;
```
