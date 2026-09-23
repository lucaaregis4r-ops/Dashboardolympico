const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "src", "client", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "src", "client", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src", "client", "styles.css"), "utf8");
const flatTheme = fs.readFileSync(path.join(root, "src", "client", "theme-flat.css"), "utf8");
const serviceWorker = fs.readFileSync(
  path.join(root, "src", "client", "service-worker.js"),
  "utf8"
);
const deploymentConfig = fs.readFileSync(
  path.join(root, "src", "client", "deployment-config.js"),
  "utf8"
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "src", "client", "manifest.webmanifest"), "utf8")
);

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
  assert.match(app, /physiotherapyUrl:\s*"\/api\/physiotherapy"/);
  assert.match(app, /fetch\(DEPLOYMENT\.physiotherapyUrl/);
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

test("tema flat e carregado depois dos estilos estruturais", () => {
  const baseIndex = html.indexOf('href="styles.css"');
  const themeIndex = html.indexOf('href="theme-flat.css"');
  assert.ok(baseIndex >= 0);
  assert.ok(themeIndex > baseIndex);
  assert.match(flatTheme, /--navy:\s*#171d49/);
  assert.match(flatTheme, /--red:\s*#df3046/);
  assert.match(flatTheme, /body\s*\{[^}]*background:\s*#f1f3f8/s);
  assert.match(flatTheme, /\.sidebar\s*\{[^}]*background:\s*var\(--navy\)/s);
  assert.match(flatTheme, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(serviceWorker, /"\.\/theme-flat\.css"/);
});

test("combinacoes principais do tema atendem contraste AA", () => {
  function luminance(hex) {
    const channels = hex
      .match(/[a-f\d]{2}/gi)
      .map((value) => parseInt(value, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  }

  function contrast(left, right) {
    const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  [
    ["#171d49", "#ffffff"],
    ["#1c2442", "#ffffff"],
    ["#69748f", "#ffffff"],
    ["#df3046", "#ffffff"],
    ["#4246a6", "#ffffff"],
  ].forEach(([foreground, background]) => {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} sobre ${background}`);
  });
});

test("estrutura principal possui atalhos e anuncios acessiveis", () => {
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /id="main-content" tabindex="-1"/);
  assert.match(html, /id="login-error"[^>]*role="alert"[^>]*aria-live="assertive"/);
  assert.match(html, /id="results-count" aria-live="polite"/);
  assert.match(flatTheme, /\.skip-link:focus\s*\{/);
});

test("graficos e alternancia de modo possuem semantica assistiva", () => {
  assert.equal((html.match(/<canvas[^>]*role="img"[^>]*aria-label=/g) || []).length, 4);
  assert.match(html, /class="mode-switch" role="tablist"/);
  assert.match(html, /id="athlete-mode-button"[^>]*role="tab"[^>]*aria-selected="true"/);
  assert.match(app, /setAttribute\("aria-selected", String\(state\.viewMode === "athlete"\)\)/);
});

test("dialogo da comissao controla foco, escape e estado expandido", () => {
  assert.match(html, /id="staff-drawer" role="dialog" aria-modal="true"/);
  assert.match(html, /aria-labelledby="staff-drawer-title" aria-hidden="true"/);
  assert.match(app, /state\.staffReturnFocus = document\.activeElement/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /event\.key !== "Tab"/);
  assert.match(app, /document\.addEventListener\("keydown", handleStaffDrawerKeydown\)/);
});

test("navegacao sincroniza o item atual para tecnologias assistivas", () => {
  assert.match(html, /id="nav-panel-button"[^>]*aria-current="page"/);
  assert.match(app, /button\.setAttribute\("aria-current", "page"\)/);
  assert.match(app, /button\.removeAttribute\("aria-current"\)/);
});

test("manifesto PWA declara o tamanho real do escudo e usa caminhos portaveis", () => {
  const png = fs.readFileSync(path.join(root, "assets", "olympico-crest.png"));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./?source=pwa");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.icons.length, 1);
  assert.equal(manifest.icons[0].sizes, `${width}x${height}`);
  assert.equal(manifest.icons[0].purpose, "any");
  assert.match(serviceWorker, /dashboard-olympico-v10/);
  assert.match(serviceWorker, /"\.\/deployment-config\.js"/);
});

test("cliente aceita fontes de dados configuraveis e desativa relatorios no Pages", () => {
  const configIndex = html.indexOf('src="deployment-config.js"');
  const appIndex = html.indexOf('src="app.js"');

  assert.ok(configIndex >= 0 && configIndex < appIndex);
  assert.match(deploymentConfig, /reportsEnabled:\s*true/);
  assert.match(app, /fetch\(DEPLOYMENT\.athletesUrl/);
  assert.match(app, /fetch\(DEPLOYMENT\.physiotherapyUrl/);
  assert.match(app, /if \(!DEPLOYMENT\.reportsEnabled\)/);
  assert.match(html, /serviceWorker\.register\("\.\/service-worker\.js"\)/);
});
