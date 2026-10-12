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
import { IntestazioneAgente } from "../components/ui/IntestazioneAgente";

export function AcquisizionePipelineProspect({ onAuthExpired }) {
  return (
    <div className="px-5 py-8 sm:px-10 lg:px-16 lg:py-12 space-y-5">
      <IntestazioneAgente
        agente="matteo"
        titolo="Contatti"
        sotto="Chi è entrato in contatto con Ciak e a che punto è. Un clic su un lead apre il suo lavoro."
        className="mb-2"
      />
      <LeadManager embedded onAuthExpired={onAuthExpired} />
    </div>
  );
}

export default AcquisizionePipelineProspect;
