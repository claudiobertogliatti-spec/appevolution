import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function PartnerLogin({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Inserisci email e password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Credenziali non valide');
      }

      // Verifica che sia un partner
      if (data.user?.user_type === 'cliente_analisi') {
        throw new Error('Questo accesso è riservato ai partner. Se sei un cliente, usa la pagina dedicata.');
      }

      // Salva token e user
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Callback
      if (onLogin) {
        onLogin(data.user, data.access_token);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1E2128' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-2xl font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <div className="text-left">
              <span className="text-2xl font-black" style={{ color: '#FFFFFF' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
              <div className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                Area Partner
              </div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl p-8" style={{ background: '#FFFFFF' }}>
          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: '#1E2128' }}>
            Accedi al tuo account
          </h1>
          <p className="text-center mb-8" style={{ color: '#5F6572' }}>
            Inserisci le credenziali fornite dal team Evolution PRO
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="tuaemail@esempio.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                  style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                  data-testid="partner-email-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="La tua password"
                  className="w-full pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                  style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                  data-testid="partner-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  ) : (
                    <Eye className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
              style={{ background: '#F5C518', color: '#1E2128' }}
              data-testid="partner-login-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Accedi
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid #ECEDEF' }}>
            <p className="text-sm" style={{ color: '#5F6572' }}>
              Non hai ancora un account partner?
            </p>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
              Contatta il team Evolution PRO per informazioni.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: '#5F6572' }}>
          © 2026 Evolution PRO - Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
}

export default PartnerLogin;
