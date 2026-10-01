import { etichettaPasso } from "./startPassi";

test("i sei passi di Start hanno nomi semplici, senza gergo", () => {
  const ids = ["03-brand-kit", "04-posizionamento", "start-profili", "start-vetrina", "start-contenuti-90", "start-readiness"];
  const nomi = ids.map((step_id) => etichettaPasso({ step_id, label: "Nome tecnico" }));
  expect(nomi).toEqual([
    "Il tuo marchio", "Chi sei e cosa offri", "I tuoi profili social",
    "La tua pagina web", "Il calendario dei 60 giorni", "Il controllo finale",
  ]);
  expect(nomi.join(" ").toLowerCase()).not.toMatch(/brand kit|readiness|vetrina|90/);
});

test("un passo sconosciuto non sparisce: si usa il suo nome", () => {
  expect(etichettaPasso({ step_id: "altro", label: "Altro passo" })).toBe("Altro passo");
  expect(etichettaPasso({ step_id: "altro" })).toBe("altro");
  expect(etichettaPasso(null)).toBe("");
});
