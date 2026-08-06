# Contenuti statici — erogazione reale del Pacchetto Starter €97 (design)

Data: 2026-08-05 · Stato: da implementare · Decisione di Claudio presa in sessione

> **Origine.** Una proposta esterna suggeriva di clonare Swipeeza dentro Ciak come "Carousel
> Studio" (editor drag&drop, nuova collection `partner_carousels`, modulo render da zero).
> Verificato alla fonte il 5/8: **il render esiste già**, **la collection esiste già**, e il
> problema vero non è generare caroselli — è che un servizio a listino con Stripe price ID reale
> ha come motore di erogazione una funzione mock che marca i contenuti `"pronto"`.
> Questa spec descrive il taglio minimo che eroga **un pacchetto intero**, non il clone.

## Perché questo documento

Verificato il 5/8/2026 sul repo, branch `main`, commit `c7d60edb`:

- **I contenuti sono già un prodotto a listino** — `routers/servizi_extra.py:89` `SERVIZI_CATALOGO`:
  `calendario-pro` €297/mese ("8 post grafici + 4 caroselli + 4 reel avatar + 2 reel Kling +
  2 reel animati", *"Consegna entro 48h"*) e `calendario-starter` €97 ("8 post grafici +
  2 caroselli + copy").
- **Sono tra i pochissimi servizi con Stripe price ID reale**: `STRIPE_PRICE_CALENDARIO_PRO =
  price_1TEpHJKjIoAIM4LD1sTFrvz0` e `STRIPE_PRICE_CALENDARIO_STARTER =
  price_1TEpHJKjIoAIM4LD8002kZ5h` (`servizi_extra.py:30-31`). Gli altri ~24 sono `price_TODO_*`.
- **Il motore di erogazione è mock** — `servizi_extra.py:773-775`:
  ```
  # TODO: Qui va la generazione con Claude + Canva/HeyGen/Kling
  # Per ora usiamo contenuti mock
  contenuti_mock = genera_contenuti_mock(num_contenuti, mese)
  ```
  e subito dopo (`:781`) scrive `"stato": "pronto"` su `db.calendari_editoriali` e incrementa
  `calendari_generati` su `db.partner_servizi`. **Il sistema dichiara pronto ciò che è finto.**
- **I topic mock violano il brand voice** — `servizi_extra.py:826-837` ha 10 topic hardcoded
  ("La routine mattutina dei top performer", "Mindset imprenditoriale: le basi", "5 step per
  creare contenuti virali") e copy `"💡 {topic}\n\nEcco cosa devi sapere..."`. Gli altri due
  motori vietano esattamente questo per iscritto (`"zero fuffa"`, `"Niente superlativi assoluti"`).
- **Zero acquisti ad oggi** (confermato da Claudio, 5/8). Non c'è un buco di consegna attivo:
  si costruisce **prima** di vendere. È l'ordine giusto e va sfruttato.

### Cosa NON va costruito (esiste già)

| Componente | Dove | Nota |
|---|---|---|
| HTML → PDF via Playwright/Chromium | `services/ciak_pdf.py:92` `html_to_pdf` | pattern da riusare tale e quale |
| Stesso, con margini e formato | `services/certificati_pdf_renderer.py:148` | secondo esempio in produzione |
| Chromium nell'immagine backend | `backend/Dockerfile:20` | `playwright install --with-deps chromium` |
| Librerie | `backend/requirements.txt` | `playwright==1.58.0`, `pillow==12.1.0`, `reportlab==4.4.10`, `Jinja2==3.1.6` |
| Collection dei calendari | `db.calendari_editoriali` | ⛔ **non** creare `partner_carousels`: duplicherebbe |
| Piano editoriale con AI vera | `services/editorial_calendar.py:306` `build_editorial_calendar` | mese di lancio (fase 2) |
| Piano trimestrale con AI vera | `services/quarterly_calendar.py` | post-lancio (fase 3) |
| Brand kit partner | `db.partner_brand_kits` → `logo`, `primary_color`, `accent_color` | `routers/ciak_admin.py:406-408` |

## Scope: lo Starter, non il PRO

I contenuti **statici** (post grafico + carosello) sono lo stesso motore: un carosello è N slide,
un post è 1 slide. Contando i formati a listino:

| Pacchetto | Composizione | Coperto dal renderer statico |
|---|---|---|
| **Starter €97** | 8 post grafici + 2 caroselli | **10 / 10 → 100%** |
| PRO €297 | 8 post + 4 caroselli + 8 reel | 12 / 20 → 60% |

**Si implementa lo Starter.** Un solo modulo eroga un pacchetto vendibile per intero, senza
toccare HeyGen né Kling — che sono la parte cara, lenta e con costi API ricorrenti. Il PRO
resta erogabile a mano finché lo Starter non ha validato la domanda.

## L'idea portante

**Il modulo non inventa contenuti: esegue il piano che già esiste.**

`editorial_calendar.py:10` e `quarterly_calendar.py:17` dichiarano entrambi *"Deliverable BASE =
il calendario (il piano), NON i contenuti (quelli sono il servizio EXTRA)"*. Ma oggi il servizio
extra ignora il piano e inventa 10 topic propri. Sono due sistemi paralleli che si contraddicono.

Il piano produce già, per ogni giorno (`editorial_calendar.py:71` `_DAY_SCHEMA`):

```
{formato, tema, fonte, come_farlo, cta}
```

dove `formato ∈ ["Reel", "Carosello", "Post", "Storie"]` e `come_farlo` contiene già l'istruzione
esecutiva — *"5 slide, 1 passo per slide"*, *"6 slide, 1 errore per slide, testo grande"*.

Quindi **numero di slide, tema, fonte e CTA sono già decisi a monte**. All'LLM resta solo di
scrivere i testi delle slide dentro un vincolo stretto. Questo elimina metà del lavoro che la
proposta esterna attribuiva alla generazione.

## Architettura

### 1. `backend/services/content_renderer.py` (nuovo)

Template HTML/CSS + Playwright screenshot. **Riusa il pattern di `ciak_pdf.py:92`**: stesso
`async_playwright()`, stesso `chromium.launch(args=["--no-sandbox", "--disable-dev-shm-usage"])`,
stesso `page.set_content(html, wait_until="networkidle")`. Cambia solo l'uscita:
`page.screenshot()` invece di `page.pdf()`, con `page.set_viewport_size()` e `device_scale_factor`
per la risoluzione.

Formati richiesti:
- feed 4:5 → **1080×1350**
- story 9:16 → **1080×1920**

Tre layout, non di più:
1. `cover_hook` — slide 1 del carosello
2. `content` — slide intermedia (numerata)
3. `cta` — slide finale
4. (`post` = `cover_hook` senza numerazione, singola immagine)

⚠️ **Brand lock.** Font **Poppins**, palette `#0F172A` `#64748B` `#E5E7EB` `#FACC15`
(`docs/brand/ciak-brand-kit.md` + `brand_logos_official.md`). Per i contenuti partner: `logo`,
`primary_color`, `accent_color` da `db.partner_brand_kits`.

⛔ **Decisione da dichiarare, non da prendere di nascosto**: `partner_brand_kits` **non contiene
un font per partner**. O i template restano su Poppins per tutti (coerenza Ciak), o si estende
il brand kit. Default proposto: **Poppins per tutti**, il partner si distingue per logo e colori.

⚠️ Il font va **incorporato nell'HTML** (woff2 base64 o file locale servito). Chromium headless
in container non ha Poppins installato: senza embed, il render esce con un fallback e il brand
lock salta silenziosamente.

### 2. `backend/services/content_generator.py` (nuovo)

Da giorno-del-piano → testi delle slide. **Riusa il pattern Anthropic tool-use di
`editorial_calendar.py:238` `_call_claude`**: `import anthropic` locale, `ANTHROPIC_API_KEY` da
env, `anthropic.Anthropic(api_key=...)`, JSON schema come tool, **fallback deterministico** se
la chiamata fallisce (`editorial_calendar.py:168` `_deterministic` è il modello da seguire —
lo step non si blocca mai).

Modello via env, coerente con gli altri due motori: `CONTENT_GENERATOR_MODEL`, default allineato
a `EDITORIAL_CALENDAR_MODEL`.

Regole di scrittura: **le stesse, verbatim**, di `editorial_calendar.py:57-68` (italiano diretto,
zero fuffa, niente superlativi assoluti). Non riscriverle diversamente: sono brand voice bloccata.

### 3. `backend/services/partner_content_storage.py` (nuovo)

⛔ `collaborator_document_storage.py` **non è riusabile as-is**: la sua `build_object_key`
(`:13`) produce `private/collaborators/{id}/settlements/{settlement_id}/...`, path e firma
specifici per i collaboratori.

Va scritto un modulo gemello per i partner, **stesso pattern minimale** (`storage.Client()
.bucket(BUCKET).blob(key).upload_from_string(data, content_type=...)`), stesso `BUCKET =
os.environ.get("GCS_BUCKET", ...)`, con chiave `partners/{partner_id}/contenuti/{mese}/...`.

### 4. Modifica a `routers/servizi_extra.py`

- `genera_calendario_task` (`:748`) → sostituire la riga `contenuti_mock = ...` (`:775`) con la
  pipeline vera: legge il piano → genera testi → renderizza → carica su GCS → scrive `asset_url`.
- `genera_contenuti_mock` (`:823`) → **eliminare**, non lasciare come fallback: i suoi topic
  violano il brand voice.
- `"stato": "pronto"` (`:781`) → si scrive **solo** se ogni contenuto ha `asset_url` popolato.
  Se il render fallisce su alcuni: `"stato": "parziale"`.

### 5. Modello dati

**Estendere** i documenti di `db.calendari_editoriali`, non creare una collection nuova. La
struttura per contenuto esiste già (`servizi_extra.py:844-862`): `giorno`, `tipo`, `topic`,
`copy`, `hashtag`, `asset_url`, `pronto`, `generazione_status`, `num_slide`.

Campi da aggiungere per contenuto:

| Campo | Tipo | Uso |
|---|---|---|
| `slides` | `list[dict]` | `{index, layout, headline, body}` — il testo renderizzato |
| `asset_url` | `str` | già previsto, oggi sempre `None` → object key GCS |
| `asset_story_url` | `str \| None` | variante 9:16 |
| `zip_object_key` | `str` | ZIP mensile del pacchetto |
| `source_giorno_ref` | `dict` | da quale giorno del piano nasce (tracciabilità) |

## Gate di evidenza (protocollo multi-agente)

Nessuno di questi passa "a lettura". Ognuno produce un artefatto ispezionabile:

1. **Render**: `content_renderer` produce un PNG 1080×1350 reale, salvato su disco, **aperto e
   guardato**. Non "il codice sembra giusto". Il font deve essere Poppins nel PNG — se esce un
   sans di sistema, l'embed non funziona e il gate è rosso.
2. **Brand lock**: sul PNG, i colori campionati devono essere quelli del kit. Un partner con
   `primary_color` custom deve produrre un PNG visibilmente diverso.
3. **Il piano viene letto**: test che il contenuto generato per il giorno *N* abbia `tema` e
   `num_slide` coerenti con `come_farlo` del piano, non con topic inventati.
4. **Nessun falso "pronto"**: test che con render fallito lo stato sia `"parziale"` e
   `calendari_generati` **non** venga incrementato.
5. **Fallback**: con `ANTHROPIC_API_KEY` assente il task completa comunque via deterministico
   (come `editorial_calendar`), senza eccezioni non gestite.

## Pitfall noti (da memoria, verificare prima di toccare)

- ⚠️ **Shadow routes in `server.py`**: `grep` sulle route prima di aggiungerne — esistono
  definizioni duplicate che si mascherano a vicenda (`appevolution_server_shadow_routes`).
- ⚠️ **Il deploy backend è automatico su push a `main`, ma solo se cambia `backend/**`**. Questa
  spec tocca solo `backend/` → **ogni push deploya in produzione**. Lavorare su branch.
- ⚠️ `ANTHROPIC_API_KEY` esposta è ancora nella lista delle 3 chiavi da ruotare
  (`session_2026_05_27_ciak_seo_host_aware_fix`). Non peggiorare: leggere solo da env.

## Fuori scope (esplicito)

- Editor drag&drop / inline editing → l'analisi originale lo metteva al centro; non serve per
  erogare. Il partner riceve gli asset, non li monta.
- Reel (HeyGen / Kling) → è il 40% del PRO, si affronta solo se lo Starter vende.
- PDF LinkedIn multipagina → aggiunta banale dopo (`page.pdf()` è già in casa), ma lo Starter è
  su Instagram: non serve al giorno 1.
- Pubblicazione/scheduling → fuori perimetro, come per Swipeeza stesso.

## Domande aperte

1. **Font per partner**: Poppins per tutti (proposto) o si estende `partner_brand_kits`?
2. **Chi è il partner di collaudo** per i primi 10 contenuti reali? (stessa domanda ancora aperta
   su CreatorAI e videocorsi — conviene che sia lo stesso).
3. ~~Lo Starter €97 è una tantum o mensile?~~ **Risolto** (`servizi_extra.py:119`):
   `"tipo": "una_tantum"`, `"attivo": True`. Il task gira **una volta sola** per partner — non
   serve scheduling ricorrente, e il servizio è già comprabile a catalogo.

## Nota su Swipeeza

Resta lo strumento giusto **per il brand di Claudio** (Ciak / Metodo EVO): le due KB sono già
scritte dal 9/7 in `docs/marketing/swipeeza/`, con 30 topic e 8 caroselli pronti in
`docs/marketing/caroselli-swipeeza-claudio.md`. Sono due problemi diversi: Swipeeza non eroga ai
partner (un brand kit per partner, i partner non hanno accesso, export manuale). Questa spec non
lo sostituisce.
