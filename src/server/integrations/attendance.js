const { ATTENDANCE_SOURCES, listAttendanceTeams } = require("../config/data-sources");

const MONTH_NUMBERS = new Map([
  ["JANEIRO", 1],
  ["FEVEREIRO", 2],
  ["MARCO", 3],
  ["ABRIL", 4],
  ["MAIO", 5],
  ["JUNHO", 6],
  ["JULHO", 7],
  ["AGOSTO", 8],
  ["SETEMBRO", 9],
  ["OUTUBRO", 10],
  ["NOVEMBRO", 11],
  ["DEZEMBRO", 12],
]);
const CACHE_TTL_MS = 5 * 60 * 1000;
let attendanceCache = null;
let attendanceCachePromise = null;

function normalizeText(value) {
  return String(value ?? "")
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

function normalizeAthleteKey(value) {
  return normalizeKey(normalizeText(value).replace(/\([^)]*\)/g, " "));
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
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function toIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function findAttendanceHeader(rows) {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const athleteColumn = rows[rowIndex].findIndex((cell) => normalizeKey(cell) === "ATLETA");
    if (athleteColumn >= 0) return { headerRowIndex: rowIndex, athleteColumn };
  }
  return null;
}

function buildDateColumns(rows, headerRowIndex, athleteColumn, sourceYear) {
  const monthRow = rows[headerRowIndex] || [];
  const dayRow = rows[headerRowIndex + 1] || [];
  const dateColumns = [];
  const warnings = [];
  const seenDates = new Set();
  let activeMonth = null;
  let activeYear = sourceYear;
  let previousBlockMonth = null;

  const columnCount = Math.max(monthRow.length, dayRow.length);
  for (let column = athleteColumn + 1; column < columnCount; column += 1) {
    const declaredMonth = MONTH_NUMBERS.get(normalizeKey(monthRow[column]));
    if (declaredMonth) {
      if (previousBlockMonth === 1 && declaredMonth === 12) activeYear -= 1;
      activeMonth = declaredMonth;
      previousBlockMonth = declaredMonth;
    }

    const day = Number(normalizeText(dayRow[column]));
    if (!activeMonth || !Number.isInteger(day) || day < 1 || day > 31) continue;
    const date = toIsoDate(activeYear, activeMonth, day);
    if (!date) {
      warnings.push({ code: "invalid-date", column, year: activeYear, month: activeMonth, day });
      continue;
    }
    if (seenDates.has(date)) {
      warnings.push({ code: "duplicate-date", column, date });
      continue;
    }
    seenDates.add(date);
    dateColumns.push({ column, date });
  }

  if (dateColumns.length) return { dateColumns, warnings, dataRowOffset: 2 };

  activeMonth = null;
  activeYear = sourceYear;
  previousBlockMonth = null;
  for (let column = athleteColumn + 1; column < monthRow.length; column += 1) {
    const headerValue = normalizeText(monthRow[column])
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .trim();
    const monthAndDay = headerValue.match(/^([A-Z]+)\s+(\d{1,2})$/);
    const declaredMonth = monthAndDay ? MONTH_NUMBERS.get(normalizeKey(monthAndDay[1])) : null;
    if (declaredMonth) {
      if (previousBlockMonth === 1 && declaredMonth === 12) activeYear -= 1;
      activeMonth = declaredMonth;
      previousBlockMonth = declaredMonth;
    }

    const day = Number(monthAndDay ? monthAndDay[2] : headerValue);
    if (!activeMonth || !Number.isInteger(day) || day < 1 || day > 31) continue;
    const date = toIsoDate(activeYear, activeMonth, day);
    if (!date) continue;
    if (seenDates.has(date)) {
      warnings.push({ code: "duplicate-date", column, date });
      continue;
    }
    seenDates.add(date);
    dateColumns.push({ column, date });
  }

  return { dateColumns, warnings, dataRowOffset: 1 };
}

function isPresent(value) {
  const key = normalizeKey(value);
  return key === "TRUE" || key === "VERDADEIRO" || key === "SIM" || key === "1";
}

