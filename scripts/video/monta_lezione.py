#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Monta una lezione secondo docs/video/recipe-lezione-cut.md (standard 17/7):
slide di copertina + voce narrante Evolution, poi il girato montato.
NESSUNA sigla, NESSUN outro, nessun sottotitolo impresso.

Il girato montato viene copiato senza ricodifica: il montato gia' approvato
resta bit-per-bit identico.
"""
import subprocess, re, sys, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

LEAD_IN   = 0.5   # respiro prima che parta la voce
TAIL      = 0.7   # respiro dopo la voce, prima dello stacco
FADE_IN   = 0.45

def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        print(p.stderr[-2000:]); raise SystemExit('ffmpeg fallito: %s' % ' '.join(cmd[:6]))
    return p.stderr

def durata(path):
    o = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                        '-of','csv=p=0',path], capture_output=True, text=True).stdout
    return float(o.strip())

def lufs(path):
    err = run(['ffmpeg','-v','info','-i',path,'-af','ebur128','-f','null','-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1]) if m else None

def monta(cover_png, vo_mp3, lezione_mp4, out_mp4):
    # 1. pareggia la voce narrante alla lezione (la chiarezza audio e' pedagogia, §5)
    target = lufs(lezione_mp4)
    voce   = lufs(vo_mp3)
    gain   = round(target - voce, 2)
    print('lezione %.1f LUFS · voce %.1f LUFS -> guadagno voce %+.2f dB' % (target, voce, gain))

    dur_vo  = durata(vo_mp3)
    dur_cov = round(LEAD_IN + dur_vo + TAIL, 3)
    print('copertina %.2fs (voce %.2fs)' % (dur_cov, dur_vo))

    # 2. segmento copertina, codificato per combaciare con la lezione
    run(['ffmpeg','-y','-v','error','-loop','1','-framerate','25','-t',str(dur_cov),
         '-i',cover_png,'-i',vo_mp3,
         '-filter_complex',
         '[0:v]scale=1920:1080,format=yuvj420p,fade=t=in:st=0:d=%s,setsar=1[v];'
         '[1:a]volume=%sdB,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=mono,'
         'adelay=%d,apad,atrim=0:%s,asetpts=PTS-STARTPTS[a]' % (FADE_IN, gain, int(LEAD_IN*1000), dur_cov),
         '-map','[v]','-map','[a]',
         '-c:v','libx264','-profile:v','high','-level','4.0','-pix_fmt','yuvj420p',
         '-crf','18','-preset','medium','-video_track_timescale','12800','-r','25',
         '-c:a','aac','-b:a','192k','-ar','48000','-ac','1','_cover_seg.mp4'])

    # 3. concat senza ricodifica
    with open('_concat.txt','w') as f:
        f.write("file '_cover_seg.mp4'\nfile '%s'\n" % lezione_mp4)
    run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i','_concat.txt',
         '-c','copy',out_mp4])

    tot = durata(out_mp4)
    print('OK %s — %.2fs (%.0f:%02.0f)' % (out_mp4, tot, tot//60, tot%60))
    print('   copertina %.2f + lezione %.2f = %.2f' % (dur_cov, durata(lezione_mp4), tot))
    for tmp in ('_cover_seg.mp4','_concat.txt'):
        os.remove(tmp)
    return out_mp4

if __name__ == '__main__':
    monta('cover_m1_l1.png','vo_cover_andrew.mp3','pilot_3lug.mp4',
          'lezione_andolfi_m1l1_v1.mp4')
