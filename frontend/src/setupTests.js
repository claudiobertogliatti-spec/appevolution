import "@testing-library/jest-dom";

// React Router 7 relies on Web Encoding APIs that jsdom in CRA/Jest 27 does
// not expose by default under Node. Keep the polyfill in the shared test
// setup instead of duplicating it across individual test files.
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
