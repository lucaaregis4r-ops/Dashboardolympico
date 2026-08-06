const http = require("http");
const https = require("https");
const fsSync = require("fs");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { randomUUID } = require("crypto");
const { URL, pathToFileURL } = require("url");
const paths = require("./config/paths");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = paths.projectRoot;
const CLIENT_DIR = paths.clientDir;
const ASSETS_DIR = paths.assetsDir;
const DOCS_DIR = paths.docsDir;
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY/export?format=csv&gid=1847097737";
const PHYSIO_DEMANDS_SHEET_ID = "1RzfD3RM0PEBXCPZdthVeIWu7G0mYIENlsP1_ToV6Xzs";
const PSYCHOLOGY_DEMANDS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ZUFyKxUvvxZ41sVGIwr3ophT39SSKjrXDdlnq_S2vI0/export?format=csv&gid=1746478381";
const ACTIVE_ATHLETE_WINDOW_DAYS = 30;
const REPORT_KIT_ITEMS = [
  { modalityId: "basquete", teamName: "BASQUETE SUB14", fileName: "Relatório BASQUETE SUB14.pdf" },
  { modalityId: "basquete", teamName: "BASQUETE SUB 15", fileName: "Relatório BASQUETE SUB 15.pdf" },
  { modalityId: "basquete", teamName: "BASQUETE SUB16", fileName: "Relatório BASQUETE SUB16.pdf" },
  { modalityId: "basquete", teamName: "BASQUETE SUB17", fileName: "Relatório BASQUETE SUB17.pdf" },
  { modalityId: "natacao", teamName: "", fileName: "Relatório Natação.pdf" },
  { modalityId: "futsal", teamName: "", fileName: "Relatório Futsal.pdf" },
];
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

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const MODALITY_DEFS = [
  { id: "basquete", label: "Basquete", matchers: ["BASQUETE"], physioGid: "0", physioSheets: ["BASQUETE", "Basquete"] },
  { id: "volei-feminino", label: "Vôlei feminino", matchers: ["VOLEI FEM"], physioGid: "1581953087", physioSheets: ["VOLEIBOL FEM", "Vôlei feminino", "Volei Feminino"] },
  { id: "volei-masculino", label: "Vôlei masculino", matchers: ["VOLEI MASC"], physioGid: "956162552", physioSheets: ["VOLEIBOL MASC", "Vôlei masculino", "Volei Masculino"] },
  { id: "natacao", label: "Natação", matchers: ["NATACAO"], physioGid: "613790653", physioSheets: ["NATAÇÃO", "Natação", "Natacao"] },
  { id: "futsal", label: "Futsal", matchers: ["FUTSAL"], physioGid: "1577881056", physioSheets: ["FUTSAL", "Futsal"] },
];

const BROWSER_CANDIDATES = [
  process.env.EDGE_PATH,
  process.env.CHROME_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

function getLocalNetworkUrls(port) {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}`);
}

function openUrlInDefaultBrowser(url) {
  const command =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];

  execFile(command[0], command[1], { windowsHide: true }, () => {});
}

function shouldOpenBrowser() {
  if (process.env.OLYMPICO_NO_OPEN === "1") {
    return false;
  }
  return process.argv.includes("--open") || process.env.OPEN_BROWSER === "1" || Boolean(process.pkg);
}


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
    .toUpperCase();
}

function normalizeLooseKey(value) {
  return normalizeKey(value).replace(/[^A-Z0-9]+/g, "");
}

function normalizeTeamName(value) {
  const text = normalizeText(value);
  const key = normalizeLooseKey(text);

  if (key === "NATACAOJUVENIL" || key === "NATACAOJUV") {
    return "NATAÇÃO JUV";
  }

  return text;
}

function normalizeTeamLookupKey(value) {
  const key = normalizeLooseKey(value);

  if (key === "NATACAOJUVENIL" || key === "NATACAOJUV") {
    return "NATACAOJUV";
  }

  return key;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getCrestDataUrl() {
  const crestFile = path.join(ASSETS_DIR, "olympico-crest.png");
  if (!fsSync.existsSync(crestFile)) {
    return "";
  }

  const buffer = await fs.readFile(crestFile);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function parseBrazilianDateTime(rawValue) {
  const value = normalizeText(rawValue);
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw, hourRaw = "0", minuteRaw = "0", secondRaw = "0"] =
    match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBrazilianDate(rawValue) {
  const value = normalizeText(rawValue);
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) {
    return null;
  }

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractNumericScore(value, maxValue) {
  const match = normalizeText(value).match(/\d+/);
  if (!match) {
    return null;
  }

  const score = Number(match[0]);
  if (!Number.isFinite(score) || score < 0 || score > maxValue) {
    return null;
  }

  return score;
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return null;
  }

  return filtered.reduce((total, value) => total + value, 0) / filtered.length;
}

function roundNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pickFirstFilled(values) {
  for (const value of values) {
    const cleaned = normalizeText(value);
    if (cleaned) {
      return cleaned;
    }
  }

  return "";
}

function buildStatus(entry) {
  const painLevel = entry.painLevel ?? 0;
  const concernScores = [
    entry.fatigueScore,
    Number.isFinite(entry.sleepScore) ? 6 - entry.sleepScore : null,
    entry.muscleScore,
    entry.stressScore,
    Number.isFinite(entry.moodScore) ? 6 - entry.moodScore : null,
  ];
  const wellbeingAverage = average(concernScores);
  const highStrain = concernScores.some((score) => score >= 5);
  const mediumStrain = concernScores.some((score) => score >= 4);

  if (painLevel >= 6 || highStrain || entry.muscleScore >= 4) {
    return {
      id: "critical",
      label: "Atenção",
      tone: "critical",
      summary: "Dor alta ou sinais relevantes no ultimo check-in.",
      wellbeingAverage,
    };
  }

  if (painLevel >= 3 || mediumStrain || (wellbeingAverage ?? 0) >= 3.2) {
    return {
      id: "warning",
      label: "Observação",
      tone: "warning",
      summary: "Vale acompanhar a recuperacao e o bem-estar.",
      wellbeingAverage,
    };
  }

  return {
    id: "stable",
    label: "Ok",
    tone: "stable",
    summary: "Ultimo registro sem sinais aparentes de alerta.",
    wellbeingAverage,
  };
}

function computeLoadScore(entry) {
  const values = [
    Number.isFinite(entry.painLevel) ? entry.painLevel / 2 : null,
    entry.fatigueScore,
    Number.isFinite(entry.sleepScore) ? 6 - entry.sleepScore : null,
    entry.muscleScore,
    entry.stressScore,
    Number.isFinite(entry.moodScore) ? 6 - entry.moodScore : null,
  ];

  return roundNumber(average(values));
}

function computeRecoveryScore(entry) {
  const values = [
    Number.isFinite(entry.fatigueScore) ? 6 - entry.fatigueScore : null,
    Number.isFinite(entry.stressScore) ? 6 - entry.stressScore : null,
    Number.isFinite(entry.muscleScore) ? 6 - entry.muscleScore : null,
    Number.isFinite(entry.sleepScore) ? 6 - entry.sleepScore : null,
    Number.isFinite(entry.moodScore) ? entry.moodScore : null,
    Number.isFinite(entry.painLevel) ? 6 - Math.min(5, entry.painLevel / 2) : null,
  ];

  return roundNumber(average(values));
}

function formatDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatShortDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatRatio(value, max = 5) {
  if (!Number.isFinite(value)) {
    return "Sem base";
  }

  return `${roundNumber(value, 1)}/${max}`;
}

function percentile(values, target) {
  const validValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!validValues.length || !Number.isFinite(target)) {
    return null;
  }

  const lessThan = validValues.filter((value) => value < target).length;
  const equalTo = validValues.filter((value) => value === target).length;
  return roundNumber(((lessThan + equalTo * 0.5) / validValues.length) * 100, 0);
}

function quantile(values, ratio) {
  const validValues = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!validValues.length) {
    return null;
  }

  if (validValues.length === 1) {
    return validValues[0];
  }

  const index = (validValues.length - 1) * ratio;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  if (lowerIndex === upperIndex) {
    return validValues[lowerIndex];
  }

  return validValues[lowerIndex] * (1 - weight) + validValues[upperIndex] * weight;
}

function transformRows(rows) {
  if (!rows.length) {
    return {
      updatedAt: null,
      totalRows: 0,
      athletes: [],
      categories: [],
      summary: {
        totalAthletes: 0,
        inactiveAthletes: 0,
        critical: 0,
        warning: 0,
        stable: 0,
      },
      inactiveAthletes: 0,
      activeAthleteWindowDays: ACTIVE_ATHLETE_WINDOW_DAYS,
    };
  }

  const header = rows[0].map((value) => normalizeText(value));
  const painAreaIndex = header.findIndex((value) => value.includes("DOR MUSCULAR"));
  const painLevelIndex = header.findIndex((value) => value.includes("De 0 a 10"));
  const fatigueIndex = header.findIndex((value) => value.includes("[FADIGA]"));
  const sleepIndex = header.findIndex((value) => value.includes("[SONO]"));
  const muscleIndex = header.findIndex((value) => value.includes("[DOR MUSCULAR]"));
  const stressIndex = header.findIndex((value) => value.includes("[ESTRESSE]"));
  const moodIndex = header.findIndex((value) => value.includes("[HUMOR]"));

  const nameStartIndex = 3;
  const nameEndIndex = painAreaIndex > nameStartIndex ? painAreaIndex - 1 : 18;
  const groups = new Map();
  let updatedAt = null;

  for (const rawRow of rows.slice(1)) {
    if (!rawRow.some((cell) => normalizeText(cell))) {
      continue;
    }

    const row = header.map((_, index) => rawRow[index] || "");
    const category = normalizeTeamName(row[1]);
    const athleteName = pickFirstFilled(row.slice(nameStartIndex, nameEndIndex + 1));

    if (!athleteName || !category) {
      continue;
    }

    const timestamp = parseBrazilianDateTime(row[0]);
    if (timestamp && (!updatedAt || timestamp > updatedAt)) {
      updatedAt = timestamp;
    }

    const entry = {
      timestampIso: timestamp ? timestamp.toISOString() : null,
      timestampLabel: row[0] || "",
      timestampDisplay: timestamp ? formatDate(timestamp) : normalizeText(row[0]),
      reportedDate: normalizeText(row[2]),
      category,
      painArea: normalizeText(row[painAreaIndex]),
      painLevel: extractNumericScore(row[painLevelIndex], 10),
      painLevelLabel: normalizeText(row[painLevelIndex]),
      fatigueLabel: normalizeText(row[fatigueIndex]),
      fatigueScore: extractNumericScore(row[fatigueIndex], 5),
      sleepLabel: normalizeText(row[sleepIndex]),
      sleepScore: extractNumericScore(row[sleepIndex], 5),
      muscleLabel: normalizeText(row[muscleIndex]),
      muscleScore: extractNumericScore(row[muscleIndex], 5),
      stressLabel: normalizeText(row[stressIndex]),
      stressScore: extractNumericScore(row[stressIndex], 5),
      moodLabel: normalizeText(row[moodIndex]),
      moodScore: extractNumericScore(row[moodIndex], 5),
    };
    entry.loadScore = computeLoadScore(entry);

    const key = `${normalizeKey(athleteName)}|${normalizeKey(category)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        name: athleteName,
        category,
        entries: [],
      });
    }

    groups.get(key).entries.push(entry);
  }

  const activeThreshold = updatedAt
    ? updatedAt.getTime() - ACTIVE_ATHLETE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : null;

  const allAthletes = Array.from(groups.values())
    .map((group) => {
      group.entries.sort((left, right) => {
        const leftTime = left.timestampIso ? Date.parse(left.timestampIso) : 0;
        const rightTime = right.timestampIso ? Date.parse(right.timestampIso) : 0;
        return rightTime - leftTime;
      });

      const latest = group.entries[0];
      const status = buildStatus(latest);
      const latestTimestamp = latest.timestampIso ? Date.parse(latest.timestampIso) : null;
      const isActive =
        !Number.isFinite(activeThreshold) ||
        (Number.isFinite(latestTimestamp) && latestTimestamp >= activeThreshold);

      return {
        id: group.key,
        name: group.name,
        category: group.category,
        isActive,
        totalEntries: group.entries.length,
        lastCheckIn: latest.timestampDisplay,
        reportedDate: latest.reportedDate,
        status,
        latest,
        trendAverage: roundNumber(average(group.entries.map((entry) => entry.loadScore))),
        entries: group.entries,
        recentHistory: group.entries.slice(0, 5),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));

  const athletes = allAthletes.filter((athlete) => athlete.isActive);
  const inactiveAthletes = allAthletes.length - athletes.length;

  const categories = Array.from(
    new Set(athletes.map((athlete) => athlete.category).filter(Boolean))
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));

  const summary = athletes.reduce(
    (accumulator, athlete) => {
      accumulator.totalAthletes += 1;
      accumulator[athlete.status.id] += 1;
      return accumulator;
    },
    {
      totalAthletes: 0,
      inactiveAthletes,
      critical: 0,
      warning: 0,
      stable: 0,
    }
  );

  return {
    updatedAt: updatedAt ? updatedAt.toISOString() : null,
    updatedAtLabel: updatedAt ? formatDate(updatedAt) : "",
    totalRows: rows.length - 1,
    athletes,
    categories,
    summary,
    inactiveAthletes,
    activeAthleteWindowDays: ACTIVE_ATHLETE_WINDOW_DAYS,
  };
}

