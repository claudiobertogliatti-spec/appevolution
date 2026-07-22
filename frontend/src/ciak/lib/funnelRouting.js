export const BLUEPRINT_SOURCES = Object.freeze({
  DIRECT: "direct",
  MASTERCLASS_OPTIN: "masterclass_optin",
  RETARGETING: "retargeting",
});

const ALLOWED_ATTRIBUTION_SOURCES = new Set(Object.values(BLUEPRINT_SOURCES));

export function blueprintBridgeUrl() {
  return `/blueprint?source=${BLUEPRINT_SOURCES.MASTERCLASS_OPTIN}`;
}

export function isMasterclassOptinBridge(sourceOrSearch = "") {
  const safeSource = sourceOrSearch || "";
  const source = safeSource.startsWith("?")
    ? new URLSearchParams(safeSource).get("source")
    : safeSource;
  return source === BLUEPRINT_SOURCES.MASTERCLASS_OPTIN;
}

export function masterclassSkipUrl() {
  return "/masterclass/guarda";
}

export function normalizeAttributionSource(source) {
  return ALLOWED_ATTRIBUTION_SOURCES.has(source)
    ? source
    : BLUEPRINT_SOURCES.DIRECT;
}
