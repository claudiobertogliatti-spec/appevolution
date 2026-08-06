#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""FASE 1 — trascrive word-level e propone i tagli, applicando la protezione esercizi.

NON monta niente: produce solo <lez>.analisi.json, che e' il materiale del gate umano.
Regola §3 della ricetta: i silenzi dentro un esercizio guidato NON si tagliano MAI,
e nel dubbio si preserva.
"""
import json, os, sys, io, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SOGLIA_SILENZIO = 1.3          # §3: pause morte oltre 1,3s
FILLER = {'quindi', 'cioe', 'cioè', 'ecco allora', 'praticamente', 'diciamo'}

# Cue che aprono una pratica guidata. Se una pausa lunga cade in una finestra
# "calda" attorno a uno di questi, e' respiro/concentrazione: si preserva.
CUE = ['chiudi gli occhi', 'chiudere gli occhi', "porta l'attenzione", 'porta la tua attenzione',
       'inspira', 'espira', 'inspirare', 'espirare', 'rilassa', 'rilassati', 'respira',
       'ascolta il tuo corpo', 'ascolta il respiro', 'prenditi un momento', 'segui il respiro',
       'senti il respiro', 'facciamo insieme', 'proviamo insieme', 'mettiti comodo',
       'schiena dritta', 'appoggia le mani', 'senti', 'ascolta', 'nota']
FINESTRA_CUE = 25.0            # secondi attorno a un cue considerati zona protetta


def trascrivi(mp4, out_json):
    if os.path.exists(out_json):
        return json.load(open(out_json, encoding='utf-8'))
    wav = mp4.replace('.mp4', '.wav')
    if not os.path.exists(wav):
        subprocess.run(['ffmpeg','-y','-v','error','-i',mp4,'-ac','1','-ar','16000',wav], check=True)
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="float32", cpu_threads=1)
    segs, info = model.transcribe(wav, language="it", word_timestamps=True, vad_filter=False)
    parole = []
    for s in segs:
        for w in (s.words or []):
            parole.append({'word': w.word.strip(), 'start': round(w.start,3), 'end': round(w.end,3)})
    d = {'durata': round(info.duration,3), 'parole': parole}
    json.dump(d, open(out_json,'w',encoding='utf-8'), ensure_ascii=False)
    os.remove(wav)
    return d


def zone_protette(parole):
    """Intervalli temporali attorno ai cue di pratica guidata."""
    testo = ' '.join(p['word'].lower() for p in parole)
    zone = []
    for i, p in enumerate(parole):
        finestra = ' '.join(q['word'].lower() for q in parole[i:i+4])
        for cue in CUE:
            if finestra.startswith(cue) or p['word'].lower().strip('.,') == cue:
                zone.append((p['start'] - FINESTRA_CUE, p['start'] + FINESTRA_CUE))
                break
    # fonde le zone sovrapposte
    zone.sort()
    fuse = []
    for z in zone:
        if fuse and z[0] <= fuse[-1][1]:
            fuse[-1] = (fuse[-1][0], max(fuse[-1][1], z[1]))
        else:
            fuse.append(list(z) if False else (z[0], z[1]))
    return [list(z) for z in fuse]


def proponi_tagli(d, rischio):
    parole, durata = d['parole'], d['durata']
    zone = zone_protette(parole)
    def protetto(t0, t1):
        return any(t0 < z[1] and t1 > z[0] for z in zone)

    # ⛔ DECISIONE DI CLAUDIO (30/7): sulle lezioni a rischio ALTO non si taglia NULLA.
    # Nemmeno i filler. Sono i moduli del respiro: si consegnano intatti, con la sola
    # copertina davanti. I candidati restano elencati, tutti disattivati, per ispezione.
    NIENTE = (rischio == 'ALTO')
    MOTIVO_ALTO = 'rischio ALTO: nessun taglio, decisione di Claudio 30/7'

    tagli = []
    # 1. pause morte fra parola e parola
    for a, b in zip(parole, parole[1:]):
        gap = b['start'] - a['end']
        if gap >= SOGLIA_SILENZIO:
            t0, t1 = a['end'] + 0.15, b['start'] - 0.15
            if t1 - t0 <= 0.2:
                continue
            if NIENTE:
                tagli.append({'start': round(t0,3), 'end': round(t1,3), 'tipo': 'silenzio',
                              'attivo': False, 'motivo': MOTIVO_ALTO}); continue
            if protetto(t0, t1):
                tagli.append({'start': round(t0,3), 'end': round(t1,3), 'tipo': 'silenzio',
                              'attivo': False, 'motivo': 'dentro zona esercizio'}); continue
            tagli.append({'start': round(t0,3), 'end': round(t1,3), 'tipo': 'silenzio',
                          'attivo': True, 'motivo': ''})
    # 2. filler isolati (mai dentro una zona protetta, mai sulle lezioni ALTO)
    for i, p in enumerate(parole):
        w = p['word'].lower().strip('.,!?')
        if w in FILLER:
            prima = parole[i-1]['end'] if i else 0
            dopo = parole[i+1]['start'] if i+1 < len(parole) else durata
            if not (p['start'] - prima > 0.12 or dopo - p['end'] > 0.12):
                continue
            if NIENTE:
                tagli.append({'start': round(p['start'],3), 'end': round(p['end'],3),
                              'tipo': 'filler', 'parola': p['word'],
                              'attivo': False, 'motivo': MOTIVO_ALTO})
            elif not protetto(p['start'], p['end']):
                tagli.append({'start': round(p['start'],3), 'end': round(p['end'],3),
                              'tipo': 'filler', 'parola': p['word'], 'attivo': True, 'motivo': ''})
    tagli.sort(key=lambda t: t['start'])
    return tagli, zone


if __name__ == '__main__':
    L = json.load(open('lezioni.json'))
    os.makedirs('analisi', exist_ok=True)
    for lez in sys.argv[1:]:
        mp4 = 'grezzi/%s.mp4' % lez
        if not os.path.exists(mp4):
            print('%-7s grezzo assente, salto' % lez); continue
        rischio = L[lez]['rischio']
        d = trascrivi(mp4, 'analisi/%s.words.json' % lez)
        tagli, zone = proponi_tagli(d, rischio)
        attivi = [t for t in tagli if t['attivo']]
        risp = sum(t['end']-t['start'] for t in attivi)
        out = {'lezione': lez, 'rischio': rischio, 'durata': d['durata'],
               'zone_protette': zone, 'tagli': tagli,
               'tagli_attivi': len(attivi), 'tagli_bloccati': len(tagli)-len(attivi),
               'secondi_tagliati': round(risp,2)}
        json.dump(out, open('analisi/%s.analisi.json' % lez,'w',encoding='utf-8'),
                  ensure_ascii=False, indent=1)
        print('%-7s %-6s durata %6.1fs · zone protette %2d · tagli %3d (attivi %3d, bloccati %3d) · -%.1fs'
              % (lez, rischio, d['durata'], len(zone), len(tagli), len(attivi),
                 len(tagli)-len(attivi), risp))
