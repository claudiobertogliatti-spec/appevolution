const { createProxyMiddleware } = require("http-proxy-middleware");

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  "https://evolution-pro-backend-dc2gzjsmdq-ew.a.run.app";

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
