#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Genera le tracce della voce narrante Evolution per tutte le lezioni.
Voce chiusa: Andrew, rate -2%. Libreria Python, non il CLI (il CLI non applica la voce)."""
import asyncio, json, os, sys, io
import edge_tts
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VOCE, RATE = "en-US-AndrewMultilingualNeural", "-2%"

async def main(quali):
    C = json.load(open('copioni.json', encoding='utf-8'))
    os.makedirs('voci', exist_ok=True)
    for lez in quali:
        testo = C[lez]
        out = 'voci/%s.mp3' % lez
        if os.path.exists(out):
            print('%-7s gia\' presente' % lez); continue
        await edge_tts.Communicate(testo, VOCE, rate=RATE).save(out)
        print('%-7s ok' % lez)

if __name__ == '__main__':
    C = json.load(open('copioni.json', encoding='utf-8'))
    quali = sys.argv[1:] or [k for k in C if not k.startswith('_')]
    asyncio.run(main(quali))
