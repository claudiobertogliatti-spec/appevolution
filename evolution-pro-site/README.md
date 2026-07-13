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
pnpm --dir evolution-pro-site exec playwright install chromium firefox webkit
pnpm --dir evolution-pro-site e2e
pnpm --dir evolution-pro-site build
pnpm --dir evolution-pro-site lighthouse
```

I test browser coprono Chromium, Firefox e WebKit su desktop, oltre a mobile e tablet touch, incluso il comportamento con `prefers-reduced-motion` e rete rallentata.

## Asset da collegare

- loghi definitivi delle collaborazioni;
- loghi tool in SVG;
- citazioni, video, foto e poster testimonial verificati: il binding resta incompleto nella bozza locale, quindi le buste reali e il modal non vengono pubblicati;
- screenshot reali della piattaforma Ciak.

Tutti gli asset provvisori devono essere sostituiti solo con materiali approvati e con provenienza verificabile.

## Dominio

La destinazione di tutte le CTA applicative è `https://www.ciak.io`. Il dominio applicativo storico dismesso non deve comparire nel codice, nei contenuti o nella configurazione.
