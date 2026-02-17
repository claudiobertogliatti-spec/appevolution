import { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
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
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      const { access_token, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Call onLogin callback
      onLogin(user, access_token);
      
    } catch (err) {
      setError(err.response?.data?.detail || "Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" data-testid="login-page">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F5C518]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F5C518]/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5C518] flex items-center justify-center">
              <span className="text-2xl font-black text-black">E</span>
            </div>
            <div className="text-left">
              <div className="text-xl font-black tracking-tight text-[#1E2128]">
                EVOLUTION <span className="text-[#F5C518]">PRO</span>
              </div>
              <div className="text-[10px] font-bold text-[#9CA3AF] tracking-widest">
                OPERATING SYSTEM
              </div>
            </div>
          </div>
        </div>
        
        {/* Login Card */}
        <div className="bg-white border border-[#ECEDEF] rounded-2xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-2 text-[#1E2128]">Bentornato!</h1>
          <p className="text-[#9CA3AF] text-center text-sm mb-6">
            Accedi al tuo account Evolution PRO
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-[#5F6572] mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@email.com"
                required
                className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] focus:border-[#F5C518] outline-none transition-colors"
                data-testid="login-email"
              />
            </div>
            
            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-[#5F6572] mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#FAFAF7] border border-[#ECEDEF] rounded-xl px-4 py-3 pr-12 text-sm text-[#1E2128] placeholder:text-[#9CA3AF] focus:border-[#F5C518] outline-none transition-colors"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#5F6572] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
            
            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#F5C518] text-black font-bold text-sm hover:bg-[#e0a800] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                "Accedi"
              )}
            </button>
          </form>
          
          {/* Demo credentials hint */}
          <div className="mt-6 pt-6 border-t border-[#ECEDEF]">
            <p className="text-xs text-[#9CA3AF] text-center">
              Demo Admin: claudio@evolutionpro.it / Evolution2026!
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-xs text-[#9CA3AF] mt-6">
          © 2026 Evolution PRO OS. Tutti i diritti riservati.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
