---
name: ciak-video-lesson-editor
description: Trasforma automaticamente i video grezzi caricati dai partner in videolezioni Ciak pronte per la revisione, applicando lo standard approvato di taglio didattico, protezione degli esercizi, copertina brandizzata con voce Andrew, pulizia audio e controllo qualità. Usare per upload, elaborazione, revisione, recovery o audit della pipeline video_type=videocorso; non usare per masterclass, reel o video promozionali.
---

# Ciak Video Lesson Editor

Applicare lo standard come contratto vincolante. La comprensione viene prima della brevità.

## Flusso

1. Verificare che `video_type=videocorso` e che `lesson_id` sia presente.
2. Leggere titolo lezione, partner, `partner_hub` e step `03-brand-kit`.
3. Trascrivere word-level con AssemblyAI.
4. Proporre tagli di pulizia, quindi passarli sempre a `services.ciak_lesson_standard.enforce_lesson_policy`.
5. Tagliare con `cut_filler_segments`, preservando audio e video sincronizzati.
6. Generare una frase introduttiva italiana di 20–35 parole, derivata solo da titolo e trascrizione.
7. Chiamare `apply_ciak_lesson_standard`: copertina Andrew, poi talking-head, poi finalizzazione audio.
8. Salvare `lesson_standard_report` con versione, fonte brand, intro, tagli e zone protette.
9. Pubblicare solo dopo il render riuscito; lasciare `ready_for_review`, mai approvare automaticamente.
10. Mostrare al partner la versione editata nel Workspace Corso. Accettare solo una delle due decisioni esplicite: approvazione o richiesta di modifica motivata.
11. Legare la decisione a `output_version`. Ogni nuovo render azzera l'ok precedente e torna `pending`.

## Regole non negoziabili

- Rimuovere soltanto pause morte oltre 1,3 secondi, false partenze e ripetizioni involontarie.
- Lasciare circa 0,35 secondi per lato attorno a una pausa rimossa.
- Conservare spiegazioni, esempi, enfasi, anafore e ripetizioni retoriche.
- Proteggere integralmente esercizi di respirazione, rilassamento, meditazione e ascolto.
- Non aggiungere musica, sottotitoli, lower-third, capitoli, overlay, sigla o outro.
- Anteporre soltanto la copertina di 10–20 secondi con `en-US-AndrewMultilingualNeural`, rate `-2%`.
- Usare il brand del partner. Se incompleto, usare il fallback neutro; non usare il giallo o il logo Ciak.
- Concludere a 1920×1080, 25 fps, H.264/AAC stereo, picco massimo −1,5 dBFS, timestamp monotoni.
- Non pubblicare silenziosamente il grezzo se copertina o finalizzazione falliscono: registrare errore e recovery.
- Solo un utente con ruolo `partner` associato a quel `partner_id` può dare l'ok finale. L'admin può supervisionare, ma non impersonare il consenso del partner.
- Una richiesta di modifica deve conservare nota, autore, data e versione nella cronologia audit; impostare `revision_requested` fino al nuovo montaggio.

## Decisioni AI consentite

Consentire all’agente di:

- riconoscere false partenze e riformulazioni;
- derivare l’intro dalla trascrizione;
- riconoscere il vocabolario usato dal partner (`modulo`, `capitolo`, `lezione`);
- classificare un blocco come esercizio protetto.

Non consentire all’agente di eliminare autonomamente passaggi superiori a 2,5 secondi. Richiedere revisione umana.

## Gate di consegna

Verificare tutti i controlli in [references/qc-gate.md](references/qc-gate.md). Conservare sempre il video originale e rendere il montato una nuova versione.
