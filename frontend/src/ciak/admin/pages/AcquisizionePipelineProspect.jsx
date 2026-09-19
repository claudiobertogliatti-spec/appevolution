/**
 * Reparto Acquisizione — Pipeline Prospect (pagina unica).
 *
 * È la sotto-nav del reparto + il Lead Manager (lo strumento buono: ricerca
 * automatica, Nuovo lead, Importa, "Da Systeme", tabella con badge, e ogni lead
 * cliccabile → workspace di lavorazione). Acquisizione sopra, lavorazione al click.
 *
 * Deciso con Claudio (19/9): la tab Pipeline Prospect deve mostrare il Lead Manager,
 * non una pagina custom separata.
 */
import { LeadManager } from "./LeadManager";
import { AcquisizioneSubNav } from "../components/AcquisizioneSubNav";

export function AcquisizionePipelineProspect({ onAuthExpired }) {
  return (
    <div className="p-6 md:p-8 space-y-5">
      <AcquisizioneSubNav active="Pipeline Prospect" />
      <LeadManager embedded onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default AcquisizionePipelineProspect;
