const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(ROOT, "output", "reports");
const DEFAULT_PORT = 3147;
const HOST = "127.0.0.1";

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

const FIXED_REPORTS = [
  { modality: "basquete", team: "BASQUETE SUB14", fileName: "Relatório BASQUETE SUB14.pdf" },
  { modality: "basquete", team: "BASQUETE SUB 15", fileName: "Relatório BASQUETE SUB 15.pdf" },
  { modality: "basquete", team: "BASQUETE SUB16", fileName: "Relatório BASQUETE SUB16.pdf" },
  { modality: "basquete", team: "BASQUETE SUB17", fileName: "Relatório BASQUETE SUB17.pdf" },
  { modality: "natacao", team: "", fileName: "Relatório Natação.pdf" },
  { modality: "futsal", team: "", fileName: "Relatório Futsal.pdf" },
];

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

function formatReportFolderName(updatedAtIso) {
  const dateArg = getArgValue("date");
  const date = dateArg ? new Date(`${dateArg}T12:00:00`) : updatedAtIso ? new Date(updatedAtIso) : new Date();
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
  const reports = FIXED_REPORTS.map((report) => ({
    ...report,
    team: report.team ? resolveTeam(categories, report.team) : "",
  }));

  categories
    .filter((teamName) => ["volei-feminino", "volei-masculino"].includes(inferModalityId(teamName)))
    .sort((left, right) => left.localeCompare(right, "pt-BR"))
    .forEach((teamName) => {
      reports.push({
        modality: inferModalityId(teamName),
        team: teamName,
        fileName: `Relatório ${fileSafeTeamName(teamName)}.pdf`,
      });
    });

  return reports;
}

async function downloadReport(baseUrl, report, outputDir) {
  const params = new URLSearchParams({ modality: report.modality });
  if (report.team) {
    params.set("team", report.team);
  }

  const url = `${baseUrl}/api/export-pdf?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`${report.fileName}: falha ${response.status} ${text}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 1000) {
    throw new Error(`${report.fileName}: PDF retornou vazio ou incompleto.`);
  }

  await fs.writeFile(path.join(outputDir, report.fileName), buffer);
}

async function main() {
  const port = Number(getArgValue("port")) || DEFAULT_PORT;
  const dryRun = hasFlag("dry-run");
  const baseUrl = `http://${HOST}:${port}`;
  const server = startServer(port);

  try {
    const payload = await waitForApi(baseUrl);
    const outputDir = path.join(REPORTS_ROOT, formatReportFolderName(payload.updatedAt));
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
  } finally {
    if (!server.killed) {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
