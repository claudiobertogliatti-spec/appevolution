#!/usr/bin/env node
/**
 * postbuild-ciak.js — genera build/index.ciak.html (shell SPA con meta Ciak).
 *
 * CRA produce build/index.html con i bundle JS/CSS hashed iniettati.
 * Cloniamo quel file sostituendo il blocco <!--! BRAND_META_START --> .. <!--! BRAND_META_END -->
 * con il blocco meta Ciak. Lo stesso bundle JS gira su tutti gli host (routing in src/index.js).
 *
 * Consolidamento 2026-06-18: Ciak e' l'unico brand servito. Tutti gli host servono
 * index.ciak.html via il rewrite catch-all in vercel.json. Rimuoviamo build/index.html
 * cosi' Vercel non lo serve come directory-index (meta default) scavalcando il rewrite.
 */
const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
const indexHtmlPath = path.join(buildDir, "index.html");
const ciakMetaPath = path.join(__dirname, "ciak-meta.html");
const outPath = path.join(buildDir, "index.ciak.html");

// Marker con `!` iniziale per sopravvivere a html-minifier-terser di
// CRA production (ignoreCustomComments default: [/^!/, /^\s*#/]).
const MARKER_RE =
  /<!--!\s*BRAND_META_START\s*-->[\s\S]*?<!--!\s*BRAND_META_END\s*-->/;

function fail(msg) {
  console.error("postbuild-ciak: " + msg);
  process.exit(1);
}

if (!fs.existsSync(indexHtmlPath)) {
  fail("build/index.html non trovato — il build CRA non e' stato eseguito?");
}
if (!fs.existsSync(ciakMetaPath)) {
  fail("scripts/ciak-meta.html non trovato");
}

const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
const ciakMeta = fs.readFileSync(ciakMetaPath, "utf8").trim();

if (!MARKER_RE.test(indexHtml)) {
  fail(
    "Marker BRAND_META_START/BRAND_META_END non trovati in build/index.html — " +
      "verifica public/index.html"
  );
}

const ciakHtml = indexHtml.replace(MARKER_RE, ciakMeta);

fs.writeFileSync(outPath, ciakHtml, "utf8");
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log("✓ Generated build/index.ciak.html (" + sizeKb + " KB)");

// Rimuovi build/index.html: Ciak e' l'unico shell servito (via rewrite catch-all
// in vercel.json). Senza questo, Vercel servirebbe index.html (meta default) come
// directory-index su "/" scavalcando il rewrite.
fs.unlinkSync(indexHtmlPath);
console.log("✓ Removed build/index.html (solo index.ciak.html viene servito)");
