import React from "react";
import { Megaphone, Magnet, Sparkles, UserRound, ArrowRight } from "lucide-react";
import { ACCELERA_CATALOG, recommendAccelera } from "../acceleraRecommender";

/**
 * Card "Accelera la crescita" (Evolution One) della fase Ottimizza.
 * Mostra l'extra a piu alta leva consigliato ORA (data-triggered) + il catalogo completo.
 * I pagamenti vivono su Systeme (collegato allo Stripe di Claudio): ogni CTA linka alla
 * pagina prodotto Systeme. Finche i prodotti non sono creati, i link restano placeholder.
 */

// Pagine prodotto Systeme — DA COMPILARE quando i prodotti sono creati su Systeme.
// Lasciare "" mostra il bottone come "Scopri di piu" verso il supporto, non un link rotto.
const SYSTEME_LINKS = {
  consulenza: "",
  lead_magnet: "",
  adv: "",
  contenuti: "",
};

const ICONS = {
  consulenza: UserRound,
  lead_magnet: Magnet,
  adv: Megaphone,
  contenuti: Sparkles,
};

const ORDER = ["adv", "lead_magnet", "contenuti", "consulenza"];

function ExtraCard({ id, highlight, reason, onSupport }) {
  const item = ACCELERA_CATALOG[id];
  const Icon = ICONS[id];
  const link = SYSTEME_LINKS[id];
  return (
    <div
      className={`bg-white rounded-2xl p-5 flex flex-col ${
        highlight ? "border-2 border-yellow-300 shadow-lg shadow-yellow-400/10" : "border border-gray-200"
      }`}
    >
      {highlight && (
        <span className="self-start text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 mb-3">
          Consigliato per te ora
        </span>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
          <Icon className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-slate-900 leading-tight">{item.name}</p>
          <p className="text-xs text-slate-500">{item.tagline}</p>
        </div>
      </div>
      {highlight && reason && (
        <div className="rounded-xl p-3 my-2 bg-yellow-50 border border-yellow-100">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-700 mb-0.5">Perche ora</p>
          <p className="text-[13px] text-slate-700 leading-snug">{reason}</p>
        </div>
      )}
      <p className="text-[13px] text-slate-600 leading-relaxed flex-1 mt-1">{item.motivation}</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
        >
          {item.cta} <ArrowRight className="w-4 h-4" />
        </a>
      ) : (
        <button
          onClick={onSupport}
          className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition"
        >
          {item.cta} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function AcceleraGrowth({ signals = {}, onSupport = () => {} }) {
  const reco = recommendAccelera(signals);
  const top = reco[0] || null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Accelera la crescita</h2>
        <p className="text-sm text-slate-500 mt-1">
          Servizi extra del team per far decollare l'accademia. Te li proponiamo in base ai tuoi numeri:
          il momento giusto, non a caso.
        </p>
      </div>

      {top && (
        <div className="mb-6">
          <ExtraCard id={top.id} highlight reason={top.reason} onSupport={onSupport} />
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
        Tutti i servizi
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ORDER.filter((id) => !top || id !== top.id).map((id) => (
          <ExtraCard key={id} id={id} onSupport={onSupport} />
        ))}
      </div>
    </div>
  );
}
