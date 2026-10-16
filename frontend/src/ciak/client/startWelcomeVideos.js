// Video del benvenuto Ciak Start. Ogni voce: { titolo, descrizione, src | embed }.
// `src` = file mp4 nel repo (si riproduce nel browser, nessun blocco di terze
// parti: un incorporamento HeyGen risultava "bloccato" sul telefono di una
// cliente). `embed` resta per un eventuale iframe. Una voce compare solo se ha
// `src` o `embed` reali: niente riquadri vuoti.
export const START_WELCOME_VIDEOS = [
  {
    titolo: "Benvenuto in Ciak Start",
    descrizione: "Claudio ti spiega cosa hai acquistato.",
    src: "/video/ciak-start-benvenuto-1.mp4",
  },
];
