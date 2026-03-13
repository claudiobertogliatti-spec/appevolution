import React, { useState } from 'react';
import { CheckCircle, ArrowRight, X, Loader2, Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export function Homepage() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Registration state
  const [registerForm, setRegisterForm] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    password: ''
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Login state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError(null);

    try {
      const response = await fetch(`${API}/api/cliente-analisi/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Errore durante la registrazione');
      }

      // Save token and user
      if (data.token) {
        localStorage.setItem('access_token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Redirect to dashboard
      window.location.href = '/dashboard-cliente';

    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Credenziali non valide');
      }

      // Save token and user
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on user type
      if (data.user?.user_type === 'cliente_analisi') {
        // Cliente - redirect alla dashboard cliente
        window.location.href = '/dashboard-cliente';
      } else {
        // Partner/Admin - redirect alla dashboard partner
        window.location.href = '/dashboard-partner';
      }

    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF7' }}>
      {/* Header */}
      <header className="border-b" style={{ background: '#FFFFFF', borderColor: '#ECEDEF' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <div>
              <span className="font-black text-lg" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
            </div>
          </div>
          
          {/* Login Link */}
          <button 
            onClick={() => setShowLoginModal(true)}
            className="text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: '#5F6572' }}
          >
            Accedi
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          
          {/* Title - Centered */}
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-12 text-center" 
            style={{ color: '#1E2128' }}
          >
            Scopri se la tua competenza può diventare una{' '}
            <span style={{ color: '#F5C518' }}>Accademia Digitale</span>{' '}
            che vende davvero
          </h1>

          {/* Two Columns */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column - Image */}
            <div className="flex justify-center lg:justify-end">
              <img 
                src="/images/hero-analisi.png" 
                alt="Analisi Strategica" 
                className="w-full max-w-md rounded-2xl"
              />
            </div>

            {/* Right Column - Content */}
            <div>
              {/* Subtitle */}
              <p 
                className="text-lg mb-8" 
                style={{ color: '#5F6572' }}
              >
                Analisi Strategica selettiva per professionisti che vogliono trasformare la propria competenza in una Accademia Digitale sostenibile.
              </p>

              {/* Benefits */}
              <div className="flex flex-col gap-3 mb-8">
                {[
                  'Analisi del tuo posizionamento',
                  'Valutazione reale del mercato',
                  'Diagnosi della fattibilità del progetto',
                  'Videocall strategica entro 48 ore'
                ].map((benefit, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F5C518' }} />
                    <span style={{ color: '#1E2128' }}>{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              <button
                onClick={() => setShowRegisterModal(true)}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="cta-analisi-strategica"
              >
                Richiedi l'Analisi Strategica
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Scarcity Text */}
              <p 
                className="mt-4 text-sm font-medium"
                style={{ color: '#9CA3AF' }}
              >
                Solo 4 nuovi progetti accettati ogni mese
              </p>

              {/* Partner Link */}
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid #ECEDEF' }}>
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="text-sm transition-colors hover:opacity-70"
                  style={{ color: '#5F6572' }}
                >
                  Sei già partner Evolution PRO?{' '}
                  <span className="font-medium" style={{ color: '#F5C518' }}>Accedi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center" style={{ borderTop: '1px solid #ECEDEF' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#F5C518' }}>
              <span className="text-xs font-black" style={{ color: '#1E2128' }}>E</span>
            </div>
            <span className="font-bold text-sm" style={{ color: '#1E2128' }}>
              EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: '#5F6572' }}>
            Trasformiamo competenze reali in asset digitali sostenibili.
          </p>
          <a 
            href="https://www.evolution-pro.it" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-medium hover:opacity-70 transition-colors"
            style={{ color: '#F5C518' }}
          >
            www.evolution-pro.it
          </a>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: Registrazione Cliente
          ═══════════════════════════════════════════════════════════════════════════ */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="relative w-full max-w-md rounded-2xl p-8 max-h-[90vh] overflow-y-auto"
            style={{ background: '#FFFFFF' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#1E2128' }}>
              Crea il tuo account Evolution PRO
            </h2>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={registerForm.nome}
                    onChange={(e) => setRegisterForm({ ...registerForm, nome: e.target.value })}
                    placeholder="Il tuo nome"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="register-nome"
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
                    value={registerForm.cognome}
                    onChange={(e) => setRegisterForm({ ...registerForm, cognome: e.target.value })}
                    placeholder="Il tuo cognome"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="register-cognome"
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
                    value={registerForm.telefono}
                    onChange={(e) => setRegisterForm({ ...registerForm, telefono: e.target.value })}
                    placeholder="+39 333 1234567"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="register-telefono"
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
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    placeholder="tuaemail@esempio.com"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="register-email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    placeholder="Crea una password"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="register-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    ) : (
                      <Eye className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {registerError && (
                <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  {registerError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="register-submit"
              >
                {registerLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Crea account e inizia il questionario
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              {/* Time hint */}
              <p className="text-center text-sm" style={{ color: '#9CA3AF' }}>
                Tempo richiesto: circa 5 minuti
              </p>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODAL: Login Partner
          ═══════════════════════════════════════════════════════════════════════════ */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div 
            className="relative w-full max-w-md rounded-2xl p-8"
            style={{ background: '#FFFFFF' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </button>

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F5C518' }}>
                <span className="text-lg font-black" style={{ color: '#1E2128' }}>E</span>
              </div>
              <span className="font-black text-lg" style={{ color: '#1E2128' }}>
                EVOLUTION <span style={{ color: '#F5C518' }}>PRO</span>
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold mb-2 text-center" style={{ color: '#1E2128' }}>
              Accedi
            </h2>
            <p className="text-sm text-center mb-6" style={{ color: '#5F6572' }}>
              Accedi con le tue credenziali
            </p>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="tuaemail@esempio.com"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="login-email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1E2128' }}>Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="La tua password"
                    required
                    className="w-full pl-11 pr-11 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F5C518] transition-all"
                    style={{ background: '#FAFAF7', border: '1px solid #ECEDEF' }}
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    ) : (
                      <Eye className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <div className="p-3 rounded-xl text-sm" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                  {loginError}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:opacity-90"
                style={{ background: '#F5C518', color: '#1E2128' }}
                data-testid="login-submit"
              >
                {loginLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Accedi'
                )}
              </button>
            </form>

            {/* Help text */}
            <p className="text-xs text-center mt-6" style={{ color: '#9CA3AF' }}>
              Non hai un account partner? Contatta il team Evolution PRO.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Homepage;
