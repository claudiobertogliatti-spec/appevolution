#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Classifica le 32 lezioni per RISCHIO DI TAGLIO, dai trascritti gia' in Ciak.
Regola critica della ricetta (§3): i silenzi dentro un esercizio guidato NON si
tagliano MAI. Serve sapere PRIMA quali lezioni sono zone protette."""
import json, io, sys, re
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

APERTURA = [
    'chiudi gli occhi', 'chiudere gli occhi', "porta l'attenzione", 'porta la tua attenzione',
    'inspira', 'espira', 'inspirare', 'espirare', 'rilassa', 'rilassati',
    'ascolta il tuo corpo', 'ascolta il respiro', 'prenditi un momento', 'segui il respiro',
    'senti il respiro', 'respira', 'facciamo insieme', 'proviamo insieme', 'mettiti comodo',
    'schiena dritta', 'appoggia le mani', 'conta fino a',
]
CHIUSURA = ['riapri gli occhi', 'quando sei pronto', 'torniamo', 'apri gli occhi']

d = json.load(open('andolfi-fulldata.json', encoding='utf-8'))
L = d['videocorso']['lessons']

def ordina(k):
    m, l = k[1:].split('_l'); return (int(m), int(l))

righe = []
for k in sorted(L, key=ordina):
    v = L[k]
    t = (v.get('review_transcript') or v.get('video_transcript') or '').lower()
    hits = Counter()
    for cue in APERTURA:
        n = t.count(cue)
        if n: hits[cue] += n
    chiusure = sum(t.count(c) for c in CHIUSURA)
    tot = sum(hits.values())
    # soglia: poche occorrenze = il tema e' nominato; molte = si sta praticando
    if tot >= 8:
        rischio = 'ALTO — esercizio guidato'
    elif tot >= 3:
        rischio = 'MEDIO — da verificare'
    else:
        rischio = 'basso'
    righe.append((k, v.get('title',''), len(t.split()), tot, chiusure, rischio,
                  ', '.join('%s×%d' % (c, n) for c, n in hits.most_common(4))))

print('%-8s %-33s %6s %5s %5s %-26s %s' % ('lez','titolo','parole','cue','chius','RISCHIO','cue principali'))
print('-'*140)
for r in righe:
    print('%-8s %-33s %6d %5d %5d %-26s %s' % r)

print()
alto  = [r[0] for r in righe if r[5].startswith('ALTO')]
medio = [r[0] for r in righe if r[5].startswith('MEDIO')]
print('ALTO  (%2d): %s' % (len(alto), ' '.join(alto)))
print('MEDIO (%2d): %s' % (len(medio), ' '.join(medio)))
print('basso (%2d): il resto' % (32-len(alto)-len(medio)))
