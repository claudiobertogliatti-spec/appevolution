import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Clock, Download, Receipt } from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it")) ? "" : (process.env.REACT_APP_BACKEND_URL || "");

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNER PAYMENTS - I Miei Pagamenti (Solo Lettura)
// ═══════════════════════════════════════════════════════════════════════════════

export function PartnerPayments({ partner }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (partner?.id) {
      fetchPayments();
    }
  }, [partner]);
  
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/partners/${partner.id}/payments`);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching payments:", e);
    } finally {
      setLoading(false);
    }
  };
  
  const totalPaid = payments.filter(p => p.status === "paid").reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((sum, p) => sum + (p.amount || 0), 0);
  
  return (
    <div className="min-h-full p-6" style={{ background: "#FAFAF7" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
               style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "#1E2128" }}>I Miei Pagamenti</h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>Storico delle transazioni della partnership</p>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #ECEDEF" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Totale Pagato</p>
                <p className="text-3xl font-black text-green-600">
                  €{totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: "1px solid #ECEDEF" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">In Attesa</p>
                <p className="text-3xl font-black" style={{ color: "#F59E0B" }}>
                  €{totalPending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Payments List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
          <div className="p-5 border-b" style={{ background: "#FAFAF7" }}>
            <h2 className="font-bold flex items-center gap-2" style={{ color: "#1E2128" }}>
              <Receipt className="w-5 h-5" />
              Storico Transazioni
            </h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Caricamento...</p>
            </div>
          ) : payments.length > 0 ? (
            <div className="divide-y">
              {payments.map((payment, idx) => (
                <div key={payment.id || idx} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        payment.status === "paid" ? "bg-green-100" : "bg-yellow-100"
                      }`}>
                        {payment.status === "paid" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: "#1E2128" }}>{payment.description}</p>
                        <p className="text-sm text-gray-500">
                          {payment.date ? new Date(payment.date).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black" style={{ color: "#1E2128" }}>
                        €{payment.amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        payment.status === "paid" 
                          ? "bg-green-100 text-green-700" 
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {payment.status === "paid" ? "Pagato" : "Da pagare"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nessun pagamento registrato</p>
            </div>
          )}
        </div>
        
        {/* Info Box */}
        <div className="mt-6 p-4 rounded-xl" style={{ background: "#FFF8DC", border: "1px solid #F2C41850" }}>
          <p className="text-sm" style={{ color: "#92700C" }}>
            💡 <strong>Nota:</strong> Per domande sui pagamenti o per richiedere una fattura, 
            contatta il team Evolution PRO tramite la chat con Stefania.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PartnerPayments;
