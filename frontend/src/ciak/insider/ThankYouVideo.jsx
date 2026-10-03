import React from 'react';

/**
 * Video di ringraziamento sotto il titolo (richiesta di Claudio, 1/10/2026).
 *
 * Honesty rule: compare SOLO se esiste un video vero (quello predefinito è un file del
 * repo; una proposta può averne uno suo in `video_benvenuto_url`). Niente locandina finta,
 * niente "arriva a breve". Mai avvio automatico. Accetta un file (mp4/webm/mov) oppure un
 * embed (YouTube, Vimeo, Loom...). Solo http(s) o percorsi dello stesso sito.
 */
const FILE_RE = /\.(mp4|webm|mov)(\?.*)?$/i;

// URL assoluto http(s) oppure percorso dello stesso sito ("/video/x.mp4"); mai "//altro-host".
export function isPlayableUrl(url) {
  if (typeof url !== 'string') return false;
  const u = url.trim();
  return /^https?:\/\//i.test(u) || (u.startsWith('/') && !u.startsWith('//'));
}

// Video di ringraziamento registrato da Claudio (1/10/2026): uguale per tutti i lead.
// Una proposta può averne uno suo (`video_benvenuto_url`), che ha la precedenza.
export const DEFAULT_THANK_YOU_VIDEO = {
  url: '/video/ciak-post-call-ringraziamento.mp4',
  poster: '/video/ciak-post-call-ringraziamento.jpg',
  captionsUrl: '/video/ciak-post-call-ringraziamento.it.vtt',
};

export function pickThankYouVideo(customUrl) {
  return isPlayableUrl(customUrl) ? { url: customUrl.trim() } : DEFAULT_THANK_YOU_VIDEO;
}

export default function ThankYouVideo({ url, captionsUrl, poster }) {
  if (!isPlayableUrl(url)) return null;
  const src = url.trim();
  const isFile = FILE_RE.test(src);
  const hasCaptions = isPlayableUrl(captionsUrl);

  // Niente espressioni `{...}` come figlie di <video>: in sviluppo un plugin di editing visivo
  // le avvolge in <span> e il <track> finirebbe fuori dal video. Tre alberi JSX letterali.
  let player;
  if (!isFile) {
    player = (
      <iframe
        src={src}
        title="Video di ringraziamento"
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  } else if (hasCaptions) {
    player = (
      <video controls playsInline preload="metadata" poster={poster || undefined} aria-label="Video di ringraziamento">
        <source src={src} />
        <track kind="captions" srcLang="it" label="Italiano" src={captionsUrl} default />
        Il tuo browser non riesce a riprodurre il video.
      </video>
    );
  } else {
    player = (
      <video controls playsInline preload="metadata" poster={poster || undefined} aria-label="Video di ringraziamento">
        <source src={src} />
        Il tuo browser non riesce a riprodurre il video.
      </video>
    );
  }

  return (
    <div className="pc-thanks" data-testid="thank-you-video">
      <div className="pc-video">{player}</div>
      <p className="pc-thanks__note">
        Un minuto da parte di Claudio: cosa trovi in questa pagina e come decidere con calma.
      </p>
    </div>
  );
}
