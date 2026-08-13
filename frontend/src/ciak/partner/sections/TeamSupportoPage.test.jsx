import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamSupportoPage } from "./TeamSupportoPage";

test("apre il gruppo Telegram dedicato ricevuto dal contesto partner", async () => {
  const open = jest.spyOn(window, "open").mockImplementation(() => null);
  render(<TeamSupportoPage partner={{ telegram_group_url: "https://t.me/gruppo_reale" }} />);
  await userEvent.click(screen.getByRole("button", { name: /apri canale telegram dedicato/i }));
  expect(open).toHaveBeenCalledWith("https://t.me/gruppo_reale", "_blank");
});
