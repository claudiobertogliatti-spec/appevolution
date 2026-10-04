import { buildOggi, giorniDa, isProva, pulisciNome, SOGLIE } from "./oggiModel";

// Fotografia realistica (dati sporchi come in produzione): un account di prova tra le
// trattative, "Mario Rossi" tra i partner, Paola sia in pipeline sia partner.
const NOW = new Date("2026-10-04T10:00:00Z");
const giorniFa = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

const col = (id, items) => ({ id, items });
const pipelineReale = () => ({
  columns: [
    col("call_prenotata", [
      { email: "elena@x.it", nome: "elena rizzo", stage_since: giorniFa(11), updated_at: giorniFa(30) },
    ]),
    col("call_fatta", [
      { email: "piero@x.it", nome: "Piero", stage_since: giorniFa(7) },
      { email: "chiara@x.it", nome: "Chiara Ferri", stage_since: giorniFa(19) },
      { email: "paola@x.it", nome: "Paola Neri", stage_since: giorniFa(19) },
      { email: "FABIO@X.IT", nome: "FABIO", stage_since: giorniFa(13) },
      { email: "nico@x.it", nome: "Nico", stage_since: giorniFa(1) },
    ]),
    col("in_trattativa", [
      { email: "qa+ciaktest@example.com", nome: "Test Ciak", stage_since: giorniFa(0) },
      { email: "sandro@x.it", nome: "Sandro", stage_since: giorniFa(0) },
      { email: "annachiara@x.it", nome: "ROSA MARIA", stage_since: giorniFa(3) },
    ]),
  ],
});

const auditReale = () => ({
  items: [
    { id: "p1", name: "Dario", email: "dario@x.it", owner: "Team", blocked: false, stale: true, step_updated_at: giorniFa(30), macro_label: "Valida", next_action: "Pubblicare il funnel" },
    { id: "p2", name: "Irene", email: "irene@x.it", owner: "Partner", blocked: false, stale: true, step_updated_at: giorniFa(12), macro_label: "Valida" },
    { id: "p3", name: "Mario Rossi", email: "mario@x.it", owner: "Partner", blocked: false, stale: true, macro_label: "Esamina" },
    { id: "p4", name: "Luisa Moretti", email: "luisa@x.it", owner: "Team/Claudio", blocked: true, stale: false, step_updated_at: giorniFa(2), macro_label: "Valida" },
    { id: "p5", name: "Paola Neri", email: "paola@x.it", owner: "Team", blocked: false, stale: false, step_updated_at: giorniFa(1), macro_label: "Esamina" },
    { id: "p6", name: "Paolo Greco", email: "paolo@x.it", owner: "Partner", blocked: false, stale: false, step_updated_at: giorniFa(0), macro_label: "Valida" },
  ],
});

describe("isProva", () => {
  test("riconosce l'indirizzo +ciaktest anche in maiuscolo e i nomi finti", () => {
    expect(isProva({ email: "QA+CiakTest@example.com" })).toBe(true);
    expect(isProva({ nome: "  MARIO ROSSI " })).toBe(true);
    expect(isProva({ nome: "Mario Bianchi", email: "mb@x.it" })).toBe(false);
    expect(isProva({})).toBe(false);
  });
});

describe("giorniDa", () => {
  test("conta giorni interi e non esplode su dati vuoti o illeggibili", () => {
    expect(giorniDa(giorniFa(19), NOW)).toBe(19);
    expect(giorniDa(null, NOW)).toBeNull();
    expect(giorniDa("non-una-data", NOW)).toBeNull();
    expect(giorniDa(new Date(NOW.getTime() + 86400000).toISOString(), NOW)).toBe(0); // futuro: mai negativo
  });
});

describe("buildOggi — call e trattative", () => {
  const o = buildOggi({ pipeline: pipelineReale(), audit: auditReale(), now: NOW });

  test("le call fatte sono ordinate per giorni di attesa, le piu' ferme in cima", () => {
    expect(o.call.fatte.map((c) => c.nome)).toEqual(["Chiara Ferri", "Fabio", "Piero", "Nico"]);
    expect(o.call.fatte.map((c) => c.giorni)).toEqual([19, 13, 7, 1]);
  });

  test("i toni seguono le soglie: rosso da 14, ambra da 5, neutro sotto", () => {
    const tone = Object.fromEntries(o.call.fatte.map((c) => [c.nome, c.tone]));
    expect(tone["Chiara Ferri"]).toBe("critical"); // 19 giorni
    expect(tone.Fabio).toBe("warning");        // 13: ambra, non rosso
    expect(tone.Piero).toBe("warning");         // 7
    expect(tone.Nico).toBe("neutral");            // 1
    expect([SOGLIE.fattaAmbra, SOGLIE.fattaRossa]).toEqual([5, 14]);
  });

  test("il rosso non e' ovunque: sulla fotografia vera ne resta uno solo", () => {
    expect(o.call.fatte.filter((c) => c.tone === "critical")).toHaveLength(1);
  });

  test("chi e' gia' partner non resta tra le call fatte (Paola ha comprato Start)", () => {
    expect(o.call.fatte.map((c) => c.nome)).not.toContain("Paola Neri");
    expect(o.doppi).toBe(1);
  });

  test("l'account di prova non entra nelle trattative ma viene dichiarato", () => {
    expect(o.trattative.map((t) => t.nome)).toEqual(["Rosa Maria", "Sandro"]);
    expect(o.esclusi).toEqual(expect.arrayContaining(["Test Ciak", "Mario Rossi"]));
  });

  test("senza data della call il record lo dice, non inventa un orario", () => {
    expect(o.call.prenotate).toHaveLength(1);
    expect(o.call.prenotate[0]).toMatchObject({ quando: null, passata: false, nota: "Data non registrata", giorni: 11 });
  });
});

