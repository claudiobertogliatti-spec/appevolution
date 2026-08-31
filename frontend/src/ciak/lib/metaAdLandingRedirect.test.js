import { metaAdLandingRedirect } from "./funnelRouting";

/**
 * L'inserzione Meta attiva punta a https://www.ciak.io/, ma dopo il redesign la
 * home non ha piu' il form: 2.244 clic al mese finivano su una vetrina invece
 * che sull'opt-in. Il link non si corregge nell'annuncio (sta dentro un post
 * gia' pubblicato), quindi lo corregge il sito.
 */
describe("metaAdLandingRedirect", () => {
  it("porta all'opt-in chi arriva con fbclid", () => {
    expect(metaAdLandingRedirect("?fbclid=IwAR123")).toBe("/masterclass?fbclid=IwAR123");
  });

  it("conserva TUTTI i parametri, non solo fbclid", () => {
    // fbclid serve all'attribuzione del Pixel: perderlo qui vorrebbe dire
    // perdere la conversione proprio quando inizia ad arrivare.
    const search = "?utm_source=meta&fbclid=abc&utm_campaign=ciak";
    expect(metaAdLandingRedirect(search)).toBe(`/masterclass${search}`);
  });

  it("lascia passare chi arriva senza fbclid", () => {
    expect(metaAdLandingRedirect("")).toBeNull();
    expect(metaAdLandingRedirect("?utm_source=newsletter")).toBeNull();
  });

  it("non redirige con un fbclid vuoto", () => {
    // `?fbclid=` senza valore non e' un clic da un annuncio.
    expect(metaAdLandingRedirect("?fbclid=")).toBeNull();
  });

  it("regge una search assente senza esplodere", () => {
    expect(metaAdLandingRedirect()).toBeNull();
    expect(metaAdLandingRedirect(undefined)).toBeNull();
  });

  it("non manda mai sulla pagina del video: l'opt-in viene prima", () => {
    // /masterclass/guarda e' raggiungibile senza compilare: mandarci il
    // traffico a pagamento significherebbe pagare per non raccogliere nulla.
    const destinazione = metaAdLandingRedirect("?fbclid=x");
    expect(destinazione.startsWith("/masterclass?")).toBe(true);
    expect(destinazione).not.toContain("/guarda");
  });
});
