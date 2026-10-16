import { streamAssistente } from "./assistenteStream";

jest.mock("../api", () => ({ getClientToken: () => "tok" }));

const risposta = (testo, status = 200) => ({
  ok: status < 400,
  status,
  body: null,
  text: async () => testo,
});
const sse = (...eventi) => eventi.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");

test("legge i pezzi, manda il token e dice se la domanda e' passata al team", async () => {
  const pezzi = [];
  const fetchImpl = jest.fn().mockResolvedValue(risposta(sse({ t: "Non lo so. " }, { t: "Lo giro al team." }, { done: true, passato: true })));
  const r = await streamAssistente({ message: "Ciao", history: [{ role: "user", content: "x" }], onText: (t) => pezzi.push(t), fetchImpl });
  expect(pezzi.join("")).toBe("Non lo so. Lo giro al team.");
  expect(r).toEqual({ passato: true });
  const [url, opts] = fetchImpl.mock.calls[0];
  expect(url).toBe("/api/ciak/client/start/assistente");
  expect(opts.headers.Authorization).toBe("Bearer tok");
  expect(JSON.parse(opts.body)).toEqual({ message: "Ciao", history: [{ role: "user", content: "x" }] });
});

test("errore del server, sessione scaduta e rete assente diventano messaggi onesti", async () => {
  await expect(streamAssistente({ message: "a", onText() {}, fetchImpl: async () => risposta("", 500) })).rejects.toThrow(/assistenza@evolution-pro.it/);
  await expect(streamAssistente({ message: "a", onText() {}, fetchImpl: async () => risposta("", 401) })).rejects.toThrow(/sessione è scaduta/);
  await expect(streamAssistente({ message: "a", onText() {}, fetchImpl: async () => { throw new TypeError("offline"); } })).rejects.toThrow(/assistenza@evolution-pro.it/);
  await expect(streamAssistente({ message: "a", onText() {}, fetchImpl: async () => risposta(sse({ error: "Servizio giù" })) })).rejects.toThrow("Servizio giù");
});
