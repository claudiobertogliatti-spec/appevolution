import { useState, useEffect } from "react";
import {
  CreditCard, CheckCircle, Clock, Receipt, ArrowRight,
  FileText, Rocket, Phone, ChevronDown, ChevronUp, Shield,
  AlertCircle,
} from "lucide-react";

const API = (typeof window !== "undefined" && window.location.hostname.includes("evolution-pro.it"))
  ? "" : (process.env.REACT_APP_BACKEND_URL || "");

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function fmtEur(amount) {
  return `€${Number(amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONFERMA PAGAMENTO PRINCIPALE
   ═══════════════════════════════════════════════════════════════════════════ */

function ConfermaHero({ payments }) {
  const mainPayment = payments.find((p) => p.status === "paid" && p.amount >= 2000);
  const hasPaid = !!mainPayment;

  if (!hasPaid) {
    return (
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#FFFBEB", border: "2px solid #FDE68A" }}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#F59E0B20" }}>
            <Clock className="w-6 h-6" style={{ color: "#F59E0B" }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#92400E" }}>
              Pagamento in attesa
            </p>
            <p className="text-lg font-black" style={{ color: "#1E2128" }}>Partnership non ancora attiva</p>
            <p className="text-sm mt-1" style={{ color: "#5F6572" }}>
              Non risulta ancora un pagamento confermato. Se hai già pagato, contatta il team tramite la chat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-6" data-testid="conferma-hero"
      style={{ background: "#1E2128" }}>
      <div className="p-6">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#34C77B20" }}>
            <CheckCircle className="w-5 h-5" style={{ color: "#34C77B" }} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#34C77B" }}>
            Pagamento confermato
          </span>
        </div>

        {/* Importo */}
        <p className="text-5xl font-black text-white mb-1">{fmtEur(mainPayment.amount)}</p>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          Partnership Evolution PRO · {fmtDate(mainPayment.date)}
        </p>

        {/* Receipt row */}
        <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Riferimento", val: mainPayment.stripe_id ? `#${mainPayment.stripe_id.slice(-8).toUpperCase()}` : `#${mainPayment.id?.toString().slice(-6).padStart(6, "0")}` },
              { label: "Metodo", val: mainPayment.method === "bonifico" ? "Bonifico" : "Carta di credito" },
              { label: "Stato", val: "Pagato" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {item.label}
                </p>
                <p className="text-xs font-bold text-white">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. COSA SUCCEDE ADESSO
   ═══════════════════════════════════════════════════════════════════════════ */

const NEXT_STEPS = [
  {
    num: "1",
    icon: CheckCircle,
    color: "#34C77B",
    title: "Account attivo",
    desc: "Hai accesso completo alla piattaforma: percorso, strumenti, bonus e supporto. Inizia da dove vuoi.",
    done: true,
  },
  {
    num: "2",
    icon: Phone,
    color: "#3B82F6",
    title: "Call di onboarding entro 24h",
    desc: "Il team ti contatterà per configurare insieme il tuo funnel Systeme, il posizionamento e i primi contenuti.",
    done: false,
  },
  {
    num: "3",
    icon: Rocket,
    color: "#FFD24D",
    title: "Segui il tuo Percorso Evolution",
    desc: "Il percorso è diviso in fasi: ogni fase sblocca la successiva. Completa la Fase 1 prima di tutto il resto.",
    done: false,
    navTarget: "percorso",
  },
];

function CosaSuccedeAdesso({ onNavigate }) {
  return (
    <div className="mb-6" data-testid="cosa-succede-adesso">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FFD24D20" }}>
          <Rocket className="w-5 h-5" style={{ color: "#FFD24D" }} />
        </div>
        <div>
          <h2 className="text-base font-black" style={{ color: "#1E2128" }}>Cosa succede adesso</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>I prossimi passi della tua partnership</p>
        </div>
      </div>

      <div className="space-y-3">
        {NEXT_STEPS.map((step) => {
          const SIcon = step.icon;
          return (
            <div key={step.num} className="bg-white rounded-2xl p-5"
              style={{ border: step.done ? `1.5px solid ${step.color}40` : "1.5px solid #ECEDEF" }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${step.color}15` }}>
                  <SIcon className="w-4 h-4" style={{ color: step.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-black" style={{ color: "#1E2128" }}>{step.title}</p>
                    {step.done && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#DCFCE7", color: "#166534" }}>
                        Completato
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#5F6572" }}>{step.desc}</p>
                  {step.navTarget && (
                    <button
                      onClick={() => onNavigate && onNavigate(step.navTarget)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                      style={{ background: `${step.color}15`, color: step.color === "#FFD24D" ? "#92700C" : step.color }}
                    >
                      Vai al percorso <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. CONTRATTO
   ═══════════════════════════════════════════════════════════════════════════ */

function ContrattoBlocco({ partner }) {
  const contractUrl = partner?.contract_url || null;

  return (
    <div className="bg-white rounded-2xl p-5 mb-6" data-testid="contratto-blocco"
      style={{ border: "1.5px solid #ECEDEF" }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
          <FileText className="w-4 h-4" style={{ color: "#3B82F6" }} />
        </div>
        <div>
          <p className="text-sm font-black" style={{ color: "#1E2128" }}>Contratto di partnership</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Documento firmato e archivato</p>
        </div>
      </div>

      {contractUrl ? (
        <a
          href={contractUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
          style={{ background: "#EFF6FF", color: "#3B82F6", border: "1px solid #BFDBFE" }}
        >
          <FileText className="w-4 h-4" />
          Scarica contratto PDF
        </a>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
          style={{ background: "#FAFAF7", border: "1px solid #ECEDEF" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#9CA3AF" }} />
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Contratto non ancora disponibile — il team lo caricherà a breve.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 px-1">
        <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#9CA3AF" }} />
        <p className="text-[11px]" style={{ color: "#9CA3AF" }}>
          Coperto da garanzia soddisfatti o rimborsati 30 giorni · dati protetti e riservati
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. STORICO PAGAMENTI
   ═══════════════════════════════════════════════════════════════════════════ */

function StoricoTransazioni({ payments }) {
  const [open, setOpen] = useState(false);
  if (payments.length === 0) return null;

  return (
    <div className="mb-6" data-testid="storico-transazioni">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white"
        style={{ border: "1px solid #ECEDEF" }}
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          <span className="text-sm font-bold" style={{ color: "#1E2128" }}>Storico transazioni</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "#F5F3EE", color: "#9CA3AF" }}>
            {payments.length}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          : <ChevronDown className="w-4 h-4" style={{ color: "#9CA3AF" }} />
        }
      </button>

      {open && (
        <div className="mt-2 bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #ECEDEF" }}>
          {payments.map((p, idx) => (
            <div key={p.id || idx}
              className={`px-5 py-4 flex items-center justify-between ${idx < payments.length - 1 ? "border-b" : ""}`}
              style={{ borderColor: "#ECEDEF" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: p.status === "paid" ? "#DCFCE7" : "#FFFBEB" }}>
                  {p.status === "paid"
                    ? <CheckCircle className="w-4 h-4" style={{ color: "#34C77B" }} />
                    : <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
                  }
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1E2128" }}>
                    {p.description || "Pagamento partnership"}
                  </p>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>{fmtDate(p.date)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black" style={{ color: "#1E2128" }}>{fmtEur(p.amount)}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: p.status === "paid" ? "#DCFCE7" : "#FFFBEB",
                    color: p.status === "paid" ? "#166534" : "#92400E",
                  }}>
                  {p.status === "paid" ? "Pagato" : "In attesa"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════ */

export function PartnerPayments({ partner, onNavigate }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partner?.id) { setLoading(false); return; }
    fetch(`${API}/api/partners/${partner.id}/payments`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPayments(Array.isArray(data) ? data : []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [partner?.id]);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "#FAFAF7" }}>
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasPaid = payments.some((p) => p.status === "paid" && p.amount >= 2000);

  return (
    <div className="min-h-full" style={{ background: "#FAFAF7" }}>
      <div className="max-w-2xl mx-auto p-6">

        {/* HERO */}
        <div className="mb-6" data-testid="payments-hero">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#1E2128" }}>Pagamenti</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Stato della tua partnership e prossimi passi.
          </p>
        </div>

        {/* 1. CONFERMA */}
        <ConfermaHero payments={payments} />

        {/* 2. COSA SUCCEDE ADESSO (solo se pagamento confermato) */}
        {hasPaid && <CosaSuccedeAdesso onNavigate={onNavigate} />}

        {/* 3. CONTRATTO */}
        <ContrattoBlocco partner={partner} />

        {/* 4. STORICO (collassabile) */}
        <StoricoTransazioni payments={payments} />

        {/* CTA PERCORSO */}
        {hasPaid && (
          <div className="rounded-2xl overflow-hidden" data-testid="cta-percorso"
            style={{ background: "#1E2128" }}>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                Inizia adesso
              </p>
              <p className="text-lg font-black text-white mb-1">Apri il tuo Percorso Evolution</p>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
                Il percorso ti guida passo per passo dal posizionamento al lancio. Ogni fase ha obiettivi chiari e materiali pronti.
              </p>
              <button
                onClick={() => onNavigate && onNavigate("percorso")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#FFD24D", color: "#1E2128" }}
              >
                <Rocket className="w-4 h-4" />
                Vai al Percorso <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default PartnerPayments;
