const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ATTENDANCE_SOURCES,
  ATHLETE_IDENTITY_REVIEW_SOURCE,
  PRIMARY_ATHLETES_SOURCE,
  listAttendanceTeams,
  validateDataSourceConfiguration,
} = require("../src/server/config/data-sources");
const { buildAttendanceProbeUrl, probeAttendanceSheet } = require("../scripts/validate-data-sources");

test("mantem a base atual como fonte principal separada da presenca", () => {
  assert.equal(PRIMARY_ATHLETES_SOURCE.role, "primary");
  assert.match(PRIMARY_ATHLETES_SOURCE.csvUrl, /15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY/);
  assert.ok(ATTENDANCE_SOURCES.every((source) => source.role === "supplementary"));
  assert.ok(ATTENDANCE_SOURCES.every((source) => !PRIMARY_ATHLETES_SOURCE.csvUrl.includes(source.id)));
});

test("mapeia cinco planilhas e dezesseis categorias de presenca", () => {
  const result = validateDataSourceConfiguration();
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);
  assert.equal(result.attendanceSourceCount, 5);
  assert.equal(result.attendanceTeamCount, 16);
  assert.equal(listAttendanceTeams().length, 16);
});

test("registra a planilha de revisao sem substituir nenhuma fonte", () => {
  assert.equal(ATHLETE_IDENTITY_REVIEW_SOURCE.role, "review");
  assert.equal(ATHLETE_IDENTITY_REVIEW_SOURCE.purpose, "athlete-identity-unification");
  assert.match(ATHLETE_IDENTITY_REVIEW_SOURCE.url, /1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw/);
});

test("monta URL de leitura limitada para a aba configurada", () => {
  const url = new URL(buildAttendanceProbeUrl("spreadsheet-id", "NAT JUV"));
  assert.equal(url.pathname, "/spreadsheets/d/spreadsheet-id/gviz/tq");
  assert.equal(url.searchParams.get("sheet"), "NAT JUV");
  assert.equal(url.searchParams.get("range"), "A1:D5");
});

test("validador online exige cabecalho de atleta e rejeita redirecionamento para login", async () => {
  const target = {
    spreadsheetId: "spreadsheet-id",
    modalityId: "basquete",
    sheetName: "B14",
    teamName: "BASQUETE SUB14",
  };
  const available = await probeAttendanceSheet(target, async () => ({
    ok: true,
    status: 200,
    url: "https://docs.google.com/spreadsheets/d/spreadsheet-id/gviz/tq",
    text: async () => '"FREQUENCIA","","ATLETA","AGOSTO"',
  }));
  const privateSheet = await probeAttendanceSheet(target, async () => ({
    ok: true,
    status: 200,
    url: "https://accounts.google.com/signin",
    text: async () => "ATLETA",
  }));

  assert.equal(available.accessible, true);
  assert.equal(privateSheet.accessible, false);
  assert.equal(privateSheet.reason, "redirecionada para login");
});
