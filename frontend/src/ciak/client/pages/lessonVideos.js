// Video delle cinque lezioni della pagina Partnership (girati con HeyGen da Claudio, 3/10/2026).
// I file stanno in `frontend/public/video/`: video, locandina (.jpg) e sottotitoli italiani (.it.vtt).
const base = (n) => ({
  videoUrl: `/video/partnership-lezione-${n}.mp4`,
  posterUrl: `/video/partnership-lezione-${n}.jpg`,
  captionsUrl: `/video/partnership-lezione-${n}.it.vtt`,
});

export const lessonVideos = {
  1: base(1),
  2: base(2),
  3: base(3),
  4: base(4),
  5: base(5),
};