async function fetchAthletesData() {
  const csv = await downloadText(SHEET_CSV_URL);
  return transformRows(parseCsv(csv));
}

function normalizeHeaderKey(value) {
  return normalizeKey(value).replace(/[^A-Z0-9]+/g, "");
}

function getCellByHeader(row, headerMap, candidates) {
  const keys = candidates.map((candidate) => normalizeHeaderKey(candidate));
  const index = keys
    .map((key) => headerMap.get(key))
    .find((candidateIndex) => Number.isInteger(candidateIndex));
  return Number.isInteger(index) ? normalizeText(row[index]) : "";
}

function transformClinicalDemandRows(rows) {
  if (!rows.length) {
    return [];
  }

  const headerMap = new Map();
  rows[0].forEach((headerCell, index) => {
    headerMap.set(normalizeHeaderKey(headerCell), index);
  });

  return rows
    .slice(1)
    .map((rawRow) => {
      const row = rows[0].map((_, index) => rawRow[index] || "");
      return {
        athleteName: getCellByHeader(row, headerMap, ["Nome do atleta", "Atleta", "Nome"]),
        teamName: getCellByHeader(row, headerMap, ["Equipe", "Categoria"]),
        demand: getCellByHeader(row, headerMap, ["Demanda", "Lesao", "Lesão"]),
        semaphore: getCellByHeader(row, headerMap, ["Semaforo", "Semáforo", "Status"]),
        phase: getCellByHeader(row, headerMap, ["Fase"]),
        notes: getCellByHeader(row, headerMap, ["Obs", "Observacoes", "Observações"]),
      };
    })
    .filter((item) => item.athleteName && item.teamName);
}

