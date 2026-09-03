/**
 * StatusPill — stato con icona E parola, mai il solo colore.
 *
 * Perche' esiste: nell'admin gli stati erano semafori a emoji ("🔴 · 🟡 · 🟢")
 * o pill colorate senza testo. Un cerchio colorato non e' leggibile da chi non
 * distingue i colori, si rende diverso su ogni sistema e non dice cosa fare.
 * E rosso/ambra si confondono per un deutan: il validatore del kit dataviz lo
 * conferma, e obbliga l'etichetta accanto. Qui l'etichetta e' obbligatoria.
 *
 * `tone` e' semantico (buono/attenzione/critico/neutro) ed e' separato
 * dall'accento del brand: un colore di stato non e' mai la tinta del reparto.
 */
import { AlertTriangle, Ban, CheckCircle2, Circle, Clock, Info } from "lucide-react";

const TONES = {
  good: { cls: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  warning: { cls: "bg-amber-50 text-amber-800", Icon: AlertTriangle },
  critical: { cls: "bg-red-50 text-red-700", Icon: Ban },
  info: { cls: "bg-slate-100 text-slate-700", Icon: Info },
  pending: { cls: "bg-slate-100 text-slate-600", Icon: Clock },
  neutral: { cls: "bg-slate-100 text-slate-600", Icon: Circle },
};

export function StatusPill({ tone = "neutral", label, icon: IconOverride, className = "" }) {
  const t = TONES[tone] || TONES.neutral;
  const Icon = IconOverride || t.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${t.cls} ${className}`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export default StatusPill;
