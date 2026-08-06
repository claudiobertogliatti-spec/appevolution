#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""QC gate automatico su una lezione consegnata."""
import subprocess, re, sys, json, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def probe(f, campi, stream=None):
    cmd = ['ffprobe','-v','error']
    if stream: cmd += ['-select_streams', stream]
    cmd += ['-show_entries', campi, '-of', 'default=noprint_wrappers=1', f]
    return dict(l.split('=',1) for l in subprocess.run(cmd,capture_output=True,text=True).stdout.strip().splitlines() if '=' in l)

def lufs(f, extra=None):
    cmd = ['ffmpeg','-v','info'] + (extra or []) + ['-i',f,'-af','ebur128','-f','null','-']
    e = subprocess.run(cmd,capture_output=True,text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', e)
    return float(m[-1]) if m else None

for lez in sys.argv[1:]:
    f = 'consegna/lezione_andolfi_%s.mp4' % lez
    if not os.path.exists(f):
        print('%-7s NON CONSEGNATO' % lez); continue
    v = probe(f, 'stream=r_frame_rate,avg_frame_rate,width,height,time_base', 'v:0')
    a = probe(f, 'stream=sample_rate,channels', 'a:0')
    tot = float(probe(f, 'format=duration')['duration'])
    ana = json.load(open('analisi/%s.analisi.json' % lez, encoding='utf-8'))
    voce = float(probe('voci/%s.mp3' % lez, 'format=duration')['duration'])
    cover = 0.5 + voce + 0.7
    atteso = cover + ana['durata'] - ana['secondi_tagliati']

    lu_cov = lufs(f, ['-ss','0','-t','%.2f' % (cover-0.5)])
    lu_lez = lufs(f, ['-ss','%.2f' % (cover+1)])

    ok = []
    ok.append(('durata', abs(tot-atteso) < 1.5, '%.1fs (attesi %.1f)' % (tot, atteso)))
    # avg_frame_rate non torna MAI esatto su sorgenti a frame rate variabile normalizzate:
    # resta un residuo frazionario (es. 25,0008). Conta che sia 25 entro lo 0,5%.
    def rate(s):
        n, d = s.split('/'); return float(n)/float(d) if float(d) else 0.0
    avg = rate(v.get('avg_frame_rate','0/1'))
    ok.append(('frame rate ~25 cost.', v.get('r_frame_rate')=='25/1' and abs(avg-25) < 0.125,
               '%s · medio %.4f' % (v.get('r_frame_rate'), avg)))
    ok.append(('1080p', v.get('width')=='1920' and v.get('height')=='1080', '%sx%s' % (v.get('width'), v.get('height'))))
    ok.append(('audio 48k mono', a.get('sample_rate')=='48000' and a.get('channels')=='1', '%s Hz %s ch' % (a.get('sample_rate'), a.get('channels'))))
    ok.append(('voce pareggiata', abs(lu_cov-lu_lez) <= 1.0, 'copertina %.1f / lezione %.1f LUFS' % (lu_cov, lu_lez)))

    print('%-7s %s' % (lez, 'TUTTO OK' if all(o[1] for o in ok) else '!! PROBLEMI'))
    for nome, esito, det in ok:
        print('   %s %-22s %s' % ('ok' if esito else '!!', nome, det))