function transformAttendanceRows(rows, target) {
  const header = findAttendanceHeader(rows);
  if (!header) {
    throw new Error(`${target.sheetName}: cabecalho ATLETA nao encontrado.`);
  }

  const { headerRowIndex, athleteColumn } = header;
  const sourceYear = target.year || 2026;
  const { dateColumns, warnings, dataRowOffset } = buildDateColumns(rows, headerRowIndex, athleteColumn, sourceYear);
  if (!dateColumns.length) {
    throw new Error(`${target.sheetName}: nenhuma coluna de data reconhecida.`);
  }

  const athletes = [];
  for (const row of rows.slice(headerRowIndex + dataRowOffset)) {
    const athleteName = normalizeText(row[athleteColumn]);
    if (!athleteName) continue;
    athletes.push({
      name: athleteName,
      normalizedName: normalizeAthleteKey(athleteName),
      values: new Map(dateColumns.map(({ column, date }) => [date, isPresent(row[column])])),
    });
  }

  const asOfDate = target.asOfDate || new Date().toISOString().slice(0, 10);
  const sessionDates = dateColumns
    .map(({ date }) => date)
    .filter((date) => date <= asOfDate)
    .filter((date) => athletes.some((athlete) => athlete.values.get(date)))
    .sort();
  const records = sessionDates.flatMap((date) =>
    athletes.map((athlete) => ({
      date,
      athleteName: athlete.name,
      athleteKey: athlete.normalizedName,
      present: athlete.values.get(date) === true,
      modalityId: target.modalityId,
      teamName: target.teamName,
      sheetName: target.sheetName,
      spreadsheetId: target.spreadsheetId,
    }))
  );

  return {
    modalityId: target.modalityId,
    teamName: target.teamName,
    sheetName: target.sheetName,
    spreadsheetId: target.spreadsheetId,
    athleteCount: athletes.length,
    sessionDates,
    records,
    warnings,
  };
}

function buildAttendanceCsvUrl(spreadsheetId, sheetName, headerRows = 2) {
  const params = new URLSearchParams({ tqx: "out:csv", headers: String(headerRows), sheet: sheetName });
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?${params.toString()}`;
}

async function downloadAttendanceCsv(target, fetchImpl = fetch, headerRows = 2) {
  const response = await fetchImpl(buildAttendanceCsvUrl(target.spreadsheetId, target.sheetName, headerRows), {
    headers: { "User-Agent": "Dashboard Olympico" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function fetchAttendanceData({ fetchImpl = fetch } = {}) {
  const yearsBySpreadsheet = new Map(ATTENDANCE_SOURCES.map((source) => [source.id, source.year]));
  const results = await Promise.all(
    listAttendanceTeams().map(async (target) => {
      const enrichedTarget = { ...target, year: yearsBySpreadsheet.get(target.spreadsheetId) };
      try {
        const csv = await downloadAttendanceCsv(enrichedTarget, fetchImpl);
        try {
          return { team: transformAttendanceRows(parseCsv(csv), enrichedTarget), error: null };
        } catch (error) {
          if (!String(error.message).includes("nenhuma coluna de data reconhecida")) throw error;
          const csvWithExtraHeader = await downloadAttendanceCsv(enrichedTarget, fetchImpl, 3);
          return { team: transformAttendanceRows(parseCsv(csvWithExtraHeader), enrichedTarget), error: null };
        }
      } catch (error) {
        return {
          team: null,
          error: { ...enrichedTarget, message: error.message || String(error) },
        };
      }
    })
  );

  const teams = results.map((result) => result.team).filter(Boolean);
  const errors = results.map((result) => result.error).filter(Boolean);
  return {
    fetchedAt: new Date().toISOString(),
    teams,
    errors,
    records: teams.flatMap((team) => team.records),
  };
}

async function getAttendanceData({ force = false, fetchImpl = fetch } = {}) {
  if (!force && attendanceCache && Date.now() - attendanceCache.cachedAt < CACHE_TTL_MS) {
    return attendanceCache.data;
  }
  if (!force && attendanceCachePromise) return attendanceCachePromise;

  attendanceCachePromise = fetchAttendanceData({ fetchImpl }).then((data) => {
    attendanceCache = { cachedAt: Date.now(), data };
    return data;
  });
  try {
    return await attendanceCachePromise;
  } finally {
    attendanceCachePromise = null;
  }
}

function clearAttendanceCache() {
  attendanceCache = null;
  attendanceCachePromise = null;
}

module.exports = {
  buildAttendanceCsvUrl,
  buildDateColumns,
  clearAttendanceCache,
  fetchAttendanceData,
  findAttendanceHeader,
  getAttendanceData,
  normalizeAthleteKey,
  normalizeKey,
  parseCsv,
  transformAttendanceRows,
};
