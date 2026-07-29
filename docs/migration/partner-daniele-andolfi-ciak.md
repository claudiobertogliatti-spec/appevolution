# Daniele Andolfi (ID 23) — simulazione percorso EVO

**Metodo:** protocollo di `memory/CIAK_MIGRATION_MEMORY.md` — si simula l'intero percorso EVO
con il materiale realmente in nostro possesso (Drive + memoria + web); ciò che non abbiamo si
lascia **vuoto o segnato come mancante** (regola 6) e **non si marca una fase come completa per
un materiale parziale** (regola 7). Per i buchi si prepara la richiesta al partner.

**Fonti lette il 29/07/2026:** Drive (entrambi i rami: `01 Partner/Daniele Andolfi` e
`06_PARTNER_E_CLIENTI/Daniele Andolfi`) · `GET /api/partners/23` · `GET /api/partner-hub/23` ·
`GET /api/masterclass-factory/23`.
⚠️ **Non ancora letto:** `GET /api/admin/partner/23/full-data` (richiede token admin) — la
verifica finale va fatta lì prima di dichiarare qualsiasi step completo.

---

## ATTO 1 — ESAMINA

| Step | Stato | Fonte / nota |
|---|---|---|
| `02-discovery-video` | ⬜ da verificare in full-data | — |
| `burocrazia` | ⚠️ **da verificare** | `01 - Documenti` nel ramo `01 Partner` risulta **vuota**; la nota del 20/7 dava lì contratto, CI/CF e analisi. Controllare il ramo root (`1unW-X_gtdmVYbI3vl1P9DYKvJdP5DI3M`) prima di dire che mancano. |
| `03-brand-kit` | ✅ **completo** | Hub pieno: `logo`, `primaryColor`, `accentColor`, `textColor`, `bgColor`, `fontPrimary`, `fontSecondary`, `photo`, `toneOfVoice` |
| `la-tua-storia` | ✅ **COMPLETA 21/21** | 8 risposte ricostruite dal suo sito + **13 raccolte da 4 note vocali** (22/7 e 24/7), trascritte in locale il 29/7. Testo pronto in un file locale fuori dal repo (contiene parole sue). ⚠️ La nota del 20/7 che la dava a 0/21 è **superata**. |
| `obiettivo` | ⬜ da verificare | — |
| `04-posizionamento` | ✅ **completo** | Hub pieno: `whoYouAre`, `targetAudience`, `problem`, `solution`, `pitch`, `differentiator`, `keywords`, `niche`, `bio` |

## ATTO 2 — VALIDA

