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
      const res = await axios.post(`${API}/api/clienti/register`, {
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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF9E7', border: '1px solid #FFD24D' }}>
            <User className="w-8 h-8 text-[#FFD24D]" />
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
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl font-bold bg-[#FFD24D] text-black hover:bg-[#e0b115] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="btn-register">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Registrazione...</> : <>Continua<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </form>

        <p className="text-xs text-[#9CA3AF] text-center mt-6">
          Registrandoti accetti i nostri <a href="#" className="text-[#FFD24D] hover:underline">Termini</a> e <a href="#" className="text-[#FFD24D] hover:underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}

export default AnalisiRegistrazione;
