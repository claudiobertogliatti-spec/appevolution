// Le 3 tappe del percorso partner, in parole semplici. Solo presentazione: non sblocca nulla.
// Il servizio extra suggerito viene dal catalogo (nome e prezzo non si ripetono qui).
const IMG = 'https://res.cloudinary.com/dxoeksxtg/image/upload/f_auto,q_auto,w_1200';

export const TAPPE = {
  esamina: {
    numero: 1,
    nome: 'Esamina',
    motto: 'Si costruisce',
    immagine: `${IMG}/v1791823064/ciak/tappe/tappa-1-costruisco.webp`,
    alt: 'Un cantiere dove prende forma il tuo progetto',
    cosa: 'Con Ciak costruiamo il tuo progetto: i tuoi dati, il tuo marchio e a chi ti rivolgi.',
    perche: 'Un progetto chiaro si vende più facilmente. Qui mettiamo le fondamenta.',
    alla_fine: 'Un messaggio preciso e riconoscibile, tuo, pronto per andare online.',
    extra: 'shooting-fotografico',
  },
  valida: {
    numero: 2,
    nome: 'Valida',
    motto: 'Si lancia',
    immagine: `${IMG}/v1791823079/ciak/tappe/tappa-2-lancio.webp`,
    alt: 'Il lancio del tuo corso online',
    cosa: 'Mettiamo online il corso su Systeme e prepariamo il lancio: un calendario di 30 giorni e una diretta di vendita con promo di lancio, con script e slide.',
    perche: 'Un lancio con una data e una promo porta le prime vendite.',
    alla_fine: 'Il corso online, i contenuti dei primi 30 giorni e la tua diretta di vendita pronta.',
    extra: 'copywriting-premium',
  },
  ottimizza: {
    numero: 3,
    nome: 'Ottimizza',
    motto: 'Si vende',
    immagine: `${IMG}/v1791823104/ciak/tappe/tappa-3-vendo.webp`,
    alt: 'Il ciclo di vendita da 60 giorni',
    cosa: 'Ripetiamo il ciclo con un calendario di 60 giorni e una nuova diretta di vendita con promo. Leggiamo i numeri e miglioriamo.',
    perche: 'Un ritmo fisso porta clienti in modo prevedibile.',
    alla_fine: 'Vendite regolari e un pubblico che ti conosce.',
    extra: 'campagne-adv',
  },
};
