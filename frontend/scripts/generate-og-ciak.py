#!/usr/bin/env python3
"""
Genera frontend/public/og-ciak.png (1200x630) brand Ciak.

Brand kit LOCK 12/5: logo standard va su bianco/grigio chiaro; su scuro serve
versione monocromatica che non abbiamo come asset. Quindi background bianco
("versione preferita" da brand-kit §4) con accenti gialli #FACC15.

Composizione:
- BG: bianco puro (riprende le slide masterclass + Landing.jsx hero)
- Accent stripe gialla #FACC15 a sinistra (12px) — riferimento "pixel giallo logo"
- Logo Ciak orizzontale al centro-alto
- Tagline #0F172A (slate-900, body color)
- Pill gialla con CTA "ciak.io"
- Footer: Powered by Evolution PRO (gerarchia casa madre)

Font: Poppins (brand kit) se disponibile, altrimenti fallback Segoe UI/Arial.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "public" / "ciak" / "logo.webp"
OUT = ROOT / "public" / "og-ciak.png"

W, H = 1200, 630
WHITE = (255, 255, 255)
DARK = (15, 23, 42)       # #0F172A slate-900 — body color brand
YELLOW = (250, 204, 21)   # #FACC15 yellow-400 — accent
MUTED = (100, 116, 139)   # #64748B slate-500 — muted text


def load_font(size, bold=False):
    candidates = [
        ROOT.parent / "docs" / "brand" / "assets" / "fonts" / (
            "Poppins-Bold.ttf" if bold else "Poppins-Regular.ttf"
        ),
        Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"),
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(str(c), size)
    return ImageFont.load_default()


def text_w(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def main():
    if not LOGO.exists():
        print(f"missing logo: {LOGO}", file=sys.stderr)
        sys.exit(1)

    canvas = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(canvas)

    # Stripe gialla a sinistra (12px verticale)
    draw.rectangle((0, 0, 14, H), fill=YELLOW)

    # Logo Ciak — preserva alpha
    logo = Image.open(LOGO).convert("RGBA")
    logo_target_h = 300
    ratio = logo_target_h / logo.height
    logo_w = int(logo.width * ratio)
    logo_h = int(logo.height * ratio)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
    logo_x = (W - logo_w) // 2
    logo_y = 50
    canvas.paste(logo, (logo_x, logo_y), logo)

    # Tagline grande scura
    tagline = "Masterclass gratuita per consulenti e coach"
    f_tag = load_font(46, bold=True)
    tw = text_w(draw, tagline, f_tag)
    tag_y = logo_y + logo_h + 30
    draw.text(((W - tw) // 2, tag_y), tagline, font=f_tag, fill=DARK)

    # Pill gialla con CTA centrale
    pill_text = "30 min  ·  on-demand  ·  ciak.io"
    f_pill = load_font(28, bold=True)
    pw = text_w(draw, pill_text, f_pill)
    pill_pad_x, pill_pad_y = 32, 14
    pill_w = pw + pill_pad_x * 2
    pill_h = 28 + pill_pad_y * 2 + 6
    pill_x = (W - pill_w) // 2
    pill_y = tag_y + 70
    radius = pill_h // 2
    draw.rounded_rectangle(
        (pill_x, pill_y, pill_x + pill_w, pill_y + pill_h),
        radius=radius,
        fill=YELLOW,
    )
    # Center text vertically in pill (accounting for ascender)
    text_bbox = draw.textbbox((0, 0), pill_text, font=f_pill)
    text_h = text_bbox[3] - text_bbox[1]
    draw.text(
        (pill_x + pill_pad_x, pill_y + (pill_h - text_h) // 2 - 4),
        pill_text,
        font=f_pill,
        fill=DARK,
    )

    # Footer parent brand (gerarchia casa madre)
    parent = "Powered by Evolution PRO"
    f_par = load_font(18, bold=False)
    pw2 = text_w(draw, parent, f_par)
    draw.text((W - pw2 - 30, H - 35), parent, font=f_par, fill=MUTED)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT, format="PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"ok: {OUT} ({W}x{H}, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
