const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CLIENT = path.join(ROOT, "src", "client");
const ASSETS = path.join(ROOT, "assets");
const TARGET = path.join(ROOT, "output", "github-pages");
const DATA = path.join(TARGET, "data");
const PORT = 41739;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function waitForServer(child) {
  const deadline = Date.now() + 120000;
  let lastError = null;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Servidor encerrou antes de gerar os dados (codigo ${child.exitCode}).`);
    }

    try {
      const response = await fetch(`${BASE_URL}/api/athletes`, { cache: "no-store" });
      if (response.ok) return response.json();
      lastError = new Error(`API de atletas respondeu ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await wait(1000);
  }

  throw new Error(`Tempo excedido aguardando o servidor: ${lastError?.message || "sem resposta"}`);
}

async function fetchJson(route) {
  const response = await fetch(`${BASE_URL}${route}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.details || payload.message || `${route} respondeu ${response.status}.`);
  }
  return payload;
}

async function main() {
  const expectedTarget = path.join(ROOT, "output", "github-pages");
  if (path.resolve(TARGET) !== path.resolve(expectedTarget)) {
    throw new Error("Destino inesperado para o build do GitHub Pages.");
  }

  const server = spawn(process.execPath, [path.join(ROOT, "src", "server", "index.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      OLYMPICO_NO_OPEN: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let serverError = "";
  server.stderr.on("data", (chunk) => {
    serverError += chunk.toString();
  });

  try {
    const athletes = await waitForServer(server);
    const physiotherapy = await fetchJson("/api/physiotherapy");
    const attendance = await fetchJson("/api/attendance");

    await fs.rm(TARGET, { recursive: true, force: true });
    await copyDirectory(CLIENT, TARGET);
    await copyDirectory(ASSETS, path.join(TARGET, "assets"));
    await fs.mkdir(DATA, { recursive: true });

    const generatedAt = new Date().toISOString();
    const config = `window.OLYMPICO_CONFIG = Object.freeze({\n  staticHosting: true,\n  reportsEnabled: false,\n  athletesUrl: "./data/athletes.json",\n  attendanceUrl: "./data/attendance.json",\n  physiotherapyUrl: "./data/physiotherapy.json",\n  generatedAt: "${generatedAt}"\n});\n`;

    await Promise.all([
      fs.writeFile(path.join(TARGET, "deployment-config.js"), config, "utf8"),
      fs.writeFile(path.join(DATA, "athletes.json"), JSON.stringify(athletes), "utf8"),
      fs.writeFile(path.join(DATA, "attendance.json"), JSON.stringify(attendance), "utf8"),
      fs.writeFile(path.join(DATA, "physiotherapy.json"), JSON.stringify(physiotherapy), "utf8"),
      fs.writeFile(path.join(TARGET, ".nojekyll"), "", "utf8"),
      fs.copyFile(path.join(TARGET, "index.html"), path.join(TARGET, "404.html")),
    ]);

    const metadata = {
      generatedAt,
      athletes: athletes.athletes?.length || 0,
      teams: athletes.categories?.length || 0,
      attendanceRecords: attendance.items?.length || 0,
      physiotherapyRecords: physiotherapy.items?.length || 0,
      reportsEnabled: false,
    };
    await fs.writeFile(path.join(DATA, "build-info.json"), JSON.stringify(metadata, null, 2), "utf8");
    await fs.writeFile(
      path.join(TARGET, "LEIA-ME-PUBLICACAO.txt"),
      [
        "DASHBOARD OLYMPICO - GITHUB PAGES",
        "",
        "Esta pasta pode ser publicada como site estatico.",
        "A geracao de PDF e o kit semanal estao desativados.",
        "",
        "Para sincronizacao automatica, publique o projeto completo e selecione",
        "GitHub Actions em Settings > Pages. O workflow atualiza os dados a cada hora.",
        "",
        "ATENCAO: os JSONs desta pasta contem dados de atletas e fisioterapia.",
        "GitHub Pages e publico e o login visual nao protege esses arquivos.",
        "Consulte docs/PUBLICACAO-GITHUB-PAGES.md antes de divulgar o endereco.",
        "",
      ].join("\n"),
      "utf8"
    );

    console.log(`GitHub Pages criado em ${TARGET}`);
    console.log(`${metadata.athletes} atletas; ${metadata.teams} equipes; ${metadata.physiotherapyRecords} registros de fisioterapia.`);
    console.log("Geracao de PDF desativada nesta edicao.");
  } finally {
    if (server.exitCode === null) {
      server.kill();
      await Promise.race([
        new Promise((resolve) => server.once("exit", resolve)),
        wait(5000),
      ]);
    }
    if (serverError.trim()) {
      console.error(serverError.trim());
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
