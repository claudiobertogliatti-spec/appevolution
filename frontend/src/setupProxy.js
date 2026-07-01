const { createProxyMiddleware } = require("http-proxy-middleware");

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://evolution-pro-backend-977860235035.europe-west1.run.app";

module.exports = function setupProxy(app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      secure: true,
    })
  );
};
