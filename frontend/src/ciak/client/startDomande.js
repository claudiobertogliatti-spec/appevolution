// Le domande di Ciak Start sono le STESSE 20 del percorso EVO (decisione di Claudio,
// 11/10/2026): una sola fonte, `partner/operativo/questionari/posizionamentoQuestions.js`.
// Gli `id` sono quelli storici del questionario partner e dei generatori della consegna
// Start (backend/services/ciak_start_domande.py): NON rinominarli. Se si cambia
// l'elenco qui, va cambiato anche DOMANDE_START_IDS nel backend (stesso ordine).
import { POSIZIONAMENTO_QUESTIONS } from "../partner/operativo/questionari/posizionamentoQuestions";

export const START_DOMANDE = POSIZIONAMENTO_QUESTIONS.map(({ id, blocco, domanda, hint, esempio }) => ({
  id,
  blocco,
  domanda,
  hint,
  esempio,
}));

// Soglia minima per andare avanti. Piu' bassa dei `minChar` EVO (25-80) di proposito:
// per un cliente poco digitalizzato "qualche parola" basta, la qualita' la guida l'esempio.
export const MIN_CARATTERI = 8;
