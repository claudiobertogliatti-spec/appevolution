#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""FASE 2 — applica i tagli ATTIVI del file di analisi e produce il girato montato.

I tagli con "attivo": false NON vengono applicati: sono quelli bloccati dalla
protezione esercizi (§3 della ricetta). Restano nel file solo per ispezione.

Se i tagli attivi valgono meno di SOGLIA_UTILE secondi, il girato viene copiato
senza ricodifica: non ha senso ricodificare 8 minuti di 1080p a 18 Mbps per
recuperarne due.
"""
import json, os, sys, subprocess
# reconfigure e NON un TextIOWrapper nuovo: monta_tutte.py importa questo modulo, e due
# wrapper sullo stesso buffer lo chiudono a vicenda ("I/O operation on closed file").
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SOGLIA_UTILE = 4.0     # secondi: sotto questa soglia non vale la ricodifica
BORDO        = 0.06    # micro-dissolvenza audio ai bordi del taglio, evita i click


def durata(p):
    return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                                 '-of','csv=p=0',p], capture_output=True, text=True).stdout.strip())


def taglia(lez):
    src = 'grezzi/%s.mp4' % lez
    ana = json.load(open('analisi/%s.analisi.json' % lez, encoding='utf-8'))
    out = 'montati/%s_cut.mp4' % lez
    os.makedirs('montati', exist_ok=True)
    if os.path.exists(out):
        print('%-7s gia\' tagliato' % lez); return out

    attivi = [t for t in ana['tagli'] if t['attivo']]
    risparmio = sum(t['end'] - t['start'] for t in attivi)
    tot = durata(src)

    if risparmio < SOGLIA_UTILE:
        # ⛔ NON si puo' usare -c copy: i grezzi sono a frame rate VARIABILE (dichiarano
        # 60 fps, ne hanno ~30 reali, timebase 1/30000, audio 16 kHz stereo). Concatenandoli
        # in copia con la copertina (25 fps, 1/12800, 48 kHz mono) il concat non riscrive i
        # tempi e la lezione viene riprodotta al frame rate sbagliato: dura 2,4x.
        # Quindi anche il caso "nessun taglio" passa per una normalizzazione.
        subprocess.run(['ffmpeg','-y','-v','error','-i',src,'-map','0:v:0','-map','0:a:0',
                        '-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p',
                        '-crf','18','-preset','veryfast','-r','25','-vsync','cfr',
                        '-video_track_timescale','12800',
                        '-c:a','aac','-b:a','192k','-ar','48000','-ac','1', out], check=True)
        print('%-7s %-5s %d tagli attivi = %.1fs (<%.0fs) -> nessun taglio, solo normalizzazione'
              % (lez, ana['rischio'], len(attivi), risparmio, SOGLIA_UTILE))
        return out

    # segmenti da TENERE = complemento dei tagli attivi
    tieni, cur = [], 0.0
    for t in sorted(attivi, key=lambda x: x['start']):
        if t['start'] > cur:
            tieni.append((cur, t['start']))
        cur = max(cur, t['end'])
    if cur < tot:
        tieni.append((cur, tot))
    tieni = [(a, b) for a, b in tieni if b - a > 0.25]

    parti = []
    for i, (a, b) in enumerate(tieni):
        parti.append('[0:v]trim=%.3f:%.3f,setpts=PTS-STARTPTS[v%d];' % (a, b, i))
        parti.append('[0:a]atrim=%.3f:%.3f,asetpts=PTS-STARTPTS,'
                     'afade=t=in:st=0:d=%.3f,afade=t=out:st=%.3f:d=%.3f[a%d];'
                     % (a, b, BORDO, max(0, b - a - BORDO), BORDO, i))
    cat = ''.join('[v%d][a%d]' % (i, i) for i in range(len(tieni)))
    fc = ''.join(parti) + cat + 'concat=n=%d:v=1:a=1[v][a]' % len(tieni)

    subprocess.run(['ffmpeg','-y','-v','error','-i',src,'-filter_complex',fc,
                    '-map','[v]','-map','[a]',
                    '-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p',
                    '-crf','18','-preset','veryfast','-r','25','-vsync','cfr',
                    '-video_track_timescale','12800',
                    '-c:a','aac','-b:a','192k','-ar','48000','-ac','1', out], check=True)
    print('%-7s %-5s %d tagli attivi (%d bloccati) = -%.1fs · %.1fs -> %.1fs'
          % (lez, ana['rischio'], len(attivi), ana['tagli_bloccati'], risparmio, tot, durata(out)))
    return out


if __name__ == '__main__':
    for lez in sys.argv[1:]:
        if not os.path.exists('analisi/%s.analisi.json' % lez):
            print('%-7s analisi assente, salto' % lez); continue
        taglia(lez)
