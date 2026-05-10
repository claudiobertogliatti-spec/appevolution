# Ciak Si Cambia — Brand Kit v1.0

**Versione**: v1.0
**Data**: 2026-05-09
**Status**: definitivo — sblocca OQ1 della spec migrazione

---

## 1) Concept simbolico

| Elemento | Significato |
|---|---|
| **C come ruota di pellicola** | Riferimento al "ciak" cinematografico — il momento del "azione!" che dà inizio alla scena |
| **Segmenti circolari rotanti** | Movimento, processo, cambiamento (= "si cambia") |
| **Pixel quadrati in alto a sinistra** | Digitalizzazione, transizione analogico → digitale |
| **Accento giallo in alto a destra** | Energia, attenzione, cambio di direzione |
| **Tipografia geometrica Poppins** | Modernità, tecnologia, accessibilità |

---

## 2) Palette colori

| Nome | Hex | RGB | Tailwind | Uso primario |
|---|---|---|---|---|
| **Blu profondo** | `#0F172A` | `15, 23, 42` | `slate-900` | Testi principali, logo solid, header dark, pulsanti primari |
| **Grigio medio** | `#64748B` | `100, 116, 139` | `slate-500` | Testi secondari, accenti, segmenti grigi del logo |
| **Grigio chiaro** | `#E5E7EB` | `229, 231, 235` | `gray-200` | Backgrounds neutri, divider, card surface |
| **Giallo accento** | `#FACC15` | `250, 204, 21` | `yellow-400` | CTA, highlight, micro-animazioni, link hover |

### Regole d'uso colore

- **Primary action (CTA)**: sfondo `#FACC15` + testo `#0F172A`
- **Secondary action**: bordo `#0F172A` + testo `#0F172A` su sfondo bianco/`#E5E7EB`
- **Body text**: `#0F172A` su bianco, oppure bianco su `#0F172A`
- **Muted text**: `#64748B`
- **Mai** usare `#FACC15` per blocchi di testo lunghi (basso contrasto)
- **Contrasto WCAG AA**: `#0F172A` su bianco = 17.4:1 ✓ AAA. `#FACC15` su `#0F172A` = 9.8:1 ✓ AAA.

### Tailwind config (frontend)

```js
// tailwind.config.ts — già allineato con i token di default
// Nessuna estensione necessaria — basta usare:
// bg-slate-900 / text-slate-900 (Blu profondo)
// bg-slate-500 / text-slate-500 (Grigio medio)
// bg-gray-200 (Grigio chiaro)
// bg-yellow-400 / text-yellow-400 (Giallo accento)

// Se vuoi alias semantici:
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',     // slate-900
        secondary: '#64748B',   // slate-500
        surface: '#E5E7EB',     // gray-200
        accent: '#FACC15',      // yellow-400
      }
    }
  }
}
```

---

## 3) Tipografia

| Ruolo | Font | Peso | Esempio |
|---|---|---|---|
| Headline / titoli | **Poppins** | SemiBold (600) | "Aiuto consulenti e coach…" |
| Sottotitoli / sub | **Poppins** | Medium (500) | "SI CAMBIA" |
| Body / paragrafi | **Poppins** | Regular (400) | testi correnti |
| Caption / micro | **Poppins** | Regular (400) — taglia piccola | metadata, footer |

### Import (frontend Next.js)

```tsx
// app/layout.tsx
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
})

export default function RootLayout({ children }) {
  return (
    <html lang="it" className={poppins.variable}>
      <body className="font-poppins">{children}</body>
    </html>
  )
}
```

### Fallback

Se Poppins non carica: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

---

## 4) Logo — varianti e quando usarle

| Variante | File proposto | Uso |
|---|---|---|
| **Pannello completo** | `ciak-logo-full.svg` | Hero homepage, About, header desktop |
| **Orizzontale** | `ciak-logo-horizontal.svg` | Header siti, email signature, footer |
| **Compatta** | `ciak-logo-compact.svg` | Mobile header, social profile |
| **Solo icona "C"** | `ciak-icon.svg` | Favicon, app icon, watermark, sub-brand |

