# Ricette di montaggio video — Funnel Factory

**Principio:** stesso girato grezzo, **due grammatiche di montaggio opposte**.
La masterclass **vende**, le lezioni **insegnano**. Montarle allo stesso modo è
l'errore da evitare.

| Ricetta | Obiettivo | Regola discriminante | Destinazione |
|---|---|---|---|
| [masterclass-cut](recipe-masterclass-cut.md) | Vendere il videocorso | Taglia tutto ciò che non fa avanzare verso la vendita | Pagina *masterclass* del funnel |
| [lezione-cut](recipe-lezione-cut.md) | Insegnare / trasformare | Taglia solo ciò che non insegna; preserva le spiegazioni | Videocorso (area cliente) |

## Come sono operative
Ogni ricetta contiene un **prompt operativo** (§6) e un **QC gate** (§7).

1. Il partner carica il **grezzo** (masterclass o lezione — già oggi via Step07/08,
   `lesson_video`, `masterclass_factory`).
2. Un **agente video** esegue il prompt della ricetta giusta con lo skill **video-use**
   o **Descript** (montaggio guidato da trascrizione: taglio filler, riordino,
   sottotitoli, capitoli, studio sound, overlay).
3. **QC gate** della ricetta → poi **approvazione umana** (Claudio/Antonella) prima
   della pubblicazione.
4. Pubblicazione: masterclass → pagina masterclass del funnel; lezioni → videocorso.

## Aggancio Paperclip (dopo il self-host)
Le ricette sono il "cervello" della **Squadra Video** di Paperclip: l'agente riceve il
grezzo, riconosce il tipo, applica la ricetta, produce il montato, lo manda al gate di
approvazione. Funzionano **anche senza** Paperclip (eseguibili a mano con video-use).

## Brand
`{BRAND}` nei prompt = colore/logo del partner dal BrandKit (coerente con la Funnel
Factory: intro/outro e card CTA usano il brand del singolo partner).