| Step | Stato | Materiale reale |
|---|---|---|
| `05-script-masterclass` | ⬜ da verificare | script non trovato su Drive; `masterclass-factory/23` da rileggere in full-data |
| `06-outline-lezioni` | ✅ **derivabile** | 12 moduli con titoli parlanti (vedi sotto) |
| `07-script-videolezioni` | ⬜ non trovato | nessuno script lezioni su Drive |
| `08-registra-masterclass` | ✅ **FATTO** | `Masterclass_definitiva.mp4` + `video_pipeline_status: approved` + URL YouTube già presente |
| `09-registra-lezioni` | ✅ **FATTO — 12 moduli** | vedi mappa sotto |
| `10-sistema-vendita` | ✅ **SBLOCCATO** | Offerta definita da Claudio il 29/7: nome **Sabai Academy**, prezzo di listino e prezzo di lancio decisi, contenuto = percorso in 4 livelli (dall'Analisi Strategica) + 12 moduli. `offerGuarantee` resta **vuoto per scelta**. Valori nel file locale fuori dal repo. |
| `11-calendario-30gg` | ⚠️ parziale | `04 - Calendario editoriale` contiene solo una cartella `reel` |
| `12-prezzo-webinar` | ❌ **BLOCCATO** | dipende dall'offerta (step 10) |
| `13-lancio` | ⬜ | `05 - Funnel` contiene una cartella `Funnel`, contenuto da aprire |

## ATTO 3 — OTTIMIZZA
Post-lancio, gestita da `OperativoContinuo`. Non applicabile finché il lancio non è avvenuto.

---

## Mappa videocorso — 12 moduli (⚠️ in DUE posizioni diverse)

**In `03 - Videocorso / Claudio`** (`1iOTjaYT…`): moduli **1, 3, 4, 5, 6, 7, 8, 9**
**In `03 - Videocorso`, un livello sopra** (`1aOEVGk1…`): moduli **2, 10, 11, 12**

Titoli utili per compilare l'outline (dai nomi file):
1. `pilotaautomatico` · `modalitadelfaremodalitadellessere` · `tornareaisensi`
2. `comelostressaccumulanelcorpo`
3. `simpaticoeparasimpatico` · `iperattivazioneipoattivazioneequilibrio` · `riconoscereilpropriostato`
4. `perchéilrespirocambiatutto` · `ildiaframmaeilrespiroalto` · `respirazioneconsapevole`
5. `respiro di pancia` · `respirazioneatrezone` · `larespirazionedellapompetta`
6. `viviamoimmersinelgiudizio` · `giudiziolamaadoppiotaglio` · `dagiudizioadosservazione`
7. `iononsonolemieemozioni` · `iononsonoilprimopensiero` · `traimpulsoerisposta`
8. `placeboenocebo` · `nonparlaremaledite11` · `trasformareillinguaggiointerno`
9. `mangiarenonesoloriempirsi` · `fameveraefameemotiva` · `ilprimobocconeconsapevole`
10. `mindfulnessnellagiornata`
11. `relazionieperditadelcentro`
12. `conclusione`

Il corso è chiaramente su **mindfulness applicata** (respiro, stress, giudizio, emozioni,
alimentazione consapevole). Coerente con il posizionamento già compilato nell'hub.

⚠️ **Video non caricabili su YouTube ora:** Celery/Redis risultano spenti in produzione
(`/api/celery/status` → `enabled:false`, `worker_running:false`). Si agganciano i link Drive
come da Plan B, con nota che è provvisorio.

---

## 🔴 IL BLOCCO: manca l'offerta

Con 12 moduli girati e la masterclass approvata, **l'unica cosa che impedisce il lancio è che
non esiste un'offerta**: né nome, né prezzo, né cosa include, né garanzia. Senza quella non si
possono fare né lo step 10 (sistema di vendita) né il 12 (prezzo/webinar), e quindi né il 13.

Non è un dato che si possa dedurre dal materiale: è una **decisione commerciale**.

### Messaggio pronto per Daniele

```
Ciao Daniele, ho finito di sistemare tutto il tuo materiale dentro la piattaforma.

Buone notizie: il videocorso è completo, 12 moduli, e la masterclass è pronta.
Dal lato produzione ci siamo.

Per andare avanti mi manca una cosa sola, ed è una decisione tua, non un file:
l'offerta. In concreto mi servono quattro risposte brevi:

1. Come si chiama il corso, il nome con cui lo vendi
2. A che prezzo lo vendi
3. Cosa riceve esattamente chi lo compra (i 12 moduli e cos'altro)
4. Se dai una garanzia, e quale

Appena mi mandi queste, chiudo il sistema di vendita e passiamo al lancio.

Claudio
```

---

## Cosa resta da fare prima di dichiarare qualcosa completo
1. Leggere `GET /api/admin/partner/23/full-data` (serve token admin di Claudio).
2. Verificare `01 - Documenti` nel ramo root: contratto, CI/CF, analisi ci sono o no.
3. Aprire `05 - Funnel / Funnel` e `04 - Calendario editoriale / reel`.
4. Backup pre/post letti da `full-data` (regola 12), **non composti a mano**.
5. Alla fine: verificare che `updated_at` si sia mosso (regola 17).
