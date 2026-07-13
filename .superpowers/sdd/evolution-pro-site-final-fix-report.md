# Evolution PRO site — report revisione finale

Data: 2026-07-13
Base verificata: `0619361f5b8b3c683cff1f103d7346f52681f95b`

## Modifiche

- Header: logo ufficiale, sticky/blur, stato compatto, navigazione accessibile desktop/mobile/tablet, CTA unica “Guarda la masterclass gratuita”.
- Contenuti: CTA centralizzata su `https://www.ciak.io`; FAQ corretta a “12 fasi operative”.
- Testimonial: gate quote+video invariato; sequenza desktop reversibile guidata da scroll con Framer Motion; fallback statico mobile/reduced; rimossi keyframe e delay CSS autonomi.
- Founder: PNG rimossi e sostituiti con WebP 640/1024 e 640/1280, senza upscaling; `srcSet`, `sizes`, dimensioni, lazy loading e async decoding.
- Font/performance: eliminato `@import`; aggiunti preconnect e stylesheet in `index.html`.
- Robustezza: `overflow-x: clip`; marquee non più focusabile senza contenuti interattivi; pausa hover mantenuta.
- Toolchain: versioni esatte, plugin React in devDependencies, lockfile pnpm, Lighthouse CI pinned.
- E2E: Chromium desktop/mobile/tablet touch, Firefox desktop e WebKit desktop; anchor, dominio vietato nell’intero HTML, errori console/page anche dopo reload reduced-motion, rete rallentata e struttura hero desktop.

## TDD e test unitari

RED: la prima suite ha prodotto 8 failure attese (logo/anchor, CTA/copy, testimonial scroll-linked/keyframe, WebP/font, marquee focus).
GREEN finale: `pnpm test:run` — 8 file, 30 test passati, 0 failure (33,1 s).

## Build

`pnpm build` — exit 0; 2205 moduli; bundle JS 350,04 kB (112,46 kB gzip), CSS 21,11 kB (4,40 kB gzip).

## E2E

Browser install: `pnpm exec playwright install chromium firefox webkit` — exit 0 (Firefox 151 / WebKit 26.5 installati).
Matrice finale: `pnpm e2e` — exit 0; 18 passati, 2 skip intenzionali (test motion desktop escluso da mobile/tablet), 0 failure, 1,9 min.

Progetti:

- desktop-chromium: 4 pass;
- mobile-chromium: 3 pass, 1 skip;
- tablet-chromium touch: 3 pass, 1 skip;
- desktop-firefox: 4 pass;
- desktop-webkit: 4 pass.

Il modal reale resta non testabile end-to-end perché non esistono ancora citazione e video verificati associabili. Il comportamento è coperto da fixture unit completa (apertura, focus trap, Escape, stop video e ripristino focus).

## Lighthouse

Comando riproducibile: `pnpm lighthouse`; dipendenza `@lhci/cli@0.15.1`, soglie configurate nella root del sito. Audit completato, ma exit 1 per soglia Performance:

- Performance: **58** (target 90) — non conforme;
- Accessibility: **95** (target 95) — conforme;
- Best Practices: **96** (target 95) — conforme;
- SEO: **100** (target 95) — conforme.

Metriche principali: FCP 2,6 s; LCP 6,7 s; TBT 610 ms; Max Potential FID 420 ms; TTI 6,7 s. Lighthouse segnala inoltre DOM size, forced reflow e network dependency tree. Il gap è reale e non è stato mascherato: richiede un’ondata dedicata di riduzione DOM/hydration e alleggerimento della motion/client bundle.

## Verifiche statiche

- `git diff --check` — exit 0 (solo avvisi Git CRLF, nessun errore whitespace).
- Scansione dominio vietato — occorrenze esclusivamente nei due test che ne asseriscono l’assenza; nessun contenuto/config/runtime usa il dominio dismesso.
- Asset testimonial, loghi collaborazioni/tool e screenshot Ciak restano binding esterni incompleti e sono documentati nel README; non sono stati inventati dati, URL, quote o video.

## Self-review

- Scope applicativo rispettato: modifiche di prodotto soltanto in `evolution-pro-site/`; questo report è l’unico file richiesto fuori dalla directory.
- CTA coerenti e centralizzate; nessun `aria-label` divergente.
- Tutte le correzioni comportamentali hanno regression test e ciclo RED/GREEN registrato.
- Nessun artefatto Lighthouse è incluso; configurazione e lockfile rendono l’audit riproducibile.
- Gap noto non risolto: Performance Lighthouse 58/100; nessuna dichiarazione di conformità alla soglia 90.
