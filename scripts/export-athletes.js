const fs = require("fs/promises");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "data", "reference");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "athletes.csv");
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY/export?format=csv&gid=1847097737";
const ACTIVE_ATHLETE_WINDOW_DAYS = 70;

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

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

function extractNumericScore(value, maxScore) {
  const match = normalizeText(value).match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return null;
  }

  const score = Number(match[1].replace(",", "."));
  if (!Number.isFinite(score)) {
    return null;
  }

  return Math.min(Math.max(score, 0), maxScore);
}

function computeLoadScore(entry) {
  const values = [entry.fatigueScore, entry.sleepScore, entry.muscleScore, entry.stressScore]
    .filter((score) => Number.isFinite(score))
    .map((score) => Number(score));

  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function average(values) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return total / validValues.length;
}

function roundNumber(value, precision = 1) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function buildStatus(latest) {
  const painLevel = latest.painLevel || 0;
  const loadScore = latest.loadScore || 0;

  if (painLevel >= 7 || loadScore >= 4.5) {
    return { id: "critical", label: "Critico" };
  }

  if (painLevel >= 4 || loadScore >= 3.5) {
    return { id: "warning", label: "Atencao" };
  }

  return { id: "stable", label: "Estavel" };
}

function parseBrazilianDateTime(value) {
  const text = normalizeText(value);
  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    return null;
  }

  const [, day, month, year, hour = "0", minute = "0", second = "0"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function pickFirstFilled(values) {
  return values.map((value) => normalizeText(value)).find(Boolean) || "";
}

function inferModalityId(category) {
  const token = normalizeKey(category);

  if (token.includes("BASQUETE")) {
    return "basquete";
  }
  if (token.includes("VOLEI FEM")) {
    return "volei-feminino";
  }
  if (token.includes("VOLEI MASC")) {
    return "volei-masculino";
  }
  if (token.includes("NATACAO")) {
    return "natacao";
  }
  if (token.includes("FUTSAL")) {
    return "futsal";
  }

  return "outras";
}

function createAthleteId(name, category, knownIds) {
  const base = `ath-${slugify(category)}-${slugify(name)}`.replace(/-+/g, "-");
  let candidate = base;
  let counter = 2;

  while (knownIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  knownIds.add(candidate);
  return candidate;
}

function transformRows(rows) {
  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((value) => normalizeText(value));
  const painAreaIndex = header.findIndex((value) => value.includes("DOR MUSCULAR"));
  const painLevelIndex = header.findIndex((value) => value.includes("De 0 a 10"));
  const fatigueIndex = header.findIndex((value) => value.includes("[FADIGA]"));
  const sleepIndex = header.findIndex((value) => value.includes("[SONO]"));
  const muscleIndex = header.findIndex((value) => value.includes("[DOR MUSCULAR]"));
  const stressIndex = header.findIndex((value) => value.includes("[ESTRESSE]"));

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
      reportedDate: normalizeText(row[2]),
      painArea: normalizeText(row[painAreaIndex]),
      painLevel: extractNumericScore(row[painLevelIndex], 10),
      fatigueScore: extractNumericScore(row[fatigueIndex], 5),
      sleepScore: extractNumericScore(row[sleepIndex], 5),
      muscleScore: extractNumericScore(row[muscleIndex], 5),
      stressScore: extractNumericScore(row[stressIndex], 5),
    };
    entry.loadScore = computeLoadScore(entry);

    const key = `${normalizeKey(athleteName)}|${normalizeKey(category)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name: athleteName,
        category,
        entries: [],
      });
    }

    groups.get(key).entries.push(entry);
  }

  const knownIds = new Set();
  const activeThreshold = updatedAt
    ? updatedAt.getTime() - ACTIVE_ATHLETE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : null;

  return Array.from(groups.values())
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
        isActive,
        athlete_id: createAthleteId(group.name, group.category, knownIds),
        nome: group.name,
        categoria: group.category,
        modalidade_id: inferModalityId(group.category),
        total_checkins: group.entries.length,
        ultimo_checkin_iso: latest.timestampIso || "",
        data_referida: latest.reportedDate || "",
        status_id: status.id,
        status_label: status.label,
        media_carga: roundNumber(average(group.entries.map((entry) => entry.loadScore)), 1) ?? "",
        area_dor_mais_recente: latest.painArea || "",
      };
    })
    .filter((athlete) => athlete.isActive)
    .map(({ isActive, ...athlete }) => athlete)
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const header = Object.keys(rows[0]);
  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(header.map((column) => escapeCsv(row[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function downloadText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Muitas redirecoes ao tentar baixar a planilha."));
      return;
    }

    https
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
  });
}

async function main() {
  const csv = await downloadText(SHEET_CSV_URL);
  const athletes = transformRows(parseCsv(csv));
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, toCsv(athletes), "utf8");
  console.log(`Arquivo gerado: ${OUTPUT_FILE}`);
  console.log(`Atletas exportados: ${athletes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
