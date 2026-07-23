"""
Ciak.io / Evolution PRO — Lesson Description Generator for Systeme.io

Genera automaticamente descrizioni formattate delle lezioni pronte per l'Area Riservata di Systeme.io
basandosi sull'audio/trascrizione o sulla traccia della lezione del videocorso.
"""

import logging
from html import escape
from typing import Dict

logger = logging.getLogger(__name__)

def generate_lesson_description(title: str, transcript_or_outline: str, partner_name: str = "") -> Dict[str, str]:
    """
    Genera il testo di descrizione per una lezione dell'Area Riservata di Systeme.io.

    Args:
        title: Titolo della lezione
        transcript_or_outline: Trascrizione audio o argomenti trattati
        partner_name: Nome del partner o dell'Accademia (opzionale)

    Returns:
        Dict con testo formattato sia in Markdown che in HTML pronto per Systeme.io
    """
    # 1. Estrarre punti chiave principali
    lines = [line.strip() for line in transcript_or_outline.splitlines() if line.strip()]
    summary_bullets = lines[:4] if lines else [f"Approfondimento pratico su {title}"]
    markdown_bullets = "".join(f"- {bullet}\n" for bullet in summary_bullets)

    # 2. Generare testo Markdown
    markdown_content = f"""### 📚 Lezione: {title}
{f'*In collaborazione con {partner_name}*' if partner_name else ''}

In questa lezione affronteremo i concetti chiave per applicare subito la strategia nel tuo business.

#### 💡 Cosa imparerai in questo modulo:
{markdown_bullets}

#### 📝 Azioni Pratiche da completare:
- [ ] Guarda il video completo della lezione.
- [ ] Scarica le risorse collegate e i modelli di supporto allegati sotto.
- [ ] Applica l'esercizio pratico nella tua area di lavoro.

---
*Hai domande su questa lezione? Scrivi nella community o contatta il supporto partner Ciak.io.*
"""

    # 3. Generare HTML compatibile con l'editor di Systeme.io
    safe_title = escape(title)
    safe_partner_name = escape(partner_name)
    safe_bullets = [escape(bullet) for bullet in summary_bullets]
    html_content = f"""<div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <h3 style="color: #0f172a; border-bottom: 2px solid #facc15; padding-bottom: 8px;">📚 Lezione: {safe_title}</h3>
  {f'<p style="font-style: italic; color: #64748b;">In collaborazione con {safe_partner_name}</p>' if safe_partner_name else ''}

  <p>Benvenuto/a in questa lezione! Qui sotto trovi la sintesi dei concetti chiave e i passi operativi da seguire.</p>

  <h4 style="color: #0f172a; margin-top: 16px;">💡 Concetti Chiave Trattati:</h4>
  <ul>
    {"".join([f"<li>{bullet}</li>" for bullet in safe_bullets])}
  </ul>

  <h4 style="color: #0f172a; margin-top: 16px;">📝 Checkpoint Pratico:</h4>
  <ol>
    <li>Guarda il video completo della lezione.</li>
    <li>Scarica le risorse collegate allegate qui sotto.</li>
    <li>Applica la procedura nella tua attività.</li>
  </ol>
</div>"""

    return {
        "title": title,
        "markdown": markdown_content,
        "html": html_content
    }
