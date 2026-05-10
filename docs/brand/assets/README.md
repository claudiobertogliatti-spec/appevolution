# Ciak — Brand Assets

Asset visivi del brand Ciak Si Cambia. Riferimento canonico: [`../ciak-brand-kit.md`](../ciak-brand-kit.md).

---

## ✅ Stato attuale (2026-05-10)

**Asset originali ufficiali consegnati** in [`raster/`](raster/) — formato WebP, **da non modificare**.

| File | Cosa | Use case primario |
|---|---|---|
| `raster/ciak-logo-full.webp` | Logo completo: icona "C" + "iak" + "SI CAMBIA" con linee gialle | Hero homepage, header siti, email signature, OG image, social profile cover |
| `raster/ciak-icon.webp` | Solo icona "C" + pixel decorativi (no testo) | Favicon, app icon, watermark, profilo IG/FB |

⚠️ **Regola assoluta**: questi 2 file **NON vanno modificati**. Sono i logo definitivi consegnati dal designer 2026-05-10 e archiviati nel repo come unica fonte di verità grafica.

Se servono varianti (es. inversione colori, dimensioni specifiche, monocromatico) → creare nuovi file con nome esplicito (es. `ciak-icon-mono-white.webp`) **senza alterare gli originali**.

---

## Struttura cartelle

```
assets/
├── README.md              # questo file
├── raster/                # ✅ ASSET UFFICIALI (WebP, NO touch)
│   ├── ciak-logo-full.webp
│   └── ciak-icon.webp
├── svg/                   # ⏳ vuota — opzionale, solo se in futuro arrivano SVG vettoriali
└── _archive/
    └── reconstructed-svg-2026-05-09/  # ricostruzioni Claude rifiutate (storico)
```

---

## Come usarli nel progetto

### Frontend `ciak-frontend` (Next.js + Tailwind)

```bash
# Copiare gli asset in /public/
cp docs/brand/assets/raster/ciak-logo-full.webp ciak-frontend/public/logo/
cp docs/brand/assets/raster/ciak-icon.webp ciak-frontend/public/logo/
```

```tsx
// app/components/Logo.tsx
import Image from 'next/image'

export function LogoFull() {
  return <Image
    src="/logo/ciak-logo-full.webp"
    alt="Ciak Si Cambia"
    width={400}
    height={300}
    priority
  />
}

export function LogoIcon({ size = 64 }) {
  return <Image
    src="/logo/ciak-icon.webp"
    alt="Ciak"
    width={size}
    height={size}
  />
}
```

### Email transazionali (SendGrid/Brevo)

WebP è supportato da Gmail, Outlook web, Apple Mail (iOS 14+). Per Outlook desktop (legacy) → fornire fallback PNG (esportato dal WebP, vedi sezione Esportazione sotto).

### Social (IG, FB, OG)

WebP supportato da tutti i social moderni. Per OG image (1200×630) — meglio una versione PNG dedicata da consegnare separatamente.

---

## Esportazione (post-consegna asset originali)

Per use case che NON supportano WebP, esportare PNG dagli originali. Il WebP è già ad alta risoluzione, quindi posso esportare PNG senza perdita.

### Tool consigliati

```bash
# Convert WebP → PNG (ImageMagick o cwebp/dwebp)
dwebp ciak-logo-full.webp -o ciak-logo-full.png

# ImageMagick
magick ciak-logo-full.webp ciak-logo-full.png

# Online (più rapido se piccoli volumi)
# CloudConvert, Squoosh.app, Convertio
```

### Formati target da esportare per `ciak-frontend/public/`

| Asset | Formato | Dimensione | Da... |
|---|---|---|---|
| `favicon.ico` | ICO multi-res | 16+32+48 | `ciak-icon.webp` |
| `favicon.png` | PNG | 32×32 | `ciak-icon.webp` |
| `apple-touch-icon.png` | PNG | 180×180 | `ciak-icon.webp` |
| `android-chrome-192.png` | PNG | 192×192 | `ciak-icon.webp` |
| `android-chrome-512.png` | PNG | 512×512 | `ciak-icon.webp` |
| `og-image.png` | PNG | 1200×630 | `ciak-logo-full.webp` (con padding + tagline) |
| `social-profile.png` | PNG | 320×320 | `ciak-icon.webp` (per IG/FB profile pic) |

---

## Brand reference

- Palette: `#0F172A` `#64748B` `#E5E7EB` `#FACC15`
- Tipografia: Poppins SemiBold (600) + Medium (500)
- Documentazione completa: [`../ciak-brand-kit.md`](../ciak-brand-kit.md)
- Spec architettura: [`../../migration/spec.md`](../../migration/spec.md) (OQ1 e OQ7 risolte)
