# Fase 1 + funnel completati su Andrea Fredi — procedura replicabile

**03/08/2026.** Primo partner portato da "percorso vuoto" a "funnel generato" in circa un'ora.
Gli altri partner attivi sono nella stessa identica condizione: questa è la traccia per rifarlo.

---

## 1. Il problema: i dati c'erano, il percorso no

Andrea Fredi risultava a `F1` con tutti gli step a **0 risposte**, e la sua area partner mostrava
il posizionamento demo di un altro (vedi il fix `fee20744`). Ma nel sistema c'era già:

| Dove | Cosa |
|---|---|
| `partner_posizionamento.inputs` | target, risultato, unicità, nome corso |
| `partner_posizionamento.positioning_output` | positioning statement completo |
| `masterclass_factory` | script masterclass + **video su YouTube** (`9NUC3onmoVY`, 32') |
| `partner_videocorso.course_data` | titolo, promessa, **outline di 7 moduli**, note di produzione |
| `partner_videocorso.lessons` | **33 lezioni** |
| Google Drive | **"DOCUMENTO DI POSIZIONAMENTO A. F..docx"** — 46 domande compilate da lui |

⚠️ **Il documento su Drive è la fonte più ricca e non era agganciato a niente.** Cercarlo **per
contenuto**, non per cartella: sta fuori dalla cartella del partner e non ha il cognome nel titolo.
Query che ha funzionato: `fullText contains '<termine distintivo del metodo>'`.

## 2. Ordine delle operazioni (non è arbitrario)

1. **Leggere tutto** — `GET /api/admin/partner/{id}/full-data` + `GET /api/partner-hub/{id}` +
   `GET /api/partner-journey/posizionamento/{id}`. Backup della risposta prima di scrivere (regola 12).
2. **Step `04-posizionamento`** ← `posizionamento.inputs` + `positioning_output`.
   `PATCH /api/admin/partner/{id}/step/04-posizionamento` con `{"answers": {...}}` (merge server-side).
3. **Step `la-tua-storia`** ← il documento Drive. **Le risposte si copiano alla lettera, non si
   parafrasano**: sono la voce del partner ed è la fonte che impedisce al generatore di inventare
   credenziali.
4. **Offerta in `partner_hub`** — `PATCH /api/partner-hub/{id}/field?field=X&value=Y`, un campo alla
   volta: `offerName`, `offerIncludes`, `offerPrice`, `offerGuarantee`.
   ⛔ **Prezzo e garanzia li decide Claudio, mai il sistema e mai Luca.**
5. **Generare il funnel** — `POST /api/partner-journey/funnel/generate`
   `{partner_id, bio_partner, garanzia}`.
6. **Controllo fattuale del generato** (§3) e correzione.
7. **Pubblicazione**: passo separato (`/funnel/publish`), **dopo l'approvazione del partner**.

⛔ **Non invertire 3 e 5.** Il generatore legge `la-tua-storia` come fonte principale della bio:
senza, inventa. Su Andolfi aveva scritto "oltre 15 anni di esperienza" e "centinaia di persone"
mentre la sua storia diceva trent'anni di arti marziali e insegnamento dal 2005.

## 3. 🔴 Controllo fattuale obbligatorio sul funnel generato

**Il generatore gonfia le credenziali fondendo frasi diverse del documento.** Su Andrea aveva
prodotto **"oltre 15.000 professionisti formati"** (6 occorrenze) partendo da due affermazioni
separate: *"ho formato più di 15.000 persone"* e *"mi dedico alla formazione di professionisti"*.
Con un partner che è autore edito e verifica, un numero gonfiato costa la relazione.

Dopo ogni generazione, cercare nel JSON del funnel:
- numeri accostati a categorie (`N professionisti`, `N clienti`, `N aziende`) → confrontare con la fonte;
- quantificatori vaghi (`migliaia di`, `centinaia di`) → verificare che siano veri;
- anni di esperienza · prezzi · durata della garanzia → devono coincidere con `partner_hub`.

Correzione: rileggere, sostituire le stringhe, riscrivere con
`PATCH /api/admin/partner/{id}/journey` `{"collection":"partner_funnel","data":{blueprint, content, email_sequence}}`,
poi **rileggere e contare i residui** (regola 17).

## 4. Esito su Andrea Fredi

| | Prima | Dopo |
|---|---|---|
| `04-posizionamento` | 0 risposte | 5 |
| `la-tua-storia` | 0 risposte | **22** |
| Offerta | 0/4 | **4/4** (€197 lancio / €297 listino, garanzia 14 gg) |
| Funnel | vuoto | **10 sezioni + 5 email**, `generated: true` |

Sezioni: hero · simulatore · pilastri · protocollo · fondatore · moduli · garanzia · faq · bio · cta finale.
La sezione *fondatore* usa il suo episodio reale (la partenza da solo per la Grecia) preso dal
documento Drive: nessun contenuto inventato.

## 5. Gli altri partner — stessa condizione, rilevata il 03/08

| Partner | Fase | `pos.inputs` | Offerta | Step con risposte | Storia | Videocorso |
|---|---|---|---|---|---|---|
| Cosimo Filieri | F5 | 4 | 3/4 | 0/17 | 0 | ✅ |
| Michele Baggio | F1 | 4 | 3/4 | 0/19 | 0 | ✅ |
| Daniele Andolfi | F2 | 4 | 3/4 | 2/17 | **21** | ✅ |
| Sarah Arensi | F9 | 8 | 3/4 | 0/16 | 0 | ✅ |
| Marco Lamanna | F4 | 4 | 0/4 | 1/16 | 0 | ✅ |
| Eva Gugliucciello | F5 | 4 | 0/4 | 0/19 | 0 | ✅ |
| Sara Stella Duè | F5 | 0 | 0/4 | 1/19 | 0 | ❌ |
| M. Tornello | LIVE | 4 | 3/4 | 0/19 | 0 | ✅ |

**Tutti hanno il posizionamento a sistema e gli step vuoti.** Sette su otto hanno il videocorso.
Manca a tutti la storia (tranne Andolfi) — quindi **il primo passo per ciascuno è cercare il suo
documento di posizionamento su Drive**, come per Andrea.

⚠️ Le fasi dichiarate non sono affidabili: molti step risultano `done` per la chiusura massiva del
10/07, non perché il lavoro esista. **Contare le risposte, non guardare la fase.**
