import { useState } from "react";
import { User, Mail, Briefcase, DollarSign, Lock, FileText, Check, Copy, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { S, NICCHIE_DISPONIBILI } from "../../data/constants";

// Utility functions
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "Evo";
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd + "!";
}

function generateWelcomeEmail(partner, appPassword, systemePassword) {
  return {
    subject: `🎯 Benvenuto in Evolution PRO, ${partner.name.split(" ")[0]}!`,
    body: `Ciao ${partner.name.split(" ")[0]}!

Sono entusiasta di darti il benvenuto nel programma Evolution PRO.

Da oggi hai accesso a due piattaforme:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 APP EVOLUTION PRO (Dashboard Partner)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: https://app.evolution-pro.it
Email: ${partner.email}
Password: ${appPassword}

Qui troverai:
• Il videocorso operativo passo-passo
• I template e le risorse
• VALENTINA, la tua assistente AI 24/7
• Il tuo calendario editoriale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 ACCADEMIA SYSTEME.IO (Area Studenti)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: https://evolution-pro.systeme.io/area-membri
Email: ${partner.email}
Password: ${systemePassword}

Qui accederai ai moduli formativi del tuo corso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMO STEP: Accedi all'app e completa il Modulo 0 – Introduzione.

Se hai domande, scrivi a VALENTINA direttamente dall'app oppure rispondi a questa email.

A presto!
Claudio B.
Evolution PRO LLC`
  };
}

