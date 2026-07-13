# Evolution PRO — sito istituzionale

Landing page React/Vite di Evolution PRO.

## Prerequisiti

- Node.js 20 o successivo
- pnpm 9 o successivo

## Avvio e verifica

```bash
pnpm --dir evolution-pro-site install
pnpm --dir evolution-pro-site dev
pnpm --dir evolution-pro-site test:run
pnpm --dir evolution-pro-site exec playwright install chromium
pnpm --dir evolution-pro-site e2e
pnpm --dir evolution-pro-site build
```

I test browser coprono viewport desktop 1440×900 e mobile 390×844, incluso il comportamento con `prefers-reduced-motion`.

## Asset da collegare

- loghi definitivi delle collaborazioni;
- loghi tool in SVG;
- citazioni, video e poster testimonial verificati;
- screenshot reali della piattaforma Ciak.

Tutti gli asset provvisori devono essere sostituiti solo con materiali approvati e con provenienza verificabile.

## Dominio

La destinazione di tutte le CTA applicative è `https://www.ciak.io`. Il dominio applicativo storico dismesso non deve comparire nel codice, nei contenuti o nella configurazione.
