# Insider: gate tecnici dei checkout Stripe

## Decisione e confine

Claudio ha autorizzato le correzioni dell'audit tecnico del 9 settembre 2026.
Questa modifica non valida contratti, dichiarazioni imprenditoriali, recesso,
provvigioni, ritenute o regime US-LLC. La validazione resta di Claudio e dei
professionisti. Il testo della dichiarazione in ContractAccept resta invariato,
con il commento PLACEHOLDER da chiudere prima della riapertura.

Il blocco riguarda i nuovi checkout Stripe Start e Partnership, compresi gli
ingressi legacy. Non modifica incassi gia registrati, webhook, rimborsi,
bonifici, Blueprint o servizi extra. Non invalida da solo URL Stripe preesistenti.

## Configurazione chiusa per default

Per chiavi sk_live_ / rk_live_ devono essere entrambe esattamente true:

- CIAK_PAID_OFFERS_LEGAL_APPROVED
- CIAK_PAID_OFFERS_FISCAL_APPROVED

Assenza, valori diversi o chiavi sconosciute mantengono il blocco.
sk_test_ / rk_test_ restano utilizzabili per collaudi senza incassi reali.
Nessuno dei due flag viene abilitato da questa modifica.

Prima di abilitare entrambi, Claudio deve registrare le approvazioni applicabili
a ENTRAMBE le offerte, completare i documenti e chiudere il placeholder mediante
una successiva modifica revisionata. Start non acquisisce implicitamente la
dichiarazione specifica Partnership: il suo flusso e la relativa documentazione
devono rientrare nella validazione prima della riapertura.

## Enforcement

- services/paid_offer_gate.py: regola condivisa, 503
  PAID_OFFER_CHECKOUT_CLOSED; nessun segreto restituito.
- Il wrapper Stripe applica la regola ai tipi ciak_start, partnership e
  attivazione_partnership, prima di chiamare Stripe.
- I router canonici applicano la stessa regola e preservano l'errore 503.
- Il checkout Partnership richiede la dichiarazione booleana true registrata
  nella specifica proposta (contract_acceptance), non una semplice firma
  o un flag inviato con la richiesta di pagamento.
- /api/ciak/client/partnership/checkout: 409
  PARTNERSHIP_PROPOSAL_REQUIRED; usare la proposta.
- /api/partnership/create-checkout-session e
  /api/flusso-analisi/create-payment-session/{user_id}: 410 permanente,
  senza lettura DB o creazione sessione.
- /api/proposta/checkout-readiness: GET pubblico, senza DB, no-store.
  Restituisce solo disponibilita per offerta e messaggio.
- La risposta della proposta contiene checkout_readiness; Insider lascia
  disabilitate le CTA se assente o chiusa. Il server ricontrolla al pagamento.

## Consenso e legacy

Il builder continua ad accettare campi imprenditoriali assenti nei payload
legacy, registrando false e P.IVA vuota. Quando presente, la dichiarazione deve
essere un booleano vero; stringhe, numeri, null, oggetti e array sono rifiutati.
La P.IVA resta facoltativa e non e una condizione di pagamento.

Il flusso checkbox richiede la dichiarazione true. Una firma legacy senza
dichiarazione non permette un nuovo checkout. Insider puo raccogliere il consenso
mancante: data e IP della nuova accettazione sono registrati nella proposta,
preservando firma e data originali del partner. Le proposte gia pagate non sono
riscritte dal recupero. Nessun backfill interpreta dati storici come consenso.

ContractAccept richiede testo non vuoto caricato per il partner corrente, entrambi
i checkbox e assenza di operazione in corso. Cambio partner: reset del testo e dei
consensi. Un errore server e mostrato anche nel percorso Proposta legacy; se manca
la dichiarazione, la UI indirizza a Insider.

## Prove pre-rilascio

Base isolata: origin/main 483461c9. Working tree concorrente non modificato.
Riproduzione prima del fix: stringa false accettata come true; una chiamata al
confine Stripe per una chiave live senza approvazioni; quattro test UI falliti
per contratto assente/in caricamento/errore/vuoto.
Riproduzione ingressi legacy: due test portal falliti (200 invece di 409), due
test altri ingressi falliti (raggiungevano DB invece di 410).
Inventario Stripe live in sola lettura checkout/sessions?status=open,
paginazione completa: 0 sessioni aperte, 0 Start/Partnership.
Il conteggio va ripetuto alla chiusura del rilascio, non implica prova futura.

Le suite test_paid_offer_gate.py, test_paid_offer_legacy_routes.py,
test_proposta_payment_gate.py, test_insider_helpers.py e
test_ciak_clients_router.py sono nella CI. Le tre suite UI Insider sono
eseguite nella CI esistente. Gli esiti definitivi di CI/deploy sono nel riepilogo
del rilascio; non dichiarare produzione protetta prima del controllo live.

Verifica finale locale: 101 test backend e 23 frontend PASS; compile e lint
E9/F821 PASS; review indipendente finale PASS. La CI resta il gate del merge.
