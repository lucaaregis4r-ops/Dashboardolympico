const test = require("node:test");
const assert = require("node:assert/strict");

const { transformRows } = require("../src/server/index");

test("inativa somente atletas com mais de vinte dias sem resposta", () => {
  const header = [
    "CARIMBO",
    "CATEGORIA",
    "DATA",
    "ATLETA",
    "DOR MUSCULAR",
    "De 0 a 10",
    "[FADIGA]",
    "[SONO]",
    "[DOR MUSCULAR]",
    "[ESTRESSE]",
    "[HUMOR]",
  ];
  const metricValues = ["Sem dor", "0", "1", "5", "1", "1", "5"];
  const rows = [
    header,
    ["31/07/2026 12:00", "BASQUETE SUB14", "31/07/2026", "INATIVO", ...metricValues],
    ["01/08/2026 12:00", "BASQUETE SUB14", "01/08/2026", "NO LIMITE", ...metricValues],
    ["21/08/2026 12:00", "BASQUETE SUB14", "21/08/2026", "RECENTE", ...metricValues],
  ];

  const result = transformRows(rows, {
    attendanceData: {
      teams: [{ teamName: "BASQUETE SUB14", sessionDates: ["2026-08-21"], records: [] }],
      errors: [],
    },
  });
  assert.equal(result.activeAthleteWindowDays, 20);
  assert.equal(result.inactiveAthletes, 1);
  assert.deepEqual(result.athletes.map((athlete) => athlete.name).sort(), ["INATIVO", "NO LIMITE", "RECENTE"]);
  assert.equal(result.athletes.find((athlete) => athlete.name === "INATIVO").isActive, false);
});

test("mantem atleta visivel e a confirmar quando a fonte suplementar esta indisponivel", () => {
  const rows = [
    ["CARIMBO", "CATEGORIA", "DATA", "ATLETA", "DOR MUSCULAR", "De 0 a 10", "[FADIGA]", "[SONO]", "[DOR MUSCULAR]", "[ESTRESSE]", "[HUMOR]"],
    ["01/07/2026 12:00", "BASQUETE SUB14", "01/07/2026", "SEM COBERTURA", "Sem dor", "0", "1", "5", "1", "1", "5"],
    ["21/08/2026 12:00", "FUTSAL SUB17", "21/08/2026", "REFERENCIA", "Sem dor", "0", "1", "5", "1", "1", "5"],
  ];

  const result = transformRows(rows);
  const athlete = result.athletes.find((item) => item.name === "SEM COBERTURA");
  assert.equal(athlete.isActive, true);
  assert.equal(athlete.activityStatus, "unverified");
  assert.equal(result.unverifiedAthletes, 1);
});
