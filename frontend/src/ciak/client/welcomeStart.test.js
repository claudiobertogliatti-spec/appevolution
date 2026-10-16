import { markWelcomeSeen, welcomeAlreadySeen } from "./welcomeStart";

beforeEach(() => localStorage.clear());

test("chi ha chiuso il benvenuto vecchio (Metodo EVO) vede quello nuovo una volta", () => {
  // Il flag della prima versione, rimasto sul telefono della cliente.
  localStorage.setItem("ciak_welcome_start_seen_c1", "1");
  expect(welcomeAlreadySeen("c1")).toBe(false);
  markWelcomeSeen("c1");
  expect(welcomeAlreadySeen("c1")).toBe(true);
});

test("il flag e' per cliente", () => {
  markWelcomeSeen("c1");
  expect(welcomeAlreadySeen("c2")).toBe(false);
});

test("senza id cliente, o con storage bloccato, non si ripresenta a vuoto", () => {
  expect(welcomeAlreadySeen(undefined)).toBe(true);
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("bloccato");
  });
  expect(welcomeAlreadySeen("c1")).toBe(true);
  spy.mockRestore();
});
