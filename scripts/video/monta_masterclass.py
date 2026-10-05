#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Montaggio automatico di una MASTERCLASS secondo lo standard ciak-masterclass-v1 (prototipo da riga di comando).

Esegue in locale gli stessi passi che la pipeline farà in produzione, per verificarli su un video reale:
  1. legge le parole con i tempi (da JSON AssemblyAI in secondi, oppure da sottotitoli .vtt di YouTube);
  2. misura i silenzi del video, trova le pratiche guidate (protette);
  3. propone i tagli: pause >1,3 s fuori pratica, intercalari, riprese ripetute, balbettii (+ tagli di
     struttura dell'AI, qui da file: --ai-cuts) e li riunisce in un piano;
  4. valida le schede a schermo (--cards, JSON) e, se non è --piano-solo, monta: tagli, schede, volume
     -17,5 LUFS, sigla di apertura e di chiusura col logo del partner, controllo qualità.

Uso:
  python scripts/video/monta_masterclass.py --source originale.mp4 --parole sottotitoli.it.vtt \
      --brand brand.json --cards schede.json --ai-cuts tagli_ai.json --out cartella/ [--altezza 720] [--piano-solo]

brand.json: {"name": "...", "colors": ["#000041", "#35B3CB", "#F67563"], "logo_path": "logo.png", "banned": ["terapia"]}
"""
import argparse, io, json, os, re, sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from services import ciak_masterclass_standard as mc  # noqa: E402
from services.ciak_lesson_standard import _duration  # noqa: E402


def parole_da_vtt(path):
    def ts(s):
        h, m, x = s.split(":"); return int(h) * 3600 + int(m) * 60 + float(x)
    raw, cs, last = [], None, -1
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        m = re.match(r"(\d\d:\d\d:\d\d\.\d+) --> ", line)
        if m:
            cs = ts(m.group(1)); continue
        if cs is None or "<c>" not in line:
            continue
        f = re.match(r"^([^<]+)<", line)
        items = [(cs, f.group(1).strip())] if f and f.group(1).strip() else []
        items += [(ts(t), w.strip()) for t, w in re.findall(r"<(\d\d:\d\d:\d\d\.\d+)><c>([^<]*)</c>", line) if w.strip()]
        for t, w in items:
            if t >= last - 0.01:
                raw.append((t, w)); last = t
    words = []
    for i, (t, w) in enumerate(raw):
        nxt = raw[i + 1][0] if i + 1 < len(raw) else t + 0.4
        words.append({"text": w, "start": round(t, 3), "end": round(min(nxt, t + 0.45), 3)})
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--parole", required=True)
    ap.add_argument("--brand", required=True)
    ap.add_argument("--cards")
    ap.add_argument("--ai-cuts")
    ap.add_argument("--out", required=True)
    ap.add_argument("--altezza", type=int)
    ap.add_argument("--piano-solo", action="store_true")
    ap.add_argument("--senza-sigla", action="store_true")
    ap.add_argument("--preset", default="veryfast", help="preset x264: ultrafast per le prove veloci")
    ap.add_argument("--crf", type=int, default=20)
    ap.add_argument("--soglia-db", type=float, help="soglia silenzi sul girato (default: -35 dB corretto del guadagno del volume)")
    a = ap.parse_args()

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    brand = json.load(open(a.brand, encoding="utf-8"))
    brand_dir = Path(a.brand).parent
    duration = _duration(a.source)
    words = parole_da_vtt(a.parole) if a.parole.endswith(".vtt") else json.load(open(a.parole, encoding="utf-8"))
    words = mc.normalize_words(words, duration)

    print(f"Video {a.source}: {duration / 60:.1f} min, {len(words)} parole")
    thr = a.soglia_db
    if thr is None:
        gain = mc.TARGET_LUFS - float(mc.measure_loudnorm(a.source, [(0.0, duration)])["input_i"])
        thr = round(-35.0 - gain, 1)
    print(f"Soglia silenzi sul girato: {thr} dB")
    sil_pratica = mc.silence_list(a.source)          # soglia fissa -35 dB: riconosce le pratiche
    sil = mc.silence_list(a.source, thr)             # soglia corretta dal guadagno: decide le pause da tagliare
    practice = mc.practice_ranges(words, sil_pratica, duration)
    print("Pratiche guidate (protette):", [(round(r['start']), round(r['end'])) for r in practice])

    pause = mc.silence_cuts(sil, practice)
    fill = mc.filler_cuts(words, practice)
    rep = mc.repeat_cuts(words, practice)
    pause += mc.adjacent_pause_cuts(sil, fill + rep, practice)
    ai = {"accepted": [], "rejected": [], "total_s": 0}
    if a.ai_cuts:
        ai = mc.validate_ai_cuts(json.load(open(a.ai_cuts, encoding="utf-8")), words, practice, duration)
    plan = mc.assemble_plan(pause, fill, rep, ai["accepted"], duration_s=duration)
    print(f"Tagli: pause {len(pause)}, intercalari {len(fill)}, riprese/balbettii {len(rep)}, struttura AI {len(ai['accepted'])} "
          f"(respinti {len(ai['rejected'])}) -> {len(plan['cuts'])} tagli, {plan['cut_s']:.0f} s tolti, "
          f"durata dopo i tagli {plan['kept_s'] / 60:.1f} min")

    cards = {"accepted": [], "rejected": []}
    if a.cards:
        cards = mc.validate_cards(json.load(open(a.cards, encoding="utf-8")), practice, duration, brand.get("banned", []))
        print(f"Schede: {len(cards['accepted'])} ammesse, {len(cards['rejected'])} respinte")
        for r in cards["rejected"]:
            print("   respinta:", r["start"], r["kicker"], "->", r["rejected_because"])

    (out / "piano.json").write_text(json.dumps({"practice": practice, "plan": plan, "cards": cards,
                                                "ai_cuts": ai, "standard": mc.STANDARD_VERSION},
                                               ensure_ascii=False, indent=1), encoding="utf-8")
    if a.piano_solo:
        print("Piano scritto in", out / "piano.json")
        return
    logo = None
    if brand.get("logo_path"):
        from PIL import Image
        lp = Path(brand["logo_path"]); lp = lp if lp.is_absolute() else brand_dir / lp
        logo = Image.open(lp).convert("RGBA")
    report = mc.render_masterclass(source=a.source, output=str(out / "masterclass_montata.mp4"), tmp_dir=out / "tmp",
                                   plan=plan, cards=cards["accepted"], brand=brand, logo_image=logo, height=a.altezza,
                                   with_sigla=not a.senza_sigla, practice=practice,
                                   preset=a.preset, crf=a.crf)
    (out / "rapporto.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
