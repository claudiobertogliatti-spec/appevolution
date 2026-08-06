#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Slide di copertina lezione — standard Evolution 17/7.
Logo partner + 'Capitolo X · Lezione Y' + titolo, fondo dal BrandKit.

'Capitolo' e non 'Modulo': e' la parola che usa Daniele in 32 lezioni su 32.
"""
from PIL import Image, ImageDraw, ImageFont
import json, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

W, H = 1920, 1080

# BrandKit Daniele Andolfi (da /api/partner-hub/23)
BG      = "#FFEEBB"
PRIMARY = "#9988AA"
TEXT    = "#0F172A"
LOGO    = "logo_sabai.png"

# Nunito (font del BrandKit) non e' installato: fallback Segoe UI.
F_EYEBROW = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 33)

NUMERI = {1:'uno',2:'due',3:'tre',4:'quattro',5:'cinque',6:'sei',
          7:'sette',8:'otto',9:'nove',10:'dieci',11:'undici',12:'dodici'}

_logo_cache = {}

def logo_scontornato(h):
    """Il logo e' tratto su bianco: si toglie il bianco per posarlo sul fondo brand."""
    if h in _logo_cache:
        return _logo_cache[h]
    lg = Image.open(LOGO).convert("RGB")
    px = lg.load(); lw, lh = lg.size
    alpha = Image.new("L", (lw, lh), 0); ap = alpha.load()
    for y in range(lh):
        for x in range(lw):
            r, g, b = px[x, y]
            lum = (r + g + b) / 3.0
            ap[x, y] = 0 if lum >= 250 else (255 if lum <= 225 else int((250-lum)/25.0*255))
    lg.putalpha(alpha)
    out = lg.resize((int(lw * h / lh), h), Image.LANCZOS)
    _logo_cache[h] = out
    return out


def misura_titolo(d, testo, dim):
    f = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", dim)
    return f, d.textlength(testo, font=f)


def copertina(lez, modulo, lezione, titolo, out_png):
    canvas = Image.new("RGB", (W, H), BG)
    target_h, logo_y = 400, 168
    lg = logo_scontornato(target_h)
    canvas.paste(lg, ((W - lg.width)//2, logo_y), lg)

    d = ImageDraw.Draw(canvas)

    def centrato(testo, font, y, fill, tracking=0):
        if tracking:
            ws = [d.textlength(c, font=font) for c in testo]
            x = (W - (sum(ws) + tracking*(len(testo)-1))) / 2
            for c, cw in zip(testo, ws):
                d.text((x, y), c, font=font, fill=fill); x += cw + tracking
        else:
            d.text(((W - d.textlength(testo, font=font))/2, y), testo, font=font, fill=fill)

    y = logo_y + target_h + 78
    centrato("CAPITOLO %d  ·  LEZIONE %d" % (modulo, lezione), F_EYEBROW, y, PRIMARY, tracking=7)
    y += 64
    d.rounded_rectangle([W/2-54, y, W/2+54, y+5], radius=3, fill=PRIMARY)
    y += 48

    # il titolo si rimpicciolisce finche' non sta nei margini (alcuni sono lunghi)
    dim = 92
    while dim > 46:
        f, w = misura_titolo(d, titolo, dim)
        if w <= W - 300:
            break
        dim -= 4
    centrato(titolo, f, y + (92-dim)//2, TEXT)

    canvas.save(out_png)
    return out_png


if __name__ == '__main__':
    full = json.load(open('andolfi-fulldata.json', encoding='utf-8'))
    L = full['videocorso']['lessons']
    os.makedirs('copertine', exist_ok=True)
    quali = sys.argv[1:] or sorted(L)
    for lez in quali:
        v = L[lez]
        p = copertina(lez, v['modulo'], v['lezione'], v['title'], 'copertine/%s.png' % lez)
        print('%-7s Capitolo %2d · Lezione %d — %s' % (lez, v['modulo'], v['lezione'], v['title']))
