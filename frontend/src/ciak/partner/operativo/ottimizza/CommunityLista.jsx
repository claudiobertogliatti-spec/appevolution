import React from "react";
import { Users, Inbox, ListChecks, MessageCircle, ArrowRight, Lock } from "lucide-react";

/**
 * Card "Lista e community" (fase Ottimizza).
 * Guida sequenziale: PRIMA la lista (binario di cattura dell'inbound organico verso una
 * destinazione di proprieta), POI la community (quando c'e gia una base di clienti).
 * I binari vivono su Systeme: lista = contatti Systeme, community = funzione community Systeme,
 * ponte inbound = automation/tag Systeme. Qui spieghiamo il PERCHE e il quando, non il come tecnico.
 */

function FaseLista({ onSupport }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900">
          <ListChecks className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
            Fai questo ora
          </span>
          <p className="text-[15px] font-semibold text-slate-900 leading-tight mt-1">1. La lista</p>
        </div>
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
        Quando inizi a pubblicare, le persone ti scrivono. Commenti, DM, messaggi. Oggi quei
        contatti si perdono: arrivano e svaniscono.
        <br />
        La lista è il binario che li raccoglie in un posto tuo, dove puoi ricontattarli quando vuoi.
        Non un social che decide lui chi vede cosa: una lista è tua.
      </p>

      <div className="rounded-xl p-3 bg-slate-50 border border-gray-100 mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          Perché prima la lista
        </p>
        <p className="text-[13px] text-slate-700 leading-snug">
          La lista serve a nutrire e vendere. Oggi il funnel cattura solo chi si iscrive alla
          masterclass o al webinar. Manca il ponte dall'organico: chi ti scrive sotto un post non
          entra da nessuna parte. Questo è il pezzo da chiudere per primo.
        </p>
      </div>

      <ul className="space-y-2 mb-4">
        {[
          ["Una destinazione di proprietà", "I contatti finiscono nella tua lista su Systeme, non in un commento che sparisce."],
          ["Il ponte dall'organico", "Un'automazione cattura chi interagisce e lo porta nella lista, in automatico."],
          ["Da lì puoi vendere", "Email, inviti al webinar, promo: parli a persone che hanno già alzato la mano."],
        ].map(([t, d]) => (
          <li key={t} className="flex gap-2.5">
            <Inbox className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <span className="text-[13px] text-slate-600 leading-snug">
              <span className="font-semibold text-slate-800">{t}.</span> {d}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSupport}
        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition w-full"
      >
        Attiva il binario di cattura <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function FaseCommunity() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 opacity-95">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
          <Users className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            <Lock className="w-3 h-3" /> Dopo, quando hai clienti
          </span>
          <p className="text-[15px] font-semibold text-slate-900 leading-tight mt-1">2. La community</p>
        </div>
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed mb-3">
        La community vera arriva dopo, quando hai già una base di studenti.
        <br />
        Aprire un gruppo a stanza vuota non costruisce niente: una community senza persone dentro
        è solo un altro posto da gestire.
      </p>

      <div className="rounded-xl p-3 bg-slate-50 border border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
          A cosa serve
        </p>
        <p className="text-[13px] text-slate-700 leading-snug">
          La community non vende: trattiene. Tiene gli studenti dentro, crea relazioni, e da lì
          nascono i risultati che diventano testimonianze — il carburante della tua autorevolezza.
          Te la apriamo noi quando i numeri dicono che è il momento.
        </p>
      </div>
    </div>
  );
}

export default function CommunityLista({ onSupport = () => {} }) {
  return (
    <div>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Lista e community</h2>
        <p className="text-sm text-slate-500 mt-1">
          Due cose diverse, in due momenti diversi. Prima raccogli chi ti scrive in una lista tua.
          La community vera viene dopo, quando hai persone da farci stare dentro.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 text-[13px] text-slate-500">
        <span className="font-semibold text-slate-700">Lista</span>
        <span className="text-slate-300">→ nutri → vendi</span>
        <MessageCircle className="w-4 h-4 text-slate-300 mx-1" />
        <span className="font-semibold text-slate-700">Community</span>
        <span className="text-slate-300">→ trattieni → testimonianze</span>
      </div>

      <div className="space-y-4">
        <FaseLista onSupport={onSupport} />
        <FaseCommunity />
      </div>
    </div>
  );
}
