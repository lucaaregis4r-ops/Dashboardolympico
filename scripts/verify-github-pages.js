const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "output", "github-pages");

function requireFile(relativePath) {
  const filePath = path.join(TARGET, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo ausente: ${relativePath}`);
  }
  return filePath;
}

const required = [
  "index.html",
  "404.html",
  ".nojekyll",
  "styles.css",
  "theme-flat.css",
  "app.js",
  "deployment-config.js",
  "manifest.webmanifest",
  "service-worker.js",
  "assets/olympico-crest.png",
  "data/athletes.json",
  "data/attendance.json",
  "data/physiotherapy.json",
  "data/build-info.json",
  "LEIA-ME-PUBLICACAO.txt",
];

required.forEach(requireFile);

const html = fs.readFileSync(requireFile("index.html"), "utf8");
const config = fs.readFileSync(requireFile("deployment-config.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(requireFile("manifest.webmanifest"), "utf8"));
const athletes = JSON.parse(fs.readFileSync(requireFile("data/athletes.json"), "utf8"));
const physiotherapy = JSON.parse(fs.readFileSync(requireFile("data/physiotherapy.json"), "utf8"));
const attendance = JSON.parse(fs.readFileSync(requireFile("data/attendance.json"), "utf8"));
const { listAttendanceTeams } = require("../src/server/config/data-sources");

if (html.indexOf('src="deployment-config.js"') > html.indexOf('src="app.js"')) {
  throw new Error("A configuracao precisa carregar antes do app.js.");
}
if (!config.includes("reportsEnabled: false")) {
  throw new Error("A geracao de relatorios nao foi desativada.");
}
if (!config.includes('./data/athletes.json') || !config.includes('./data/physiotherapy.json') || !config.includes('./data/attendance.json')) {
  throw new Error("As URLs estaticas de dados nao foram configuradas.");
}
if (manifest.start_url !== "./?source=pwa" || manifest.scope !== "./") {
  throw new Error("Manifesto nao esta preparado para subcaminhos do GitHub Pages.");
}
if (!Array.isArray(athletes.athletes) || !Array.isArray(athletes.categories)) {
  throw new Error("Snapshot de atletas invalido.");
}
if (!Array.isArray(physiotherapy.items)) {
  throw new Error("Snapshot de fisioterapia invalido.");
}
if (!Array.isArray(attendance.items) || attendance.loadedTeams !== listAttendanceTeams().length || attendance.failedTeams !== 0) {
  throw new Error("Snapshot de presenca incompleto: todas as categorias precisam ser carregadas antes da publicacao.");
}

console.log("Pasta GitHub Pages validada.");
console.log(`${athletes.athletes.length} atletas; ${athletes.categories.length} equipes; ${physiotherapy.items.length} registros de fisioterapia.`);
console.log("PDF e kit semanal desativados na configuracao estatica.");
console.log(`${attendance.loadedTeams} categorias de presenca carregadas; ${attendance.items.length} atletas nas chamadas.`);
