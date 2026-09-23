const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAttendanceCsvUrl,
  fetchAttendanceData,
  normalizeAthleteKey,
  parseCsv,
  transformAttendanceRows,
} = require("../src/server/integrations/attendance");

const TARGET = {
  spreadsheetId: "sheet-id",
  sheetName: "VM 15",
  modalityId: "volei-masculino",
  teamName: "V\u00d4LEI MASC SUB15",
  year: 2026,
};

test("interpreta cabecalho deslocado, blocos mensais e apenas sessoes realizadas", () => {
  const rows = [
    [],
    ["FREQUENCIA", "", "ATLETA", "AGOSTO", "", "", "", "JULHO"],
    ["", "", "", "18", "19", "20", "21", "31"],
    ["", "", "ATLETA UM", "TRUE", "FALSE", "TRUE", "FALSE", "FALSE"],
    ["", "", "ATLETA DOIS", "FALSE", "FALSE", "TRUE", "FALSE", "TRUE"],
  ];

  const result = transformAttendanceRows(rows, TARGET);
  assert.deepEqual(result.sessionDates, ["2026-07-31", "2026-08-18", "2026-08-20"]);
  assert.equal(result.athleteCount, 2);
  assert.equal(result.records.length, 6);
  assert.equal(result.records.find((item) => item.date === "2026-08-18" && item.athleteName === "ATLETA DOIS").present, false);
  assert.ok(!result.records.some((item) => item.date === "2026-08-19"));
});

test("normaliza CSV e sinaliza datas duplicadas sem duplicar registros", () => {
  const csv = [
    '"FREQUENCIA","","ATLETA","AGOSTO","AGOSTO"',
    '"","","","20","20"',
    '"","","NOME, COM VIRGULA","TRUE","TRUE"',
  ].join("\n");
  const result = transformAttendanceRows(parseCsv(csv), { ...TARGET, sheetName: "B14" });

  assert.equal(result.athleteCount, 1);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].athleteName, "NOME, COM VIRGULA");
  assert.equal(result.warnings[0].code, "duplicate-date");
});

test("interpreta cabecalho publico com mes e primeiro dia na mesma celula", () => {
  const csv = [
    '"FREQUENCIA","","ATLETA","AGOSTO 18","19","20","","JULHO 31"',
    '"","","ATLETA UM","TRUE","FALSE","TRUE","","FALSE"',
    '"","","ATLETA DOIS","FALSE","FALSE","TRUE","","TRUE"',
  ].join("\n");
  const result = transformAttendanceRows(parseCsv(csv), TARGET);

  assert.deepEqual(result.sessionDates, ["2026-07-31", "2026-08-18", "2026-08-20"]);
  assert.equal(result.athleteCount, 2);
  assert.equal(result.records.length, 6);
});

test("carregamento retorna falha por categoria sem interromper as demais fontes", async () => {
  const validCsv = [
    '"FREQUENCIA","","ATLETA","AGOSTO"',
    '"","","","20"',
    '"","","ATLETA","TRUE"',
  ].join("\n");
  let requestCount = 0;
  const result = await fetchAttendanceData({
    fetchImpl: async () => {
      requestCount += 1;
      if (requestCount === 1) return { ok: true, status: 200, text: async () => validCsv };
      return { ok: false, status: 401, text: async () => "" };
    },
  });

  assert.equal(requestCount, 16);
  assert.equal(result.teams.length, 1);
  assert.equal(result.errors.length, 15);
  assert.equal(result.records.length, 1);
});

test("URL de importacao preserva o nome exato da aba", () => {
  const url = new URL(buildAttendanceCsvUrl("sheet-id", "VF 15"));
  assert.equal(url.searchParams.get("sheet"), "VF 15");
  assert.equal(url.searchParams.get("headers"), "2");
});

test("chave do atleta ignora acentos e observacao operacional entre parenteses", () => {
  assert.equal(
    normalizeAthleteKey("Gustavo Moreira Ferreira (Nao vem segunda-feira)"),
    "GUSTAVOMOREIRAFERREIRA"
  );
});
