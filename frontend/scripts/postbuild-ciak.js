#!/usr/bin/env node
/**
 * postbuild-ciak.js — genera build/index.ciak.html
 *
 * Strategia: CRA produce build/index.html con bundle JS/CSS hashed iniettati.
 * Cloniamo quel file sostituendo solo il blocco <!--BRAND_META_START--> .. <!--BRAND_META_END-->
 * con il blocco meta Ciak. Lo stesso bundle JS gira su entrambi i brand (host-based
 * routing in src/index.js), quindi non serve ricompilare nulla.
 *
 * Vercel rewrites (vercel.json) serve build/index.ciak.html quando host = ciak.io
 * o www.ciak.io. I crawler social leggono i meta server-side — niente JS dipendenza.
 */
const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "..", "build");
const indexHtmlPath = path.join(buildDir, "index.html");
const ciakMetaPath = path.join(__dirname, "ciak-meta.html");
const outPath = path.join(buildDir, "index.ciak.html");

const MARKER_RE =
  /<!--BRAND_META_START-->[\s\S]*?<!--BRAND_META_END-->/;

function fail(msg) {
  console.error("postbuild-ciak: " + msg);
  process.exit(1);
}

if (!fs.existsSync(indexHtmlPath)) {
  fail("build/index.html non trovato — il build CRA non è stato eseguito?");
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