describe("buildOggi — call prenotate con data", () => {
  const conData = (quando) => buildOggi({
    pipeline: { columns: [col("call_prenotata", [
      { email: "a@x.it", nome: "Futura", call_starts_at: "2026-10-06T14:00:00Z", stage_since: giorniFa(2) },
      { email: "b@x.it", nome: "Passata", call_starts_at: "2026-10-01T09:00:00Z", stage_since: giorniFa(9) },
      { email: "c@x.it", nome: "SenzaData", stage_since: giorniFa(20) },
      { email: "d@x.it", nome: "Prima", call_starts_at: "2026-10-05T08:00:00Z", stage_since: giorniFa(1) },
    ])] },
    now: quando || NOW,
  }).call.prenotate;

  test("ordine: data passata (da correggere), poi la prossima in ordine di tempo, poi senza data", () => {
    expect(conData().map((c) => c.nome)).toEqual(["Passata", "Prima", "Futura", "SenzaData"]);
  });

  test("una call con data passata e ancora 'prenotata' e' un allarme rosso", () => {
    const passata = conData().find((c) => c.nome === "Passata");
    expect(passata).toMatchObject({ passata: true, tone: "critical", nota: "Data passata: aggiorna lo stato" });
  });
});

describe("buildOggi — partner", () => {
  const o = buildOggi({ pipeline: pipelineReale(), audit: auditReale(), now: NOW });

  test("Mario Rossi (finto) non e' contato: 5 partner, non 6", () => {
    expect(o.partner.totale).toBe(5);
    expect(o.partner.fermi).toBe(3); // Dario, Irene, Luisa; Mario escluso
  });

  test("'tocca a te' = owner Team o Claudio, con i fermi per primi", () => {
    expect(o.partner.tocca.map((p) => p.nome)).toEqual(["Luisa Moretti", "Dario", "Paola Neri"]);
  });

  test("'aspettiamo il partner' mette il fermo da piu' giorni prima di chi e' in moto", () => {
    expect(o.partner.aspettiamo.map((p) => p.nome)).toEqual(["Irene", "Paolo Greco"]);
  });

  test("raggruppa per fase con il conteggio dei fermi", () => {
    const valida = o.partner.perFase.find((f) => f.fase === "Valida");
    expect(valida).toEqual({ fase: "Valida", totale: 4, fermi: 3 });
  });
});

describe("buildOggi — fonti mancanti e backend vecchio", () => {
  test("se una fonte non risponde i suoi blocchi sono null, non zero", () => {
    expect(buildOggi({ pipeline: null, audit: auditReale(), now: NOW }).call).toBeNull();
    expect(buildOggi({ pipeline: pipelineReale(), audit: null, now: NOW }).partner).toBeNull();
    expect(buildOggi({ now: NOW })).toMatchObject({ call: null, trattative: null, partner: null });
  });

  test("senza audit nessun contatto viene scartato come 'gia' partner'", () => {
    const o = buildOggi({ pipeline: pipelineReale(), audit: null, now: NOW });
    expect(o.call.fatte.map((c) => c.nome)).toContain("Paola Neri");
  });

  test("audit senza email (backend non ancora aggiornato): il doppione si riconosce dal nome", () => {
    const audit = auditReale();
    audit.items.forEach((i) => delete i.email);
    const o = buildOggi({ pipeline: pipelineReale(), audit, now: NOW });
    expect(o.call.fatte.map((c) => c.nome)).not.toContain("Paola Neri");
  });

  test("senza stage_since ricade su updated_at, senza date resta neutro", () => {
    const o = buildOggi({
      pipeline: { columns: [col("call_fatta", [
        { email: "a@x.it", nome: "A", updated_at: giorniFa(5) },
        { email: "b@x.it", nome: "B" },
      ])] },
      now: NOW,
    });
    expect(o.call.fatte.map((c) => [c.nome, c.giorni, c.tone])).toEqual([["A", 5, "warning"], ["B", null, "neutral"]]);
  });
});

describe("pulisciNome", () => {
  test("sistema i nomi tutti minuscoli o tutti maiuscoli", () => {
    expect(pulisciNome("elena rizzo")).toBe("Elena Rizzo");
    expect(pulisciNome("ROSA MARIA VERDI")).toBe("Rosa Maria Verdi");
    expect(pulisciNome("d'angelo")).toBe("D'Angelo");
    expect(pulisciNome("maria-chiara")).toBe("Maria-Chiara");
  });

  test("non tocca i nomi gia' scritti bene, ne' i vuoti", () => {
    expect(pulisciNome("Chiara Ferri")).toBe("Chiara Ferri");
    expect(pulisciNome("De Luca")).toBe("De Luca");
    expect(pulisciNome("")).toBe("");
    expect(pulisciNome(null)).toBe("");
  });

  test("la lista mostra il nome pulito ma l'esclusione dei finti usa il dato grezzo", () => {
    const o = buildOggi({
      pipeline: { columns: [col("call_fatta", [{ email: "a@x.it", nome: "MARIO ROSSI" }, { email: "b@x.it", nome: "luca verdi" }])] },
      now: NOW,
    });
    expect(o.call.fatte.map((c) => c.nome)).toEqual(["Luca Verdi"]);
    expect(o.esclusi).toEqual(["MARIO ROSSI"]);
  });
});
