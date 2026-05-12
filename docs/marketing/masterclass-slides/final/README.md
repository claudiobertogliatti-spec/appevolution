# Slide Masterclass Ciak — final/

**10 PNG 1920x1080** pronte per CapCut. Mix di:
- **5 slide titolo errore** (originali Canva con illustrazioni AI-style — Claudio le voleva tenere)
- **5 slide concept chiave** (generate ex novo via Pillow Python — framework Ciak puro)

---

## File

| File | Tipo | Quando appare nel video |
|---|---|---|
| `titolo-errore-1.png` | Illustrazione Canva | Inizio Take 2a (~03:00) |
| `concept-1.png` | Framework Ciak puro | Inizio Take 2b (~06:00) |
| `titolo-errore-2.png` | Illustrazione Canva | Inizio Take 3a (~13:00) |
| `concept-2.png` | Framework Ciak puro | Inizio Take 3b (~16:00) |
| `titolo-errore-3.png` | Illustrazione Canva | Inizio Take 4a (~24:00) |
| `concept-3.png` | Framework Ciak puro | Inizio Take 4b (~27:00) |
| `titolo-errore-4.png` | Illustrazione Canva | Inizio Take 5a (~35:00) |
| `concept-4.png` | Framework Ciak puro | Inizio Take 5b (~38:00) |
| `titolo-errore-5.png` | Illustrazione Canva | Inizio Take 6a (~45:00) |
| `concept-5.png` | Framework Ciak puro | Inizio Take 6b (~49:00) |

> ⚠️ I timing sopra sono per la versione masterclass v1 a **60 minuti**. Con la masterclass v1 HeyGen reale a **~26 minuti** (deroga 12/5), tutti i timing vanno scalati a ~43% (es. titolo-errore-1 entra a ~01:18 invece di 03:00).
>
> **Workflow CapCut consigliato**: importa i 17 mp4 HeyGen in timeline, identifica visivamente l'inizio di ogni take (dal cambio di "scena" interna), e inserisci la slide come overlay all'inizio del take corrispondente.

## Cue editing — quando far apparire/sparire ogni slide

### Slide titolo errore (apparizione cinematic)
- **Fade-in**: 0.5s
- **Durata visibile**: 4-6 secondi (lascia respirare l'illustrazione + lettura titolo)
- **Fade-out**: 0.5s (verso il video Claudio)

### Slide concept (apparizione sobria)
- **Fade-in**: 0.3s
- **Durata visibile**: 5-8 secondi (la frase deve essere letta + memorizzata)
- **Fade-out**: 0.3s

### Posizione nella timeline CapCut
- Aggiungi le slide come **layer video sopra** il take HeyGen corrispondente
- Volume audio slide: muto (le slide non hanno audio)
- Audio HeyGen: continua sotto la slide (la voce di Claudio non si ferma)

---

## Asset extra non utilizzati

- `01.png` (cover Canva con balloons pastel su sfondo giallo): **SCARTATA** — viola framework
- `12.png` (Contatti template placeholder Canva): **SCARTATA**
- `03.png, 05.png, 07.png, 09.png, 11.png` (concept slides originali Canva con sfondo giallo): **SOSTITUITE** dalle `concept-N.png` framework-compliant

---

## Brand spec usata per le concept slides

- **Sfondo**: slate-900 `#0F172A`
- **Testo principale**: white off `#F5F5F5`, Poppins SemiBold, 68-92px (adattivo)
- **Label "ERRORE N · CIAK"**: yellow-400 `#FACC15`, Poppins Medium 28px, uppercase, letter-spaced, top-center
- **Accent dot bottom**: yellow-400 rettangolo 16x8px center bottom
- **No icone**, **no decorazioni**, **no animazioni baked-in** (eventuali animazioni le aggiunge CapCut in editing)

## Brand spec delle 5 slide titolo Canva

- Sfondo: striscia nera in alto con titolo bianco serif, illustrazione AI-style a tutto schermo sotto
- Il titolo Canva usa font serif (non Poppins) ma è leggibile e coerente con l'estetica "editorial" cinematografica delle illustrazioni
- **Trade-off accettato**: il font del titolo errore NON è Poppins (framework dice Poppins) — Claudio ha esplicitamente chiesto di mantenere queste 5 illustrazioni come sono. Il departure stilistico è isolato alle slide titolo; tutto il resto del sistema Ciak resta in Poppins.

---

## Riferimenti

- Script masterclass verbatim: `../masterclass-heygen-script.md`
- Outline operativo multi-take: `../masterclass-script-v2.md`
- Framework brand: `memory/ciak_brand_copy_framework.md`
- Generator concept slides: `../generate_concept_slides.py`
