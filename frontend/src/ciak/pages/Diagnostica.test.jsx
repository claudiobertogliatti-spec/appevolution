import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CiakDiagnostica } from "./Diagnostica";

jest.mock("../components/CiakHeader", () => ({
  CiakHeader: () => <header>Ciak</header>,
}));

const ANSWER = "Risposta sufficientemente lunga e concreta per il test.";
const QUESTION_HEADINGS = [
  /qual è la competenza/i,
  /da quanto la pratichi/i,
  /con chi hai già lavorato/i,
  /se immagini un tuo corso/i,
  /che materiale hai già creato/i,
  /a chi vorresti parlare/i,
  /qual è il problema che risolvi/i,
  /che rapporto hai oggi con il mondo online/i,
  /ti sei già affidato ad agenzie/i,
  /perché vuoi farlo, davvero/i,
];

function mockDiagnosticApi(instradamento) {
  global.fetch = jest.fn(async (url) => {
    if (url === "/api/diagnostic/start") {
      return {
        ok: true,
        json: async () => ({ session_token: "tok-test", lead_id: "lead-test" }),
      };
    }
    if (url === "/api/diagnostic/answer") {
      return { ok: true, status: 204, json: async () => ({}) };
    }
    if (url === "/api/diagnostic/complete") {
      return {
        ok: true,
        json: async () => ({
          report_url: "https://ciak.io/report/tok-test",
          stato: 2,
          session_token: "tok-test",
          ...(instradamento ? { instradamento } : {}),
        }),
      };
    }
    if (url === "/api/admin/ciak/public-config") {
      return {
        ok: true,
        json: async () => ({ calcom_booking_url: "https://cal.com/evolution/test" }),
      };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

async function completeQuestionnaire(instradamento) {
  mockDiagnosticApi(instradamento);
  localStorage.setItem("ciak_lead_email", "lead@example.com");
  localStorage.setItem("ciak_lead_name", "Mario");

  render(<CiakDiagnostica />);

  for (let question = 1; question <= 10; question += 1) {
    await screen.findByRole("heading", { name: QUESTION_HEADINGS[question - 1] });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: ANSWER } });
    fireEvent.click(
      screen.getByRole("button", {
        name: question === 10 ? /completa l'analisi/i : /avanti/i,
      })
    );
  }

  await screen.findByRole("heading", { name: /grazie, ci siamo/i });
}

describe("CiakDiagnostica — gate instradamento calendario", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test.each(["partnership", "start", undefined])(
    "mantiene il calendario per l'instradamento %p",
    async (instradamento) => {
      await completeQuestionnaire(instradamento);

      expect(
        await screen.findByRole("link", { name: /prenota la tua videocall strategica/i })
      ).toHaveAttribute("href", "https://cal.com/evolution/test");
      expect(global.fetch).toHaveBeenCalledWith("/api/admin/ciak/public-config");
    }
  );

  test("per nurture non carica né mostra il calendario e propone la masterclass", async () => {
    await completeQuestionnaire("nurture");

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalledWith("/api/admin/ciak/public-config");
    });
    expect(
      screen.queryByRole("link", { name: /prenota la tua videocall strategica/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/ti scriviamo noi via email con il link/i)).not.toBeInTheDocument();
    expect(screen.getByText(/rafforzare le basi prima di una sessione strategica/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /guarda la masterclass gratuita/i })).toHaveAttribute(
      "href",
      "/masterclass/guarda"
    );
    expect(screen.queryByText(/nurture/i)).not.toBeInTheDocument();
  });
});
