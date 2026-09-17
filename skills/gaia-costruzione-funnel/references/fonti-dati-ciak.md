# Fonti dati partner in Ciak (sola lettura)

Fonte: `CLAUDE.md` (sezioni 2026-06-10 e 2026-07-30). Gaia legge, non scrive.

## Autenticazione

Dalla console del browser su www.ciak.io con sessione admin:

```js
const t = localStorage.getItem("ciak_admin_token");
const H = { Authorization: `Bearer ${t}` };
```

## Endpoint di lettura

| Endpoint | Cosa contiene |
|---|---|
| `GET /api/partner-hub/{partner_id}` | Posizionamento: `whoYouAre`, `targetAudience`, `problem`, `solution`, `pitch`, `differentiator`. Offerta: `offerName`, `offerPrice`, `offerIncludes`, `offerGuarantee` |
| `GET /api/admin/partner/{partner_id}/full-data` | Dati journey completi del partner |
| `GET /api/partners` | Lista partner con id |

## Mappa contenuti → pagine (indicativa)

| Pagina | Contenuti | Fonte |
|---|---|---|
| Optin | headline, sottotitolo, bio, 3-4 punti "cosa scoprirai" | `problem`, `solution`, `pitch`, `whoYouAre` |
| Landing | problema, soluzione, per chi è, cosa include, garanzia, chi è il partner | `problem`, `solution`, `targetAudience`, `offerIncludes`, `offerGuarantee`, `whoYouAre`, `differentiator` |
| Modulo d'ordine | nome offerta, prezzo, cosa include | `offerName`, `offerPrice`, `offerIncludes` |
| Ringraziamento | conferma e prossimo passo | nessun dato inventato: testo neutro di conferma |

## DA VERIFICARE prima del primo uso

- Endpoint di lettura del brand kit F-4 (collezione `partner_brand_kits`): non ancora individuato. Se non si trova, fermarsi e chiedere a Claudio palette e font.
- URL delle pagine legali del partner: fonte in Ciak non ancora individuata.
- ⚠️ Il metodo di iniezione testi via TipTap e la "mappa indici Optin" in `CLAUDE.md` risalgono ad aprile 2026 e al template di allora: non usarli. Usare il connector (`update_entity`).
