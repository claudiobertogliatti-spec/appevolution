#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""QC MASTERCLASS — misura un video e lo confronta con la regola in docs/video/recipe-masterclass-cut.md §2.

Uso:  python scripts/video/qc_masterclass.py <video.mp4> [--vtt sottotitoli.it.vtt] [--pratica 8:20-13:45,17:00-26:30]

--pratica: finestre di pratica guidata (m:ss-m:ss, separate da virgola). Le pause dentro quelle finestre
sono volute (ricetta §8): non contano per il verdetto e il ritmo del parlato non viene valutato.

Misura (solo ffmpeg/ffprobe, nessun servizio esterno): durata, volume (LUFS/LRA), pause.
Con --vtt (sottotitoli automatici YouTube con timing per parola) misura anche il ritmo del parlato.
NON misura le schede a schermo, il gancio, la CTA: quelle restano nel gate umano (§11).
Se nel video c'e' una pratica guidata, le pause al suo interno sono volute: leggi il verdetto
sulle pause con quella eccezione (§8).
"""
import re, subprocess, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Soglie = §2 della ricetta (misurate sulla masterclass di riferimento).
SOGLIE = {
    'durata_min': (24.0, 30.0),
    'lufs': (-18.5, -16.5),
    'lra_max': 3.5,
    'pausa_max_s': 1.3,
    'pause_1_5_max': 0,
    'ritmo_parole_min': (135, 165),
}
SILENZIO_DB = '-35dB'
SILENZIO_MIN_S = 0.25


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def durata_s(mp4):
    r = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4])
    return float(r.stdout.strip())


def loudness(mp4):
    r = run(['ffmpeg', '-nostats', '-i', mp4, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    summary = r.stderr.split('Summary:')[-1]
    i = re.search(r'I:\s+(-?[\d.]+) LUFS', summary)
    lra = re.search(r'LRA:\s+([\d.]+) LU', summary)
    return (float(i.group(1)) if i else None, float(lra.group(1)) if lra else None)


def pause(mp4):
    """Ritorna [(inizio_s, durata_s)]."""
    r = run(['ffmpeg', '-nostats', '-i', mp4, '-vn', '-af',
             f'silencedetect=noise={SILENZIO_DB}:d={SILENZIO_MIN_S}', '-f', 'null', '-'])
    return [(float(e) - float(d), float(d))
            for e, d in re.findall(r'silence_end: ([\d.]+) \| silence_duration: ([\d.]+)', r.stderr)]


def finestre(testo):
    """'8:20-13:45,17:00-26:30' -> [(500, 825), (1020, 1590)]"""
    def sec(x):
        m, s = x.strip().split(':'); return int(m) * 60 + int(s)
    out = []
    for blocco in (testo or '').split(','):
        if blocco.strip():
            a, b = blocco.split('-'); out.append((sec(a), sec(b)))
    return out


def ritmo_vtt(path):
    def ts(s):
        h, m, x = s.split(':'); return int(h) * 3600 + int(m) * 60 + float(x)
    out, cs, last = [], None, -1
    for raw in open(path, encoding='utf-8'):
        line = raw.rstrip('\n')
        m = re.match(r'(\d\d:\d\d:\d\d\.\d+) --> ', line)
        if m:
            cs = ts(m.group(1)); continue
        if cs is None or '<c>' not in line:
            continue
        f = re.match(r'^([^<]+)<', line)
        items = [(cs, f.group(1).strip())] if f and f.group(1).strip() else []
        items += [(ts(t), w.strip()) for t, w in re.findall(r'<(\d\d:\d\d:\d\d\.\d+)><c>([^<]*)</c>', line) if w.strip()]
        for t, w in items:
            if t >= last - 0.01:
                out.append(t); last = t
    if not out:
        return None
    minuti = max(out[-1], 1) / 60.0
    per_min = {}
    for t in out:
        per_min[int(t // 60)] = per_min.get(int(t // 60), 0) + 1
    pieni = [v for k, v in per_min.items() if k < int(minuti)]  # esclude l'ultimo minuto parziale
    return round(len(out) / minuti), (min(pieni) if pieni else None), (max(pieni) if pieni else None)


def esito(ok):
    return 'OK ' if ok else 'FUORI'


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'):
        print(__doc__); sys.exit(2)
    mp4 = args[0]
    vtt = args[args.index('--vtt') + 1] if '--vtt' in args else None
    pratica = finestre(args[args.index('--pratica') + 1]) if '--pratica' in args else []
    d = durata_s(mp4)
    minuti = d / 60.0
    lufs, lra = loudness(mp4)
    tutte = pause(mp4)
    in_pratica = [x for x in tutte if any(a <= x[0] <= b for a, b in pratica)]
    p = [dur for ini, dur in tutte if not any(a <= ini <= b for a, b in pratica)]
    tot = sum(p)
    p05 = sum(1 for x in p if x >= 0.5)
    p13 = sum(1 for x in p if x > SOGLIE['pausa_max_s'])
    p15 = sum(1 for x in p if x >= 1.5)
    pmax = max(p) if p else 0.0
    risultati = []

    def riga(nome, valore, ok, nota=''):
        risultati.append(ok)
        print(f'  [{esito(ok)}] {nome:<34} {valore}{("   " + nota) if nota else ""}')

    print(f'QC masterclass: {mp4}')
    lo, hi = SOGLIE['durata_min']
    riga('Durata', f'{int(d // 60)}:{int(d % 60):02d}', lo <= minuti <= hi, f'(regola {lo:.0f}-{hi:.0f} min)')
    lo, hi = SOGLIE['lufs']
    riga('Volume integrato', f'{lufs} LUFS', lufs is not None and lo <= lufs <= hi, f'(regola {lo}..{hi})')
    riga('Dinamica (LRA)', f'{lra} LU', lra is not None and lra <= SOGLIE['lra_max'], f"(regola <= {SOGLIE['lra_max']})")
    riga('Pausa piu lunga', f'{pmax:.1f} s', pmax <= SOGLIE['pausa_max_s'], f"(regola <= {SOGLIE['pausa_max_s']} s)")
    riga('Pause > 1,3 s', f'{p13}', p13 == 0, f'({p13 / minuti:.1f} al minuto)')
    riga('Pause >= 1,5 s', f'{p15}', p15 <= SOGLIE['pause_1_5_max'], '(regola: nessuna)')
    print(f'  [info] pause >= 0,5 s: {p05} ({p05 / minuti:.1f}/min, riferimento ~6,6) | tempo in pausa: {100 * tot / d:.1f}%')
    if pratica:
        print(f'  [info] pratica guidata: {len(in_pratica)} pause nelle finestre indicate (escluse dal verdetto), la piu lunga {max((x[1] for x in in_pratica), default=0):.1f} s')
    if vtt and pratica:
        print('  [info] ritmo del parlato non valutato: ci sono pratiche guidate (silenzi voluti)')
    elif vtt:
        r = ritmo_vtt(vtt)
        if r:
            wpm, mn, mx = r
            lo, hi = SOGLIE['ritmo_parole_min']
            riga('Ritmo del parlato', f'{wpm} parole/min (min {mn}, max {mx})', lo <= wpm <= hi, f'(regola {lo}-{hi}, mai accelerato)')
    else:
        print('  [info] ritmo del parlato non misurato (passa --vtt con i sottotitoli automatici)')
    print('  [da fare a mano] gancio 0-12 s, promessa entro 60 s, schede 25-35% del tempo, CTA finale, brand kit, nessun sottotitolo impresso (ricetta §11)')
    sys.exit(0 if all(risultati) else 1)


if __name__ == '__main__':
    main()
