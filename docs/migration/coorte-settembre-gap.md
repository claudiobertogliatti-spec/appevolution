# Coorte settembre — gap verificati alla fonte

**Partner:** Michele Baggio (19) · Mariantonietta Tornello (12) · Sarah Arensi (4)
**Perché questi tre:** sono i post-lancio più vicini a una prima vendita. Il collo di bottiglia
del modello non è acquisire, è avere partner che vendono: `revenue: 0` su tutti e tre lo conferma.

**Metodo:** letto alla fonte il 2026-07-27 via GET pubblici (`/api/partners/{id}`,
`/api/partner-hub/{id}`), nessun token. Rifacibile da chiunque. Regola 3 del protocollo.
⚠️ Questo documento copre **solo lo stato in Ciak**. L'incrocio con le cartelle Drive è il
passo successivo e non è ancora stato fatto: finché non c'è, nessun campo qui va compilato
per deduzione (regola 6).

---

## Difetto comune ai tre — fix meccanico

`youtube_playlist_id` contiene un **URL video** invece dell'ID della playlist:

| Partner | Valore attuale (troncato) |
|---|---|
| Baggio (19) | `https://www.youtube.com/watch?v=s397HQg_9lM&list=PLotgbrUYTzMzIBZ…` |
| Tornello (12) | `https://www.youtube.com/watch?v=djSqx5lUxYw&list=PLotgbrUYTzMwOgz…` |
| Arensi (4) | `https://www.youtube.com/watch?v=AlEMDTwMsLM&list=PLotgbrUYTzMy3Iy…` |

Il valore corretto è la sola stringa dopo `list=`. Va fatto sui tre record.
Nota: tutte e tre le playlist stanno sul canale Evolution PRO (prefisso `PLotgbrUYTzM`),
quindi il dato è recuperabile senza chiedere nulla ai partner.

---

## Michele Baggio (19) — fase F1 · hub aggiornato 2026-06-09

**Mancanti (9 su 23):** `offerGuarantee` · `toneOfVoice` · `keywords` · `heroPhoto` ·
`introVideo` · `voiceSample` · `photo` · `youtube` · `logo`

Presenti: posizionamento, offerta (`offerName` = *"Da motivato a consapevole: una crescita
costante e straordinaria"*), bio, Instagram, sito.

Da chiarire prima di scrivere:
- Lo script masterclass in Ciak parte da "La stanza in disordine"; su Drive esiste anche
  l'introduzione. **Verificare se l'omissione è voluta** prima di sovrascrivere.
- `systeme_subdomain` vuoto.

## Mariantonietta Tornello (12) — fase LIVE · hub aggiornato 2026-06-09

**Mancanti (5 su 23):** `offerGuarantee` · `heroPhoto` · `introVideo` · `voiceSample` · `youtube`

È la più completa dei tre ed è già in LIVE: è la candidata naturale alla prima vendita.
L'hub però è fermo al 9/6 mentre la fase dice LIVE — da capire cosa sia successo in mezzo.

## Sarah Arensi (4) — fase F9 · hub aggiornato 2026-07-10

**Mancanti (5 su 23):** `offerGuarantee` · `introVideo` · `voiceSample` · `youtube` · `logo`

- ⚠️ **`phase: F9`**: fuori dalla scala documentata (F1–F7 + LIVE). Da chiarire prima di toccarla.
- Il caso pilota del protocollo. I gap residui elencati nel protocollo (logo standalone,
  foto isolate, font ufficiali, mappatura playlist) risultano ancora aperti: coerente.

---

## Cosa serve da Claudio — non deducibile da nessuna fonte

1. **`offerGuarantee` per tutti e tre**: è vuoto ovunque. È una decisione commerciale, non un dato.
2. **Il caso studio concreto**, vuoto per tutti i partner dall'inizio della migrazione.
   Serve un risultato reale, e non va inventato (regola 6).
3. **Chiarimento su `phase: F9`** di Arensi e sul salto fase/hub di Tornello.

## Aperto

- Incrocio con le cartelle Drive dei tre partner: è il passo che permette di compilare.
- La scrittura in Ciak richiede la sessione admin loggata di Claudio: gli endpoint di
  scrittura non sono pubblici.
