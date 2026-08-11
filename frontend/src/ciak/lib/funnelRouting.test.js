import {
  blueprintBridgeUrl,
  isMasterclassOptinBridge,
  masterclassSkipUrl,
  masterclassOptinDestination,
  normalizeAttributionSource,
} from "./funnelRouting";

describe("funnel routing contract", () => {
  test("builds the canonical Blueprint bridge URL", () => {
    expect(blueprintBridgeUrl()).toBe("/blueprint?source=masterclass_optin");
  });

  test("recognizes only masterclass_optin as the bridge source", () => {
    expect(isMasterclassOptinBridge("masterclass_optin")).toBe(true);
    expect(isMasterclassOptinBridge("?source=masterclass_optin")).toBe(true);
    expect(isMasterclassOptinBridge("retargeting")).toBe(false);
    expect(isMasterclassOptinBridge("anything_else")).toBe(false);
  });

  test("uses the canonical masterclass viewer as the bridge skip URL", () => {
    expect(masterclassSkipUrl()).toBe("/masterclass/guarda");
  });

  test("sends a successful opt-in directly to the promised masterclass", () => {
    expect(masterclassOptinDestination()).toBe("/masterclass/guarda");
  });

  test.each(["direct", "masterclass_optin", "retargeting"])(
    "preserves the allowed attribution source %s",
    (source) => {
      expect(normalizeAttributionSource(source)).toBe(source);
    }
  );

  test.each([undefined, null, "", "paid_social", "masterclass", "MASTERCLASS_OPTIN"])(
    "normalizes arbitrary attribution source %p to direct",
    (source) => {
      expect(normalizeAttributionSource(source)).toBe("direct");
    }
  );
});
