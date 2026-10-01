// Come il cliente Start legge i nomi dei passi del suo percorso: parole di tutti
// i giorni, non i nomi tecnici interni ("brand kit", "readiness", "vetrina").
const ETICHETTE = {
  "03-brand-kit": "Il tuo marchio",
  "04-posizionamento": "Chi sei e cosa offri",
  "start-profili": "I tuoi profili social",
  "start-vetrina": "La tua pagina web",
  "start-contenuti-90": "Il calendario dei 60 giorni",
  "start-readiness": "Il controllo finale",
};

export function etichettaPasso(step) {
  return ETICHETTE[step?.step_id] || step?.label || step?.step_id || "";
}
