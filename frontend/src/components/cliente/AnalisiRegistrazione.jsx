import React, { useState } from "react";
import { 
  User, Mail, Lock, ArrowRight, ArrowLeft, Loader2, 
  Eye, EyeOff, CheckCircle, AlertTriangle
} from "lucide-react";
import axios from "axios";
import { API } from "../../utils/api-config";

export function AnalisiRegistrazione({ onComplete, onBack }) {
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: ""
  });
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
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Register the cliente
      const res = await axios.post(`${API}/clienti/register`, {
        nome: formData.nome,
        cognome: formData.cognome,
        email: formData.email,
        telefono: formData.telefono,
        password: formData.password
      });

      if (res.data.success) {
        onComplete({
          id: res.data.cliente_id,
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          telefono: formData.telefono
        });
      } else {
        setError(res.data.message || "Errore durante la registrazione");
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError("Email già registrata. Effettua il login.");
      } else {
        setError(err.response?.data?.detail || "Errore di connessione. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F5C518]/20 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[#F5C518]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Crea il tuo Account</h1>
          <p className="text-gray-400 text-sm">
            Per procedere con l'Analisi Strategica
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Cognome */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Mario"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
                data-testid="input-nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cognome</label>
              <input
                type="text"
                name="cognome"
                value={formData.cognome}
                onChange={handleChange}
                placeholder="Rossi"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
                data-testid="input-cognome"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="mario@email.com"
                className="w-full p-3 pl-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
                data-testid="input-email"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          </div>

          {/* Telefono */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Telefono</label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+39 333 1234567"
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
              data-testid="input-telefono"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimo 6 caratteri"
                className="w-full p-3 pl-11 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
                data-testid="input-password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Conferma Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Ripeti la password"
                className="w-full p-3 pl-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5C518]"
                data-testid="input-confirm-password"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-400 border border-white/10 hover:border-white/30 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold bg-[#F5C518] text-black hover:bg-[#e0b115] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="btn-register"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrazione...
                </>
              ) : (
                <>
                  Continua
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Registrandoti accetti i nostri{" "}
          <a href="#" className="text-[#F5C518] hover:underline">Termini di Servizio</a> e{" "}
          <a href="#" className="text-[#F5C518] hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

export default AnalisiRegistrazione;