function buildGoogleSheetCsvUrl(sheetId, sheetName) {
  const params = new URLSearchParams({
    tqx: "out:csv",
    headers: "0",
    sheet: sheetName,
  });
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?${params.toString()}`;
}

function buildGoogleSheetCsvUrlByGid(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

function isSectionTitle(value, title) {
  return normalizeKey(value).includes(normalizeKey(title));
}

function isPhysioExcludedSectionTitle(value) {
  const key = normalizeKey(value);
  return key.includes("HISTORICO") || key.includes("ALTA");
}

function rowIncludesSectionTitle(row, title) {
  return row.some((cell) => isSectionTitle(cell, title));
}

function rowIncludesExcludedPhysioSectionTitle(row) {
  const filledCells = row.filter(Boolean);
  return filledCells.length <= 2 && filledCells.some((cell) => isPhysioExcludedSectionTitle(cell));
}

function isPhysioDischargeValue(value) {
  const key = normalizeHeaderKey(value);
  return key === "TRUE" || key === "SIM" || key.includes("ALTA") || key === "LIBERADO";
}

function isPhysioDischargeRow(row, headerMap) {
  const values = [
    getCellByHeader(row, headerMap, ["Alta"]),
    getCellByHeader(row, headerMap, ["Status", "Situacao", "SituaÃ§Ã£o"]),
    getCellByHeader(row, headerMap, ["Tipo movimentacao", "Tipo movimentaÃ§Ã£o"]),
    getCellByHeader(row, headerMap, ["Tipo atendimento", "Tipo"]),
    getCellByHeader(row, headerMap, ["Fase do tratamento", "Fase"]),
  ];

  return values.some(isPhysioDischargeValue);
}

function pickByIndexes(row, indexes) {
  return indexes.map((index) => normalizeText(row[index] || ""));
}

function composePhysioNotes(section, values) {
  const notes = [];
  if (section) {
    notes.push(section);
  }
  if (values.phase) {
    notes.push(`Fase ${values.phase}`);
  }
  if (values.trainingVeto) {
    notes.push(`Veto treino: ${values.trainingVeto}`);
  }
  if (values.pfVeto) {
    notes.push(`Veto PF: ${values.pfVeto}`);
  }
  if (values.conduct) {
    notes.push(`Conduta: ${values.conduct}`);
  }
  if (values.painScale) {
    notes.push(`Dor ${values.painScale}/10`);
  }
  return notes.join(" | ");
}

function inferPhysioImmediateSemaphore(painScale) {
  const value = Number(String(painScale || "").replace(",", "."));
  if (!Number.isFinite(value)) {
    return "";
  }
  if (value >= 7) {
    return "VERMELHO";
  }
  if (value >= 4) {
    return "AMARELO";
  }
  return "VERDE";
}

function transformPhysioModalityRows(rows, modalityId) {
  const items = [];
  let section = "";
  let headerMap = null;
  let shouldIgnoreSection = false;

  rows.forEach((rawRow) => {
    const row = rawRow.map(normalizeText);
    const firstCell = row[0] || "";

    if (!row.some(Boolean)) {
      return;
    }

    if (rowIncludesExcludedPhysioSectionTitle(row)) {
      section = "";
      headerMap = null;
      shouldIgnoreSection = true;
      return;
    }

    if (rowIncludesSectionTitle(row, "ATLETAS EM TRATAMENTO")) {
      section = "Em tratamento";
      headerMap = null;
      shouldIgnoreSection = false;
      return;
    }

    if (rowIncludesSectionTitle(row, "ATENDIMENTOS IMEDIATOS")) {
      section = "Atendimento imediato";
      headerMap = null;
      shouldIgnoreSection = false;
      return;
    }

    if (normalizeHeaderKey(firstCell) === "NOME") {
      if (shouldIgnoreSection) {
        return;
      }
      headerMap = new Map();
      row.forEach((headerCell, index) => {
        const key = normalizeHeaderKey(headerCell);
        if (key && !headerMap.has(key)) {
          headerMap.set(key, index);
        }
      });
      return;
    }

    if (!headerMap) {
      return;
    }

    if (shouldIgnoreSection) {
      return;
    }

    const [athleteName, teamName, injury] = pickByIndexes(row, [0, 1, 2]);
    if (!athleteName || !teamName || normalizeHeaderKey(athleteName) === "NOME") {
      return;
    }

    const severity = getCellByHeader(row, headerMap, ["Gravidade", "Semaforo", "Semáforo", "Status"]);
    const painScale =
      getCellByHeader(row, headerMap, ["Escala de dor", "Dor"]) ||
      (section === "Atendimento imediato" ? normalizeText(row[3] || "") : "");
    const conduct = getCellByHeader(row, headerMap, ["Conduta"]);
    const phase = getCellByHeader(row, headerMap, ["Fase do tratamento", "Fase"]);
    const trainingVeto = getCellByHeader(row, headerMap, ["Veto treino"]);
    const pfVeto = getCellByHeader(row, headerMap, ["Veto PF"]);
    const observations = getCellByHeader(row, headerMap, [
      "Observacoes",
      "Observações",
      "Observacao",
      "Observação",
      "Obs",
      "Notes",
    ]);

    items.push({
      athleteName,
      teamName,
      modalityId,
      demand: injury || conduct || "Registro de fisioterapia",
      semaphore: severity || inferPhysioImmediateSemaphore(painScale),
      phase,
      notes: composePhysioNotes(section, { phase, trainingVeto, pfVeto, conduct, painScale }),
      observations,
    });
  });

  return items;
}

async function fetchPhysioDemandsData(modalityId = "") {
  const modality = getModalityById(modalityId);
  if (!modality) {
    return [];
  }

  if (modality.physioGid) {
    try {
      const csv = await downloadText(buildGoogleSheetCsvUrlByGid(PHYSIO_DEMANDS_SHEET_ID, modality.physioGid));
      return transformPhysioModalityRows(parseCsv(csv), modality.id);
    } catch (error) {
      console.warn(`Nao foi possivel carregar o gid ${modality.physioGid} da fisioterapia:`, error.message);
    }
  }

  for (const sheetName of modality.physioSheets || [modality.label]) {
    try {
      const csv = await downloadText(buildGoogleSheetCsvUrl(PHYSIO_DEMANDS_SHEET_ID, sheetName));
      const rows = parseCsv(csv);
      const items = transformPhysioModalityRows(rows, modality.id);
      if (items.length || sheetName === modality.label) {
        return items;
      }
    } catch (error) {
      console.warn(`Nao foi possivel carregar a aba ${sheetName} da fisioterapia:`, error.message);
    }
  }

  return [];
}

async function fetchPhysioDemandsDataLegacy() {
  try {
    const csv = await downloadText(buildGoogleSheetCsvUrl(PHYSIO_DEMANDS_SHEET_ID, "Basquete"));
    return transformClinicalDemandRows(parseCsv(csv));
  } catch (error) {
    console.warn("Nao foi possivel carregar a planilha de demandas da fisioterapia:", error.message);
    return [];
  }
}

async function fetchPsychologyDemandsData() {
  try {
    const csv = await downloadText(PSYCHOLOGY_DEMANDS_CSV_URL);
    return transformClinicalDemandRows(parseCsv(csv));
  } catch (error) {
    console.warn("Nao foi possivel carregar a planilha de demandas da psicologia:", error.message);
    return [];
  }
}

function downloadText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Muitas redirecoes ao tentar baixar a planilha."));
      return;
    }

    const request = https
      .get(
        url,
        {
          headers: {
            "User-Agent": "Dashboard Olympico",
          },
        },
        (response) => {
          const { statusCode = 0, headers } = response;

          if (statusCode >= 300 && statusCode < 400 && headers.location) {
            response.resume();
            resolve(downloadText(headers.location, redirectCount + 1));
            return;
          }

          if (statusCode !== 200) {
            response.resume();
            reject(new Error(`Falha ao ler a planilha publica (${statusCode})`));
            return;
          }

          const chunks = [];
          response.on("data", (chunk) => {
            chunks.push(chunk);
          });
          response.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf8"));
          });
        }
      )
      .on("error", (error) => {
        reject(error);
      });

    request.setTimeout(30000, () => {
      request.destroy(new Error("Tempo limite ao baixar a planilha."));
    });
  });
}

function enrichAthletes(athletes) {
  return athletes.map((athlete) => {
    const entries = athlete.entries.map((entry) => ({
      ...entry,
      recoveryScore: computeRecoveryScore(entry),
    }));
    const latest = {
      ...athlete.latest,
      recoveryScore: computeRecoveryScore(athlete.latest),
    };

    return {
      ...athlete,
      entries,
      latest,
      modalityId: inferModalityId(athlete.category),
    };
  });
}

function getMetricByKey(metricKey) {
  const metrics = {
    loadScore: { label: "Carga", max: 5 },
    recoveryScore: { label: "Recuperação", max: 5 },
    painLevel: { label: "Dor", max: 10 },
    fatigueScore: { label: "Fadiga", max: 5 },
    sleepScore: { label: "Insônia", max: 5 },
    stressScore: { label: "Estresse", max: 5 },
  };

  return metrics[metricKey] || { label: metricKey, max: 5 };
}

function inferModalityId(category) {
  const token = normalizeKey(category);
  const modality = MODALITY_DEFS.find((item) =>
    item.matchers.some((matcher) => token.includes(normalizeKey(matcher)))
  );

  return modality?.id || "outras";
}

function getModalityById(modalityId) {
  return MODALITY_DEFS.find((item) => item.id === modalityId) || null;
}

function getReportFolderName(updatedAtIso) {
  const date = updatedAtIso ? new Date(updatedAtIso) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `Relatórios ${safeDate.getDate()} de ${MONTHS_PT[safeDate.getMonth()]}`;
}

function getReportZipFileName(updatedAtIso) {
  const date = updatedAtIso ? new Date(updatedAtIso) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `relatorios-${safeDate.getDate()}-de-${MONTHS_PT[safeDate.getMonth()]}.zip`;
}

function sanitizeZipPath(value) {
  return normalizeText(value).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.\.(\/|$)/g, "");
}

function getCrc32Buffer(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBuffer = Buffer.from(sanitizeZipPath(file.name), "utf8");
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content || "");
    const crc32 = getCrc32Buffer(content);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc32, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + content.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function resolveReportTeam(categories, requestedTeam) {
  const requestedKey = normalizeTeamLookupKey(requestedTeam);
  return categories.find((teamName) => normalizeTeamLookupKey(teamName) === requestedKey) || requestedTeam;
}

function getReportFileSafeTeamName(teamName) {
  return normalizeText(teamName).replace(/[<>:"/\\|?*]+/g, "-");
}

function buildWeeklyReportKitItems(categories) {
  const items = REPORT_KIT_ITEMS.map((item) => ({
    ...item,
    teamName: item.teamName ? resolveReportTeam(categories, item.teamName) : "",
  }));

  categories
    .filter((teamName) => ["volei-feminino", "volei-masculino"].includes(inferModalityId(teamName)))
    .sort((left, right) => left.localeCompare(right, "pt-BR"))
    .forEach((teamName) => {
      items.push({
        modalityId: inferModalityId(teamName),
        teamName,
        fileName: `Relatório ${getReportFileSafeTeamName(teamName)}.pdf`,
      });
    });

  return items;
}

function filterEntriesByDays(entries, updatedAtIso, days) {
  if (!Number.isFinite(days)) {
    return entries;
  }

  const latestTimestamp = updatedAtIso ? Date.parse(updatedAtIso) : Date.now();
  const threshold = latestTimestamp - days * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const timestamp = entry.timestampIso ? Date.parse(entry.timestampIso) : null;
    return Number.isFinite(timestamp) && timestamp >= threshold;
  });
}

function getAthletesByTeam(athletes, teamName) {
  return athletes.filter((athlete) => athlete.category === teamName);
}

function aggregateEntries(entries, metricKey) {
  return average(entries.map((entry) => entry?.[metricKey]));
}

function aggregateAthlete(athlete, metricKey, updatedAtIso, days) {
  return aggregateEntries(filterEntriesByDays(athlete.entries, updatedAtIso, days), metricKey);
}

function getTeamDistribution(athletes, teamName, metricKey, updatedAtIso, days) {
  return getAthletesByTeam(athletes, teamName)
    .map((athlete) => aggregateAthlete(athlete, metricKey, updatedAtIso, days))
    .filter((value) => Number.isFinite(value));
}

function getTeamAggregate(athletes, teamName, metricKey, updatedAtIso, days) {
  return average(getTeamDistribution(athletes, teamName, metricKey, updatedAtIso, days));
}

function getAllTeamsAggregate(athletes, categories, metricKey, updatedAtIso, days) {
  return categories
    .map((category) => getTeamAggregate(athletes, category, metricKey, updatedAtIso, days))
    .filter((value) => Number.isFinite(value));
}

function buildRollingWindowValues(entries, metricKey, windowSize = 3) {
  if (!Array.isArray(entries) || entries.length < windowSize) {
    return [];
  }

  const chronological = entries.slice().reverse();
  const values = [];

  for (let index = 0; index <= chronological.length - windowSize; index += 1) {
    const windowValues = chronological
      .slice(index, index + windowSize)
      .map((entry) => entry?.[metricKey]);

    if (windowValues.every((value) => Number.isFinite(value))) {
      values.push(roundNumber(average(windowValues), 2));
    }
  }

  return values;
}

function getCurrentMovingAverage(entries, metricKey, windowSize = 3) {
  if (!Array.isArray(entries) || entries.length < windowSize) {
    return null;
  }

  const values = entries.slice(0, windowSize).map((entry) => entry?.[metricKey]);
  if (!values.every((value) => Number.isFinite(value))) {
    return null;
  }

  return roundNumber(average(values), 2);
}

function classifyPercentileBand(percentileValue) {
  if (!Number.isFinite(percentileValue)) {
    return "Sem base";
  }
  if (percentileValue >= 85) {
    return "Muito alta";
  }
  if (percentileValue >= 65) {
    return "Alta";
  }
  if (percentileValue >= 35) {
    return "Habitual";
  }
  if (percentileValue >= 15) {
    return "Baixa";
  }
  return "Muito baixa";
}

function getBaselineTone(percentileValue) {
  if (!Number.isFinite(percentileValue)) {
    return "neutral";
  }
  if (percentileValue >= 85) {
    return "strong";
  }
  if (percentileValue >= 65) {
    return "alert";
  }
  return "neutral";
}

function buildTeamLoadBaseline(athletes, categories, teamName) {
  const teamAthletes = getAthletesByTeam(athletes, teamName);
  const currentMovingAverages = teamAthletes
    .map((athlete) => getCurrentMovingAverage(athlete.entries, "loadScore", 3))
    .filter((value) => Number.isFinite(value));
  const currentTeamAverage = roundNumber(average(currentMovingAverages), 2);

  const teamTimeline = new Map();
  teamAthletes.forEach((athlete) => {
    athlete.entries
      .slice()
      .reverse()
      .forEach((entry) => {
        const key = entry.reportedDate || entry.timestampDisplay || entry.timestampIso;
        const sortValue = entry.timestampIso ? Date.parse(entry.timestampIso) : 0;
        if (!teamTimeline.has(key)) {
          teamTimeline.set(key, { sortValue, values: [] });
        }
        if (Number.isFinite(entry.loadScore)) {
          teamTimeline.get(key).values.push(entry.loadScore);
        }
      });
  });

  const teamAggregatedSeries = Array.from(teamTimeline.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((item) => roundNumber(average(item.values), 2))
    .filter((value) => Number.isFinite(value));

  const teamBaselineSeries = buildRollingWindowValues(
    teamAggregatedSeries.map((value) => ({ loadScore: value })),
    "loadScore",
    3
  );

  const clubCurrentTeamAverages = categories
    .map((category) => {
      const values = getAthletesByTeam(athletes, category)
        .map((athlete) => getCurrentMovingAverage(athlete.entries, "loadScore", 3))
        .filter((value) => Number.isFinite(value));
      return roundNumber(average(values), 2);
    })
    .filter((value) => Number.isFinite(value));

  const teamHistoryPercentile = percentile(teamBaselineSeries, currentTeamAverage);
  const clubPercentile = percentile(clubCurrentTeamAverages, currentTeamAverage);

  return {
    currentTeamAverage,
    teamHistoryPercentile,
    teamHistoryBand: classifyPercentileBand(teamHistoryPercentile),
    clubPercentile,
    clubBand: classifyPercentileBand(clubPercentile),
    baselineCount: teamBaselineSeries.length,
  };
}

function getEntryDateInfo(entry) {
  const fallbackDate = entry.timestampIso ? new Date(entry.timestampIso) : null;
  const reportedDate = parseBrazilianDate(entry.reportedDate);
  const date = reportedDate || fallbackDate;
  const key = date ? date.toISOString().slice(0, 10) : entry.reportedDate || entry.timestampLabel;

  return {
    key,
    label: date ? formatShortDate(date) : entry.reportedDate || entry.timestampDisplay || "Sem data",
    sortValue: date ? date.getTime() : 0,
  };
}

function getEntryDate(entry) {
  const reportedDate = parseBrazilianDate(entry.reportedDate);
  if (reportedDate) {
    return reportedDate;
  }

  const fallbackDate = entry.timestampIso ? new Date(entry.timestampIso) : null;
  return fallbackDate instanceof Date && !Number.isNaN(fallbackDate.getTime()) ? fallbackDate : null;
}

function buildTrendSeries(athletes, teamName, updatedAtIso) {
  const grouped = new Map();
  const endDate = updatedAtIso ? new Date(updatedAtIso) : new Date();
  const endTime = endDate instanceof Date && !Number.isNaN(endDate.getTime()) ? endDate.getTime() : Date.now();
  const startTime = endTime - 90 * 24 * 60 * 60 * 1000;

  getAthletesByTeam(athletes, teamName).forEach((athlete) => {
    athlete.entries.forEach((entry) => {
      const entryDate = getEntryDate(entry);
      const entryTime = entryDate ? entryDate.getTime() : null;
      if (!Number.isFinite(entryTime) || entryTime < startTime || entryTime > endTime) {
        return;
      }

      const info = getEntryDateInfo(entry);
      if (!grouped.has(info.key)) {
        grouped.set(info.key, { label: info.label, sortValue: entryTime, entries: [] });
      }
      grouped.get(info.key).entries.push(entry);
    });
  });

  return Array.from(grouped.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((item) => ({
      label: item.label,
      loadScore: aggregateEntries(item.entries, "loadScore"),
      recoveryScore: aggregateEntries(item.entries, "recoveryScore"),
      stressScore: aggregateEntries(item.entries, "stressScore"),
    }));
}

function buildProfileSeries(athletes, categories, teamName, updatedAtIso) {
  const metricKeys = ["loadScore", "recoveryScore", "fatigueScore", "sleepScore", "stressScore"];
  return metricKeys.map((metricKey) => ({
    key: metricKey,
    label: getMetricByKey(metricKey).label,
    team: roundNumber(getTeamAggregate(athletes, teamName, metricKey, updatedAtIso, 90), 1),
    club: roundNumber(average(getAllTeamsAggregate(athletes, categories, metricKey, updatedAtIso, 90)), 1),
    max: getMetricByKey(metricKey).max,
  }));
}

function buildPercentileSeries(athletes, categories, teamName, updatedAtIso) {
  const metricKeys = ["loadScore", "recoveryScore", "painLevel", "stressScore"];
  return metricKeys.map((metricKey) => {
    const teamValue = getTeamAggregate(athletes, teamName, metricKey, updatedAtIso, 30);
    const percentValue = percentile(
      getAllTeamsAggregate(athletes, categories, metricKey, updatedAtIso, 30),
      teamValue
    );

    return {
      key: metricKey,
      label: getMetricByKey(metricKey).label,
      percentile: percentValue,
      value: roundNumber(teamValue, 1),
    };
  });
}

function polylinePoints(values, width, height, maxValue) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return "";
  }

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value / maxValue)) : 0;
      const y = height - ratio * height;
      return `${roundNumber(x, 2)},${roundNumber(y, 2)}`;
    })
    .join(" ");
}

function buildLineChartSvg(series) {
  const width = 760;
  const height = 170;
  const padLeft = 46;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 48;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const lines = [
    { key: "loadScore", color: "#f3374a", label: "Carga" },
    { key: "recoveryScore", color: "#29c989", label: "Recuperação" },
    { key: "stressScore", color: "#7a89ff", label: "Estresse" },
  ];

  const xLabels = series.length
    ? series
        .map((point, index) => {
          const x =
            series.length === 1 ? padLeft + innerWidth / 2 : padLeft + (index / (series.length - 1)) * innerWidth;
          return `<text x="${x}" y="${height - 30}" class="axis-label" text-anchor="middle">${escapeHtml(point.label)}</text>`;
        })
        .filter((_, index) => index === 0 || index === series.length - 1 || index % 2 === 0)
        .join("")
    : "";

  const yGuides = Array.from({ length: 6 }, (_, index) => {
    const value = 5 - index;
    const y = padTop + (index / 5) * innerHeight;
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="grid-line" />
      <text x="${padLeft - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${value}</text>
    `;
  }).join("");

  const polylines = lines
    .map((line) => {
      const points = polylinePoints(
        series.map((point) => point[line.key]),
        innerWidth,
        innerHeight,
        5
      );

      if (!points) {
        return "";
      }

      const translatedPoints = points
        .split(" ")
        .map((pair) => {
          const [x, y] = pair.split(",").map(Number);
          return `${roundNumber(x + padLeft, 2)},${roundNumber(y + padTop, 2)}`;
        })
        .join(" ");

      return `<polyline points="${translatedPoints}" fill="none" stroke="${line.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join("");

  const legend = lines
    .map(
      (line, index) => `
        <g transform="translate(${padLeft + index * 170}, ${height - 14})">
          <rect width="22" height="6" rx="3" fill="${line.color}"></rect>
          <text x="30" y="7" class="legend-label">${line.label}</text>
        </g>
      `
    )
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="report-svg" aria-label="Evolução média">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff"></rect>
      ${yGuides}
      <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${height - padBottom}" class="axis-line" />
      <line x1="${padLeft}" y1="${height - padBottom}" x2="${width - padRight}" y2="${height - padBottom}" class="axis-line" />
      ${polylines}
      ${xLabels}
      ${legend}
    </svg>
  `;
}

function buildProfileBarsSvg(series) {
  const width = 760;
  const barHeight = 18;
  const gap = 28;
  const height = 56 + series.length * gap;
  const labelX = 24;
  const trackX = 180;
  const trackWidth = 520;

  const rows = series
    .map((item, index) => {
      const top = 34 + index * gap;
      const teamWidth = Number.isFinite(item.team) ? (item.team / item.max) * trackWidth : 0;
      const clubWidth = Number.isFinite(item.club) ? (item.club / item.max) * trackWidth : 0;

      return `
        <text x="${labelX}" y="${top + 14}" class="axis-label">${escapeHtml(item.label)}</text>
        <rect x="${trackX}" y="${top}" width="${trackWidth}" height="${barHeight}" rx="9" fill="#edf1fb"></rect>
        <rect x="${trackX}" y="${top}" width="${clubWidth}" height="${barHeight}" rx="9" fill="#8393ff"></rect>
        <rect x="${trackX}" y="${top}" width="${teamWidth}" height="${barHeight}" rx="9" fill="#f3374a"></rect>
        <text x="${trackX + trackWidth + 10}" y="${top + 14}" class="axis-label">${escapeHtml(formatRatio(item.team, item.max))}</text>
      `;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="report-svg" aria-label="Perfil da equipe">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff"></rect>
      <g transform="translate(${trackX}, 18)">
        <rect width="16" height="6" rx="3" fill="#f3374a"></rect>
        <text x="24" y="6" class="legend-label">Equipe</text>
        <rect x="94" width="16" height="6" rx="3" fill="#8393ff"></rect>
        <text x="118" y="6" class="legend-label">Clube</text>
      </g>
      ${rows}
    </svg>
  `;
}

function buildPercentileSvg(series) {
  const width = 760;
  const barHeight = 18;
  const gap = 32;
  const height = 64 + series.length * gap;
  const labelX = 24;
  const trackX = 220;
  const trackWidth = 470;

  const ticks = [0, 25, 50, 75, 100]
    .map((value) => {
      const x = trackX + (value / 100) * trackWidth;
      return `
        <line x1="${x}" y1="20" x2="${x}" y2="${height - 20}" class="grid-line"></line>
        <text x="${x}" y="16" class="axis-label" text-anchor="middle">${value}</text>
      `;
    })
    .join("");

  const rows = series
    .map((item, index) => {
      const top = 36 + index * gap;
      const widthValue = Number.isFinite(item.percentile) ? (item.percentile / 100) * trackWidth : 0;

      return `
        <text x="${labelX}" y="${top + 14}" class="axis-label">${escapeHtml(item.label)}</text>
        <rect x="${trackX}" y="${top}" width="${trackWidth}" height="${barHeight}" rx="9" fill="#edf1fb"></rect>
        <rect x="${trackX}" y="${top}" width="${widthValue}" height="${barHeight}" rx="9" fill="#16255f"></rect>
        <circle cx="${trackX + widthValue}" cy="${top + barHeight / 2}" r="6" fill="#f3374a"></circle>
        <text x="${trackX + trackWidth + 10}" y="${top + 14}" class="axis-label">${Number.isFinite(item.percentile) ? `${item.percentile}%` : "Sem base"}</text>
      `;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="report-svg" aria-label="Percentis da equipe">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff"></rect>
      ${ticks}
      ${rows}
    </svg>
  `;
}

function buildBaselinePanelHtml(teamName, baseline, teamSummary, recoveryMean, stressMean, teamAthletes) {
  const summaryRows = [
    {
      label: "Carga MM3 atual",
      value: formatRatio(baseline.currentTeamAverage),
      note: `${baseline.teamHistoryBand} na própria história`,
      tone: getBaselineTone(baseline.teamHistoryPercentile),
    },
    {
      label: "Percentil histórico",
      value: Number.isFinite(baseline.teamHistoryPercentile) ? `${baseline.teamHistoryPercentile}%` : "Sem base",
      note: `${baseline.baselineCount} janelas móveis de 3 checks`,
      tone: getBaselineTone(baseline.teamHistoryPercentile),
    },
    {
      label: "Faixa central",
      value: `${formatRatio(teamSummary.p25)} a ${formatRatio(teamSummary.p75)}`,
      note: `Mediana ${formatRatio(teamSummary.median)}`,
      tone: "neutral",
    },
    {
      label: "Recuperação média",
      value: formatRatio(recoveryMean),
      note: `${teamAthletes.length} atletas monitorados`,
      tone: Number.isFinite(recoveryMean) && recoveryMean <= 2.5 ? "strong" : Number.isFinite(recoveryMean) && recoveryMean <= 3.2 ? "alert" : "neutral",
    },
    {
      label: "Estresse médio",
      value: formatRatio(stressMean),
      note: "Leitura semanal",
      tone: Number.isFinite(stressMean) && stressMean >= 4 ? "strong" : Number.isFinite(stressMean) && stressMean >= 3.2 ? "alert" : "neutral",
    },
  ];

  return `
    <article class="report-panel report-panel--baseline">
      <div class="report-panel__head report-panel__head--tight">
        <div>
          <p>Baseline da equipe</p>
          <span>MM3 atual na própria história da equipe</span>
        </div>
      </div>
      <div class="report-baseline-grid">
        ${summaryRows
          .map(
            (row) => `
              <div class="report-baseline-card report-baseline-card--${escapeHtml(row.tone)}">
                <span>${escapeHtml(row.label)}</span>
                <strong>${escapeHtml(row.value)}</strong>
                <small>${escapeHtml(row.note)}</small>
              </div>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function buildWeeklyRangeLabel(updatedAtIso) {
  const endDate = updatedAtIso ? new Date(updatedAtIso) : new Date();
  const startDate = new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000);
  return `${formatShortDate(startDate)} a ${formatShortDate(endDate)}`;
}

function buildAthleteLoadBaseline(athlete, teamAthletes) {
  const baselineSeries = buildRollingWindowValues(athlete.entries, "loadScore", 3);
  const currentMovingAverage = getCurrentMovingAverage(athlete.entries, "loadScore", 3);
  const ownPercentile = percentile(baselineSeries, currentMovingAverage);
  const teamCurrentMovingAverages = teamAthletes
    .map((teamAthlete) => getCurrentMovingAverage(teamAthlete.entries, "loadScore", 3))
    .filter((value) => Number.isFinite(value));
  const teamPercentile = percentile(teamCurrentMovingAverages, currentMovingAverage);

  return {
    currentMovingAverage,
    ownPercentile,
    teamPercentile,
    ownBand: classifyPercentileBand(ownPercentile),
    teamBand: classifyPercentileBand(teamPercentile),
  };
}

function buildAttentionItems(teamAthletes) {
  return teamAthletes
    .map((athlete) => {
      const loadBaseline = buildAthleteLoadBaseline(athlete, teamAthletes);
      const recoveryScore = athlete.latest.recoveryScore;
      const stressScore = athlete.latest.stressScore;
      const reasons = [];
      let score = 0;

      if (Number.isFinite(loadBaseline.teamPercentile) && loadBaseline.teamPercentile >= 85) {
        reasons.push("percentil equipe muito alto");
        score += 4;
      } else if (Number.isFinite(loadBaseline.teamPercentile) && loadBaseline.teamPercentile >= 75) {
        reasons.push("percentil equipe alto");
        score += 3;
      }

      if (Number.isFinite(loadBaseline.currentMovingAverage) && loadBaseline.currentMovingAverage >= 4) {
        reasons.push("MM3 elevado");
        score += 2;
      }

      if (Number.isFinite(recoveryScore) && recoveryScore <= 2.2) {
        reasons.push("recuperação muito baixa");
        score += 4;
      } else if (Number.isFinite(recoveryScore) && recoveryScore <= 2.8) {
        reasons.push("recuperação baixa");
        score += 2;
      }

      if (Number.isFinite(stressScore) && stressScore >= 4.3) {
        reasons.push("estresse muito alto");
        score += 3;
      } else if (Number.isFinite(stressScore) && stressScore >= 3.8) {
        reasons.push("estresse alto");
        score += 2;
      }

      if (!reasons.length) {
        return null;
      }

      const level = score >= 7 ? "Prioridade alta" : score >= 4 ? "Prioridade média" : "Monitorar";
      const tone = score >= 7 ? "high" : score >= 4 ? "medium" : "watch";

      return {
        athlete,
        loadBaseline,
        recoveryScore,
        stressScore,
        reasons,
        mainReason: reasons[0],
        level,
        tone,
        score,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function describeLoadBand(band, percentileValue) {
  const percentileText = Number.isFinite(percentileValue) ? `${percentileValue}%` : "sem base histórica suficiente";
  const normalized = normalizeKey(band);

  if (normalized.includes("MUITO ALTA") || normalized === "ALTA") {
    return `A carga atual está acima do padrão recente da própria equipe (${percentileText}); isso pode indicar uma semana mais exigente ou concentração de estímulos e merece cruzamento com recuperação, dor e agenda de treinos.`;
  }

  if (normalized.includes("MUITO BAIXA") || normalized === "BAIXA") {
    return `A carga atual está abaixo da história recente da equipe (${percentileText}); pode representar alívio planejado, menor adesão aos check-ins ou redução de exposição, então vale confirmar o contexto com a comissão.`;
  }

  if (normalized === "HABITUAL") {
    return `A carga está em faixa habitual da própria história (${percentileText}), sugerindo uma semana sem desvio importante de volume/intensidade quando comparada ao padrão interno.`;
  }

  return "Ainda não há base histórica suficiente para classificar a carga com segurança; priorize a leitura dos dados individuais e dos registros clínicos.";
}

function buildWeeklyInterpretationItems(baseline, recoveryMean, stressMean, attentionItems) {
  const items = [
    describeLoadBand(baseline.teamHistoryBand, baseline.teamHistoryPercentile),
  ];

  if (Number.isFinite(recoveryMean) && recoveryMean <= 2.8) {
    items.push(`A recuperação média está baixa (${formatRatio(recoveryMean)}), o que aumenta a necessidade de monitorar sono, fadiga e resposta aos próximos treinos.`);
  } else if (Number.isFinite(recoveryMean)) {
    items.push(`A recuperação média está em ${formatRatio(recoveryMean)}, sem sinal coletivo forte de queda, mas atletas fora da média precisam de leitura individual.`);
  }

  if (Number.isFinite(stressMean) && stressMean >= 3.8) {
    items.push(`O estresse médio está elevado (${formatRatio(stressMean)}), podendo amplificar risco percebido mesmo quando a carga externa não parece alta.`);
  } else if (Number.isFinite(stressMean)) {
    items.push(`O estresse médio está em ${formatRatio(stressMean)}, com leitura coletiva controlada para esta janela.`);
  }

  const highPriorityCount = attentionItems.filter((item) => item.tone === "high").length;
  const synthesis =
    highPriorityCount > 0
      ? `Síntese: ${highPriorityCount} atleta(s) exigem decisão integrada antes de elevar a carga.`
      : attentionItems.length
        ? `Síntese: há atletas para monitoramento, mas sem concentração dominante de prioridade alta.`
        : "Síntese: o grupo não apresenta alerta individual relevante pelos critérios de carga, recuperação e estresse.";

  return [...items.slice(0, 3), synthesis];
}

function getTeamClinicalItems(items, teamName) {
  const normalizedTeam = normalizeTeamLookupKey(teamName);
  return items.filter((item) => {
    const itemTeam = normalizeTeamLookupKey(item.teamName);
    return itemTeam && (itemTeam === normalizedTeam || normalizedTeam.includes(itemTeam));
  });
}

function getSyntheticTeamPrefix(modality) {
  const prefixes = {
    basquete: "BASQUETE",
    "volei-feminino": "VÔLEI FEM",
    "volei-masculino": "VÔLEI MASC",
    natacao: "NATAÇÃO",
    futsal: "FUTSAL",
  };
  return prefixes[modality.id] || normalizeKey(modality.label);
}

function buildSyntheticTeamName(modality, teamName) {
  const cleanTeamName = normalizeText(teamName);
  if (!cleanTeamName) {
    return "";
  }

  const modalityMatchers = [modality.label, ...(modality.matchers || []), getSyntheticTeamPrefix(modality)];
  const alreadyIncludesModality = modalityMatchers.some((matcher) =>
    normalizeLooseKey(cleanTeamName).includes(normalizeLooseKey(matcher))
  );

  return alreadyIncludesModality ? cleanTeamName : `${getSyntheticTeamPrefix(modality)} ${cleanTeamName}`;
}

function buildReportCategories(loadCategories, modality, physioDemands = []) {
  const reportCategories = [...loadCategories];

  physioDemands.forEach((item) => {
    if (!item.teamName) {
      return;
    }

    const alreadyCovered = reportCategories.some((teamName) => getTeamClinicalItems([item], teamName).length > 0);
    if (alreadyCovered) {
      return;
    }

    const syntheticTeamName = buildSyntheticTeamName(modality, item.teamName);
    if (
      syntheticTeamName &&
      !reportCategories.some((teamName) => normalizeTeamLookupKey(teamName) === normalizeTeamLookupKey(syntheticTeamName))
    ) {
      reportCategories.push(syntheticTeamName);
    }
  });

  return reportCategories;
}

function isPhysioRed(item) {
  return getSemaphoreTone(item.semaphore) === "red";
}

function hasVetoText(item) {
  return normalizeKey(`${item.demand} ${item.notes}`).includes("VETADO");
}

function buildPhysioClinicalAlert(teamName, physioDemands) {
  const teamItems = getTeamClinicalItems(physioDemands, teamName);
  const redOrVeto = teamItems.filter((item) => isPhysioRed(item) || hasVetoText(item));
  const yellowCount = teamItems.filter((item) => getSemaphoreTone(item.semaphore) === "yellow").length;

  if (redOrVeto.length) {
    const names = redOrVeto.slice(0, 3).map((item) => item.athleteName).join(", ");
    return {
      tone: "strong",
      title: "Alerta da fisioterapia",
      text: `${redOrVeto.length} caso(s) vermelho(s) ou com veto registrado: ${names}. Validar restrições antes de liberar carga plena.`,
    };
  }

  if (yellowCount >= 3) {
    return {
      tone: "alert",
      title: "Atenção interdisciplinar",
      text: `${yellowCount} registros amarelos na fisioterapia. Recomenda-se alinhar treino, preparação física e atendimento clínico.`,
    };
  }

  return null;
}

function buildSuggestedReferrals(attentionItems, physioAlert, psychologyItems) {
  const referrals = [];

  if (attentionItems.some((item) => item.tone === "high")) {
    referrals.push("Revisar individualmente atletas de prioridade alta antes de progressões de carga.");
  }

  if (psychologyItems.length) {
    referrals.push("Cruzar demandas da psicologia com sinais de estresse e recuperação baixa.");
  }

  if (!referrals.length) {
    referrals.push("Manter rotina de monitoramento e discutir oscilações pontuais na reunião da comissão.");
  }

  return referrals.slice(0, 3);
}

function buildCoachSummaryHtmlLegacy(teamName, updatedAtIso, baseline, recoveryMean, stressMean, teamAthletes) {
  const rangeLabel = buildWeeklyRangeLabel(updatedAtIso);
  const attentionAthletes = teamAthletes
    .map((athlete) => {
      const loadBaseline = buildAthleteLoadBaseline(athlete, teamAthletes);
      return {
        athlete,
        loadBaseline,
        recoveryScore: athlete.latest.recoveryScore,
        stressScore: athlete.latest.stressScore,
      };
    })
    .filter(
      (item) =>
        Number.isFinite(item.loadBaseline.teamPercentile) &&
        (item.loadBaseline.teamPercentile >= 75 ||
          (Number.isFinite(item.recoveryScore) && item.recoveryScore <= 2.5) ||
          (Number.isFinite(item.stressScore) && item.stressScore >= 4))
    )
    .sort((left, right) => {
      const leftScore =
        (left.loadBaseline.teamPercentile || 0) +
        ((5 - (left.recoveryScore || 5)) * 8) +
        ((left.stressScore || 0) * 4);
      const rightScore =
        (right.loadBaseline.teamPercentile || 0) +
        ((5 - (right.recoveryScore || 5)) * 8) +
        ((right.stressScore || 0) * 4);
      return rightScore - leftScore;
    })
    .slice(0, 5);

  const summaryItems = [
    `Carga da equipe em ${baseline.teamHistoryBand.toLowerCase()} na própria história (${Number.isFinite(baseline.teamHistoryPercentile) ? `${baseline.teamHistoryPercentile}%` : "sem base"}).`,
    `Recuperação média da semana em ${formatRatio(recoveryMean)} e estresse médio em ${formatRatio(stressMean)}.`,
    `A carga recente da equipe segue uma faixa central interna de leitura, sem comparacao com outras equipes do clube.`,
  ];

  return `
    <section class="report-coach-grid">
      <article class="report-panel report-panel--coach">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Leitura da semana</p>
            <span>Resumo para envio aos treinadores · ${rangeLabel}</span>
          </div>
        </div>
        <div class="report-summary-list">
          ${summaryItems
            .map(
              (item, index) => `
                <div class="report-summary-item">
                  <strong>0${index + 1}</strong>
                  <span>${escapeHtml(item)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
      <article class="report-panel report-panel--coach">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Atletas para atenção</p>
            <span>Prioridade combinando MM3 alta, recuperação baixa e estresse</span>
          </div>
        </div>
        <div class="report-attention-list">
          ${
            attentionAthletes.length
              ? attentionAthletes
                  .map(
                    ({ athlete, loadBaseline, recoveryScore, stressScore }) => `
                      <div class="report-attention-item">
                        <div>
                          <strong>${escapeHtml(athlete.name)}</strong>
                          <span>${escapeHtml(teamName)}</span>
                        </div>
                        <div>
                          <small>MM3 ${formatRatio(loadBaseline.currentMovingAverage)} · Eq ${Number.isFinite(loadBaseline.teamPercentile) ? `${loadBaseline.teamPercentile}%` : "Sem base"}</small>
                          <small>Rec ${formatRatio(recoveryScore)} · Est ${formatRatio(stressScore)}</small>
                        </div>
                      </div>
                    `
                  )
                  .join("")
              : '<div class="report-empty-note">Nenhum atleta entrou em atenção prioritária nesta semana.</div>'
          }
        </div>
      </article>
    </section>
  `;
}

function buildCoachSummaryHtml(teamName, updatedAtIso, baseline, recoveryMean, stressMean, teamAthletes) {
  const rangeLabel = buildWeeklyRangeLabel(updatedAtIso);
  const attentionAthletes = buildAttentionItems(teamAthletes);
  const summaryItems = buildWeeklyInterpretationItems(
    baseline,
    recoveryMean,
    stressMean,
    attentionAthletes
  );

  return `
    <section class="report-coach-grid">
      <article class="report-panel report-panel--coach">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Leitura da semana</p>
            <span>${rangeLabel}</span>
          </div>
        </div>
        <div class="report-summary-list">
          ${summaryItems
            .map(
              (item, index) => `
                <div class="report-summary-item">
                  <strong>0${index + 1}</strong>
                  <span>${escapeHtml(item)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
      <article class="report-panel report-panel--coach">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Atletas para atenção</p>
            <span>Percentil equipe, MM3, recuperação e estresse</span>
          </div>
        </div>
        <div class="report-attention-list">
          ${
            attentionAthletes.length
              ? attentionAthletes
                  .map(
                    ({ athlete, loadBaseline, recoveryScore, stressScore, level, tone, mainReason }) => `
                      <div class="report-attention-item report-attention-item--${escapeHtml(tone)}">
                        <div>
                          <strong>${escapeHtml(athlete.name)}</strong>
                          <span>${escapeHtml(level)} · ${escapeHtml(mainReason)}</span>
                        </div>
                        <div>
                          <small>MM3 ${formatRatio(loadBaseline.currentMovingAverage)} · Percentil equipe ${Number.isFinite(loadBaseline.teamPercentile) ? `${loadBaseline.teamPercentile}%` : "Sem base"}</small>
                          <small>Recuperação ${formatRatio(recoveryScore)} · Estresse ${formatRatio(stressScore)}</small>
                        </div>
                      </div>
                    `
                  )
                  .join("")
              : '<div class="report-empty-note">Nenhum atleta entrou em atenção prioritária nesta semana.</div>'
          }
        </div>
      </article>
    </section>
  `;
}

function buildPhysioDemandPanelHtml(teamName, physioDemands) {
  const allTeamItems = getTeamClinicalItems(physioDemands, teamName);
  const teamItems = allTeamItems;

  return `
    <article class="report-panel report-panel--physio">
      <div class="report-panel__head report-panel__head--tight">
        <div>
          <p>Fisioterapia</p>
          <span>${allTeamItems.length ? `${allTeamItems.length} demandas registradas` : "Sem demandas registradas"}</span>
        </div>
      </div>
      <div class="report-physio-list">
        ${
          teamItems.length
            ? teamItems
                .map(
                  (item) => `
                    <div class="report-physio-item">
                      <strong>${escapeHtml(item.athleteName)}</strong>
                      <span>${escapeHtml(item.demand || "Demanda sem descricao")}</span>
                      <em>${escapeHtml([item.semaphore, item.phase ? `Fase ${item.phase}` : ""].filter(Boolean).join(" · "))}</em>
                      <b class="report-semaphore report-semaphore--${escapeHtml(getSemaphoreTone(item.semaphore))}">${escapeHtml([item.semaphore, item.phase ? `Fase ${item.phase}` : ""].filter(Boolean).join(" / "))}</b>
                      ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
                      ${item.observations ? `<small class="report-physio-observations"><b>Observações:</b> ${escapeHtml(item.observations)}</small>` : ""}
                    </div>
                  `
                )
                .join("")
            : '<div class="report-empty-note">Nenhuma observacao da fisioterapia para esta equipe.</div>'
        }
      </div>
    </article>
  `;
}

function buildPsychologyDemandPanelHtml(teamName, psychologyDemands) {
  const allTeamItems = getTeamClinicalItems(psychologyDemands, teamName);
  const teamItems = allTeamItems.slice(0, 5);

  return `
    <article class="report-panel report-panel--psychology">
      <div class="report-panel__head report-panel__head--tight">
        <div>
          <p>Psicologia</p>
          <span>${allTeamItems.length ? `${allTeamItems.length} registros` : "Sem registros"}</span>
        </div>
      </div>
      <div class="report-physio-list">
        ${
          teamItems.length
            ? teamItems
                .map(
                  (item) => `
                    <div class="report-physio-item">
                      <strong>${escapeHtml(item.athleteName)}</strong>
                      <span>${escapeHtml(item.demand || "Demanda sem descricao")}</span>
                      ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}
                    </div>
                  `
                )
                .join("")
            : '<div class="report-empty-note">Nenhum registro da psicologia para esta equipe.</div>'
        }
      </div>
    </article>
  `;
}

function getSemaphoreTone(value) {
  const normalized = normalizeKey(value);
  if (normalized.includes("VERMELHO")) {
    return "red";
  }
  if (normalized.includes("AMARELO")) {
    return "yellow";
  }
  if (normalized.includes("VERDE")) {
    return "green";
  }
  return "neutral";
}

function buildClinicalAlertHtml(alert) {
  if (!alert) {
    return "";
  }

  return `
    <article class="report-panel report-panel--clinical-alert report-panel--clinical-alert-${escapeHtml(alert.tone)}">
      <div class="report-panel__head report-panel__head--tight">
        <div>
          <p>${escapeHtml(alert.title)}</p>
          <span>Fisioterapia</span>
        </div>
      </div>
      <strong>${escapeHtml(alert.text)}</strong>
    </article>
  `;
}

function buildSupportPanelHtml(attentionItems, physioAlert, psychologyItems) {
  const referrals = buildSuggestedReferrals(attentionItems, physioAlert, psychologyItems);

  return `
    <section class="report-support-grid">
      <article class="report-panel report-panel--support">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Encaminhamentos sugeridos</p>
            <span>Para discussão com a comissão</span>
          </div>
        </div>
        <div class="report-summary-list">
          ${referrals
            .map(
              (item, index) => `
                <div class="report-summary-item">
                  <strong>${index + 1}</strong>
                  <span>${escapeHtml(item)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </article>
      <article class="report-panel report-panel--support">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Nota metodológica</p>
            <span>Interpretação dos indicadores</span>
          </div>
        </div>
        <div class="report-method-list">
          <span><strong>Carga mediana da semana:</strong> valor central da carga recente da equipe, reduzindo o efeito de extremos individuais.</span>
          <span><strong>MM3:</strong> média móvel dos últimos 3 check-ins.</span>
          <span><strong>Percentil histórico:</strong> posição da carga atual em relação à própria história da equipe.</span>
          <span><strong>Percentil equipe:</strong> posição do atleta em relação aos colegas da mesma equipe.</span>
          <small>Os check-ins são autorrelatos e devem ser interpretados junto à comissão técnica, preparação física, fisioterapia e psicologia.</small>
        </div>
      </article>
    </section>
  `;
}

function buildTeamOverviewRows(athletes, categories, updatedAtIso, modalityId, physioDemands, psychologyDemands) {
  return categories
    .filter((category) => inferModalityId(category) === modalityId)
    .map((teamName) => {
      const teamAthletes = getAthletesByTeam(athletes, teamName);
      const baseline = buildTeamLoadBaseline(athletes, categories, teamName);
      const loadMedian = roundNumber(quantile(getTeamDistribution(athletes, teamName, "loadScore", updatedAtIso, 30), 0.5), 1);
      const recoveryMean = roundNumber(getTeamAggregate(athletes, teamName, "recoveryScore", updatedAtIso, 30), 1);
      const stressMean = roundNumber(getTeamAggregate(athletes, teamName, "stressScore", updatedAtIso, 30), 1);
      const attentionItems = buildAttentionItems(teamAthletes);
      const teamPhysio = getTeamClinicalItems(physioDemands, teamName);
      const teamPsychology = getTeamClinicalItems(psychologyDemands, teamName);
      const highPriority = attentionItems.filter((item) => item.tone === "high").length;
      const physioPriorityCount = teamPhysio.filter((item) => isPhysioRed(item) || hasVetoText(item)).length;
      const synthesis = highPriority
          ? `${highPriority} prioridade(s) alta(s)`
          : physioPriorityCount
            ? `${physioPriorityCount} registro(s) prioritario(s) na fisio`
          : baseline.teamHistoryBand === "Alta" || baseline.teamHistoryBand === "Muito alta"
            ? "Carga acima do habitual"
            : baseline.teamHistoryBand === "Baixa" || baseline.teamHistoryBand === "Muito baixa"
              ? "Semana de carga reduzida"
              : "Quadro controlado";

      return {
        teamName,
        athletesCount: teamAthletes.length,
        loadMedian,
        recoveryMean,
        stressMean,
        attentionCount: attentionItems.length,
        physioCount: teamPhysio.length,
        psychologyCount: teamPsychology.length,
        synthesis,
        sortScore: attentionItems.length * 3 + teamPhysio.filter((item) => isPhysioRed(item) || hasVetoText(item)).length * 5,
      };
    })
    .sort((left, right) => right.sortScore - left.sortScore || left.teamName.localeCompare(right.teamName, "pt-BR"));
}

function buildOverviewPageHtml(athletes, categories, updatedAtIso, modality, crestDataUrl, physioDemands, psychologyDemands) {
  const rows = buildTeamOverviewRows(
    athletes,
    categories,
    updatedAtIso,
    modality.id,
    physioDemands,
    psychologyDemands
  );
  const totalAthletes = rows.reduce((total, row) => total + row.athletesCount, 0);
  const totalAttention = rows.reduce((total, row) => total + row.attentionCount, 0);
  const totalPhysio = rows.reduce((total, row) => total + row.physioCount, 0);
  const totalPsychology = rows.reduce((total, row) => total + row.psychologyCount, 0);

  return `
    <section class="report-page report-page--overview">
      <div class="report-page__bg"></div>
      <header class="report-header">
        <div class="report-header__brand">
          <img src="${crestDataUrl || ""}" alt="Escudo do Olympico Clube" />
          <div>
            <p class="report-eyebrow">Olympico Club</p>
            <h1>Panorama ${escapeHtml(modality.label)}</h1>
            <p class="report-subtitle">Comparativo de carga por equipe</p>
          </div>
        </div>
        <div class="report-header__meta">
          <span>Relatório geral</span>
          <strong>${escapeHtml(formatDate(updatedAtIso ? new Date(updatedAtIso) : new Date()))}</strong>
        </div>
      </header>

      <section class="report-stats report-stats--overview">
        <article class="report-stat"><span>Equipes</span><strong>${rows.length}</strong></article>
        <article class="report-stat"><span>Atletas</span><strong>${totalAthletes}</strong></article>
        <article class="report-stat"><span>Em atenção</span><strong>${totalAttention}</strong></article>
        <article class="report-stat"><span>Fisio / Psico</span><strong>${totalPhysio} / ${totalPsychology}</strong></article>
      </section>

      <article class="report-panel report-panel--overview-table">
        <div class="report-panel__head report-panel__head--tight">
          <div>
            <p>Comparativo entre equipes</p>
            <span>Carga, recuperação, estresse e demandas integradas</span>
          </div>
        </div>
        <table class="report-overview-table">
          <thead>
            <tr>
              <th>Equipe</th>
              <th>Atletas</th>
              <th>Carga mediana</th>
              <th>Recuperação</th>
              <th>Estresse</th>
              <th>Atenção</th>
              <th>Fisio</th>
              <th>Psico</th>
              <th>Síntese</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td><strong>${escapeHtml(row.teamName)}</strong></td>
                    <td>${row.athletesCount}</td>
                    <td>${escapeHtml(formatRatio(row.loadMedian))}</td>
                    <td>${escapeHtml(formatRatio(row.recoveryMean))}</td>
                    <td>${escapeHtml(formatRatio(row.stressMean))}</td>
                    <td>${row.attentionCount}</td>
                    <td>${row.physioCount}</td>
                    <td>${row.psychologyCount}</td>
                    <td>${escapeHtml(row.synthesis)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </article>

      <section class="report-support-grid">
        <article class="report-panel report-panel--support">
          <div class="report-panel__head report-panel__head--tight">
            <div>
              <p>Como ler esta página</p>
              <span>Critérios de comparação</span>
            </div>
          </div>
          <div class="report-method-list">
            <span><strong>Carga mediana da semana:</strong> valor central da carga recente da equipe.</span>
            <span><strong>Em atenção:</strong> atletas classificados por percentil equipe, MM3, recuperação baixa e estresse alto.</span>
            <span><strong>Fisio/Psico:</strong> registros ativos nas abas clínicas, filtrados pela equipe.</span>
          </div>
        </article>
        <article class="report-panel report-panel--support">
          <div class="report-panel__head report-panel__head--tight">
            <div>
              <p>Síntese geral</p>
              <span>Prioridades para discussão</span>
            </div>
          </div>
          <div class="report-method-list">
            <span>${escapeHtml(totalAttention ? `${totalAttention} atleta(s) aparecem em atenção na modalidade.` : "Nenhum atleta entrou em atenção pelos critérios combinados.")}</span>
            <span>${escapeHtml(totalPhysio ? `${totalPhysio} demanda(s) de fisioterapia devem ser cruzadas com a carga.` : "Sem demandas de fisioterapia registradas para esta modalidade.")}</span>
            <span>${escapeHtml(totalPsychology ? `${totalPsychology} registro(s) de psicologia adicionam contexto ao monitoramento.` : "Sem registros de psicologia para esta modalidade.")}</span>
          </div>
        </article>
      </section>
    </section>
  `;
}

function buildTeamReportSection(
  athletes,
  categories,
  updatedAtIso,
  modality,
  teamName,
  crestDataUrl,
  physioDemands = [],
  psychologyDemands = []
) {
  const teamAthletes = getAthletesByTeam(athletes, teamName);
  const trendSeries = buildTrendSeries(athletes, teamName, updatedAtIso);
  const loadMedian = roundNumber(quantile(getTeamDistribution(athletes, teamName, "loadScore", updatedAtIso, 30), 0.5), 1);
  const recoveryMean = roundNumber(getTeamAggregate(athletes, teamName, "recoveryScore", updatedAtIso, 30), 1);
  const stressMean = roundNumber(getTeamAggregate(athletes, teamName, "stressScore", updatedAtIso, 30), 1);
  const teamSummary = {
    p25: roundNumber(quantile(getTeamDistribution(athletes, teamName, "loadScore", updatedAtIso, 30), 0.25), 1),
    median: loadMedian,
    p75: roundNumber(quantile(getTeamDistribution(athletes, teamName, "loadScore", updatedAtIso, 30), 0.75), 1),
  };
  const baseline = buildTeamLoadBaseline(athletes, categories, teamName);
  const attentionItems = buildAttentionItems(teamAthletes);
  const physioAlert = null;
  const physioItems = getTeamClinicalItems(physioDemands, teamName);
  const psychologyItems = getTeamClinicalItems(psychologyDemands, teamName);
  const hasLoadReport = teamAthletes.length > 0;

  if (!hasLoadReport && physioItems.length) {
    const immediateCount = physioItems.filter((item) => normalizeKey(item.notes).includes("ATENDIMENTO IMEDIATO")).length;
    const treatmentCount = physioItems.filter((item) => normalizeKey(item.notes).includes("EM TRATAMENTO")).length;
    const priorityCount = physioItems.filter((item) => isPhysioRed(item) || hasVetoText(item)).length;

    return `
      <section class="report-page report-page--team report-page--clinical-only">
        <div class="report-page__bg"></div>
        <header class="report-header">
          <div class="report-header__brand">
            <img src="${crestDataUrl || ""}" alt="Escudo do Olympico Clube" />
            <div>
              <p class="report-eyebrow">Olympico Club</p>
              <h1>${escapeHtml(teamName)}</h1>
              <p class="report-subtitle">${escapeHtml(modality.label)} · relatório de fisioterapia</p>
            </div>
          </div>
          <div class="report-header__meta">
            <span>Relatório clínico</span>
            <strong>${escapeHtml(formatDate(updatedAtIso ? new Date(updatedAtIso) : new Date()))}</strong>
          </div>
        </header>

        <section class="report-stats">
          <article class="report-stat">
            <span>Registros de fisio</span>
            <strong>${physioItems.length}</strong>
          </article>
          <article class="report-stat">
            <span>Em tratamento</span>
            <strong>${treatmentCount}</strong>
          </article>
          <article class="report-stat">
            <span>Demandas imediatas</span>
            <strong>${immediateCount}</strong>
          </article>
          <article class="report-stat">
            <span>Prioritários</span>
            <strong>${priorityCount}</strong>
          </article>
        </section>

        <section class="report-clinical-grid report-clinical-grid--single">
          ${buildPhysioDemandPanelHtml(teamName, physioDemands)}
          ${buildPsychologyDemandPanelHtml(teamName, psychologyDemands)}
        </section>

        <section class="report-support-grid">
          <article class="report-panel report-panel--support">
            <div class="report-panel__head report-panel__head--tight">
              <div>
                <p>Nota de leitura</p>
                <span>Equipe sem base de carga nesta modalidade</span>
              </div>
            </div>
            <div class="report-method-list">
              <span>Esta equipe aparece no relatório geral por ter registros ativos na planilha da fisioterapia.</span>
              <span>Não há check-ins de carga suficientes para montar os painéis de carga, recuperação, estresse e baseline.</span>
            </div>
          </article>
        </section>
      </section>
    `;
  }

  return `
    <section class="report-page report-page--team">
      <div class="report-page__bg"></div>
      <header class="report-header">
        <div class="report-header__brand">
          <img src="${crestDataUrl || ""}" alt="Escudo do Olympico Clube" />
          <div>
            <p class="report-eyebrow">Olympico Club</p>
            <h1>${escapeHtml(teamName)}</h1>
            <p class="report-subtitle">${escapeHtml(modality.label)} · relatório de carga</p>
          </div>
        </div>
        <div class="report-header__meta">
          <span>Relatório de equipe</span>
          <strong>${escapeHtml(formatDate(updatedAtIso ? new Date(updatedAtIso) : new Date()))}</strong>
        </div>
      </header>

      <section class="report-stats">
        <article class="report-stat">
          <span>Atletas</span>
          <strong>${teamAthletes.length}</strong>
        </article>
        <article class="report-stat">
          <span>Carga mediana da semana</span>
          <strong>${escapeHtml(formatRatio(loadMedian))}</strong>
        </article>
        <article class="report-stat">
          <span>Recuperação</span>
          <strong>${escapeHtml(formatRatio(recoveryMean))}</strong>
        </article>
        <article class="report-stat">
          <span>Estresse</span>
          <strong>${escapeHtml(formatRatio(stressMean))}</strong>
        </article>
      </section>

      <section class="report-main-grid">
        <article class="report-panel report-panel--chart">
        <div class="report-panel__head">
          <p>Evolução média</p>
          <span>Últimos 90 dias válidos</span>
        </div>
        ${buildLineChartSvg(trendSeries)}
        </article>

        ${buildCoachSummaryHtml(teamName, updatedAtIso, baseline, recoveryMean, stressMean, teamAthletes)}
      </section>

      <section class="report-clinical-grid">
        ${buildPhysioDemandPanelHtml(teamName, physioDemands)}
        ${buildPsychologyDemandPanelHtml(teamName, psychologyDemands)}
      </section>

      ${buildBaselinePanelHtml(teamName, baseline, teamSummary, recoveryMean, stressMean, teamAthletes)}
      ${buildSupportPanelHtml(attentionItems, physioAlert, psychologyItems)}
    </section>
  `;
}

function buildPrintReportHtml(
  payload,
  modalityId,
  crestDataUrl,
  physioDemands = [],
  psychologyDemands = [],
  selectedTeamName = ""
) {
  const modality = getModalityById(modalityId);
  if (!modality) {
    throw new Error("Modalidade invalida para exportacao.");
  }

  const athletes = enrichAthletes(payload.athletes);
  const loadCategories = payload.categories.filter((category) => inferModalityId(category) === modalityId);
  const categories = buildReportCategories(loadCategories, modality, physioDemands);
  if (!categories.length) {
    throw new Error("Nenhuma equipe encontrada para a modalidade selecionada.");
  }

  const selectedTeam = normalizeText(selectedTeamName);
  const reportCategories = selectedTeam
    ? categories.filter((teamName) => normalizeTeamLookupKey(teamName) === normalizeTeamLookupKey(selectedTeam))
    : categories;

  if (selectedTeam && !reportCategories.length) {
    throw new Error("Equipe invalida para a modalidade selecionada.");
  }

  const overviewPage = selectedTeam
    ? ""
    : buildOverviewPageHtml(
        athletes,
        categories,
        payload.updatedAt,
        modality,
        crestDataUrl,
        physioDemands,
        psychologyDemands
      );

  const pages = overviewPage + reportCategories
    .map((teamName) =>
      buildTeamReportSection(
        athletes,
        categories,
        payload.updatedAt,
        modality,
        teamName,
        crestDataUrl,
        physioDemands,
        psychologyDemands
      )
    )
    .join("");

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Relatório ${escapeHtml(selectedTeam || modality.label)}</title>
      <style>
        :root {
          color-scheme: light;
          --navy: #0d1232;
          --navy-soft: #16255f;
          --blue: #233577;
          --red: #f3374a;
          --paper: #f4f7fd;
          --line: rgba(17, 24, 60, 0.12);
          --ink: #11183c;
          --muted: #65729b;
        }

        * {
          box-sizing: border-box;
        }

        @page {
          size: A4 landscape;
          margin: 0;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: var(--ink);
          font-family: "Segoe UI", Arial, sans-serif;
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .report-page {
          position: relative;
          min-height: 210mm;
          padding: 11mm 12mm 9mm;
          background: linear-gradient(180deg, #f8faff 0%, #eef3ff 100%);
          page-break-after: always;
          break-after: page;
          overflow: visible;
        }

        .report-page--overview {
          overflow: hidden;
        }

        .report-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }

        .report-page__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at top right, rgba(243, 55, 74, 0.16), transparent 28%),
            linear-gradient(180deg, rgba(13, 18, 50, 1) 0 30mm, transparent 30mm 100%);
          pointer-events: none;
        }

        .report-header,
        .report-stats,
        .report-panel,
        .report-main-grid,
        .report-clinical-grid,
        .report-grid {
          position: relative;
          z-index: 1;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #ffffff;
          margin-bottom: 4mm;
        }

        .report-header__brand {
          display: flex;
          align-items: center;
          gap: 4mm;
          padding: 3.2mm 4mm;
          border-radius: 4mm;
          background: linear-gradient(135deg, rgba(13, 18, 50, 0.98), rgba(33, 47, 112, 0.92));
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 14px 34px rgba(5, 8, 28, 0.2);
        }

        .report-header__brand img {
          width: 16mm;
          height: 16mm;
          object-fit: contain;
          filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.18));
        }

        .report-eyebrow {
          margin: 0 0 1mm;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.24em;
          opacity: 0.76;
        }

        .report-header h1 {
          margin: 0;
          font-size: 28px;
          line-height: 0.94;
          color: #ffffff;
          text-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
        }

        .report-subtitle {
          margin: 1.8mm 0 0;
          font-size: 13px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.96);
        }

        .report-header__meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1mm;
          padding: 3mm 3.4mm;
          border-radius: 4mm;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-size: 10px;
          color: rgba(255, 255, 255, 0.88);
        }

        .report-header__meta strong {
          font-size: 13px;
          color: #ffffff;
        }

        .report-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 2.4mm;
          margin-bottom: 3mm;
        }

        .report-stats--overview {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .report-stat {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(17, 24, 60, 0.08);
          border-radius: 3.4mm;
          padding: 2.4mm 3mm;
          box-shadow: 0 10px 30px rgba(18, 24, 61, 0.08);
        }

        .report-stat span {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #4f5d8d;
          margin-bottom: 1.5mm;
        }

        .report-stat strong {
          font-size: 16px;
          color: var(--navy);
        }

        .report-panel {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(17, 24, 60, 0.08);
          border-radius: 3.8mm;
          padding: 3mm;
          box-shadow: 0 12px 36px rgba(18, 24, 61, 0.08);
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .report-main-grid {
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 3mm;
          align-items: start;
        }

        .report-clinical-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 3mm;
          margin-top: 3mm;
          align-items: start;
        }

        .report-panel--chart {
          align-self: start;
        }

        .report-panel__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 3mm;
          margin-bottom: 2.4mm;
        }

        .report-panel__head p {
          margin: 0;
          color: var(--navy);
          font-size: 14px;
          font-weight: 700;
        }

        .report-panel__head span {
          color: #35436f;
          font-size: 11px;
          font-weight: 700;
        }

        .report-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
        }

        .report-panel--baseline {
          margin-top: 2.4mm;
        }

        .report-panel--clinical-alert {
          margin-bottom: 4mm;
          padding: 3mm 3.6mm;
        }

        .report-panel--clinical-alert strong {
          display: block;
          color: #11183c;
          font-size: 11px;
          line-height: 1.35;
        }

        .report-panel--clinical-alert-strong {
          background: linear-gradient(180deg, #fff0f2, #ffdfe4);
          border-color: rgba(243, 55, 74, 0.34);
        }

        .report-panel--clinical-alert-alert {
          background: linear-gradient(180deg, #fff7e8, #ffefcf);
          border-color: rgba(255, 178, 77, 0.36);
        }

        .report-panel--coach {
          min-height: 0;
        }

        .report-panel__head--tight {
          margin-bottom: 3mm;
        }

        .report-coach-grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 3mm;
          margin: 0;
        }

        .report-support-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3mm;
          margin-top: 2.4mm;
        }

        .report-summary-list,
        .report-attention-list,
        .report-physio-list {
          display: grid;
          gap: 1.8mm;
        }

        .report-summary-item,
        .report-attention-item,
        .report-physio-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2.4mm;
          align-items: start;
          padding: 1.8mm 2.2mm;
          border-radius: 3mm;
          background: linear-gradient(180deg, #f7f9ff, #eef3ff);
          border: 1px solid rgba(23, 29, 73, 0.08);
        }

        .report-summary-item strong {
          width: 8mm;
          height: 8mm;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #16255f;
          color: #ffffff;
          font-size: 9px;
        }

        .report-summary-item span {
          color: #1a234f;
          font-size: 10px;
          line-height: 1.35;
          font-weight: 600;
        }

        .report-attention-item {
          grid-template-columns: 1fr auto;
        }

        .report-attention-item--high {
          background: linear-gradient(180deg, #fff0f2, #ffe2e7);
          border-color: rgba(243, 55, 74, 0.24);
        }

        .report-attention-item--medium {
          background: linear-gradient(180deg, #fff8e8, #ffefd0);
          border-color: rgba(255, 178, 77, 0.28);
        }

        .report-attention-item--watch {
          background: linear-gradient(180deg, #f4f8ff, #e8efff);
        }

        .report-attention-item strong {
          display: block;
          color: #11183c;
          font-size: 10px;
        }

        .report-attention-item span,
        .report-attention-item small,
        .report-physio-item span,
        .report-physio-item em,
        .report-physio-item small,
        .report-empty-note {
          display: block;
          color: #40507d;
          font-size: 8.4px;
          line-height: 1.3;
        }

        .report-empty-note {
          padding: 2mm 0;
          font-weight: 700;
        }

        .report-physio-item {
          display: block;
        }

        .report-physio-item strong {
          display: block;
          color: #11183c;
          font-size: 10px;
          line-height: 1.2;
        }

        .report-physio-item span {
          margin-top: 1mm;
          font-weight: 700;
        }

        .report-physio-item em {
          display: none;
        }

        .report-semaphore {
          display: inline-flex;
          width: fit-content;
          margin-top: 1mm;
          padding: 0.9mm 1.8mm;
          border-radius: 999px;
          font-size: 8px;
          line-height: 1;
          font-style: normal;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .report-semaphore--green {
          color: #0f5f3d;
          background: #dff7eb;
          border: 1px solid rgba(15, 95, 61, 0.2);
        }

        .report-semaphore--yellow {
          color: #7a4c00;
          background: #fff0bf;
          border: 1px solid rgba(122, 76, 0, 0.24);
        }

        .report-semaphore--red {
          color: #8f1524;
          background: #ffe0e5;
          border: 1px solid rgba(143, 21, 36, 0.24);
        }

        .report-semaphore--neutral {
          color: #31406f;
          background: #edf1fb;
          border: 1px solid rgba(49, 64, 111, 0.16);
        }

        .report-physio-item em.report-semaphore {
          display: inline-flex;
          margin-top: 0.8mm;
        }

        .report-physio-item small {
          margin-top: 0.8mm;
        }

        .report-physio-item .report-physio-observations {
          margin-top: 1.2mm;
          padding: 1.2mm 1.5mm;
          color: #24325f;
          background: #f1f4fc;
          border-left: 1.1mm solid #4246a6;
        }

        .report-physio-observations b {
          color: #171d49;
        }

        .report-method-list {
          display: grid;
          gap: 1.6mm;
        }

        .report-method-list span,
        .report-method-list small {
          color: #40507d;
          font-size: 9px;
          line-height: 1.35;
          font-weight: 650;
        }

        .report-method-list strong {
          color: #11183c;
        }

        .report-overview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          color: #1a234f;
        }

        .report-overview-table th,
        .report-overview-table td {
          padding: 2mm 1.8mm;
          text-align: left;
          border-bottom: 1px solid rgba(17, 24, 60, 0.08);
          vertical-align: top;
        }

        .report-overview-table th {
          color: #41507e;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 7.5px;
        }

        .report-overview-table td strong {
          color: #11183c;
          font-size: 10px;
        }

        .report-baseline-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 2.2mm;
        }

        .report-baseline-card {
          padding: 2.3mm 2.6mm;
          border-radius: 3.2mm;
          background: linear-gradient(180deg, #f7f9ff, #eef3ff);
          border: 1px solid rgba(23, 29, 73, 0.08);
        }

        .report-baseline-card--ok {
          background: linear-gradient(180deg, #eefaf5, #e2f6ec);
          border-color: rgba(44, 182, 138, 0.28);
        }

        .report-baseline-card--alert {
          background: linear-gradient(180deg, #fff7e8, #ffefcf);
          border-color: rgba(255, 178, 77, 0.36);
        }

        .report-baseline-card--strong {
          background: linear-gradient(180deg, #fff0f2, #ffdfe4);
          border-color: rgba(243, 55, 74, 0.34);
        }

        .report-baseline-card span {
          display: block;
          color: #41507e;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 700;
        }

        .report-baseline-card strong {
          display: block;
          margin-top: 1.6mm;
          color: #11183c;
          font-size: 15px;
          line-height: 1;
        }

        .report-baseline-card small {
          display: block;
          margin-top: 1.5mm;
          color: #43517b;
          font-size: 9px;
          line-height: 1.28;
        }

        .report-svg {
          width: 100%;
          height: auto;
          display: block;
          max-height: 36mm;
        }

        .axis-line {
          stroke: rgba(17, 24, 60, 0.18);
          stroke-width: 1.5;
        }

        .grid-line {
          stroke: rgba(17, 24, 60, 0.08);
          stroke-width: 1;
        }

        .axis-label {
          fill: #31406f;
          font-size: 13px;
          font-family: "Segoe UI", Arial, sans-serif;
          font-weight: 700;
        }

        .legend-label {
          fill: #11183c;
          font-size: 14px;
          font-family: "Segoe UI", Arial, sans-serif;
          font-weight: 800;
        }
      </style>
    </head>
    <body>${pages}</body>
  </html>`;
}

function findBrowserExecutable() {
  return BROWSER_CANDIDATES.find((candidate) => fsSync.existsSync(candidate)) || null;
}

function execFileAsync(file, args) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true, timeout: 90000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function renderPdfFromUrl(url, outputFilePath) {
  const browserExecutable = findBrowserExecutable();
  if (!browserExecutable) {
    throw new Error("Nenhum navegador compativel foi encontrado para gerar o PDF.");
  }

  const userDataDir = path.join(os.tmpdir(), `olympico-browser-${Date.now()}-${randomUUID()}`);
  const args = [
    "--headless",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--hide-scrollbars",
    "--no-first-run",
    `--user-data-dir=${userDataDir}`,
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=12000",
    "--print-to-pdf-no-header",
    `--print-to-pdf=${outputFilePath}`,
    url,
  ];

  try {
    await execFileAsync(browserExecutable, args);

    const deadline = Date.now() + 45000;
    let lastSize = -1;
    let stableChecks = 0;

    while (Date.now() < deadline) {
      if (fsSync.existsSync(outputFilePath)) {
        const currentSize = fsSync.statSync(outputFilePath).size;
        if (currentSize > 0 && currentSize === lastSize) {
          stableChecks += 1;
        } else {
          stableChecks = 0;
          lastSize = currentSize;
        }

        if (stableChecks >= 2) {
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!fsSync.existsSync(outputFilePath)) {
      throw new Error("O navegador nao retornou o arquivo PDF esperado.");
    }
  } finally {
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function serveFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";
  const file = await fs.readFile(filePath);

  response.writeHead(200, { "Content-Type": contentType });
  response.end(file);
}

function resolveStaticFilePath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath === "/" ? "/index.html" : requestPath);
  const normalizedPath = path.posix.normalize(decodedPath.replace(/\\/g, "/"));
  const route = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;

  let root = CLIENT_DIR;
  let relativePath = route.slice(1);

  if (route === "/assets" || route.startsWith("/assets/")) {
    root = ASSETS_DIR;
    relativePath = route.replace(/^\/assets\/?/, "");
  } else if (route === "/docs" || route.startsWith("/docs/")) {
    root = DOCS_DIR;
    relativePath = route.replace(/^\/docs\/?/, "");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

async function handleExportPdf(requestUrl, response) {
  const modalityId = normalizeText(requestUrl.searchParams.get("modality"));
  const modality = getModalityById(modalityId);
  if (!modality) {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ message: "Modalidade invalida para exportacao." }));
    return;
  }

  const [payload, physioDemands, psychologyDemands] = await Promise.all([
    fetchAthletesData(),
    fetchPhysioDemandsData(modalityId),
    fetchPsychologyDemandsData(),
  ]);
  const crestDataUrl = await getCrestDataUrl();
  const selectedTeamName = normalizeText(requestUrl.searchParams.get("team"));
  const html = buildPrintReportHtml(payload, modalityId, crestDataUrl, physioDemands, psychologyDemands, selectedTeamName);
  const tempHtmlPath = path.join(os.tmpdir(), `olympico-${modalityId}-${Date.now()}-${randomUUID()}.html`);
  const fileSlug = normalizeKey(selectedTeamName || modalityId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outputFilePath = path.join(os.tmpdir(), `olympico-${fileSlug}-${Date.now()}.pdf`);

  try {
    await fs.writeFile(tempHtmlPath, html, "utf8");
    await renderPdfFromUrl(pathToFileURL(tempHtmlPath).href, outputFilePath);
    const pdfBuffer = await fs.readFile(outputFilePath);

    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="olympico-${fileSlug || modalityId}.pdf"`,
      "Cache-Control": "no-store",
    });
    response.end(pdfBuffer);
  } finally {
    await fs.rm(tempHtmlPath, { force: true }).catch(() => {});
    await fs.rm(outputFilePath, { force: true }).catch(() => {});
  }
}

async function renderReportPdfBuffer(html, slug) {
  const tempHtmlPath = path.join(os.tmpdir(), `olympico-kit-${slug}-${Date.now()}-${randomUUID()}.html`);
  const outputFilePath = path.join(os.tmpdir(), `olympico-kit-${slug}-${Date.now()}-${randomUUID()}.pdf`);

  try {
    await fs.writeFile(tempHtmlPath, html, "utf8");
    await renderPdfFromUrl(pathToFileURL(tempHtmlPath).href, outputFilePath);
    return await fs.readFile(outputFilePath);
  } finally {
    await fs.rm(tempHtmlPath, { force: true }).catch(() => {});
    await fs.rm(outputFilePath, { force: true }).catch(() => {});
  }
}

async function handleExportWeeklyKit(response) {
  const payload = await fetchAthletesData();
  const crestDataUrl = await getCrestDataUrl();
  const psychologyDemands = await fetchPsychologyDemandsData();
  const folderName = getReportFolderName(payload.updatedAt);
  const kitItems = buildWeeklyReportKitItems(payload.categories);
  const physioByModality = new Map();
  const files = [];

  for (const item of kitItems) {
    if (!physioByModality.has(item.modalityId)) {
      physioByModality.set(item.modalityId, await fetchPhysioDemandsData(item.modalityId));
    }

    const html = buildPrintReportHtml(
      payload,
      item.modalityId,
      crestDataUrl,
      physioByModality.get(item.modalityId),
      psychologyDemands,
      item.teamName
    );
    const slug = normalizeKey(item.teamName || item.modalityId).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const pdfBuffer = await renderReportPdfBuffer(html, slug || item.modalityId);
    files.push({
      name: `${folderName}/${item.fileName}`,
      content: pdfBuffer,
    });
  }

  const zipBuffer = createZipBuffer(files);
  const zipFileName = getReportZipFileName(payload.updatedAt);

  response.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${zipFileName}"`,
    "Cache-Control": "no-store",
  });
  response.end(zipBuffer);
}

async function handlePrintReport(requestUrl, response) {
  const modalityId = normalizeText(requestUrl.searchParams.get("modality"));
  const modality = getModalityById(modalityId);
  if (!modality) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Modalidade invalida para impressao.");
    return;
  }

  const [payload, physioDemands, psychologyDemands] = await Promise.all([
    fetchAthletesData(),
    fetchPhysioDemandsData(modalityId),
    fetchPsychologyDemandsData(),
  ]);
  const crestDataUrl = await getCrestDataUrl();
  const selectedTeamName = normalizeText(requestUrl.searchParams.get("team"));
  const html = buildPrintReportHtml(
    payload,
    modalityId,
    crestDataUrl,
    physioDemands,
    psychologyDemands,
    selectedTeamName
  ).replace(
    "</body>",
    `<script>
      window.addEventListener("load", () => {
        setTimeout(() => window.print(), 450);
      });
    </script></body>`
  );

  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/athletes") {
    try {
      const payload = await fetchAthletesData();
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(payload));
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          message: "Nao foi possivel carregar os atletas agora.",
          details: error.message,
        })
      );
    }
    return;
  }

  if (requestUrl.pathname === "/api/export-pdf") {
    try {
      await handleExportPdf(requestUrl, response);
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          message: "Nao foi possivel exportar este PDF agora.",
          details: error.message,
        })
      );
    }
    return;
  }

  if (requestUrl.pathname === "/api/export-weekly-kit") {
    try {
      await handleExportWeeklyKit(response);
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(
        JSON.stringify({
          message: "Nao foi possivel gerar o kit semanal agora.",
          details: error.message,
        })
      );
    }
    return;
  }

  if (requestUrl.pathname === "/print-report") {
    try {
      await handlePrintReport(requestUrl, response);
    } catch (error) {
      response.writeHead(500, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(error.message || "Nao foi possivel montar o relatório para impressao.");
    }
    return;
  }

  const filePath = resolveStaticFilePath(requestUrl.pathname);

  if (!filePath) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Caminho invalido.");
    return;
  }

  try {
    await serveFile(filePath, response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Arquivo nao encontrado.");
  }
});

function announceServer(port) {
  const localUrl = `http://localhost:${port}`;
  const networkUrls = getLocalNetworkUrls(port);

  console.log(`Dashboard Olympico rodando em ${localUrl}`);
  if (networkUrls.length) {
    console.log(`Celular na mesma rede: ${networkUrls.join(" | ")}`);
  }

  if (shouldOpenBrowser()) {
    openUrlInDefaultBrowser(`${localUrl}/?v=${Date.now()}`);
  }
}

function startServer(port, attempt = 0) {
  const maxAttempts = process.env.PORT ? 0 : 20;

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < maxAttempts) {
      startServer(port + 1, attempt + 1);
      return;
    }

    console.error(error.message);
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    announceServer(port);
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  buildPhysioDemandPanelHtml,
  transformPhysioModalityRows,
};
