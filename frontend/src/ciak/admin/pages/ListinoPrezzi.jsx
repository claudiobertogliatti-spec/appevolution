import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { PRICING } from "../../pricing";

/**
 * Listino & prezzi — fonte unica, sola lettura.
 *
 * Legge i prezzi dalla SSOT frontend (src/ciak/pricing.js). Non scrive nulla:
 * serve a dare a chi vende un unico posto dove leggere i numeri ufficiali e a
 * riconoscere i prezzi stale ancora eventualmente in giro (la "deriva").
 */

const LISTINO = [
  {
    nome: "Ciak Start",
    prezzo: PRICING.start.label,
    nota: "Primo passo pre-Partnership. I €390 si riscalano come credito pieno.",
  },
  {
    nome: "Partnership Evolution PRO",
    prezzo: PRICING.partnership.label,
    nota: "Il sistema completo. Prezzo di chiusura Insider.",
    hero: true,
  },
  {
    nome: "Upgrade Start → Partnership",
    prezzo: PRICING.upgradeFromStart.label,
    nota: "Partnership meno il credito Start già versato (2.990 − 390).",
  },
  {
    nome: "Blueprint (analisi)",
    prezzo: "GRATIS",
    nota: "Lead magnet. ⚠️ Il checkout €27 è in migrazione verso il gratuito (in corso).",
  },
];

const STALE = ["499 €", "2.790 €", "2.291 €", "67 €", "27 € (Blueprint)"];

export function ListinoPrezzi() {
  return (
    <div className="p-10 max-w-4xl">
      <Link
        to="/admin/reparto/acquisizione-vendita"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Acquisizione e vendita
      </Link>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
        Acquisizione e vendita
      </p>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Listino &amp; prezzi</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        I prezzi ufficiali del percorso, da un'unica fonte. Sola lettura: i numeri
        vivono nel codice (una sola volta) — qui li leggi, non li modifichi.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {LISTINO.map((r) => (
          <div
            key={r.nome}
            className={`rounded-2xl border p-6 ${
              r.hero ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-gray-200"
            }`}
          >
            <p
              className={`text-sm font-medium mb-1 ${
                r.hero ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {r.nome}
            </p>
            <p
              className={`text-3xl font-semibold mb-2 ${
                r.hero ? "text-yellow-400" : "text-slate-900"
              }`}
            >
              {r.prezzo}
            </p>
            <p className={`text-sm leading-relaxed ${r.hero ? "text-slate-300" : "text-slate-500"}`}>
              {r.nota}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 mb-2">
          <AlertTriangle className="w-4 h-4" /> Prezzi stale — se li vedi in giro, sono da correggere
        </p>
        <p className="text-sm text-amber-900 leading-relaxed mb-3">
          Questi valori sono <strong>superati</strong>. Non devono comparire in nessun
          documento, pagina o messaggio verso il cliente.
        </p>
        <div className="flex flex-wrap gap-2">
          {STALE.map((s) => (
            <span
              key={s}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-amber-300 text-amber-800 line-through"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
