/**
 * Ciak Admin — Template Email: ripristinare un template al default (sovrascrive
 * le modifiche) non parte da un confirm() del browser ma da una conferma in pagina.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TemplateEmail } from "./TemplateEmail";
import { adminFetch } from "../api";

jest.mock("../api", () => ({ adminFetch: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  adminFetch.mockImplementation((url, opts) => {
    if (url === "/api/admin/email-templates") {
      return Promise.resolve({ json: async () => ({ templates: [{ template_id: "welcome_email", subject: "Ciao" }] }) });
    }
    if (url === "/api/admin/email-templates/welcome_email") {
      return Promise.resolve({ json: async () => ({ template_id: "welcome_email", subject: "Ciao", body_html: "<p>x</p>" }) });
    }
    if (opts?.method === "POST") return Promise.resolve({ ok: true });
    return Promise.resolve({ json: async () => ({}) });
  });
});

async function selectTemplate() {
  render(<TemplateEmail onAuthExpired={() => {}} />);
  fireEvent.click(await screen.findByText("Welcome Email"));
  await screen.findByRole("button", { name: "Ripristina Default" });
}

test("ripristinare apre una conferma in pagina, non un window.confirm", async () => {
  const spy = jest.spyOn(window, "confirm");
  await selectTemplate();
  fireEvent.click(screen.getByRole("button", { name: "Ripristina Default" }));
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog").textContent).toMatch(/template/i);
  spy.mockRestore();
});

test("confermando chiama il reset del template", async () => {
  await selectTemplate();
  fireEvent.click(screen.getByRole("button", { name: "Ripristina Default" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Ripristina" }));
  await waitFor(() =>
    expect(adminFetch).toHaveBeenCalledWith(
      "/api/admin/email-templates/welcome_email/reset",
      { method: "POST" }
    )
  );
});
