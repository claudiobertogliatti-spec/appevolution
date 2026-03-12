import React, { useState } from 'react';
import { CheckCircle, ArrowRight, Loader2, Phone, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function AnalisiStrategicaLanding({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    telefono: '',
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

  const isFormValid = () => {
    return formData.nome.length >= 2 &&
           formData.cognome.length >= 2 &&
           formData.email.includes('@') &&
           formData.telefono.length >= 8 &&
           formData.password.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/cliente-analisi/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante la registrazione');
      }

      // Salva token
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Callback per redirect
      if (onRegisterSuccess) {
        onRegisterSuccess(data);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    "Analisi del tuo posizionamento",
    "Valutazione reale del mercato",
    "Diagnosi della fattibilità del progetto",
    "Videocall strategica entro 48h",
    "Accesso alla guida \"Come creare un videocorso che vende\""
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* SINISTRA - Value Proposition */}
          <div className="lg:pr-8">
            {/* Logo */}
            <div className="mb-8">
              <span className="text-2xl font-black" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-6" style={{ color: '#1E2128' }}>
              Scopri se la tua competenza può diventare un'
              <span style={{ color: '#F5C518' }}>Accademia Digitale</span> che vende davvero
            </h1>

            {/* Subheadline */}
            <p className="text-xl mb-8" style={{ color: '#5F6572' }}>
              Analisi Strategica selettiva per professionisti che vogliono trasformare la propria competenza in un asset digitale.
            </p>

            {/* Benefits */}
            <div className="space-y-4 mb-8">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#10B981' }} />
                  <span className="text-lg" style={{ color: '#1E2128' }}>{benefit}</span>
                </div>
              ))}
            </div>

            {/* Price Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full" style={{ background: '#1E2128' }}>
              <span className="text-white">Investimento:</span>
              <span className="text-2xl font-black" style={{ color: '#F5C518' }}>€67</span>
              <span className="text-white/60 text-sm">una tantum</span>
            </div>
          </div>

          {/* DESTRA - Form Registrazione */}
          <div className="lg:pl-8">
            <div className="rounded-2xl p-8 shadow-xl" style={{ background: '#FFFFFF', border: '2px solid #ECEDEF' }}>
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E2128' }}>
                Crea il tuo account Evolution PRO
              </h2>
              <p className="text-sm mb-6" style={{ color: '#5F6572' }}>
                Registrati per accedere all'Analisi Strategica
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => handleChange('nome', e.target.value)}
                      placeholder="Il tuo nome"
                      className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ background: '#FAFAF7', border: '1px solid #ECEDEF', focusRing: '#F5C518' }}
                      data-testid="input-nome"
                    />
                  </div>
                </div>

                {/* Cognome */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Cognome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={formData.cognome}
                      onChange={(e) => handleChange('cognome', e.target.value)}
                      placeholder="Il tuo cognome"
                      className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                      data-testid="input-cognome"
                    />
                  </div>
                </div>

                {/* Telefono */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Telefono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                      data-testid="input-telefono"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="tuaemail@esempio.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                      data-testid="input-email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Minimo 6 caratteri"
                      className="w-full pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2"
                      style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                      data-testid="input-password"
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

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!isFormValid() || loading}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                  style={{ background: '#F5C518', color: '#1E2128' }}
                  data-testid="register-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Crea account e continua
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Note */}
                <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
                  Registrandoti accetti i Termini di Servizio e la Privacy Policy di Evolution PRO.
                </p>
              </form>

              {/* Already have account */}
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid #ECEDEF' }}>
                <p className="text-sm text-center" style={{ color: '#5F6572' }}>
                  Hai già un account?{' '}
                  <a href="/" className="font-medium hover:underline" style={{ color: '#F5C518' }}>
                    Accedi
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalisiStrategicaLanding;
