# Procedura di migrazione partner (Drive → Ciak)

Ricavata dalla migrazione di **Daniele Andolfi (ID 23)**, chiusa e verificata il 30/07/2026.
Prima di lui il pilota era stato Sarah Arensi (ID 4), ma a mano e senza strumenti.
Questa è la versione ripetibile: **quattro comandi e tre decisioni umane.**

Protocollo di riferimento: `memory/CIAK_MIGRATION_MEMORY.md` (18 regole).
Strumento: `scripts/migrazione_partner.py`.

---

## Prima di iniziare: due cose da sapere

1. **Gli endpoint admin non chiedono token.** Si lavora da shell con `curl`/Python.
   Non serve il browser, non serve rubare il token dal `localStorage` di Chrome
   (l'admin React congela le automazioni: ci si è persa mezza giornata il 29/7).
2. **La UI mente più dei dati.** La fase mostrata sulla scheda partner era F2 per un
   partner arrivato di fatto al lancio. Si legge sempre `full-data`, mai la schermata.

---

## Passo 0 — Da chi partire

```bash
python scripts/migrazione_partner.py gap
```

Stampa, per ogni partner: fase dichiarata, **fase attesa dagli step**, storia X/21,
offerta X/4, lezioni con video, stato masterclass. Snapshot del 30/07/2026 in
`gap-partner-2026-07-30.md`.

⚠️ **La colonna ATTESA è un indizio, non un verdetto.** È la `fase_legacy` dell'ultimo
step `done`, e molti step risultano `done` per la chiusura massiva del 10/07/2025, non
perché il lavoro esista. Serve a dire *"qui c'è un'incoerenza, vai a guardare"*.

## Passo 1 — Censire il Drive **cercando per nome**, non navigando le cartelle

Le cartelle mentono: nomi uguali su rami paralleli, gusci vuoti, file un livello sopra.
Sul solo Andolfi ci si è sbagliati tre volte navigando l'albero.

- `search_files` con `title contains '<pattern>'` su **tutto** il Drive → poi
  `get_file_metadata` sul `parentId` per risalire e attribuire.
- **Ignorare tutto ciò che sta sotto `05 - DA ELIMINARE`** (contiene le copie byte-identiche).
- Per **Cosimo Filieri, Marco Lamanna, Sara Duè** aprire **entrambi** i rami
  (`01 Partner/<nome>` e `06_PARTNER_E_CLIENTI/<nome>`): hanno contenuti diversi.
- Non concludere mai "manca" dopo aver guardato una sola cartella.

## Passo 2 — Backup pre (regola 12)

```bash
python scripts/migrazione_partner.py backup <id> --tag before
```

Salva in `storage/migration-backups/` le risposte **reali** dell'API. Un JSON scritto a
mano che dichiara `success: true` non è una prova, è un'intenzione: il 27/07 un backup
così avrebbe retrocesso Cosimo di quattro fasi se fosse mai atterrato.

## Passo 3 — Colmare i buchi (la parte lenta, e umana)

- Quello che c'è su Drive/sito/social **si porta dentro**, citando la fonte.
- Quello che manca **si chiede al partner**. Su Andolfi: 4 note vocali WhatsApp
  trascritte in locale con faster-whisper hanno risolto 13 risposte su 14.
- Quello che è una **decisione commerciale** (nome offerta, prezzo, garanzia, data di
  lancio) non si deduce e non si inventa: la prende Claudio.
- Se una frase la scrivi tu, **segnalala** e falla validare dal partner (regola 6).

## Passo 4 — Scrivere

Si importa il modulo, non si passano i testi da riga di comando:

```python
from scripts.migrazione_partner import Partner
p = Partner("23")
p.scrivi_risposte("la-tua-storia", {"S02": "...", "S03": "..."})  # merge non distruttivo
p.scrivi_hub({"offerName": "...", "offerPrice": "...", "offerGuarantee": ""})  # "" = saltato
p.scrivi_fase("F6")
```

- `scrivi_risposte` usa `PATCH /api/admin/partner/{id}/step/{step_id}`: merge lato server,
  **non tocca lo status**, e risponde con `answers_saved` (totale dopo il merge).
  🔴 **Non usare `save-draft`**: quello sostituisce `answers` in blocco e cancella il resto.
- `scrivi_hub` **salta i valori vuoti**: un campo lasciato vuoto per scelta resta vuoto.

## Passo 5 — Backup post e verifica (regola 17)

```bash
python scripts/migrazione_partner.py backup <id> --tag after
python scripts/migrazione_partner.py verifica <id> --da storage/migration-backups/<...>-before-<data>.json
```

Se `updated_at` non si è mosso, **la scrittura non è atterrata**: non dichiararla fatta.

## Passo 6 — Scrivere cosa è successo

- Scheda partner in `docs/migration/partner-<nome>-ciak.md`: prima/dopo, cosa resta aperto e perché.
- Riga di esito in `memory/CIAK_MIGRATION_MEMORY.md`.
- Messaggio pronto per il partner (validazione) in fondo alla scheda.

---

## Quando un partner è "chiuso"

Chiuso **non** significa tutto verde. Significa: *tutto ciò che avevamo è dentro, tutto
ciò che manca è scritto nero su bianco.*

- Uno step si marca `done` solo se il lavoro esiste davvero (regola 7).
- Se un testo lo abbiamo scritto noi, lo step resta `in_progress` finché il partner non
  valida. Su Andolfi `la-tua-storia` è 21/21 ma **in_progress**: S08 è l'unica frase non
  uscita dalla sua bocca. È una fotografia onesta, non un lavoro lasciato a metà.

## Tempi reali (Andolfi, misurati)

| Fase | Tempo |
|---|---|
| Censimento Drive + lettura stato | il grosso del lavoro, ~1 sessione |
| Raccolta buchi (vocali + trascrizione) | ~1 sessione, dipende dal partner |
| Scrittura + verifica + doc | **~20 minuti** con questo script |

Il collo di bottiglia non è la scrittura: è **il materiale che manca e la decisione
commerciale**. Chiedere al partner *prima* di aprire il Drive fa risparmiare una sessione.
