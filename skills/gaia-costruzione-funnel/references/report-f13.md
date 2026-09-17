# Report finale per Claudio — funnel partner

Ogni affermazione con la sua prova (URL, screenshot, risposta del connector). Etichette obbligatorie: ✅ verificato · 🔎 deduzione · ⛔ mancante.

## Modello

```
FUNNEL <nome partner> (partner_id <id>) — <data>

Account Systeme: <sottodominio partner>
Funnel: <nome> — URL Optin: <url>

Pagine
1. Optin            — salvata ✅/⛔ — prova: <screenshot/rilettura>
2. Landing          — ...
3. Modulo d'ordine  — prezzo impostato: <valore> (fonte: offerPrice) ...
4. Ringraziamento   — ...

Dati mancanti
- [MANCANTE: ...] in <pagina> — serve da: <chi>

Controlli F-13 (stato visto da Gaia, NON scritto in Ciak)
- systeme_account_or_course: ...
- public_sales_url: ...
- domain_or_platform_url: ...
- legal_pages: ...
- checkout: ...
- price_consistency: ...
- access_automation: ...

Azioni per Claudio (valori esatti)
- Attivare il funnel <nome>
- Salvare in Ciak: funnel_systeme_url = <url>
- <altre: dominio, Stripe, pagine legali>
```

I nomi dei 7 controlli vengono da `docs/superpowers/specs/2026-08-12-journey-evo-f1-f20-design.md` §8.
