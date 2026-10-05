import {
  MESSAGGI, mittenteDefault, messaggioConsigliato, compila, segnapostoMancanti, tappeFatte, cronologia,
} from "./schedaScriptModel";

const LEAD = { display_name: "Giulia Esempio", niche_detected: "coaching" };

test("il mittente predefinito è chi è collegato: Mariangela solo per il suo account", () => {
  expect(mittenteDefault("mariangela")).toBe("Mariangela");
  expect(mittenteDefault("claudio")).toBe("Claudio");
  expect(mittenteDefault(undefined)).toBe("Claudio");
});

test("il messaggio consigliato segue l'origine, il canale e cosa è già partito", () => {
  expect(messaggioConsigliato({ origine: "ex_cliente", canale: "linkedin", touches: [] })).toBe("risveglio_ex");
  expect(messaggioConsigliato({ origine: "setter", canale: "linkedin" })).toBe("risveglio_setter");
  expect(messaggioConsigliato({ origine: "rete", canale: "linkedin" })).toBe("risveglio_rete");
  // senza origine non si ipotizza il rapporto: versione breve
  expect(messaggioConsigliato({ origine: "", canale: "linkedin" })).toBe("breve");
  // fuori da LinkedIn i testi lunghi non vanno bene
  expect(messaggioConsigliato({ origine: "ex_cliente", canale: "social" })).toBe("breve");
  // dopo un risveglio tocca al seguito; dopo il seguito non si ripropone
  const dopo = [{ message: "risveglio_ex" }];
  expect(messaggioConsigliato({ origine: "ex_cliente", canale: "linkedin", touches: dopo })).toBe("seguito");
  expect(messaggioConsigliato({ origine: "ex_cliente", canale: "linkedin", touches: [...dopo, { message: "seguito" }] })).not.toBe("seguito");
});

test("compila: nome, settore, mittente e firma di chi scrive; a parte quelli il testo è identico", () => {
  const m = compila({ key: "risveglio_ex", mittente: "Mariangela", lead: LEAD });
  const c = compila({ key: "risveglio_ex", mittente: "Claudio", lead: LEAD });
  expect(m).toMatch(/^Buongiorno Giulia,/);
  expect(m).toMatch(/sono Mariangela di Evolution Pro/);
  expect(m).toMatch(/in coaching/);
  expect(m.trim().endsWith("Mariangela\nEvolution Pro")).toBe(true);
  expect(c.trim().endsWith("Claudio Bertogliatti\nEvolution Pro")).toBe(true);
  const senzaMittente = (t) =>
    t.replace("sono Mariangela di", "sono M di").replace("sono Claudio di", "sono M di")
      .replace(/(Mariangela|Claudio Bertogliatti)\nEvolution Pro\s*$/, "FIRMA\nEvolution Pro");
  expect(senzaMittente(m)).toBe(senzaMittente(c));
  expect(segnapostoMancanti(m)).toEqual([]);
});

test("senza nome o settore i segnaposto restano visibili, mai riempiti a caso", () => {
  const t = compila({ key: "risveglio_ex", mittente: "Claudio", lead: { display_name: "", niche_detected: "" } });
  expect(segnapostoMancanti(t)).toEqual(expect.arrayContaining(["[Nome]", "[settore]"]));
});

test("il testo 3 (rete) chiede sempre il contesto", () => {
  const t = compila({ key: "risveglio_rete", mittente: "Mariangela", lead: LEAD });
  expect(segnapostoMancanti(t)).toEqual(["[contesto]"]);
});

test("ogni messaggio ha un blocco reale e una chiave accettata dal backend", () => {
  const accettate = ["risveglio_ex", "risveglio_setter", "risveglio_rete", "breve", "seguito"];
  expect(MESSAGGI.map((m) => m.key)).toEqual(accettate);
  MESSAGGI.forEach((m) => expect(compila({ key: m.key, mittente: "Claudio", lead: LEAD }).length).toBeGreaterThan(40));
});

test("tappe: si accendono in base ai tocchi e allo stato; la prossima è la prima non fatta", () => {
  expect(tappeFatte({ touches: [], status: "discovered" })).toEqual({ flags: [false, false, false, false, false], prossima: 0 });
  const r = tappeFatte({ touches: [{ message: "risveglio_ex" }], status: "contacted" });
  expect(r.flags).toEqual([true, true, false, false, false]);
  expect(r.prossima).toBe(2);
  expect(tappeFatte({ touches: [{ message: "risveglio_ex" }, { message: "seguito" }], status: "responded_positive" }).prossima).toBe(4);
  expect(tappeFatte({ touches: [{ message: "risveglio_ex" }], status: "qualified" }).prossima).toBeNull();
});

test("cronologia: dal più recente, senza modificare l'originale", () => {
  const t = [{ at: "2026-09-28T10:00:00Z", message: "profilo_trovato" }, { at: "2026-10-05T10:00:00Z", message: "risveglio_ex" }];
  expect(cronologia(t).map((x) => x.message)).toEqual(["risveglio_ex", "profilo_trovato"]);
  expect(t[0].message).toBe("profilo_trovato");
});
