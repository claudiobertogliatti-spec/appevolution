#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Montaggio finale: taglio (fase 2) + copertina con voce narrante, per ogni lezione pronta.
Niente sigla, niente outro, niente sottotitoli, niente musica (ricetta §4, decisione 30/7)."""
import json, os, re, subprocess, sys, glob
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import taglia

LEAD_IN, TAIL, FADE_IN = 0.5, 0.7, 0.45
OUT = 'consegna'


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        print(p.stderr[-1500:]); raise SystemExit('ffmpeg fallito')
    return p.stderr


def durata(p):
    return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                                 '-of','csv=p=0',p], capture_output=True, text=True).stdout.strip())


def lufs(p):
    err = run(['ffmpeg','-v','info','-i',p,'-af','ebur128','-f','null','-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1]) if m else -18.5


def monta(lez):
    finale = '%s/lezione_andolfi_%s.mp4' % (OUT, lez)
    if os.path.exists(finale):
        print('%-7s gia\' consegnato' % lez); return

    girato = taglia.taglia(lez)                      # applica solo i tagli attivi
    cover, voce = 'copertine/%s.png' % lez, 'voci/%s.mp3' % lez
    for f in (cover, voce):
        if not os.path.exists(f):
            print('%-7s manca %s' % (lez, f)); return

    gain = round(lufs(girato) - lufs(voce), 2)       # §5: voce pareggiata al girato
    dv = durata(voce)
    dc = round(LEAD_IN + dv + TAIL, 3)

    run(['ffmpeg','-y','-v','error','-loop','1','-framerate','25','-t',str(dc),
         '-i',cover,'-i',voce,'-filter_complex',
         '[0:v]scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=%s,setsar=1[v];'
         '[1:a]volume=%sdB,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono,'
         'adelay=%d,apad,atrim=0:%s,asetpts=PTS-STARTPTS[a]' % (FADE_IN, gain, int(LEAD_IN*1000), dc),
         '-map','[v]','-map','[a]','-c:v','libx264','-profile:v','high','-pix_fmt','yuv420p',
         '-crf','18','-preset','medium','-video_track_timescale','12800','-r','25',
         '-c:a','aac','-b:a','192k','-ar','48000','-ac','1','_cov_%s.mp4' % lez])

    with open('_cat_%s.txt' % lez, 'w') as f:
        f.write("file '_cov_%s.mp4'\nfile '%s'\n" % (lez, girato))
    run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i','_cat_%s.txt' % lez,
         '-c','copy',finale])

    tot = durata(finale)
    atteso = dc + durata(girato)
    # Guardia: il concat in copia non riscrive i tempi. Se copertina e girato non hanno
    # gli stessi parametri (fps, timebase, campionamento) il file esce lungo il doppio
    # senza che ffmpeg segnali nulla. Successo gia' verificato una volta: 18:41 invece di 7:57.
    if abs(tot - atteso) > 1.0:
        os.remove(finale)
        raise SystemExit('%s: DURATA SBAGLIATA %.1fs invece di %.1fs — parametri non allineati'
                         % (lez, tot, atteso))
    print('%-7s OK  %5.1fs (%d:%02d)  voce %+.1f dB' % (lez, tot, tot//60, tot%60, gain))
    for t in ('_cov_%s.mp4' % lez, '_cat_%s.txt' % lez):
        os.remove(t)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    quali = sys.argv[1:]
    if not quali:
        quali = sorted(os.path.basename(f).split('.')[0]
                       for f in glob.glob('analisi/*.analisi.json'))
    for lez in quali:
        if not os.path.exists('analisi/%s.analisi.json' % lez):
            print('%-7s analisi assente' % lez); continue
        monta(lez)
