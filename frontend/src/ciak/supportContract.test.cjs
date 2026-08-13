const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("area cliente espone assistenza cliccabile", () => {
  const source = fs.readFileSync("src/ciak/client/ClientLayout.jsx", "utf8");
  assert.match(source, /mailto:assistenza@evolution-pro\.it/);
  assert.match(source, />Supporto</);
});

test("area partner passa il contesto completo alla pagina supporto", () => {
  const source = fs.readFileSync("src/ciak/partner/CiakPartnerApp.jsx", "utf8");
  assert.match(source, /<TeamSupportoPage partner=\{partnerContext\}/);
});

test("lo stato partner espone il gruppo Telegram assegnato", () => {
  const source = fs.readFileSync("../backend/routers/partner_guided.py", "utf8");
  assert.match(source, /"telegram_group_url": partner\.get\("telegram_group_url"\)/);
});
