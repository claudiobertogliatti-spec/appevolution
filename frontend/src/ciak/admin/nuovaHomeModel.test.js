import { daSollecitare, frasePrincipale, SOLLECITO_GIORNI } from "./nuovaHomeModel";

const t = (nome, giorni) => ({ email: `${nome}@x.it`, nome, giorni, tone: "neutral" });

test("la soglia è 5 giorni, come deciso", () => {
  expect(SOLLECITO_GIORNI).toBe(5);
});

test("fonte assente: null, non zero", () => {
  expect(daSollecitare(null)).toBeNull();
  expect(daSollecitare(undefined)).toBeNull();
});

test("tiene chi è a 5 giorni o più, dalla più vecchia; esclude chi è sotto", () => {
  const r = daSollecitare([t("a", 4), t("b", 5), t("c", 14), t("d", 0)]);
  expect(r.lista.map((x) => x.nome)).toEqual(["c", "b"]);
  expect(r.totale).toBe(4);
});

test("senza data non si giudica: si conta a parte, non entra nella lista", () => {
  const r = daSollecitare([t("a", null), t("b", 9)]);
  expect(r.lista.map((x) => x.nome)).toEqual(["b"]);
  expect(r.senzaData).toBe(1);
});

test("frase con numeri veri, singolare e plurale", () => {
  expect(frasePrincipale({ call: 2, solleciti: 2, tocca: 5 })).toBe("Hai 2 call oggi, 2 trattative da sollecitare e 5 partner che aspettano te.");
  expect(frasePrincipale({ call: 1, solleciti: 1, tocca: 1 })).toBe("Hai 1 call oggi, 1 trattativa da sollecitare e 1 partner che aspetta te.");
});

test("le cose a zero non si elencano quando ce n'è qualcuna da fare", () => {
  expect(frasePrincipale({ call: 0, solleciti: 2, tocca: 0 })).toBe("Hai 2 trattative da sollecitare.");
});

test("tutto a zero lo dice, non tace", () => {
  expect(frasePrincipale({ call: 0, solleciti: 0, tocca: 0 })).toBe("Nessuna call oggi, nessuna trattativa da sollecitare e nessun partner che aspetta te.");
});

test("una fonte non leggibile non diventa uno zero", () => {
  expect(frasePrincipale({ call: 1, solleciti: null, tocca: 3 })).toBe("Hai 1 call oggi e 3 partner che aspettano te. Non riesco a leggere le trattative.");
  expect(frasePrincipale({ call: 0, solleciti: 0, tocca: null })).toBe("Nessuna call oggi e nessuna trattativa da sollecitare. Non riesco a leggere i partner.");
  expect(frasePrincipale({ call: null, solleciti: null, tocca: null })).toBe("Non riesco a leggere le call, le trattative e i partner.");
});
