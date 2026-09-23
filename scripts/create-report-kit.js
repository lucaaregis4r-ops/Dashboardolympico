const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const { listAttendanceTeams } = require("../src/server/config/data-sources");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(ROOT, "output", "reports");
const DEFAULT_PORT = 3147;
const HOST = "127.0.0.1";
const DEFAULT_REPORT_TIMEOUT_MS = 180000;
const DEFAULT_RETRIES = 2;

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const FIXED_REPORTS = listAttendanceTeams().map(({ modalityId, teamName }) => ({
  modality: modalityId,
  team: teamName,
  fileName: `Relatório ${teamName}.pdf`,
}));

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function inferModalityId(category) {
  const key = normalizeKey(category);
  if (key.includes("BASQUETE")) return "basquete";
  if (key.includes("VOLEIFEM")) return "volei-feminino";
  if (key.includes("VOLEIMASC")) return "volei-masculino";
  if (key.includes("NATACAO")) return "natacao";
  if (key.includes("FUTSAL")) return "futsal";
  return "outras";
}

function fileSafeTeamName(teamName) {
  return normalizeText(teamName).replace(/[<>:"/\\|?*]+/g, "-");
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function getPositiveIntegerArg(name, fallback) {
  const raw = getArgValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} deve ser um numero inteiro positivo.`);
  }
  return value;
}

function formatReportFolderName(updatedAtIso) {
  const dateArg = getArgValue("date");
  // O nome do kit representa quando ele foi gerado, e não quando houve
  // o último check-in. --date continua permitindo uma data manual.
  const date = dateArg ? new Date(`${dateArg}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new Error("Data invalida. Use --date=AAAA-MM-DD, por exemplo --date=2026-06-18.");
  }

  return `Relatórios ${date.getDate()} de ${MONTHS_PT[date.getMonth()]}`;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApi(baseUrl) {
  const deadline = Date.now() + 45000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/athletes`, { cache: "no-store" });
      if (response.ok) {
        return response.json();
      }
      lastError = new Error(`API respondeu ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(700);
  }

  throw new Error(`Servidor nao respondeu no tempo esperado: ${lastError?.message || "sem detalhe"}`);
}

function startServer(port) {
  const child = spawn(process.execPath, [path.join("src", "server", "index.js")], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST,
      OPEN_BROWSER: "0",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));

  return child;
}

function resolveTeam(categories, requestedTeam) {
  const requestedKey = normalizeKey(requestedTeam);
  return categories.find((teamName) => normalizeKey(teamName) === requestedKey) || requestedTeam;
}

function buildReportList(categories) {
  return FIXED_REPORTS.map((report) => ({
    ...report,
    team: resolveTeam(categories, report.team),
  }));
}

async function downloadReport(baseUrl, report, outputDir) {
  const timeoutMs = getPositiveIntegerArg("timeout-seconds", DEFAULT_REPORT_TIMEOUT_MS / 1000) * 1000;
  const retries = getPositiveIntegerArg("retries", DEFAULT_RETRIES);
  const force = hasFlag("force");
  const outputPath = path.join(outputDir, report.fileName);
  const partialPath = `${outputPath}.partial`;

  if (!force) {
    const current = await fs.stat(outputPath).catch(() => null);
    if (current?.isFile() && current.size >= 1000) {
      console.log(`  Ja existe (${Math.round(current.size / 1024)} KB); pulando.`);
      return { path: outputPath, skipped: true, size: current.size };
    }
  }

  const params = new URLSearchParams({ modality: report.modality });
  if (report.team) {
    params.set("team", report.team);
  }

  const url = `${baseUrl}/api/export-pdf?${params.toString()}`;
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      console.log(`  Ainda processando ${report.fileName} (${elapsed}s)...`);
    }, 10000);

    try {
      if (attempt > 1) console.log(`  Nova tentativa ${attempt}/${retries}...`);
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`falha ${response.status} ${text}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1000 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        throw new Error("PDF retornou vazio, incompleto ou com assinatura invalida.");
      }

      await fs.writeFile(partialPath, buffer);
      await fs.rm(outputPath, { force: true });
      await fs.rename(partialPath, outputPath);
      console.log(`  Concluido em ${Math.round((Date.now() - startedAt) / 1000)}s (${Math.round(buffer.length / 1024)} KB).`);
      return { path: outputPath, skipped: false, size: buffer.length };
    } catch (error) {
      await fs.rm(partialPath, { force: true }).catch(() => {});
      lastError = error?.name === "AbortError"
        ? new Error(`tempo limite de ${Math.round(timeoutMs / 1000)}s excedido`)
        : error;
      console.error(`  Tentativa ${attempt}/${retries} falhou: ${lastError.message}`);
      if (attempt < retries) await wait(2000);
    } finally {
      clearTimeout(timeout);
      clearInterval(heartbeat);
    }
  }

  throw new Error(`${report.fileName}: ${lastError?.message || "falha desconhecida"}`);
}

async function main() {
  const port = Number(getArgValue("port")) || DEFAULT_PORT;
  const dryRun = hasFlag("dry-run");
  const baseUrl = `http://${HOST}:${port}`;
  const server = startServer(port);

  try {
    const payload = await waitForApi(baseUrl);
    const outputDir = path.join(REPORTS_ROOT, formatReportFolderName());
    const reports = buildReportList(payload.categories || []);

    console.log(`Kit: ${outputDir}`);
    reports.forEach((report) => {
      console.log(`- ${report.fileName}${report.team ? ` (${report.team})` : ""}`);
    });

    if (dryRun) {
      return;
    }

    await fs.mkdir(outputDir, { recursive: true });
    for (const [index, report] of reports.entries()) {
      console.log(`Gerando ${index + 1}/${reports.length}: ${report.fileName}`);
      await downloadReport(baseUrl, report, outputDir);
    }

    console.log(`Kit concluido com ${reports.length} PDFs em ${outputDir}`);

    if (hasFlag("upload-drive")) {
      const { uploadReportDirectory } = require("./google-drive");
      console.log("Enviando o kit para o Google Drive...");
      const driveResult = await uploadReportDirectory(outputDir, {
        parentFolderId: getArgValue("drive-parent-id") || "",
      });
      console.log(`Drive concluido: ${driveResult.folder.webViewLink || driveResult.folder.id}`);
    }
  } finally {
    if (!server.killed) {
      server.kill();
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildReportList,
  downloadReport,
  formatReportFolderName,
  normalizeKey,
  resolveTeam,
};
