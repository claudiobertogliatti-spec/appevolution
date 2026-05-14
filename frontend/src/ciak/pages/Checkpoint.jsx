/**
 * Ciak.io /checkpoint — Checkpoint Strategico standalone.
 *
 * Pagina dedicata raggiungibile via deep-link (es. email Systeme per chi non
 * ha completato il Checkpoint a fine masterclass). Stesso componente usato
 * inline in /masterclass, qui con header/footer propri.
 *
 * source="checkpoint_page" → distingue nel tag Systeme / audit log da chi
 * arriva dal flusso masterclass (source="masterclass").
 */
import { CiakHeader } from "../components/CiakHeader";
import { CiakFooter } from "../components/CiakFooter";
import { CheckpointStrategico } from "../components/CheckpointStrategico";

export function CiakCheckpoint() {
  return (
    <>
      <CiakHeader />
      <CheckpointStrategico source="checkpoint_page" />
      <CiakFooter />
    </>
  );
}
