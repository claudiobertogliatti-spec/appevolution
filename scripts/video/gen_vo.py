#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Voce narrante Evolution per la copertina della lezione.
Pitfall noto: il CLI edge-tts non applica la voce -> usare la libreria."""
import asyncio, sys, io
import edge_tts

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Copione derivato dal trascritto reale della lezione (illusione della presenza +
# "il pilota automatico non e' un nemico, e' una funzione importante").
#
# ⛔ REGOLA (Claudio, 30/7): NESSUNA parola inglese nel copione, nemmeno il nome del
# brand. "Sabai Academy" apriva la traccia e la voce en-US lo leggeva all'inglese,
# quindi la lezione partiva con una frase in inglese. Il nome sta gia' nel logo in
# copertina: dirlo era ridondante oltre che sbagliato.
# Evitato anche "un nemico": la doppia n si elide e si sente "un emico".
TESTO = (
    "Modulo uno, lezione uno: il pilota automatico. "
    "In questa lezione scopri perché viviamo gran parte della giornata senza essere "
    "davvero presenti, e perché il pilota automatico non è il tuo avversario, "
    "ma una funzione da imparare a disinserire quando serve."
)

# Voce narrante Evolution = Andrew, scelta da Claudio il 30/7. Unica per tutti i
# partner e tutte le lezioni: non si ridiscute.
VOCI = {
    "andrew": "en-US-AndrewMultilingualNeural",
}

async def main():
    for nome, voce in VOCI.items():
        out = "vo_cover_%s.mp3" % nome
        await edge_tts.Communicate(TESTO, voce, rate="-2%").save(out)
        print("scritto", out, "voce", voce)

asyncio.run(main())
