const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const html = read("src", "client", "index.html");
const app = read("src", "client", "app.js");
const css = read("src", "client", "styles.css");
const deploymentConfig = read("src", "client", "deployment-config.js");
const pagesBuild = read("scripts", "create-github-pages.js");

test("area de presenca possui navegacao, filtros e tabela", () => {
  [
    "nav-attendance-button",
    "attendance-workspace",
    "attendance-search",
    "attendance-modality",
    "attendance-team",
    "attendance-match",
    "attendance-stats",
    "attendance-list",
  ].forEach((id) => assert.match(html, new RegExp(`id=["']${id}["']`)));
});

test("cliente consome a API de presenca e exibe conciliacoes para revisao", () => {
  assert.match(deploymentConfig, /attendanceUrl:\s*"\/api\/attendance"/);
  assert.match(app, /fetch\(DEPLOYMENT\.attendanceUrl/);
  assert.match(app, /state\.attendance\.items = payload\.items/);
  assert.match(app, /Sugestão/);
  assert.match(app, /Sem cadastro/);
  assert.doesNotMatch(app, /localStorage\.setItem\([^\n]*attendance/i);
});

test("build do GitHub Pages publica a fonte suplementar separadamente", () => {
  assert.match(pagesBuild, /fetchJson\("\/api\/attendance"\)/);
  assert.match(pagesBuild, /attendanceUrl: "\.\/data\/attendance\.json"/);
  assert.match(pagesBuild, /"attendance\.json"/);
});

test("layout de presenca tem tabela rolavel e filtros responsivos", () => {
  assert.match(css, /\.attendance-table-shell\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.physio-filters[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.physio-stat--green::before/);
});
