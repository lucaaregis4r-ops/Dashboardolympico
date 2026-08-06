const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src", "client", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "src", "client", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "client", "styles.css"), "utf8");

test("workspace de fisioterapia possui navegacao, filtros e regioes de resultado", () => {
  [
    "nav-physiotherapy-button",
    "physiotherapy-workspace",
    "physiotherapy-search",
    "physiotherapy-modality",
    "physiotherapy-team",
    "physiotherapy-severity",
    "physiotherapy-stats",
    "physiotherapy-list",
  ].forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`)));
});

test("cliente consome a API dedicada sem persistir dados clinicos", () => {
  assert.match(app, /fetch\("\/api\/physiotherapy"/);
  assert.match(app, /state\.physiotherapy\.items = payload\.items/);
  assert.doesNotMatch(app, /localStorage\.setItem\([^\n]*physio/i);
});

test("observacoes sao escapadas e exibidas com rotulo", () => {
  assert.match(app, /Observações:<\/b>.*escapeHtml\(item\.observations\)/);
  assert.match(app, /function escapeHtml\(value\)/);
});

test("layout da fisioterapia possui adaptacao para telas menores", () => {
  assert.match(css, /\.physio-list\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.physio-list[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.physio-filters[\s\S]*grid-template-columns:\s*1fr/);
});
