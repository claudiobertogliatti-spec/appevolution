// Tre video brevi della pagina Start Plus. Stesso schema di `lessonVideos.js` (Partnership):
// i file vanno in `frontend/public/video/` come `start-plus-lezione-N.mp4`, `.jpg` (locandina) e
// `.it.vtt` (sottotitoli). Finche' un video non esiste, la scheda mostra "Video guida in preparazione":
// aggiungere `...base(N)` solo quando i tre file sono stati caricati davvero.
const base = (n) => ({
  videoUrl: `/video/start-plus-lezione-${n}.mp4`,
  posterUrl: `/video/start-plus-lezione-${n}.jpg`,
  captionsUrl: `/video/start-plus-lezione-${n}.it.vtt`,
});

export const startPlusVideoFiles = { 1: base(1), 2: base(2), 3: base(3) };

export const startPlusLessons = [
  { title: "Cosa costruiamo per te", note: "Prodotto, pagina di vendita, checkout e messaggio di lancio." },
  { title: "Cosa fai tu", note: "Le decisioni, i contenuti e il lancio verso il tuo pubblico." },
  { title: "Come funziona il credito", note: "Da Start Plus alla Partnership: 60 giorni." },
];
