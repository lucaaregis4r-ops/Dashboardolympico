const { listWellnessTeams } = require("../config/data-sources");
const { buildAttendanceCsvUrl, normalizeKey, parseCsv } = require("./attendance");

const CACHE_TTL_MS = 5 * 60 * 1000;
const HEADER = [
  "Carimbo de data/hora",
  "CATEGORIA",
  "DATA DE HOJE",
  "NOME",
  "DOR MUSCULAR - LOCAL",
  "De 0 a 10, qual o nivel da dor?",
  "QUESTIONARIO DE BEM ESTAR [FADIGA]",
  "QUESTIONARIO DE BEM ESTAR [SONO]",
  "QUESTIONARIO DE BEM ESTAR [DOR MUSCULAR]",
  "QUESTIONARIO DE BEM ESTAR [ESTRESSE]",
  "QUESTIONARIO DE BEM ESTAR [HUMOR]",
];

let wellnessCache = null;
let wellnessCachePromise = null;

function transformWellnessSheetRows(rows, target) {
  const header = rows[0] || [];
  const expected = ["NOME", "FADIGA", "SONO", "DORMUSCULAR", "ESTRESSE", "HUMOR"];
  const actual = [header[2], ...header.slice(5, 10)].map(normalizeKey);
  if (expected.some((value, index) => !actual[index]?.includes(value))) {
    throw new Error(`${target.teamName} (${target.sheetName}): cabecalho de bem-estar inesperado.`);
  }

  return rows.slice(1)
    .filter((row) => row[0]?.trim() && row[2]?.trim())
    .map((row) => [
      row[0],
      target.teamName,
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      row[6],
      row[7],
      row[8],
      row[9],
    ]);
}

async function fetchWellnessRows({ fetchImpl = fetch } = {}) {
  const results = await Promise.all(listWellnessTeams().map(async (target) => {
    const url = buildAttendanceCsvUrl(target.spreadsheetId, target.sheetName, 0);
    const response = await fetchImpl(url, { redirect: "follow" });
    if (!response.ok || /accounts\.google\.com/i.test(response.url || "")) {
      throw new Error(`${target.teamName} (${target.sheetName}): falha ao ler a planilha (${response.status}).`);
    }
    const rows = parseCsv(await response.text());
    return transformWellnessSheetRows(rows, target);
  }));
  return [HEADER, ...results.flat()];
}

async function getWellnessRows({ force = false, fetchImpl = fetch } = {}) {
  if (!force && wellnessCache && Date.now() - wellnessCache.cachedAt < CACHE_TTL_MS) {
    return wellnessCache.rows;
  }
  if (!force && wellnessCachePromise) return wellnessCachePromise;

  wellnessCachePromise = fetchWellnessRows({ fetchImpl }).then((rows) => {
    wellnessCache = { cachedAt: Date.now(), rows };
    return rows;
  });
  try {
    return await wellnessCachePromise;
  } finally {
    wellnessCachePromise = null;
  }
}

function clearWellnessCache() {
  wellnessCache = null;
  wellnessCachePromise = null;
}

module.exports = {
  HEADER,
  clearWellnessCache,
  fetchWellnessRows,
  getWellnessRows,
  transformWellnessSheetRows,
};
