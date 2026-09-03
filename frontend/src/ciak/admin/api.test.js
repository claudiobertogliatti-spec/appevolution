/**
 * Ciak Admin — client API: apiPatch.
 *
 * Il PATCH e' il gesto che tiene onesti i numeri dell'amministrazione (segnare
 * una rata incassata, muovere una leva). Senza un helper, ogni pagina rifarebbe
 * fetch + token + gestione del 401 a modo suo.
 */
import { apiPatch } from "./api";

beforeEach(() => {
  localStorage.setItem("ciak_admin_token", "tok-123");
  global.fetch = jest.fn();
});

afterEach(() => {
  localStorage.clear();
  delete global.fetch;
});

test("apiPatch manda un PATCH JSON autenticato sul prefisso admin Ciak", async () => {
  global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });

  const out = await apiPatch("/crediti/depalma/rate/1", { stato: "incassata" });

  expect(out).toEqual({ success: true });
  const [url, opts] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/admin/ciak/crediti/depalma/rate/1");
  expect(opts.method).toBe("PATCH");
  expect(opts.headers.Authorization).toBe("Bearer tok-123");
  expect(opts.headers["Content-Type"]).toBe("application/json");
  expect(JSON.parse(opts.body)).toEqual({ stato: "incassata" });
});

test("apiPatch su 401 pulisce la sessione e segnala AUTH_EXPIRED", async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 401, text: async () => "" });

  await expect(apiPatch("/crediti/x/rate/1", { stato: "saltata" })).rejects.toThrow("AUTH_EXPIRED");
  expect(localStorage.getItem("ciak_admin_token")).toBeNull();
});
