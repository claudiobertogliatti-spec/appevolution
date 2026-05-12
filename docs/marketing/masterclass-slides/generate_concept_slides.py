"""
Genera le 5 slide concept della masterclass Ciak (sfondo slate-900 +
yellow-400 testo + Poppins SemiBold). Framework Ciak puro, no decorazione.

Output: concept-1.png ... concept-5.png in masterclass-slides/final/
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import textwrap

SCRIPT_DIR = Path(__file__).parent
FONT_SEMIBOLD = str(SCRIPT_DIR / "fonts" / "Poppins-SemiBold.ttf")
FONT_MEDIUM = str(SCRIPT_DIR / "fonts" / "Poppins-Medium.ttf")
OUT_DIR = SCRIPT_DIR / "final"
OUT_DIR.mkdir(exist_ok=True)

# Brand spec lockato
BG = (15, 23, 42)            # slate-900 #0F172A
ACCENT = (250, 204, 21)      # yellow-400 #FACC15
SECONDARY = (148, 163, 184)  # slate-400 #94A3B8

W, H = 1920, 1080

# 5 slide concept (Errore 1-5)
SLIDES = [
    {
        "num": 1,
        "label": "Errore 1",
        "text": "La visibilità è un effetto della direzione.\nNon è una causa.",
    },
    {
        "num": 2,
        "label": "Errore 2",
        "text": "Il problema non è quale strumento serve.\nIl problema è quale problema sta risolvendo.",
    },
    {
        "num": 3,
        "label": "Errore 3",
        "text": "Essere bravi nel proprio lavoro\nnon significa saper costruire un business\nbasato su quel lavoro.",
    },
    {
        "num": 4,
        "label": "Errore 4",
        "text": "Presenza senza struttura\nè un investimento di tempo\nche non scala in clienti.",
    },
    {
        "num": 5,
        "label": "Errore 5",
        "text": "Due situazioni che assomigliano in superficie\nsono spesso molto diverse a livello strutturale.",
    },
]


def measure(draw, text, font):
    """Restituisce (w, h) di un blocco di testo multilinea."""
    lines = text.split("\n")
    line_heights = []
    line_widths = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_widths.append(bbox[2] - bbox[0])
        line_heights.append(bbox[3] - bbox[1])
    # interlinea ~1.25
    total_h = sum(int(lh * 1.4) for lh in line_heights)
    return max(line_widths) if line_widths else 0, total_h, line_heights


def render_slide(slide):
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Label "Errore N" — piccolo, top-center, yellow-400, uppercase, letter-spaced
    label_font = ImageFont.truetype(FONT_MEDIUM, 28)
    label_text = slide["label"].upper() + "    ·    CIAK"
    # Letter-spacing simulato: aggiungo spazi
    label_bbox = draw.textbbox((0, 0), label_text, font=label_font)
    label_w = label_bbox[2] - label_bbox[0]
    draw.text(((W - label_w) // 2, 80), label_text, fill=ACCENT, font=label_font)

    # Testo principale — centro pagina, yellow-400, Poppins SemiBold, multilinea
    main_text = slide["text"]
    # Font size adattivo: parti grosso, scala se necessario
    font_size = 92
    main_font = ImageFont.truetype(FONT_SEMIBOLD, font_size)
    max_w = W - 280  # padding 140px lati

    while font_size > 50:
        w, h, line_heights = measure(draw, main_text, main_font)
        if w <= max_w and h < H * 0.65:
            break
        font_size -= 4
        main_font = ImageFont.truetype(FONT_SEMIBOLD, font_size)

    # Posiziona blocco centrato verticalmente
    w, h, line_heights = measure(draw, main_text, main_font)
    start_y = (H - h) // 2

    y = start_y
    for line in main_text.split("\n"):
        bbox = draw.textbbox((0, 0), line, font=main_font)
        line_w = bbox[2] - bbox[0]
        line_h = bbox[3] - bbox[1]
        x = (W - line_w) // 2
        draw.text((x, y), line, fill=(245, 245, 245), font=main_font)  # white-ish per concept
        y += int(line_h * 1.4)

    # Footer: piccolo accent yellow-400 dot center bottom
    dot_size = 8
    dot_y = H - 100
    draw.rectangle(
        [(W // 2 - dot_size, dot_y), (W // 2 + dot_size, dot_y + dot_size)],
        fill=ACCENT,
    )

    out = OUT_DIR / f"concept-{slide['num']}.png"
    img.save(out, "PNG", optimize=True)
    print(f"Saved {out.name} ({font_size}px)")


for slide in SLIDES:
    render_slide(slide)

print("\nDone. 5 concept slides in:", OUT_DIR)
