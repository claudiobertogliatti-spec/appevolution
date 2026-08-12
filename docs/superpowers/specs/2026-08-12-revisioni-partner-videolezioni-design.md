# Revisioni partner delle videolezioni — Design

Data: 2026-08-12

Stato: approvato in conversazione, in attesa di revisione della specifica scritta

Ambito: videolezioni Ciak (`video_type=videocorso`), non masterclass o video promozionali

## Obiettivo

Permettere al partner di guardare una videolezione editata, costruire una lista strutturata di
modifiche generali o puntuali e ricevere una nuova versione da approvare. Le modifiche tecniche
sicure possono essere eseguite automaticamente; quelle che possono alterare contenuto, significato
o naturalezza richiedono il controllo del team.

Il flusso finale è:

`versione editata → lista strutturata → classificazione del rischio → editing automatico o controllo team → nuova versione → nuovo ok del partner`

## Principi non negoziabili

- Ogni richiesta è legata alla `output_version` guardata dal partner.
- Ogni nuovo render azzera l'approvazione precedente.
- Una nuova versione richiede sempre un nuovo ok del partner.
- Il grezzo originale e tutte le versioni precedenti restano recuperabili.
- Il partner invia una sola lista completa per ciclo; il sistema produce un solo nuovo render.
- Dal terzo ciclo di revisione il controllo del team è sempre obbligatorio.
- L'admin supervisiona ma non impersona l'approvazione finale del partner.
- Il partner non vede stati o errori tecnici della pipeline.

## Esperienza del partner

### Apertura della revisione

Nel Workspace Corso, sotto il player, il partner può scegliere:

- `Approva il video`;
- `Richiedi modifiche`.

`Richiedi modifiche` apre il pannello **Lista delle modifiche**. Il partner può aggiungere,
modificare, riordinare o eliminare più richieste prima dell'invio.

### Richieste generali e puntuali

Ogni richiesta può applicarsi:

- all'intero video;
- a un punto preciso.

Il pulsante **Segnala questo punto** legge il tempo corrente del player, apre la selezione della
modifica e precompila il timestamp. Il partner può correggere manualmente il timestamp prima
dell'invio.

Ogni riga della lista mostra:

- categoria;
- tipo di modifica;
- intensità, se prevista;
- ambito generale oppure timestamp;
- nota aggiuntiva;
- indicazione `Automatica` oppure `Controllo del team`.

Esempio:

```text
1. Ritmo generale
   Aumenta la velocità — intensità media
   Intero video
   Elaborazione automatica con controllo finale

2. Inizio e fine
   Non troncare il finale
   Punto segnalato: 08:42
   Controllo del team

3. Tagli e contenuto
   Questa ripetizione è voluta
   Punto segnalato: 03:15
   Nota: "Fa parte dell'esercizio"
   Controllo del team
```

### Conferma e ciclo successivo

Prima dell'invio il partner vede:

> Stai inviando N modifiche sulla versione V. Verrà preparata una nuova versione da approvare.

Il comando finale è **Invia la lista al team e prepara una nuova versione**.

Dopo l'invio:

- la lista diventa di sola lettura;
- la versione corrente resta visibile ma non è approvabile;
- la richiesta può essere annullata solo finché l'elaborazione non è iniziata;
- quando la nuova versione è pronta, il partner riceve una notifica;
- il partner guarda la nuova versione e la approva oppure apre un nuovo ciclo.

## Catalogo delle modifiche

### Ritmo generale

- Aumenta la velocità: leggera, media, forte.
- Rallenta leggermente.
- Riduci le pause: leggermente, mediamente, molto.
- Lascia più respiro tra le frasi.

`Aumenta la velocità` significa prima di tutto migliorare il ritmo del montaggio e ridurre le pause.
La velocità reale della voce può essere aumentata automaticamente solo entro `1,05×`. Intensità
media o forte richiedono un controllo del team sul risultato.

### Audio

- Alza la voce.
- Riduci rumore o eco.
- Uniforma il volume.
- Migliora la sincronizzazione audio-video.

### Inizio e fine

- Accorcia l'inizio.
- Lascia più spazio prima che inizi a parlare.
- Non troncare il finale.
- Lascia più spazio dopo l'ultima frase.

Per `Non troncare il finale`, l'agente recupera il segmento dal grezzo originale. Non genera
fotogrammi o parlato inesistenti e conserva un margine naturale dopo l'ultima frase.

### Tagli e contenuto

- Ripristina una parte tagliata.
- Elimina una frase o un passaggio.
- Correggi un taglio innaturale.
- Mantieni una pausa intenzionale.
- Questa ripetizione è voluta.
- Questa ripetizione va eliminata.

Queste modifiche richiedono sempre il controllo del team.

### Grafica e copertina

- Correggi titolo o numero della lezione.
- Cambia logo o colori.
- Correggi la frase introduttiva.
- Altro problema visivo.

La nota è facoltativa per le opzioni strutturate e obbligatoria per `Altro problema visivo` o
qualsiasi futura opzione `Altro`.

## Classificazione del rischio

### Verde — automatica sicura

Comprende piccoli aggiustamenti di volume, pulizia audio, pause e ritmo entro soglie predefinite.
Il sistema può produrre automaticamente la nuova versione.

### Gialla — automatica con controllo finale

Comprende intensità media o forte, sincronizzazione complessa e modifiche che possono rendere
innaturale il parlato. L'agente prepara il risultato, ma il team lo controlla prima di consegnarlo.

