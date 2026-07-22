#!/usr/bin/env node
/** Genera shell SEO specifiche, mantenendo un solo bundle React. */
const fs = require("fs");
const path = require("path");
const buildDir = path.join(__dirname, "..", "build");
const input = path.join(buildDir, "index.html");
const marker = /<!--!\s*BRAND_META_START\s*-->[\s\S]*?<!--!\s*BRAND_META_END\s*-->/;
const noscript = /<noscript>[\s\S]*?<\/noscript>/;

if (!fs.existsSync(input)) throw new Error("build/index.html non trovato");
const base = fs.readFileSync(input, "utf8");
if (!marker.test(base)) throw new Error("marker BRAND_META non trovato");
if (!noscript.test(base)) throw new Error("blocco noscript non trovato");

const pages = {
  "index.ciak.html": { path: "/", title: "Ciak | Il sistema per accademie digitali", description: "Ciak aiuta professionisti, consulenti e formatori a costruire un progetto digitale con il Metodo EVO.", index: true, noscript: "Ciak: un sistema per trasformare competenza professionale in un progetto digitale ordinato." },
  "masterclass.ciak.html": { path: "/masterclass", title: "Masterclass gratuita | Ciak", description: "Una masterclass gratuita per capire cosa blocca un progetto digitale professionale prima di costruirlo.", index: true, noscript: "Accedi alla masterclass gratuita Ciak." },
  "masterclass-guarda.ciak.html": { path: "/masterclass/guarda", title: "Guarda la Masterclass | Ciak", description: "Guarda la masterclass Ciak e prosegui con le 8 Domande.", index: false, noscript: "Guarda la masterclass Ciak." },
  "blueprint.ciak.html": { path: "/blueprint", title: "Ciak Blueprint | Sessione strategica", description: "Ciak Blueprint: una sessione strategica per mettere a fuoco le priorità del tuo progetto digitale.", index: true, noscript: "Scopri Ciak Blueprint." },
  "blueprint-grazie.ciak.html": { path: "/blueprint/grazie", title: "Grazie | Ciak Blueprint", description: "Conferma del tuo acquisto Ciak Blueprint.", index: false, noscript: "Grazie per il tuo acquisto Ciak Blueprint." },
};

function meta(page) {
  const canonical = `https://www.ciak.io${page.path}`;
  const robots = page.index ? "index,follow" : "noindex,nofollow";
  const product = page.path === "/blueprint"
    ? '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Ciak Blueprint","offers":{"@type":"Offer","price":"27","priceCurrency":"EUR","availability":"https://schema.org/InStock"}}</script>'
    : "";
  return `<!--! BRAND_META_START --><title>${page.title}</title><meta name="description" content="${page.description}"><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${page.title}"><meta property="og:description" content="${page.description}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${page.title}"><meta name="twitter:description" content="${page.description}"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Ciak","url":"https://www.ciak.io"}</script>${product}<!--! BRAND_META_END -->`;
}

for (const [filename, page] of Object.entries(pages)) {
  const html = base
    .replace(marker, meta(page))
    .replace(noscript, `<noscript><main><h1>${page.title}</h1><p>${page.noscript}</p></main></noscript>`);
  fs.writeFileSync(path.join(buildDir, filename), html, "utf8");
  console.log(`Generated ${filename}`);
}
fs.unlinkSync(input);
