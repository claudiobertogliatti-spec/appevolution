/**
 * Ciak Partner — ConsulenzaCheckout.
 * Porting di components/partner/ConsulenzaCheckout.jsx. Re-skin palette Ciak.
 * Dipendenza di AcceleraCrescitaPage (categoria "direzione" → sessioni 1:1).
 *
 * Endpoint backend invariato:
 *  POST /api/consulenza-checkout  → { checkout_url }
 */
import { useState } from "react";
import {
  Calendar, CreditCard, Check, Loader2,
  AlertCircle, ChevronRight, Shield, Clock, ArrowLeft,
  User, Video, FileText, Target, Tag,
} from "lucide-react";

export function ConsulenzaCheckout({ partner, onBack, defaultConsultant, packages }) {
  const DEFAULT_PACKAGES = [
    { label: "1 sessione", price: 180, originalPrice: null, saving: null },
    { label: "5 sessioni", price: 765, originalPrice: 900, saving: "–15%", perSession: 153 },
    { label: "10 sessioni", price: 1350, originalPrice: 1800, saving: "–25%", perSession: 135 },
  ];
  const pkgs = packages || DEFAULT_PACKAGES;

  const [selectedConsultant, setSelectedConsultant] = useState(defaultConsultant || null);
  const [selectedPackageIdx, setSelectedPackageIdx] = useState(0);
  const [selectedDate] = useState("");
  const [projectFocus, setProjectFocus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);

  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerEmail = partner?.email || "";
  const selectedPkg = pkgs[selectedPackageIdx];

  const CONSULTANTS = [
    {
      id: "claudio",
      name: "Claudio Bertogliatti",
      role: "Fondatore & Strategist",
      avatar: "CB",
      isClaudio: true,
      expertise: ["Strategia di lancio", "Posizionamento", "Scaling business"],
      description:
        "20+ anni di esperienza nel digital marketing. Esperto in strategie di crescita e monetizzazione.",
    },
    {
      id: "antonella",
      name: "Antonella",
      role: "Operations Manager",
      avatar: "A",
      isClaudio: false,
      expertise: ["Campagne ADV", "Funnel optimization", "Content strategy"],
      description:
        "Specialista in operazioni e campagne pubblicitarie. Focus su risultati misurabili.",
    },
  ];

  const handleCheckout = async () => {
    if (!selectedConsultant) {
      setError("Seleziona un consulente");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/consulenza-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: "consulenza_marketing",
          consultant_id: selectedConsultant,
          partner_id: String(partnerId),
          partner_name: partnerName,
          partner_email: partnerEmail,
          origin_url: window.location.origin,
          preferred_date: selectedDate,
          project_focus: projectFocus,
          price: selectedPkg.price,
          package_label: selectedPkg.label,
        }),
      });

      if (!response.ok) throw new Error("Errore creazione checkout");

      const data = await response.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setPaymentStatus({
          status: "pending",
          message: "Richiesta inviata. Ti contatteremo per confermare la data.",
        });
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (paymentStatus) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto">
          <div className="rounded-2xl p-8 text-center bg-emerald-50">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-emerald-500">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2 text-slate-900">Richiesta inviata</h2>
            <p className="text-sm mb-6 text-slate-600">{paymentStatus.message}</p>
            <div className="p-4 rounded-xl mb-6 bg-white">
              <p className="text-sm text-slate-600">
                Riceverai un'email di conferma a breve.
                <br />
                Ti contatteremo per fissare la data della consulenza.
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-xl font-semibold bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition"
            >
              Torna ai Servizi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Consulenza Marketing 1:1</h1>
          <p className="text-sm text-slate-400">90 minuti di strategia personalizzata</p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 bg-slate-900">
            <Target className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                SESSIONE PREMIUM
              </span>
              <span className="text-2xl font-semibold text-slate-900">€{selectedPkg.price}</span>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900">
              Strategia su misura per il tuo business
            </h2>
            <p className="text-sm mb-4 text-slate-600">
              Una sessione intensiva di 90 minuti dove analizzeremo insieme la tua situazione
              attuale e definiremo un piano d'azione concreto per il tuo progetto.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Target, text: "Analisi strategica personalizzata" },
                { icon: FileText, text: "Piano d'azione dettagliato" },
                { icon: Video, text: "Sessione registrata" },
                { icon: Clock, text: "90 minuti dedicati" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <item.icon className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Consultant Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
          <User className="w-5 h-5 text-yellow-500" />
          Scegli il tuo consulente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONSULTANTS.map((consultant) => {
            const isSelected = selectedConsultant === consultant.id;
            return (
              <div
                key={consultant.id}
                onClick={() => setSelectedConsultant(consultant.id)}
                className={`bg-white rounded-xl p-5 cursor-pointer transition border border-gray-200 ${
                  isSelected ? "ring-2 ring-yellow-400 shadow-lg" : "hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0 ${
                      consultant.isClaudio
                        ? "bg-yellow-400 text-slate-900"
                        : "bg-slate-500 text-white"
                    }`}
                  >
                    {consultant.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-slate-900">{consultant.name}</h4>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-yellow-400">
                          <Check className="w-3 h-3 text-slate-900" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs mb-2 text-slate-400">{consultant.role}</p>
                    <p className="text-sm mb-3 text-slate-600">{consultant.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {consultant.expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-xs bg-gray-50 text-slate-600"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Package Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900">
          <Tag className="w-5 h-5 text-yellow-500" />
          Scegli il pacchetto
        </h3>
        <div className="space-y-2">
          {pkgs.map((pkg, i) => (
            <button
              key={i}
              onClick={() => setSelectedPackageIdx(i)}
              className={`w-full rounded-xl p-4 text-left transition border-2 ${
                selectedPackageIdx === i
                  ? "bg-yellow-50 border-yellow-400"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-900">{pkg.label}</span>
                  {pkg.perSession && (
                    <span className="ml-2 text-xs text-slate-400">
                      → €{pkg.perSession}/sessione
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pkg.originalPrice && (
                    <span className="text-xs line-through text-slate-400">
                      €{pkg.originalPrice}
                    </span>
                  )}
                  <span className="text-base font-semibold text-slate-900">€{pkg.price}</span>
                  {pkg.saving && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {pkg.saving}
                    </span>
                  )}
                  {selectedPackageIdx === i && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-yellow-400">
                      <Check className="w-3 h-3 text-slate-900" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold mb-3 text-slate-900">
          Su cosa vorresti focalizzarti? (opzionale)
        </h4>
        <textarea
          value={projectFocus}
          onChange={(e) => setProjectFocus(e.target.value)}
          placeholder="Es: vorrei analizzare la mia strategia di lancio, ottimizzare le campagne ADV, definire il posizionamento..."
          className="w-full p-4 rounded-xl border border-gray-200 text-sm resize-none min-h-[100px] outline-none"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl flex items-center gap-3 bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
        </div>
      )}

      {/* Checkout Button */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Totale da pagare</div>
            <div className="text-3xl font-semibold text-slate-900">€{selectedPkg.price}</div>
            <div className="text-xs text-slate-400">
              {selectedPkg.label} · IVA inclusa
              {selectedPkg.perSession && ` · €${selectedPkg.perSession}/sessione`}
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={!selectedConsultant || isProcessing}
            className="px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition hover:opacity-90 disabled:opacity-50 bg-yellow-400 text-slate-900"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <Calendar className="w-5 h-5" />
                Prenota Consulenza
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4" />
            Pagamento sicuro con Stripe
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-4 h-4" />
            90 minuti garantiti
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Video className="w-4 h-4" />
            Sessione registrata inclusa
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsulenzaCheckout;