### Spazio di rispetto

Mantenere intorno al logo uno spazio libero pari almeno alla larghezza della "C" (no testi/elementi affiancati troppo vicini).

### Sfondi consentiti

| Sfondo | OK? |
|---|---|
| Bianco puro | ✅ versione preferita |
| `#E5E7EB` grigio chiaro | ✅ |
| `#0F172A` blu profondo | ✅ versione monocromatica con icona color giallo accento |
| `#FACC15` giallo | ✅ versione monocromatica scura |
| Foto/sfondi complessi | ⚠️ usare versione su pannello bianco/scuro |

---

## 5) Formati esportati (asset deliverable)

### Favicon (`/public/favicon/`)
- `favicon-16.png` (16×16)
- `favicon-32.png` (32×32)
- `favicon-48.png` (48×48)
- `favicon.ico` (multi-resolution)
- `favicon.svg` (vector, browser moderni)

### App icon
- `apple-touch-icon.png` (180×180)
- `android-chrome-192.png` (192×192)
- `android-chrome-512.png` (512×512)
- `web-app-manifest-192.png` / `-512.png`

### Social
- `og-image.png` (1200×630, fondo bianco con logo orizzontale + tagline)
- `twitter-card.png` (1200×600)
- IG profile pic (320×320, icona + sfondo bianco/scuro/giallo a scelta)

---

## 6) Brand voice (sintesi, vedi social plan v5 per dettaglio)

| Tratto | Come |
|---|---|
| **Diretto** | Frasi brevi. Verbi attivi. No fronzoli. |
| **Educativo** | Spiega senza dare per scontato (target scarsamente digitalizzato) |
| **Caldo** | Tu informale, mai voi. Tono colloquiale italiano. |
| **Concreto** | Mai numeri inventati, mai promesse generiche. Esempi reali (Daniele). |
| **Anti-guru** | Niente "trasforma la tua vita", "metodi segreti", caps lock |

**Glossario tradotto** (vedi `docs/marketing/linee-guida-social-v5.md` sezione 4):
- "nicchia" → "il tipo specifico di cliente che servi"
- "posizionamento" → "perché un cliente sceglie te"
- "funnel" → "il percorso del cliente"
- ecc.

---

## 7) Asset originali — ✅ CONSEGNATI 2026-05-10

I file definitivi del logo sono stati consegnati e archiviati in [`assets/raster/`](assets/raster/):

| File | Cosa | Stato |
|---|---|---|
| `assets/raster/ciak-logo-full.webp` | Logo completo: icona + "iak" + "SI CAMBIA" | ✅ ufficiale, **NON modificare** |
| `assets/raster/ciak-icon.webp` | Solo icona "C" + pixel decorativi | ✅ ufficiale, **NON modificare** |

### Tasks operativi residui

| Task | Owner | Deadline |
|---|---|---|
| Esportare set favicon + app icon (PNG 16/32/48/180/192/512) da `ciak-icon.webp` in `ciak-frontend/public/` | Dev/Claude | T-22 (15/5) |
| Creare og-image PNG 1200×630 con padding + tagline (basata su `ciak-logo-full.webp`) | Designer/Canva o Claude | T-15 (22/5) |
| Creare Brand Kit su Canva Pro (importare colori + font + logo) | Claudio + Antonella | T-22 (15/5) |
| (Opzionale) Convertire WebP → PNG fallback per email Outlook legacy | Dev | T-15 (22/5) |

> ⚠️ **Nota storica**: il 2026-05-09 Claude ha generato 10 SVG ricostruiti dal brand kit grafico per sbloccare il dev/preview. Sono stati rifiutati (geometria non fedele) e archiviati in `assets/_archive/reconstructed-svg-2026-05-09/`. Sostituiti dagli asset ufficiali WebP del designer il 2026-05-10.

---

## 8) Riferimenti

- Spec architettura: `docs/migration/spec.md` (OQ1 risolto da questo doc)
- Social plan: `docs/marketing/linee-guida-social-v5.md`
- Spec masterclass: `docs/marketing/masterclass-spec.md` (sblocca decisione su brand slide)
