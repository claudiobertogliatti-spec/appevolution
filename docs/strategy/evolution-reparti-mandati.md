# Evolution — mandati per sviluppo backend

Fonte: [architettura concordata](evolution-architettura-concordata.md). Stato: implementazione backend-first autorizzata; nessuna estensione dei permessi operativi in produzione.

| ID tecnico | Nome visibile | Persone | Risultato iniziale |
|---|---|---|---|
| direction | Direzione | Claudio Bertogliatti | Luca sintetizza risultati verificati, blocchi e decisioni |
| acquisition | Reparto Acquisizioni | Mariangela Caccia | Contatto qualificato con dati e prossimo passo per Vendite |
| sales | Reparto Vendite | Mariangela Caccia | Opportunità con prossimo passo ammissibile e consegna coerente |
| delivery | Reparto Delivery | Antonella Rossi, Matteo Paredi | Materiale verificato; casi studio subordinati a prove e consenso |
| back_office | Reparto Back Office | Stefania Russo, Debora Bertogliatti | Scadenze riconciliate, regole contrattuali validate, prospetti spiegabili |

Persone visualizzate senza etichetta di ruolo. Mariangela ha una sola identità e più appartenenze. Le assegnazioni organizzative non concedono accessi a contratti o compensi. Gli ID di utenti esistenti si risolvono dalla fonte autorizzata, non da nomi inventati nel codice.

Gli agenti pubblici sono Luca, Simona, Valentina, Andrea, Gaia, Marco, Carlo. Alias legacy `STEFANIA` = Simona e `MATTEO` = Carlo; non rinominare retroattivamente gli ID. Stefania Russo e Matteo Paredi sono persone distinte. Ripartizione proposta nel mockup non equivale a nuova capacità esecutiva.

## Confini di esecuzione

- A0 lettura consentita; A1 bozze interne con provenienza; A2 solo capacità autorizzata, validata e verificabile; A3 attesa decisione sulla versione esatta.
- Registro nuovo inizialmente vuoto: nessun tipo abilitato solo perché nominato da un agente.
- Acquisizioni consegna a Vendite solo dati sufficienti, altrimenti richiesta di integrazione.
- Vendite consegna a Delivery e Back Office solo al verificarsi dei gate canonici commerciali e amministrativi.
- Delivery prepara casi studio come candidati: risultati incompleti o consenso assente impediscono uso commerciale.
- Back Office legge regole versionate e validate; condizioni sconosciute restano non calcolabili. Nessun pagamento, firma, invio o pubblicazione deriva da questo mandato tecnico.

L'attivazione per reparto richiede catalogo reale, autorizzazioni server, test, revisione e baseline runtime completa. Frontend esistente operativo fino all'integrazione separata; nessuna dashboard nuova distribuita in questa fase.
