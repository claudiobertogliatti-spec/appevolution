import { startOggiModel, startPercorsoModel, domandeRisposte, tappaCorrente, MATERIALI } from "./startOggiModel";
import { START_DOMANDE } from "../startDomande";

const TUTTE = Object.fromEntries(START_DOMANDE.map((d) => [d.id, `Risposta di prova per ${d.id}`]));
const CONSEGNE = ["08/10/2026", "15/10/2026", "22/10/2026"];
const R_VUOTE = { answers: {}, completato_at: null };
const R_OK = { answers: TUTTE, completato_at: "2026-10-02" };
const M_VUOTO = { valori: {}, completato_at: null };
const M_OK = { valori: { colors: ["#112233", "#445566", "#778899"] }, completato_at: "2026-10-03" };
const doc = (...tipi) => tipi.map((type) => ({ type }));

test("senza dati non risponde 'tutto ok': dice che sta caricando", () => {
  expect(startOggiModel({ risposte: null, marchio: M_OK, deliverables: [], consegne: CONSEGNE }).kind).toBe("loading");
  expect(startPercorsoModel({ risposte: R_OK, marchio: null, deliverables: [] })).toBeNull();
});

test("si parte dalle domande, con il conteggio vero e il link giusto", () => {
  const m = startOggiModel({ risposte: R_VUOTE, marchio: M_VUOTO, deliverables: [], consegne: CONSEGNE });
  expect(m).toMatchObject({ kind: "action", to: "/cliente/start/domande", cta: "Inizia le domande" });
  const meta = startOggiModel({
    risposte: { answers: { nicchia: "Donne dopo i quaranta", momento_di_vita: "Dopo aver provato da sole" }, completato_at: null },
    marchio: M_VUOTO, deliverables: [], consegne: CONSEGNE,
  });
  expect(meta.title).toMatch(/Continua/);
  expect(meta.description).toMatch(/2 domande su 20/);
});

test("risposte troppo corte non contano come risposte", () => {
  expect(domandeRisposte({ nicchia: "ok", promessa: "Ritrovare energia" })).toBe(1);
});

test("dopo le domande tocca al marchio; poi, se manca altro, tocca a noi", () => {
  expect(startOggiModel({ risposte: R_OK, marchio: M_VUOTO, deliverables: [], consegne: CONSEGNE }))
    .toMatchObject({ kind: "action", to: "/cliente/start/marchio", cta: "Inizia dal marchio" });
  const a = startOggiModel({ risposte: R_OK, marchio: M_OK, deliverables: [], consegne: CONSEGNE });
  expect(a).toMatchObject({ kind: "waiting", badge: "Ora tocca a noi" });
  expect(a.description).toMatch(/entro il 08\/10\/2026/);
});

test("con materiali approvati il passo e' usarli, e il conteggio e' dei soli approvati", () => {
  const m = startOggiModel({ risposte: R_OK, marchio: M_OK, deliverables: doc("positioning", "brand_kit"), consegne: CONSEGNE });
  expect(m).toMatchObject({ kind: "ready", to: "/cliente/materiali", progress: { done: 2, total: 6 } });
  expect(m.title).toBe("Hai 2 materiali pronti da usare");
  expect(m.tappa).toMatchObject({ numero: 2, data: "15/10/2026" });
});

test("tutti e sei approvati: pacchetto completo", () => {
  const m = startOggiModel({ risposte: R_OK, marchio: M_OK, deliverables: doc(...MATERIALI.map((x) => x.type)), consegne: CONSEGNE });
  expect(m).toMatchObject({ kind: "complete", progress: { done: 6, total: 6 } });
  expect(m.tappa).toBeNull();
});

test("la tappa corrente e' la prima con materiali non approvati (la readiness non ha una tappa)", () => {
  expect(tappaCorrente(doc("positioning", "brand_kit", "social_profiles", "showcase"), CONSEGNE)).toMatchObject({ numero: 3, data: "22/10/2026" });
  expect(tappaCorrente(doc("positioning", "brand_kit", "social_profiles", "showcase", "content_plan_90d"), CONSEGNE)).toBeNull();
});

test("il percorso elenca 8 voci con lo stato in parole semplici", () => {
  const v = startPercorsoModel({ risposte: R_OK, marchio: M_OK, deliverables: doc("positioning") });
  expect(v).toHaveLength(8);
  expect(v.slice(0, 2).map((x) => x.stato)).toEqual(["fatto", "fatto"]);
  expect(v.find((x) => x.id === "positioning")).toMatchObject({ stato: "fatto", nota: "Pronto", to: "/cliente/materiali" });
  expect(v.find((x) => x.id === "brand_kit")).toMatchObject({ stato: "in_preparazione", nota: "Lo stiamo preparando", to: null });
  const presto = startPercorsoModel({ risposte: R_VUOTE, marchio: M_VUOTO, deliverables: [] });
  expect(presto.find((x) => x.id === "social_profiles")).toMatchObject({ stato: "in_attesa" });
});

test("se il team ha chiesto di completare altre domande, le risposte non sono 'inviate' e il passo sono le ultime", () => {
  const meta = { answers: Object.fromEntries(START_DOMANDE.slice(0, 15).map((d) => [d.id, `Risposta di prova per ${d.id}`])), completato_at: "2026-10-02", integrazione: true };
  const m = startOggiModel({ risposte: meta, marchio: M_OK, deliverables: [], consegne: CONSEGNE });
  expect(m).toMatchObject({ kind: "action", to: "/cliente/start/domande", title: "Rispondi alle ultime domande" });
  expect(m.description).toMatch(/Te ne restano 5/);
  const v = startPercorsoModel({ risposte: meta, marchio: M_OK, deliverables: [] });
  expect(v.find((x) => x.id === "domande")).toMatchObject({ stato: "da_fare", nota: "15 su 20" });
  expect(v.find((x) => x.id === "positioning")).toMatchObject({ stato: "in_attesa" });
});
