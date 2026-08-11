import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MasterclassLanding } from "./MasterclassLanding";
import { hasMarketingConsent, trackLead } from "../lib/metaPixel";

const navigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => navigate,
}));

jest.mock("../components/CiakHeader", () => ({
  CiakHeader: () => <header>Ciak</header>,
}));

jest.mock("../components/CiakFooter", () => ({
  CiakFooter: () => <footer>Footer</footer>,
}));

jest.mock("../lib/metaPixel", () => ({
  hasMarketingConsent: jest.fn(() => false),
  trackLead: jest.fn(),
}));

function renderLanding() {
  return render(
    <MemoryRouter>
      <MasterclassLanding />
    </MemoryRouter>
  );
}

function fillValidLead() {
  fireEvent.change(screen.getAllByPlaceholderText("Il tuo nome")[0], {
    target: { value: "Claudio" },
  });
  fireEvent.change(screen.getAllByPlaceholderText("La tua email")[0], {
    target: { value: "CLAUDIO@example.net" },
  });
}

function submitHeroForm() {
  fireEvent.click(
    screen.getAllByRole("button", { name: /guarda la masterclass gratuita/i })[0]
  );
}

describe("MasterclassLanding lead capture", () => {
  beforeEach(() => {
    navigate.mockReset();
    trackLead.mockReset();
    hasMarketingConsent.mockReturnValue(true);
    global.fetch = jest.fn();
    localStorage.clear();
    document.cookie = "_fbp=; Max-Age=0; path=/";
    document.cookie = "_fbc=; Max-Age=0; path=/";
    window.history.pushState({}, "", "/masterclass?utm_source=meta&utm_campaign=luglio");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("registra il lead, traccia una sola volta e apre il viewer della masterclass", async () => {
    document.cookie = "_fbp=fb.1.123; path=/";
    document.cookie = "_fbc=fb.1.456; path=/";
    global.fetch.mockResolvedValue({ ok: true });
    renderLanding();

    fillValidLead();
    submitHeroForm();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);

    expect(url).toBe("/api/ciak/lead-capture");
    expect(options).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(payload).toEqual(expect.objectContaining({
      email: "claudio@example.net",
      nome: "Claudio",
      telefono: "",
      source: "masterclass_landing",
      utm_source: "meta",
      utm_campaign: "luglio",
      marketing_consent: true,
      fbp: "fb.1.123",
      fbc: "fb.1.456",
      referrer: null,
      event_source_url: expect.stringContaining("/masterclass?utm_source=meta"),
      event_id: expect.any(String),
    }));
    expect(payload.event_id).not.toEqual("");
    expect(trackLead).toHaveBeenCalledWith(payload.event_id);
    expect(localStorage.getItem("ciak_lead_email")).toBe("claudio@example.net");
    expect(localStorage.getItem("ciak_lead_name")).toBe("Claudio");
    expect(localStorage.getItem("ciak_lead_nome")).toBe("Claudio");
    expect(navigate).toHaveBeenCalledWith("/masterclass/guarda");
  });

  test("non invia cookie Meta né traccia Lead senza consenso marketing", async () => {
    hasMarketingConsent.mockReturnValue(false);
    document.cookie = "_fbp=fb.1.123; path=/";
    document.cookie = "_fbc=fb.1.456; path=/";
    global.fetch.mockResolvedValue({ ok: true });
    renderLanding();

    fillValidLead();
    submitHeroForm();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ marketing_consent: false, fbp: null, fbc: null });
    expect(trackLead).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/masterclass/guarda");
  });

  test("non traccia né naviga quando il backend rifiuta l'opt-in", async () => {
    global.fetch.mockResolvedValue({ ok: false });
    renderLanding();

    fillValidLead();
    submitHeroForm();

    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent(/riprova/i);
    expect(trackLead).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /guarda la masterclass gratuita/i })[0]).toBeEnabled();
  });

  test("consente un nuovo tentativo se la rete non risponde", async () => {
    global.fetch.mockRejectedValue(new Error("offline"));
    renderLanding();

    fillValidLead();
    submitHeroForm();

    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent(/riprova/i);
    expect(trackLead).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: /guarda la masterclass gratuita/i })[0]).toBeEnabled();
  });

  test.each([
    ["email non valida", "not-an-email", /email valida/i],
    ["dominio non deliverable", "claudio@mailinator.com", /non riceve messaggi/i],
  ])("rifiuta %s senza chiamare il backend", async (_label, invalidEmail, error) => {
    renderLanding();
    fireEvent.change(screen.getAllByPlaceholderText("Il tuo nome")[0], {
      target: { value: "Claudio" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("La tua email")[0], {
      target: { value: invalidEmail },
    });

    submitHeroForm();

    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent(error);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("impedisce il doppio invio anche tra modulo hero e modulo finale", async () => {
    let resolveCapture;
    global.fetch.mockReturnValue(new Promise((resolve) => {
      resolveCapture = resolve;
    }));
    renderLanding();

    fillValidLead();
    submitHeroForm();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const submitButtons = screen.getAllByRole("button", { name: /invio in corso/i });
    expect(submitButtons).toHaveLength(2);
    expect(submitButtons[0]).toBeDisabled();
    expect(submitButtons[1]).toBeDisabled();
    fireEvent.click(submitButtons[1]);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCapture({ ok: false });
    });
  });

  test("non mostra campi telefono", () => {
    renderLanding();

    expect(screen.queryByPlaceholderText(/telefono/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /telefono/i })).not.toBeInTheDocument();
  });
});
