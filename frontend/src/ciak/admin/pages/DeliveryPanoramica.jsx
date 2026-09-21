/**
 * Reparto Delivery — Home.
 *
 * "Riassume tutti i dati": la pipeline a 5 colonne del Metodo EVO
 * (Esamina · Valida · Ottimizza · Online · Bloccati) con KPI di sintesi e colli
 * di bottiglia. Ogni partner è cliccabile e apre la vista modificabile.
 * Il dettaglio a fuoco di ogni fase è nelle pagine /admin/delivery/<fase>.
 *
 * Il reparto riceve il partner firmato+pagato e lo porta LIVE (obiettivo: online
 * in 6-8 settimane), poi subentra la continuità EVO-S. Responsabile = Simona.
 */
import { DeliverySubNav } from "../components/DeliverySubNav";
import { DeliveryPipeline } from "./DeliveryPipeline";

export function DeliveryPanoramica({ onAuthExpired }) {
  return (
    <div className="p-6 md:p-8 space-y-5 max-w-6xl">
      <DeliverySubNav active="Home" />

      {/* Intestazione reparto */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400">Reparto · Simona</p>
        <h1 className="text-3xl font-semibold mt-1">Delivery</h1>
        <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
          Dal partner firmato e pagato fino alla messa online, fase per fase del Metodo EVO.
          Obiettivo: ogni partner online in 6-8 settimane. Clicca un partner per gestirlo.
        </p>
      </div>

      {/* La pipeline riassume tutti i dati */}
      <DeliveryPipeline mode="board" onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default DeliveryPanoramica;
