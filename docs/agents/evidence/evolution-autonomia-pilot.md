# Pilotaggio del motore operativo — piano e misura (T22)

⛔ **Questo è un PIANO, non un esito.** Il pilotaggio è un'attività di produzione di **almeno 7
giorni consecutivi** dopo l'attivazione (T21), su infra viva, con decisioni economiche di Claudio.
Non è completabile in una sessione di codice: qui si fissano cosa osservare, come misurarlo e il
gate di riuscita. I risultati si aggiungono in fondo, giorno per giorno, con prova.

## Cosa attivare per il pilota
- Almeno **un ciclo autorizzato per reparto** (Acquisizione, Vendite, Delivery, Back office), su
  entità pilota selezionate. Capacità abilitate una alla volta secondo il runbook T21.
- Le collaborazioni (T23-T25) entrano nel pilota solo dopo che le regole sono **validate da Claudio**
  (nessun compenso si applica senza ok); almeno un prospetto controllato per collaboratrice, con
  livello di prova dichiarato.

## Controlli giornalieri (ogni giorno, per 7+ giorni)
- Task scaduti (`due_at` passato) senza avanzamento.
- Verifiche mancanti: task `completed` senza `evidence_refs` (non dovrebbero esistere → T04).
- Duplicati: stessi effetti/handoff ripetuti (T07 `channels_to_retry` / idempotency).
- Errori provider e task `blocked`/`UNKNOWN` da riconciliare (T07/T08).
- Richieste di intervento umano aperte (escalation non risolte, T08).
- **Tempo speso da Claudio** sul motore (obiettivo: cala rispetto al baseline).

## Confronto col baseline (prima/dopo, non a parole)
- Tempo di gestione, consegne puntuali, attese di approvazione, quota task verificati, quota bloccata.
- Baseline: misurare **prima** dell'attivazione (stessa query, stesso periodo). Non dare per acquisiti
  i numeri; allegare l'output.
- ⛔ Non imporre un numero di vendite come test del software: il pilota misura affidabilità del motore,
  non il mercato.

## Consegna operativa (a fine pilota)
Istruzioni brevi per Claudio: dove guardare, quando intervenire, come recuperare, chi è responsabile.
Elenco esplicito di **tutte le capacità ancora disattivate**.

## Gate G4 — riuscita
- Zero nuovi falsi completamenti e zero duplicati rilevati nel periodo.
- Ogni blocco ha owner e prossima azione.
- Quattro flussi dimostrati con livello di prova dichiarato.
- Anomalie critiche chiuse; in presenza di anomalie, estendere il pilota **dopo** la correzione.

## Esiti del pilota
_(da compilare in produzione, giorno per giorno, con prova allegata — vuoto finché il pilota non parte)_

| giorno | reparto | ciclo | esito | prova | note |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
