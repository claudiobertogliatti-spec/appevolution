/**
 * Delivery — pagina di una singola fase EVO (Esamina / Valida / Ottimizza /
 * Online / Bloccati). Stessa pipeline della Home, ma a fuoco su un bucket, in
 * lista con dettaglio operativo. La fase arriva dall'URL (/admin/delivery/:fase).
 */
import { useParams, Navigate } from "react-router-dom";
import { DeliverySubNav } from "../components/DeliverySubNav";
import { DeliveryPipeline } from "./DeliveryPipeline";

const FASE_TO_BUCKET = {
  esamina: "Esamina",
  valida: "Valida",
  ottimizza: "Ottimizza",
  online: "Online",
  bloccati: "Bloccati",
};

export function DeliveryFase({ onAuthExpired }) {
  const { fase } = useParams();
  const bucket = FASE_TO_BUCKET[(fase || "").toLowerCase()];
  if (!bucket) return <Navigate to="/admin/reparto/delivery" replace />;

  return (
    <div className="p-6 md:p-8 space-y-5 max-w-5xl">
      <DeliverySubNav active={bucket} />
      <DeliveryPipeline mode="fase" bucket={bucket} onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default DeliveryFase;
