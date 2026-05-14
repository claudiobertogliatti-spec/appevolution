/**
 * Ciak Partner — AvatarCheckout.
 * Porting di components/partner/AvatarCheckout.jsx. Re-skin palette Ciak.
 * Dipendenza di AcceleraCrescitaPage (categoria "visibilità" → Avatar PRO).
 *
 * Endpoint backend invariati:
 *  GET  /api/avatar-packages
 *  GET  /api/avatar-checkout/status/:sessionId
 *  POST /api/avatar-checkout  → { checkout_url }
 */
import { useState, useEffect } from "react";
import {
  CreditCard, Check, Package, Sparkles, Loader2,
  AlertCircle, ChevronRight, Shield, Clock, ArrowLeft,
} from "lucide-react";

export function AvatarCheckout({ partner, onBack }) {
  const [packages, setPackages] = useState({});
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [lessonDetails, setLessonDetails] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState(null);

  const partnerId = partner?.id || "demo";
  const partnerName = partner?.name || "Partner";
  const partnerEmail = partner?.email || "";

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    if (sessionId) {
      pollPaymentStatus(sessionId);
    } else {
      loadPackages();
    }
  }, []);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/avatar-packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || {});
      }
    } catch (err) {
      setError("Errore nel caricamento dei pacchetti");
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setPaymentStatus({
        status: "timeout",
        message: "Verifica dello stato del pagamento scaduta. Controlla la tua email per conferma.",
      });
      return;
    }

    try {
      const response = await fetch(`/api/avatar-checkout/status/${sessionId}`);
      if (!response.ok) throw new Error("Errore verifica pagamento");

      const data = await response.json();

      if (data.payment_status === "paid") {
        setPaymentStatus({
          status: "success",
          message: "Pagamento completato! La produzione del tuo avatar inizierà a breve.",
          data: data,
        });
        window.history.replaceState({}, "", window.location.pathname);
        return;
      } else if (data.status === "expired") {
        setPaymentStatus({
          status: "expired",
          message: "Sessione di pagamento scaduta. Riprova.",
        });
        return;
      }

      setPaymentStatus({
        status: "processing",
        message: "Verifica pagamento in corso...",
      });
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (err) {
      setPaymentStatus({
        status: "error",
        message: "Errore nella verifica del pagamento",
      });
    }
  };

  const handleCheckout = async () => {
    if (!selectedPackage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/avatar-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_id: selectedPackage,
          partner_id: partnerId,
          partner_name: partnerName,
          partner_email: partnerEmail,
          origin_url: window.location.origin,
          lesson_details: lessonDetails,
        }),
      });

      if (!response.ok) throw new Error("Errore creazione checkout");

      const data = await response.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL checkout non ricevuto");
      }
    } catch (err) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-yellow-500" />
          <p className="text-sm text-slate-400">Caricamento pacchetti...</p>
        </div>
      </div>
    );
  }

  if (paymentStatus) {
    return (
      <div className="p-8">
        <div className="max-w-lg mx-auto">
          <div
            className={`rounded-2xl p-8 text-center ${
              paymentStatus.status === "success"
                ? "bg-emerald-50"
                : paymentStatus.status === "processing"
                ? "bg-yellow-50"
                : "bg-red-50"
            }`}
          >
            {paymentStatus.status === "success" && (
              <>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-emerald-500">
                  <Check className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-slate-900">
                  Pagamento completato
                </h2>
              </>
            )}
            {paymentStatus.status === "processing" && (
              <>
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-yellow-500" />
                <h2 className="text-xl font-semibold mb-2 text-slate-900">
                  Verifica in corso...
                </h2>
              </>
            )}
            {(paymentStatus.status === "error" || paymentStatus.status === "expired") && (
              <>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-500">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2 text-slate-900">
                  Problema con il pagamento
                </h2>
              </>
            )}
            <p className="text-sm mb-6 text-slate-600">{paymentStatus.message}</p>

            {paymentStatus.status === "success" && (
              <div className="p-4 rounded-xl mb-6 bg-white">
                <p className="text-sm text-slate-600">
                  Riceverai un'email con i dettagli.
                  <br />
                  Il team inizierà la produzione del tuo avatar a breve.
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setPaymentStatus(null);
                loadPackages();
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="px-6 py-3 rounded-xl font-semibold bg-yellow-400 text-slate-900 hover:bg-yellow-500 transition"
            >
              {paymentStatus.status === "success" ? "Torna alla Dashboard" : "Riprova"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Avatar PRO — Servizio Delega
          </h1>
          <p className="text-sm text-slate-400">
            Lascia che il nostro team crei video professionali per te
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="relative bg-slate-900 p-6 flex items-center justify-center min-h-[300px]">
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-slate-900">
              ESEMPIO AVATAR
            </div>
            <div className="w-full max-w-md">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video">
                <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
                  <source
                    src="https://customer-assets.emergentagent.com/job_workflow-sync-6/artifacts/w619n7sa_base.mp4"
                    type="video/mp4"
                  />
                </video>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-white text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Demo 30s
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 w-fit bg-yellow-50 text-yellow-700">
              <Sparkles className="w-3 h-3" />
              SERVIZIO PREMIUM
            </div>

            <h2 className="text-2xl font-semibold mb-4 text-slate-900">
              Il tuo clone digitale che insegna per te
            </h2>

            <p className="text-base mb-6 leading-relaxed text-slate-600">
              Puoi <strong>moltiplicare la tua presenza</strong> senza registrare un singolo
              video. Con il servizio Avatar PRO creiamo un <strong>avatar AI professionale</strong>{" "}
              con la tua voce e il tuo stile che parla, sorride e insegna come faresti tu.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                { t: "Qualità cinematografica", d: "Risoluzione 1080p HD" },
                { t: "Espressioni naturali", d: "Sorrisi e gesti realistici" },
                { t: "Script ottimizzato", d: "Copy persuasivo incluso" },
                { t: "Consegna rapida", d: "48-72h per lezione" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-50">
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{item.t}</div>
                    <div className="text-xs text-slate-400">{item.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-yellow-50">
              <p className="text-sm text-yellow-800">
                <strong>Come funziona:</strong> ci invii il tuo script (o lo scriviamo noi), noi
                creiamo il video con il tuo avatar che parla in modo naturale e coinvolgente.
                Ricevi il video pronto per essere caricato nel tuo corso.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Title */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-900">Scegli il pacchetto</h3>
        <p className="text-sm text-slate-400">Più lezioni acquisti, più risparmi</p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(packages).map(([id, pkg]) => {
          const isSelected = selectedPackage === id;
          const isPopular = id === "bundle_5";
          const isBest = id === "bundle_15";

          return (
            <div
              key={id}
              onClick={() => setSelectedPackage(id)}
              className={`relative bg-white rounded-2xl p-6 cursor-pointer transition border border-gray-200 ${
                isSelected
                  ? "ring-2 ring-yellow-400 shadow-lg scale-[1.02]"
                  : "hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500 text-white">
                  PIÙ POPOLARE
                </div>
              )}
              {isBest && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                  MIGLIOR VALORE
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isSelected ? "bg-yellow-400" : "bg-yellow-50"
                  }`}
                >
                  <Package
                    className={`w-6 h-6 ${isSelected ? "text-slate-900" : "text-yellow-700"}`}
                  />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold text-slate-900">€{pkg.price}</div>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2 text-slate-900">{pkg.name}</h3>
              <p className="text-sm mb-4 text-slate-600">{pkg.description}</p>

              <div className="space-y-2">
                {pkg.includes.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <span className="text-slate-600">{item}</span>
                  </div>
                ))}
              </div>

              {isSelected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center bg-yellow-400">
                  <Check className="w-4 h-4 text-slate-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lesson Details Input */}
      {selectedPackage && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold mb-3 text-slate-900">Dettagli lezione (opzionale)</h3>
          <textarea
            value={lessonDetails}
            onChange={(e) => setLessonDetails(e.target.value)}
            placeholder="Descrivi brevemente il contenuto della lezione o argomento che vuoi trattare..."
            className="w-full p-4 rounded-xl border border-gray-200 text-sm resize-none min-h-[100px] outline-none"
          />
        </div>
      )}

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
            {selectedPackage && packages[selectedPackage] && (
              <>
                <div className="text-sm text-slate-400">Totale da pagare</div>
                <div className="text-3xl font-semibold text-slate-900">
                  €{packages[selectedPackage].price}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleCheckout}
            disabled={!selectedPackage || isProcessing}
            className="px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition hover:opacity-90 disabled:opacity-50 bg-yellow-400 text-slate-900"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Elaborazione...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Procedi al pagamento
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
            Produzione entro 48h
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4" />
            Qualità professionale garantita
          </div>
        </div>
      </div>
    </div>
  );
}

export default AvatarCheckout;