export function NuovoPartnerForm({ onClose, onComplete }) {
  const [step, setStep] = useState("form"); // "form" | "preview" | "success"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    niche: "",
    investment: "",
    systemePassword: "",
    notes: "",
    sendEmail: true,
  });
  const [errors, setErrors] = useState({});
  const [generatedData, setGeneratedData] = useState(null);

  function validateForm() {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Nome obbligatorio";
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = "Email non valida";
    if (!formData.niche) errs.niche = "Seleziona una nicchia";
    if (!formData.investment || parseFloat(formData.investment) < 500) errs.investment = "Investimento minimo €500";
    if (!formData.systemePassword || formData.systemePassword.length < 8) errs.systemePassword = "Password Systeme minimo 8 caratteri";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handlePreview() {
    if (!validateForm()) return;
    const appPassword = generatePassword();
    const emailData = generateWelcomeEmail(
      { name: formData.name, email: formData.email },
      appPassword,
      formData.systemePassword
    );
    setGeneratedData({ appPassword, emailData });
    setStep("preview");
  }

  function handleCreate() {
    setTimeout(() => {
      setStep("success");
      if (onComplete) onComplete({ ...formData, ...generatedData });
    }, 800);
  }

  function copyToClipboard() {
    const text = `✅ NUOVO PARTNER ATTIVATO

Nome: ${formData.name}
Nicchia: ${formData.niche}

📱 APP EVOLUTION PRO
Email: ${formData.email}
Password: ${generatedData.appPassword}

🎓 ACCADEMIA SYSTEME
Email: ${formData.email}
Password: ${formData.systemePassword}

Primo step: Modulo 0 nell'app`;
    navigator.clipboard?.writeText(text);
  }

  // Success State
  if (step === "success") {
    return (
      <div className="max-w-xl mx-auto animate-slide-in" data-testid="nuovo-partner-success">
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-xl font-extrabold text-[#16a34a] mb-2">Partner Creato con Successo!</div>
          <div className="text-sm text-white/50 mb-6">
            {formData.name} è stato aggiunto alla pipeline.<br />
            {formData.sendEmail && "Email benvenuto inviata."}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left mb-6">
            <div className="text-[10px] font-extrabold text-white/40 uppercase tracking-wider mb-4">
              Credenziali Generate
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white/40 w-28">Email</span>
                <span className="font-mono text-sm font-bold text-white">{formData.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white/40 w-28">Password App</span>
                <span className="font-mono text-sm font-bold text-[#F5C518]">{generatedData.appPassword}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-white/40 w-28">Password Systeme</span>
                <span className="font-mono text-sm font-bold text-white">{formData.systemePassword}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors"
            >
              <Copy className="w-4 h-4" /> Copia per Telegram
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-[#F5C518] text-black rounded-xl px-4 py-3 text-sm font-extrabold hover:bg-[#e0a800] transition-colors"
            >
              Vai alla scheda Partner →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview State
  if (step === "preview") {
    return (
      <div className="max-w-xl mx-auto animate-slide-in" data-testid="nuovo-partner-preview">
        <div className="bg-[#1a2332] border border-white/10 rounded-xl p-6">
          <div className="text-xs font-extrabold text-white/40 uppercase tracking-wider mb-4">
            Anteprima Email Benvenuto
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="text-xs text-white/40 mb-1">A: {formData.email}</div>
              <div className="text-sm font-extrabold text-white">{generatedData.emailData.subject}</div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              <pre className="text-xs font-medium text-white/60 whitespace-pre-wrap font-mono leading-relaxed">
                {generatedData.emailData.body}
              </pre>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep("form")}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Modifica dati
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 flex items-center justify-center gap-2 bg-[#F5C518] text-black rounded-xl px-4 py-3 text-sm font-extrabold hover:bg-[#e0a800] transition-colors"
            >
              <Check className="w-4 h-4" /> Conferma e Crea Partner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form State
  return (
    <div className="max-w-xl mx-auto animate-slide-in" data-testid="nuovo-partner-form">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#2c3e55] rounded-xl p-6 text-center mb-6">
        <div className="text-5xl mb-3">🎯</div>
        <div className="text-xl font-extrabold text-white mb-2">Nuovo Partner — Onboarding</div>
        <div className="text-sm text-white/50">
          Compila i dati per generare gli accessi e inviare l'email benvenuto.<br />
          Assicurati di aver già creato l'account Systeme.io manualmente.
        </div>
      </div>

      {/* Dati Partner */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5 mb-4">
        <div className="text-xs font-extrabold text-white/40 uppercase tracking-wider mb-4">
          Dati Partner
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-white/60 mb-2 block">
              Nome completo<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className={`w-full bg-white/5 border rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-colors
                  ${errors.name ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#F5C518]'}`}
                placeholder="es. Marco Ferretti"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            {errors.name && <div className="text-xs font-bold text-red-400 mt-1">{errors.name}</div>}
          </div>

          <div>
            <label className="text-xs font-bold text-white/60 mb-2 block">
              Email<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                className={`w-full bg-white/5 border rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-colors
                  ${errors.email ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#F5C518]'}`}
                placeholder="marco.ferretti@gmail.com"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            {errors.email && <div className="text-xs font-bold text-red-400 mt-1">{errors.email}</div>}
            <div className="text-[11px] text-white/40 mt-1">Usa la stessa email con cui hai creato l'account Systeme.io</div>
          </div>

          <div>
            <label className="text-xs font-bold text-white/60 mb-2 block">
              Nicchia<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <select
                className={`w-full bg-white/5 border rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white outline-none transition-colors appearance-none cursor-pointer
                  ${errors.niche ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#F5C518]'}`}
                value={formData.niche}
                onChange={e => setFormData(prev => ({ ...prev, niche: e.target.value }))}
              >
                <option value="" className="bg-[#1a2332]">Seleziona nicchia...</option>
                {NICCHIE_DISPONIBILI.map(n => <option key={n} value={n} className="bg-[#1a2332]">{n}</option>)}
              </select>
            </div>
            {errors.niche && <div className="text-xs font-bold text-red-400 mt-1">{errors.niche}</div>}
          </div>

          <div>
            <label className="text-xs font-bold text-white/60 mb-2 block">
              Investimento (€)<span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="number"
                className={`w-full bg-white/5 border rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-colors
                  ${errors.investment ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#F5C518]'}`}
                placeholder="3000"
                value={formData.investment}
                onChange={e => setFormData(prev => ({ ...prev, investment: e.target.value }))}
              />
            </div>
            {errors.investment && <div className="text-xs font-bold text-red-400 mt-1">{errors.investment}</div>}
            <div className="text-[11px] text-white/40 mt-1">Importo minimo: €500</div>
          </div>
        </div>
      </div>

      {/* Accesso Systeme */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5 mb-4">
        <div className="text-xs font-extrabold text-white/40 uppercase tracking-wider mb-4">
          Accesso Systeme.io
        </div>

        <div>
          <label className="text-xs font-bold text-white/60 mb-2 block">
            Password Systeme.io<span className="text-red-400 ml-1">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              className={`w-full bg-white/5 border rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-colors
                ${errors.systemePassword ? 'border-red-500 bg-red-500/10' : 'border-white/10 focus:border-[#F5C518]'}`}
              placeholder="SysEvo2026_MF"
              value={formData.systemePassword}
              onChange={e => setFormData(prev => ({ ...prev, systemePassword: e.target.value }))}
            />
          </div>
          {errors.systemePassword && <div className="text-xs font-bold text-red-400 mt-1">{errors.systemePassword}</div>}
          <div className="text-[11px] text-white/40 mt-1">La password che hai impostato creando l'account su Systeme.io (minimo 8 caratteri)</div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-[#1a2332] border border-white/10 rounded-xl p-5 mb-4">
        <div className="text-xs font-extrabold text-white/40 uppercase tracking-wider mb-4">
          Note Interne (opzionale)
        </div>
        <div className="relative">
          <FileText className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pl-10 text-sm font-semibold text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#F5C518] resize-none min-h-[80px]"
            placeholder="es. Bonifico ricevuto 10/02 - causale EP2026MF - Provenienza: LinkedIn"
            value={formData.notes}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>
      </div>

      {/* Send Email Checkbox */}
      <div className="bg-[#FFFBEA]/10 border border-[#F5C518]/30 rounded-xl p-4 flex items-start gap-3 mb-6">
        <input
          type="checkbox"
          className="w-5 h-5 cursor-pointer accent-[#F5C518] flex-shrink-0 mt-0.5"
          checked={formData.sendEmail}
          onChange={e => setFormData(prev => ({ ...prev, sendEmail: e.target.checked }))}
        />
        <label className="text-xs font-bold text-[#F5C518]">
          Invia email benvenuto automaticamente con entrambi gli accessi (App + Systeme.io)
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white/60 hover:bg-white/10 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={handlePreview}
          className="flex-1 flex items-center justify-center gap-2 bg-[#F5C518] text-black rounded-xl px-4 py-3 text-sm font-extrabold hover:bg-[#e0a800] transition-colors"
        >
          Continua <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
