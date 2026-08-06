const fs = require("fs");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "output", "github-pages");
const PORT = Number(process.env.PORT) || 41740;
const PREFIX = "/dashboard-olympico";
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (url.pathname === PREFIX) {
    response.writeHead(302, { Location: `${PREFIX}/` });
    response.end();
    return;
  }
  if (!url.pathname.startsWith(`${PREFIX}/`)) {
    response.writeHead(404).end("Nao encontrado");
    return;
  }

  const relativePath = decodeURIComponent(url.pathname.slice(PREFIX.length + 1)) || "index.html";
  const filePath = path.resolve(ROOT, relativePath);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404).end("Nao encontrado");
    return;
  }

  response.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Preview: http://127.0.0.1:${PORT}${PREFIX}/`);
});
