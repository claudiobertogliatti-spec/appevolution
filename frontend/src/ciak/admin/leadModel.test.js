import { FASI, cella, righe, conteggi, filtra, vociPer, indirizzoScheda, nomeVisibile } from "./leadModel";

const NOW = new Date("2026-10-07T12:00:00Z");
const R = (over) => ({ email: "a@x.it", nome: "Anna", fase: "call_fatta", giorni: 2, ...over });

test("le fasi sono le quattro di Claudio, nell'ordine del percorso", () => {
  expect(FASI.map((f) => f.label)).toEqual(["Questionario", "Call fissata", "Call fatta", "Trattativa"]);
});

test("attesa: soglie della Home Oggi (5 giorni ambra, 14 rosso) e parole giuste", () => {
  expect(cella(R({ giorni: 0 }), NOW)).toEqual({ tone: "neutral", label: "oggi" });
  expect(cella(R({ giorni: 1 }), NOW).label).toBe("da 1 giorno");
  expect(cella(R({ giorni: 5 }), NOW)).toEqual({ tone: "warning", label: "da 5 giorni" });
  expect(cella(R({ giorni: 14 }), NOW).tone).toBe("critical");
  expect(cella(R({ fase: "trattativa", giorni: 6 }), NOW).tone).toBe("neutral"); // trattativa: ambra da 7
  expect(cella(R({ fase: "trattativa", giorni: 7 }), NOW).tone).toBe("warning");
  expect(cella(R({ giorni: null, da: null }), NOW)).toEqual({ tone: "neutral", label: "—" });
});

test("call fissata: in agenda, data passata, senza data", () => {
  const f = (call_starts_at) => cella(R({ fase: "call_fissata", call_starts_at }), NOW);
  expect(f("2026-10-09T15:00:00Z")).toEqual({ tone: "good", label: "In agenda" });
  expect(f("2026-10-01T15:00:00Z")).toEqual({ tone: "critical", label: "Data passata" });
  expect(f(null)).toEqual({ tone: "warning", label: "Senza data" });
});

test("ordine: prima l'urgente, poi chi aspetta di piu'; in agenda per ultimo", () => {
  const board = { colonne: [
    { id: "call_fissata", lead: [R({ email: "agenda@x.it", nome: "Agenda", fase: "call_fissata", call_starts_at: "2026-10-09T15:00:00Z", giorni: 30 })] },
    { id: "call_fatta", lead: [R({ email: "p@x.it", nome: "Poco", giorni: 6 }), R({ email: "m@x.it", nome: "Molto", giorni: 20 })] },
    { id: "questionario", lead: [R({ email: "n@x.it", nome: "Nuovo", fase: "questionario", giorni: 1 })] },
  ] };
  expect(righe(board, NOW).map((r) => r.nome)).toEqual(["Molto", "Poco", "Nuovo", "Agenda"]);
});

test("conteggi e filtri per fase e per testo (nome o email, senza maiuscole)", () => {
  const rows = righe({ colonne: [{ id: "x", lead: [
    R({ email: "linda@x.it", nome: "Linda Pavia", fase: "questionario" }),
    R({ email: "g@x.it", nome: "Giulia", fase: "call_fatta" }),
  ] }] }, NOW);
  expect(conteggi(rows)).toEqual({ tutti: 2, questionario: 1, call_fissata: 0, call_fatta: 1, trattativa: 0 });
  expect(filtra(rows, { fase: "questionario" }).map((r) => r.nome)).toEqual(["Linda Pavia"]);
  expect(filtra(rows, { testo: "PAVIA" })).toHaveLength(1);
  expect(filtra(rows, { testo: "g@x" }).map((r) => r.nome)).toEqual(["Giulia"]);
  expect(filtra(rows, {})).toHaveLength(2);
});

test("senza nome si mostra l'email", () => {
  expect(nomeVisibile({ nome: "  ", email: "z@x.it" })).toBe("z@x.it");
});

test("menu: tutte le funzioni per Claudio; Mariangela solo questionario e conferma call", () => {
  const ids = (t) => vociPer(t).flatMap((g) => g.voci.map((v) => v.id));
  expect(ids("claudio")).toEqual(["questionario", "blueprint", "fissata", "invia", "proposta", "riporta", "modifica", "elimina"]);
  expect(ids("mariangela")).toEqual(["questionario", "fissata"]);
});

test("indirizzo della scheda: email codificata e sezione in ?vai=", () => {
  expect(indirizzoScheda("a+b@x.it", "blueprint")).toBe("/admin/leads/a%2Bb%40x.it?vai=blueprint");
  expect(indirizzoScheda("a@x.it")).toBe("/admin/leads/a%40x.it");
});
