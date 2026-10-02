/**
 * Il video di benvenuto del partner (step 1) è un iframe HeyGen. Le regole di sicurezza
 * del sito (`frame-src`) permettevano YouTube, Stripe e Drive ma NON app.heygen.com:
 * il browser bloccava il riquadro e il partner vedeva l'icona di pagina rotta.
 * Questo test lega l'URL dell'iframe alle regole, così non si disallineano di nuovo.
 */
const fs = require('fs');
const path = require('path');
const { WELCOME_VIDEO_EMBED } = require('./phases');

const FRONTEND_ROOT = path.resolve(__dirname, '../../../..');

function frameSrcOf(file) {
  const text = fs.readFileSync(path.join(FRONTEND_ROOT, file), 'utf8');
  const match = text.match(/frame-src([^;"]*)/);
  return match ? match[1].trim().split(/\s+/) : [];
}

const origin = new URL(WELCOME_VIDEO_EMBED).origin;

test.each(['vercel.json', 'nginx.conf'])('%s lascia incorporare il video di benvenuto', (file) => {
  const allowed = frameSrcOf(file);
  expect(allowed.length).toBeGreaterThan(0);          // la direttiva c'è
  expect(allowed).toContain(origin);
});

test('le regole continuano a vietare i riquadri di host non elencati', () => {
  const allowed = frameSrcOf('vercel.json');
  expect(allowed).not.toContain('*');
  expect(allowed).not.toContain('https:');
  expect(allowed).toContain("'self'");
});
