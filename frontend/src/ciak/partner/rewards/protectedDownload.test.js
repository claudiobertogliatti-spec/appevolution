import { downloadProtectedDocument } from "./protectedDownload";

jest.mock("../api", () => ({
  authHeaders: jest.fn(() => ({ Authorization: "Bearer partner-token" })),
}));

describe("downloadProtectedDocument", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
    });
    global.URL.createObjectURL = jest.fn(() => "blob:document");
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("scarica il documento con il token del partner", async () => {
    await downloadProtectedDocument("/api/partner-rewards/p1/project-book", "workbook.pdf");

    expect(fetch).toHaveBeenCalledWith(
      "/api/partner-rewards/p1/project-book",
      { headers: { Authorization: "Bearer partner-token" } }
    );
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  });

  it("non crea un download quando il backend rifiuta la richiesta", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(
      downloadProtectedDocument("/api/partner-rewards/p2/project-book", "workbook.pdf")
    ).rejects.toThrow("HTTP 403");
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});
