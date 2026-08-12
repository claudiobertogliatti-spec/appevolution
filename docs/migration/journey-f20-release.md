# Release journey partner F-1/F-20

## Stato rilasciato

Il percorso EVO ha 20 step canonici e tre sole fasi:

- Esamina: F-1...F-7
- Valida: F-8...F-19
- Ottimizza: F-20

La fonte di verita' resta `partner_journey_steps`. `partners.phase` e' un dato legacy/derivato e non deve essere usato per ricostruire il completamento degli step.

## Gate automatici principali

- F-11: approvazione partner della versione masterclass corrente.
- F-12: tutte le lezioni pianificate del videocorso approvate nella versione corrente.
- F-13: sette controlli reali di readiness.
- F-16: readiness di lancio aggregata.
- F-17: funnel pubblico verificato con probe HTTP.
- F-18/F-19: certificato e workbook generati, versionati e archiviati con checksum.
- F-20: aperto automaticamente dopo la generazione valida di F-18 e F-19.

## Migrazione

Dry-run globale:

```powershell
python -m backend.scripts.migrate_journey_f20 --all
```

Applicazione esplicita:

```powershell
python -m backend.scripts.migrate_journey_f20 --all --apply --confirm-all
```

La migrazione usa inserimenti conservativi: crea soltanto record mancanti e preserva dati, stati e duplicati storici. In produzione e' stata applicata a 26 partner; il dry-run successivo ha restituito `remaining=0`.

## Prove release 2026-08-12

- Commit applicativo: `cb01442535fa965f75033f289316aaac30f07f4b`.
- GitHub CI: run `31602192136`, success.
- Cloud Run deploy: run `31602192105`, success.
- Backend: revisione `evolution-pro-backend-00542-sk4`, Ready, 100% traffico.
- Worker: revisione `evolution-pro-worker-00126-sgd`, Ready, 100% traffico.
- Vercel: deployment `dpl_34CrGf8FW65kT1NjDDBxAQUni4TG`, Ready, alias `www.ciak.io`.
- Bundle live: `static/js/main.4901a714.js`; contiene `F-20` e `3 fasi`, non contiene `Fase 4: Marco`.
- Health: `GET https://www.ciak.io/api/health` -> 200 `healthy`.
- Sicurezza anonima: state, project-book, certificate e bonus -> 401.

## Rollback

Il rollback applicativo avviene tramite revert Git e nuovo deploy. Non cancellare in massa gli step creati dalla migrazione: gli inserimenti sono compatibili con il modello append-only e la rimozione richiede prima un audit per partner.
