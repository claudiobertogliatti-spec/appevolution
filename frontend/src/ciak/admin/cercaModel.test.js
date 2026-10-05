import { CERCA_MIN, filtraPagine, hrefPersona, muovi, statoLabel, TIPO_TONE } from "./cercaModel";

describe("hrefPersona", () => {
  test("lead e cliente Start aprono la scheda con l'email codificata", () => {
    expect(hrefPersona({ email: "a+b@x.it", tipo: "lead", ha_scheda: true })).toBe("/admin/leads/a%2Bb%40x.it");
    expect(hrefPersona({ email: "c@x.it", tipo: "cliente_start", ha_scheda: true })).toBe("/admin/leads/c%40x.it");
  });

  test("un partner con la scheda lead apre la scheda (mostra anche il ruolo)", () => {
    expect(hrefPersona({ email: "p@x.it", tipo: "partner", ha_scheda: true })).toBe("/admin/leads/p%40x.it");
  });

  test("un partner storico senza scheda lead ripiega sulla Pipeline Partner", () => {
    expect(hrefPersona({ email: "p@x.it", tipo: "partner", ha_scheda: false })).toBe("/admin/partner");
  });

  test("un cliente senza scheda non finisce nella pagina dei partner", () => {
    expect(hrefPersona({ email: "c@x.it", tipo: "cliente_start", ha_scheda: false })).toBe("/admin/leads/c%40x.it");
  });
});

describe("statoLabel e toni", () => {
  test("scrive lo stato per chi legge e non inventa quelli sconosciuti", () => {
    expect(statoLabel("call_booked")).toBe("Call prenotata");
    expect(statoLabel("report_generated")).toBe("Analisi pronta");
    expect(statoLabel("boh")).toBeNull();
    expect(statoLabel(null)).toBeNull();
  });

  test("ogni tipo ha un tono", () => {
    expect(Object.keys(TIPO_TONE).sort()).toEqual(["cliente_start", "lead", "partner"]);
  });
});

describe("filtraPagine", () => {
  const pagine = [
    { to: "/admin/trattative", label: "Trattative", desc: "Pipeline dopo il Blueprint", department: "Vendite" },
    { to: "/admin/vendite-ko", label: "Trattative KO", desc: "Chiuse senza esito", department: "Vendite" },
    { to: "/admin/clienti-ciak", label: "Clienti Ciak", desc: "Blueprint, Start e upgrade", department: "Vendite" },
    { to: "/admin/fatture", label: "Fatture", desc: "Genera e scarica", department: "Back office" },
  ];

  test("cerca in titolo, descrizione e reparto senza badare alle maiuscole", () => {
    expect(filtraPagine(pagine, "FATTURE").map((p) => p.to)).toEqual(["/admin/fatture"]);
    expect(filtraPagine(pagine, "back office").map((p) => p.to)).toEqual(["/admin/fatture"]);
  });

  test("chi ha il testo nel titolo viene prima di chi lo ha solo nella descrizione", () => {
    // "blueprint" e' nella descrizione di Trattative e di Clienti Ciak, mai nei titoli:
    // "start" e' solo nella descrizione di Clienti. "ciak" e' nel titolo di Clienti Ciak.
    const r = filtraPagine(pagine, "ciak").map((p) => p.to);
    expect(r[0]).toBe("/admin/clienti-ciak");
  });

  test("sotto la lunghezza minima non restituisce niente", () => {
    expect(CERCA_MIN).toBe(2);
    expect(filtraPagine(pagine, "t")).toEqual([]);
    expect(filtraPagine(pagine, "  ")).toEqual([]);
  });

  test("rispetta il tetto e non porta campi interni", () => {
    const molte = Array.from({ length: 20 }, (_, i) => ({ to: `/p${i}`, label: `Pagina ${i}`, department: "X" }));
    const r = filtraPagine(molte, "pagina", 5);
    expect(r).toHaveLength(5);
    expect(r[0]).not.toHaveProperty("_rango");
  });

  test("tollera un elenco assente", () => {
    expect(filtraPagine(undefined, "fatture")).toEqual([]);
  });
});

describe("muovi", () => {
  test("le frecce girano in tondo", () => {
    expect(muovi(0, -1, 3)).toBe(2);
    expect(muovi(2, 1, 3)).toBe(0);
    expect(muovi(1, 1, 3)).toBe(2);
  });

  test("senza selezione la freccia giu' va al primo e la su all'ultimo", () => {
    expect(muovi(-1, 1, 4)).toBe(0);
    expect(muovi(-1, -1, 4)).toBe(3);
  });

  test("senza risultati non c'e' selezione", () => {
    expect(muovi(0, 1, 0)).toBe(-1);
  });
});
