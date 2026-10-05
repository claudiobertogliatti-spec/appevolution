/**
 * Menu di sezione — le pagine sorelle del reparto, su OGNI pagina del reparto.
 *
 * Una riga a tab sopra il contenuto: la voce attiva e' evidenziata (aria-current),
 * le altre portano alla pagina sorella con un solo clic, senza tornare alla
 * panoramica. Su schermi stretti scorre in orizzontale e porta in vista la voce
 * attiva. Da computer le voci vanno a capo (nessuna resta nascosta); i reparti a gruppi
 * (Delivery) separano i gruppi con un filo sottile. Toccabili da 44px sotto lg.
 *
 * L'elenco viene da NAV (stessa fonte delle card del reparto): niente piu' liste
 * scritte a mano che divergono. Colori del brand: slate + giallo.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export function SezioneNav({ label, voci = [], attiva }) {
  const attivaRef = useRef(null);

  // Con molte voci la attiva puo' essere fuori vista: la si porta al centro.
  useEffect(() => {
    attivaRef.current?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [attiva]);

  return (
    <nav aria-label={`Sezione ${label}`} className="px-4 pt-6 sm:px-8">
      <ul className="flex flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 lg:flex-wrap lg:overflow-visible">
        <li className="whitespace-nowrap px-2.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</li>
        <li aria-hidden="true" className="h-5 w-px flex-shrink-0 bg-slate-200" />
        {voci.map((v, i) => {
          const sel = v.to === attiva;
          const nuovoGruppo = i > 0 && v.gruppo !== voci[i - 1].gruppo;
          return (
            <li key={v.to} className="flex flex-shrink-0 items-center gap-1">
              {nuovoGruppo && <span aria-hidden="true" data-testid="separatore-gruppo" className="mx-1 h-5 w-px bg-slate-200" />}
              <Link
                to={v.to}
                ref={sel ? attivaRef : null}
                aria-current={sel ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3.5 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-400 lg:py-2 ${
                  sel ? "bg-slate-900 font-semibold text-yellow-400" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SezioneNav;
