import { pageOwns, trovaSezione } from "./sezioneModel";

// Una copia ridotta del NAV reale: reparti con `pages` piatte, con `groups`, e una
// pagina riservata (hideFor sulla singola pagina).
const NAV = [
  { id: "dashboard", label: "Direzione", to: "/admin/direzione", end: true, pages: [] },
  {
    id: "acquisizione", label: "Acquisizione", landing: true, hideFor: ["antonella"],
    pages: [
      { to: "/admin/lead-manager", label: "New Lead" },
      { to: "/admin/lista-fredda", label: "Lista Fredda", hideFor: ["mariangela"] },
      { to: "/admin/pipeline", label: "Acquisizione Evolution" },
      { to: "/admin/leads", label: "Lead inbound" },
    ],
  },
  {
    id: "vendite", label: "Vendite", landing: true, hideFor: ["antonella", "mariangela"],
    pages: [
      { to: "/admin/trattative", label: "Trattative" },
      { to: "/admin/vendite-ko", label: "Trattative KO" },
      { to: "/admin/catalogo", label: "Catalogo" },
    ],
  },
  {
    id: "delivery", label: "Delivery", landing: true, hideFor: ["mariangela"],
    groups: [
      { title: "Partner", pages: [{ to: "/admin/partner", label: "Pipeline Partner" }, { to: "/admin/ex-partner", label: "Ex Partner" }] },
      { title: "Risultati", pages: [{ to: "/admin/metriche", label: "KPI Partner" }] },
    ],
  },
];

describe("pageOwns", () => {
  test("percorso esatto o sotto-percorso, mai un prefisso di testo", () => {
    expect(pageOwns("/admin/pipeline", { to: "/admin/pipeline" })).toBe(true);
    expect(pageOwns("/admin/leads/mario%40x.it", { to: "/admin/leads" })).toBe(true);
    expect(pageOwns("/admin/pipeline-blueprint", { to: "/admin/pipeline" })).toBe(false);
  });

  test("`end` richiede il percorso esatto", () => {
    expect(pageOwns("/admin/direzione/x", { to: "/admin/direzione", end: true })).toBe(false);
  });
});

describe("trovaSezione", () => {
  test("una pagina del reparto porta con se' tutte le pagine sorelle, non solo qualcuna", () => {
    const s = trovaSezione("/admin/trattative", NAV);
    expect(s.label).toBe("Vendite");
    expect(s.voci.map((v) => v.label)).toEqual(["Panoramica", "Trattative", "Trattative KO", "Catalogo"]);
    expect(s.attiva).toBe("/admin/trattative");
  });

  test("la prima voce e' sempre la Panoramica del reparto", () => {
    const s = trovaSezione("/admin/catalogo", NAV);
    expect(s.voci[0]).toEqual({ to: "/admin/reparto/vendite", label: "Panoramica", gruppo: null });
  });

  test("sulla panoramica la voce attiva e' la panoramica", () => {
    expect(trovaSezione("/admin/reparto/delivery", NAV).attiva).toBe("/admin/reparto/delivery");
  });

  test("una sotto-pagina (scheda lead) resta nella sezione e illumina la sua voce", () => {
    const s = trovaSezione("/admin/leads/mario%40x.it", NAV);
    expect(s.id).toBe("acquisizione");
    expect(s.attiva).toBe("/admin/leads");
  });

  test("tra due pagine con prefisso comune vince la piu' specifica", () => {
    const nav = [{ id: "x", label: "X", landing: true, pages: [{ to: "/admin/a", label: "A" }, { to: "/admin/a/b", label: "AB" }] }];
    expect(trovaSezione("/admin/a/b/c", nav).attiva).toBe("/admin/a/b");
  });

  test("i reparti a gruppi mantengono il gruppo di ogni voce", () => {
    const s = trovaSezione("/admin/ex-partner", NAV);
    expect(s.voci.map((v) => [v.label, v.gruppo])).toEqual([
      ["Panoramica", null], ["Pipeline Partner", "Partner"], ["Ex Partner", "Partner"], ["KPI Partner", "Risultati"],
    ]);
  });

  test("Home, Direzione e pagine fuori da ogni reparto non hanno menu di sezione", () => {
    expect(trovaSezione("/admin", NAV)).toBeNull();
    expect(trovaSezione("/admin/direzione", NAV)).toBeNull();
    expect(trovaSezione("/admin/pagina-tecnica", NAV)).toBeNull();
  });

  test("un account limitato non vede nel menu le pagine che non sono sue", () => {
    const s = trovaSezione("/admin/leads", NAV, "mariangela");
    expect(s.voci.map((v) => v.label)).not.toContain("Lista Fredda");
    expect(s.voci.map((v) => v.label)).toContain("Lead inbound");
  });

  test("e non gli compare una pagina riservata nemmeno aprendo il suo indirizzo", () => {
    expect(trovaSezione("/admin/lista-fredda", NAV, "mariangela")).toBeNull();
    expect(trovaSezione("/admin/lista-fredda", NAV, "claudio").attiva).toBe("/admin/lista-fredda");
  });

  test("tollera un menu assente", () => {
    expect(trovaSezione("/admin/trattative", undefined)).toBeNull();
  });
});
