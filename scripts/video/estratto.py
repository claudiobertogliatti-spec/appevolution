#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Anteprima leggera di una lezione consegnata, CON verifica.

⛔ `-t` va messo DOPO `-i` (opzione di uscita). Messo prima diventa un limite
sull'ingresso e su questi file produce video piu' lungo dell'audio: il 30/7 sono
uscite anteprime da 47s di video con 28s di audio, e sembrava che il montaggio
perdesse l'audio a meta'. Il montaggio era corretto: era rotta l'anteprima.

Regola generale: **si verifica l'artefatto che si consegna davvero**, anteprime incluse.
"""
import subprocess, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SEC = 30

def durate(f):
    d = {}
    for s, lab in (('v:0','video'), ('a:0','audio')):
        o = subprocess.run(['ffprobe','-v','error','-select_streams',s,'-show_entries',
                            'stream=duration','-of','csv=p=0',f],
                           capture_output=True, text=True).stdout.strip()
        d[lab] = float(o) if o else 0.0
    return d

for lez in sys.argv[1:]:
    src = 'consegna/lezione_andolfi_%s.mp4' % lez
    out = 'anteprima_%s.mp4' % lez
    if not os.path.exists(src):
        print('%-7s non consegnato' % lez); continue
    subprocess.run(['ffmpeg','-y','-v','error','-i',src,
                    '-t',str(SEC),                      # <-- DOPO -i
                    '-c:v','libx264','-crf','23','-preset','fast','-r','25',
                    '-c:a','aac','-b:a','128k','-ar','48000','-ac','1', out], check=True)
    d = durate(out)
    ok = abs(d['video']-d['audio']) < 0.3 and abs(d['video']-SEC) < 0.5
    print('%-7s %-8s video %.2fs · audio %.2fs · %.1f MB' %
          (lez, 'OK' if ok else '!! ROTTA', d['video'], d['audio'], os.path.getsize(out)/1e6))
    if not ok:
        os.remove(out); raise SystemExit('anteprima %s scartata' % lez)
