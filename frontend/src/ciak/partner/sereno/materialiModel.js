// Presentation rules for the partner "Materiali" page. Pure functions: no
// React, no fetch — so they can be tested on the real file names of a partner.
// Nothing here hides or deletes data: older copies stay downloadable.

export const MAX_UPLOAD_MB = 200;

const KNOWN_EXT = /\.(pdf|docx?|xlsx?|csv|pptx?|odt|ods|txt|png|jpe?g|webp|heic|gif|svg|mp4|mov|webm|zip)$/i;

/** "Calendario_Social_Lancio_TAI_Andrea [CB].xlsx" -> "Calendario Social Lancio TAI Andrea". */
export function cleanFileName(name) {
  const base = String(name || '')
    .replace(KNOWN_EXT, '')
    .replace(/\[CB\]/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base || 'Documento';
}

const extOf = (name) => (String(name || '').match(KNOWN_EXT)?.[1] || '').toLowerCase();

/** Human label of the file kind: "Word", "Excel", "PDF"… never "document". */
export function humanType(file) {
  const t = String(file?.type || '').toLowerCase();
  if (t === 'pdf') return 'PDF';
  if (t === 'image') return 'Immagine';
  if (t === 'video') return 'Video';
  if (t === 'link') return 'Collegamento';
  const e = extOf(file?.name);
  if (e === 'pdf') return 'PDF';
  if (['doc', 'docx', 'odt', 'txt'].includes(e)) return 'Word';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return 'Excel';
  if (['ppt', 'pptx'].includes(e)) return 'Presentazione';
  return 'Documento';
}

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio',
  'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** "2026-10-03" or an ISO timestamp -> "3 ottobre 2026". Anything else -> ''. */
export function formatDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

// ---- cartelle ----------------------------------------------------------
// Categories coming from the API that really say where a file belongs. The
// generic ones ("document", "documento") say nothing: those are placed by name.
const GENERIC_CATEGORIES = new Set(['document', 'documento', '']);
const BY_CATEGORY = {
  'brand-kit': 'brand_kit', brand_kit: 'brand_kit', posizionamento: 'brand_kit',
  logo: 'brand_kit', image: 'brand_kit',
  masterclass: 'scripts', script: 'scripts', copione: 'scripts',
  videocorso_script: 'scripts', 'videocorso-script': 'scripts', outline: 'scripts',
  video: 'video',
  vendita_descrizione: 'funnel', vendita_faq: 'funnel', vendita_privacy: 'funnel',
  vendita_cookie: 'funnel', vendita_termini: 'funnel', funnel: 'funnel',
  contratto_firmato: 'master_pdf', distinta_pagamento: 'master_pdf',
  workbook: 'master_pdf', certificato: 'master_pdf',
};
// Order matters: the first rule that matches wins.
const BY_NAME = [
  [/posizionament|brand ?kit|logo|contratto/i, 'brand_kit'],
  [/script|outline|scaletta|copione|masterclass|lezion|videocorso/i, 'scripts'],
  [/calendario|social|caption|\bseo\b|prompt|pre[- ]?lancio|editoriale|contenut/i, 'social'],
  [/funnel|stripe|dominio|subaccount|privacy|cookie|termini|checkout/i, 'funnel'],
  [/workbook|certificat|libretto|piano|distinta/i, 'master_pdf'],
];

/** Folder id for a material: a meaningful category first, then the file name. */
export function folderForMaterial({ category, name, type } = {}) {
  const cat = String(category || '').toLowerCase();
  if (!GENERIC_CATEGORIES.has(cat) && BY_CATEGORY[cat]) return BY_CATEGORY[cat];
  if (String(type).toLowerCase() === 'video') return 'video';
  const hit = BY_NAME.find(([re]) => re.test(String(name || '')));
  return hit ? hit[1] : 'master_pdf';
}

/** "01. Brand Kit & Strategia" -> "Brand Kit & Strategia" (the number is internal). */
export const folderLabel = (name) => String(name || '').replace(/^\d+\.\s*/, '');

// ---- versioni ------------------------------------------------------------
const dateKey = (f) => String(f.createdAt || '');

/**
 * Same document uploaded many times -> one row (the latest) + `versions` with
 * the older copies. Grouping key: cleaned name + folder + who owns it. Rows
 * with no real date ("sempre aggiornato", external links) are never merged.
 */
export function groupVersions(files) {
  const groups = new Map();
  const out = [];
  for (const f of files) {
    if (!f.createdAt || f.esterno) { out.push({ ...f, versions: [] }); continue; }
    const key = [cleanFileName(f.name).toLowerCase(), f.folderId, f.owner].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
    out.push({ ...sorted[0], versions: sorted.slice(1) });
  }
  return out.sort((a, b) => dateKey(b).localeCompare(dateKey(a)));
}

/** Latest files of the last `days` days, newest first. Empty list = no section. */
export function recentFiles(files, { now = new Date(), days = 30, limit = 3 } = {}) {
  const from = now.getTime() - days * 86400000;
  return files
    .filter((f) => f.createdAt && !f.esterno && Date.parse(f.createdAt) >= from)
    .sort((a, b) => dateKey(b).localeCompare(dateKey(a)))
    .slice(0, limit);
}

// ---- caricamento -----------------------------------------------------------
/** null = ok; otherwise the sentence to show the partner. */
export function validateUpload(file) {
  if (!file) return 'Scegli un file da caricare.';
  if (!file.size) return 'Il file è vuoto: scegline un altro.';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Il file supera i ${MAX_UPLOAD_MB} MB. Se è un video lungo, scrivici: ti diciamo come farcelo arrivare.`;
  }
  return null;
}
