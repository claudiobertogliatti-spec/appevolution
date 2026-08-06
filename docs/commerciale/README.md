# Documenti commerciali ufficiali

Materiale customer-facing per la vendita. **Non sono contratti**: il contratto firmabile vive in `backend/routers/contract.py` (costante `CONTRACT_TEXT`), quella è la fonte legale.

| File | Cos'è | Stato |
|---|---|---|
| `partnership-2790-documento-ufficiale.html` / `.pdf` | Documento ufficiale del servizio **Partnership Evolution PRO €2.790**. 5 pagine A4: quando ha senso · Metodo EVO (3 fasi) · team · chi fa cosa · cosa non è incluso · investimento · come si comincia · cosa resta tuo · nessuna garanzia di risultato. | ✅ Ufficiale, 24/07/2026 |
| `percorso-evolution-funnel-completo.html` / `.pdf` | **Il percorso completo**, dalla masterclass gratuita al post-partnership. 6 pagine A4: perché un'accademia · Ciak Blueprint €27 e come si acquista · il bivio pronto/non pronto · Ciak Start €499 e i 7 passi · upgrade a €2.291 · i 25 servizi extra a listino · i 4 piani di continuità EVO-S. | ✅ Ufficiale, 24/07/2026 |

## Fonti dei dati (da ricontrollare prima di ogni revisione)

- **Prezzi**: `backend/services/ciak_offers.py` — Blueprint €27 · Start €499 · Partnership €2.790 · Upgrade €2.291 · EVO-S 147/297/497/797.
- **Condizioni contrattuali**: `backend/routers/contract.py` → `CONTRACT_TEXT` (16 articoli).
- **Percorso EVO**: `backend/models/partner_journey_step.py` → `MACRO_PHASES_DEFINITION` e `JOURNEY_STEPS_DEFINITION`.
- **Servizi extra**: `backend/routers/servizi_extra.py` (25 servizi a listino).
- **Vocabolario e parole vietate**: memoria `ciak_brand_copy_framework`.

## Come si rigenera il PDF

L'HTML è autoconsistente (logo Evolution incorporato in base64). I `<link>` ai Google Fonts vanno rimossi prima del render, altrimenti Chrome headless resta appeso in attesa della rete.

```bash
python -c "import re,pathlib; p=pathlib.Path('docs/commerciale/partnership-2790-documento-ufficiale.html'); pathlib.Path('/tmp/doc.html').write_text(re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)[^>]*>','',p.read_text(encoding='utf-8')),encoding='utf-8')"
```

Poi Chrome headless: `--headless=new --disable-gpu --virtual-time-budget=6000 --print-to-pdf=<out.pdf> file:///tmp/doc.html`
(NON usare `--no-pdf-header-footer`: fa fallire la generazione.)