### Rossa — intervento editoriale

Comprende ripristino o eliminazione di contenuto, esercizi, ripetizioni, inizio/finale e grafica.
L'agente prepara il progetto e l'anteprima; il team decide e autorizza il render definitivo.

L'intero pacchetto assume il livello di rischio più alto presente. Due richieste verdi e una rossa
producono quindi un pacchetto rosso.

## Motore di revisione

1. Recupera grezzo originale, progetto di montaggio e versione indicata nella richiesta.
2. Verifica che la versione non sia stata superata.
3. Converte ogni scelta in un'istruzione tecnica entro limiti predefiniti.
4. Valida timestamp e intervalli rispetto alla durata del video.
5. Cerca richieste incompatibili prima di accettare il pacchetto.
6. Classifica il pacchetto in verde, giallo o rosso.
7. Per il verde avvia il nuovo render; per giallo e rosso prepara il controllo del team.
8. Registra cosa è stato applicato, escluso o modificato dal team.
9. Produce una sola nuova versione e la porta a `ready_for_review`.
10. Notifica il partner e richiede un nuovo ok.

Conflitti da bloccare prima dell'invio includono:

- `Riduci molto le pause` e `Lascia più respiro` sull'intero video;
- `Questa ripetizione è voluta` e `Questa ripetizione va eliminata` sullo stesso punto;
- richieste puntuali con timestamp oltre la durata;
- intervalli sovrapposti con azioni incompatibili.

Se il sistema non sa decidere se due richieste sono compatibili, il pacchetto passa al team invece
di essere rifiutato o applicato automaticamente.

## Stati visibili al partner

- Montaggio in lavorazione
- Video pronto da guardare
- Modifiche richieste
- Modifiche in elaborazione
- Controllo del team
- Nuova versione pronta
- Approvato da te

Stati tecnici come FFmpeg, GCS, task, worker o errore di render restano interni.

## Stati interni minimi

- `ready_for_review`
- `revision_requested`
- `revision_processing`
- `revision_team_review`
- `revision_error`
- `approved`

Una richiesta mantiene almeno:

- `revision_id`;
- `partner_id` e `lesson_id`;
- `source_output_version` e `target_output_version`;
- numero del ciclo;
- stato e livello di rischio;
- lista ordinata degli elementi;
- autore e timestamp dell'invio;
- data di inizio elaborazione;
- decisione, autore e data del controllo team;
- risultato di ogni elemento;
- errori recuperabili;
- collegamento alla nuova versione prodotta.

Ogni elemento mantiene almeno:

- categoria, azione e intensità;
- ambito generale o timestamp/intervallo;
- nota;
- classificazione iniziale e finale;
- istruzione tecnica normalizzata;
- risultato: applicato, modificato dal team, non applicabile;
- motivazione visibile al partner quando non applicabile.

## Notifiche

- Al team quando arriva una lista di modifiche.
- Al partner quando la nuova versione è pronta.
- Al team quando il partner approva definitivamente.
- Alert interno quando una richiesta supera il tempo operativo previsto.

## Errori e recovery

- Una richiesta su una versione superata restituisce un conflitto e invita a ricaricare.
- Una lista con conflitti certi non può essere inviata finché il partner non li corregge.
- Un fallimento dell'automazione sposta il pacchetto al team senza perdere istruzioni o audit.
- Nessun errore sovrascrive il grezzo, il progetto precedente o una versione già renderizzata.
- Se una modifica non è applicabile, il team registra una motivazione mostrata al partner.
- Una lista inviata è immutabile; eventuali correzioni producono una nuova revisione auditata.

## Compatibilità e confini

- Le lezioni storiche già approvate mantengono lo stato esistente.
- Il nuovo flusso si applica alle videolezioni con `output_version` e standard Ciak.
- L'approvazione della struttura o dello script resta separata dall'approvazione del video.
- La prima versione non include un editor timeline completo: usa player, timestamp e lista.
- Non sono compresi chat libera, editing manuale del partner o generazione artificiale di contenuto
  mancante.

## Criteri di accettazione

- Il partner crea una lista con richieste generali e puntuali.
- `Segnala questo punto` salva il timestamp corrente del player.
- Le opzioni con intensità vengono normalizzate entro limiti sicuri.
- I conflitti certi vengono bloccati prima dell'invio.
- La richiesta è associata alla versione guardata e rifiuta versioni superate.
- I pacchetti verdi avviano il flusso automatico.
- I pacchetti gialli o rossi entrano nel controllo del team.
- Dal terzo ciclo il controllo del team è obbligatorio.
- Una lista produce un solo nuovo render.
- Ogni nuova versione richiede un nuovo ok del partner.
- Grezzo e versioni precedenti restano recuperabili.
- L'audit contiene richieste, timestamp, intensità, autore, decisione del team e risultato.
- Un errore non perde lista, progetto o versioni.
- L'interfaccia è utilizzabile da desktop e smartphone.

## Strategia di verifica

- Test unitari per classificazione, normalizzazione delle intensità e conflitti.
- Test unitari per versionamento, limite dei cicli e immutabilità delle richieste.
- Test API per autorizzazione partner, versione superata, invio, annullamento e audit.
- Test del worker per pacchetti verdi, escalation gialla/rossa e recovery da errore.
- Test del player per cattura timestamp e costruzione della lista.
- Test end-to-end: versione 1 → lista mista → controllo team → versione 2 → nuovo ok.
- Smoke reale con ripristino del finale dal grezzo e confronto durata/audio-video.
