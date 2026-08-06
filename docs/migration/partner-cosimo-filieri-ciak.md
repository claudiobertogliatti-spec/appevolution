# Cosimo Filieri - Scheda Migrazione Ciak

Data prima lavorazione: 2026-07-10  
Aggiornamento percorso Evo & Video: 2026-07-27  

Stato Fase 1 / Evo in Ciak: `fase1_chiusa_ok_operativo`  
Stato Video Grezzi: `video_grezzi_ricevuti_da_montare`  
Partner ID: `13`  

---

## Stato operativo e valutazione

Migrazione conservativa con integrazione del girato grezzo.  
Claudio ha fornito la cartella Drive del girato grezzo masterclass/lezioni di Cosimo Filieri.  
Si procede con la fase di pre-flight, trascrizione ed editing secondo la ricetta **Masterclass Cut**.

---

## Drive ordinato e fonti video

- **Cartella Partner Drive Standard**: [Cosimo Filieri Standard](https://drive.google.com/drive/folders/1vzJij7xRNaC5uHoLzckrYGWBtnVB7A2L)
- **Cartella Girato Video Grezzo (fornita da Claudio)**: [Girato Video Cosimo Filieri](https://drive.google.com/drive/folders/1rtziQUWsyVn0u3sFyffdhg3D910TLUyB)
- **Stato Struttura Drive**: `drive_strutturato_base` con sorgente video grezzo collegata.

---

## Materiali presenti

1. **Video Girato Grezzo**:
   - Cartella Drive girato masterclass/lezioni: `https://drive.google.com/drive/folders/1rtziQUWsyVn0u3sFyffdhg3D910TLUyB`
2. **Calendario / contenuti lancio social**:
   - `04 - Calendario Editoriale`: calendario editoriale social, istruzioni operative, prompt AI contenuti e template risposte commenti.
3. **Posizionamento e Nicchia**:
   - Nicchia: *Educazione musicale / Musicheria / Didattica e creatività musicale per bambini e formatori*.

---

## Piano di Montaggio Video (Masterclass Cut)

In base alle linee guida di montaggio (`docs/video/recipe-masterclass-cut.md`):

1. **Pre-flight & Trascrizione**:
   - Trascrizione con timestamp del girato.
   - Selezione del gancio iniziale (0-15s) e individuazione delle sezioni di problema, meccanismo, prova e offerta.
2. **Editing & Ritmo (FFmpeg)**:
   - Velocizzazione del parlato a **1,2×** (`setpts=PTS/1.22` + `atempo=1.22`).
   - Taglio drastico di filler ("ehm", "allora") e pause vive (jump cut serrati).
3. **Branding (Intro & Outro)**:
   - Sigla INTRO (8-10s) con logo *Cosimo Filieri / Musicheria* + traccia audio a tema didattico/musicale (voce narrante presente solo sul volto).
   - Sigla OUTRO finale con card CTA verso il videocorso.
   - Masterclass montata senza sottotitoli impressi (video pulito).
4. **Audio Processing**:
   - Normalizzazione audio con filtro `loudnorm=I=-16:TP=-1.5:LRA=11`.

---

## Percorso Ciak / Evo - Dati aggiornati

| Fase Evo | Campo / Oggetto | Stato | Note / Contesto |
| --- | --- | --- | --- |
| **01 - Dati Anagrafici** | Nome & Contatti | Parziale | Cosimo Filieri, `cosimo.musicheria@gmail.com`, `+39 328 874 8058` |
| **01 - Burocrazia** | CF / CI / IBAN | Mancante | Gap annotato, non blocca Esamina |
| **02 - Esamina** | Posizionamento | Compilato | Didattica e creatività musicale, Musicheria |
| **03 - Brand Kit** | Assets visivi | Incompleto | Palette/logo da usare nelle sigle intro/outro |
| **04 - Masterclass** | Girato Video Grezzo | **In Attesa di Approvazione** | Ricetta Masterclass Cut pronta; in attesa di approvazione umana da app UI |
| **05 - Videocorso** | Moduli / Lezioni | In fase di editing | Estrazione dal girato secondo ricetta Lezione Cut |
| **06 - Funnel** | Pagine & Checkout | In attesa | Calendario pronto, funnel da collegare |

---

## Prossima Azione Concreta

**Prossima Azione**: Approvazione da parte di Claudio/Antonella dell'output di montaggio della Masterclass di Cosimo Filieri dall'interfaccia dell'app Ciak / Evolution PRO (`step_id: 06-video-masterclass`, stato: `waiting_approval`).  
**Owner**: Claudio / Antonella  
**Strategia 30/60/90**:
- **30 giorni**: Approvazione masterclass in app, rendering finale ed estrazione moduli videocorso.
- **60 giorni**: Caricamento moduli in Ciak e configurazione funnel.
- **90 giorni**: Avvio campagna social e promozione.

