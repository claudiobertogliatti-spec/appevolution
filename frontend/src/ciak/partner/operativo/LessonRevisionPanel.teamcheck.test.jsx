import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import LessonRevisionPanel from "./LessonRevisionPanel";

afterEach(cleanup);
const base = { lesson_id: "l1", title: "Intro", output_version: 1, approved: true, partner_approved: true, ready_for_review: true, pipeline_status: "ready_for_review", embed_url: "" };
const show = (team_check) => render(<LessonRevisionPanel partnerId="p1" lesson={{ ...base, team_check }} onUpdated={() => {}} />);

test.each([
  ["in_controllo", /sta controllando il video/],
  ["online", /online nel tuo corso/],
  ["sistemando", /Stiamo sistemando/],
])("lo stato %s si legge in italiano semplice", (stato, testo) => {
  show(stato);
  expect(screen.getByTestId("team-check").textContent).toMatch(testo);
});

test("senza controllo del team non compare nulla", () => {
  show(null);
  expect(screen.queryByTestId("team-check")).toBeNull();
});
