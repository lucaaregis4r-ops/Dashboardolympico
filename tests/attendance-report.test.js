const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTeamReportSection,
  summarizeTeamAttendance,
} = require("../src/server");

function attendanceFixture() {
  return {
    sourceStatus: "available",
    lastSessionDate: "2026-08-20",
    errors: [],
    roster: [
      {
        teamName: "BASQUETE SUB 15",
        athleteName: "Atleta Um",
        weeklyPresent: 2,
        weeklySessions: 3,
      },
      {
        teamName: "BASQUETE SUB 15",
        athleteName: "Atleta Dois",
        weeklyPresent: 1,
        weeklySessions: 3,
      },
    ],
  };
}

test("resume a presenca semanal por categoria normalizada", () => {
  const summary = summarizeTeamAttendance(attendanceFixture(), "Basquete Sub15");

  assert.deepEqual(summary, {
    status: "available",
    athletes: 2,
    weeklyPresent: 3,
    weeklyPossible: 6,
    weeklyPercentage: 50,
    lastSessionDate: "2026-08-20",
  });
});

test("relatorio de cada Sub exibe percentual e numerador da presenca", () => {
  const teamName = "BASQUETE SUB 15";
  const html = buildTeamReportSection(
    [],
    [teamName],
    "2026-08-21T12:00:00.000Z",
    { id: "basquete", label: "Basquete" },
    teamName,
    "",
    [],
    [],
    attendanceFixture()
  );

  assert.match(html, /Presença PF \(7 dias\)/);
  assert.match(html, />50%<\/strong>/);
  assert.match(html, /3 presenças em 6 oportunidades/);
});

test("relatorio sinaliza quando a fonte suplementar esta indisponivel", () => {
  const summary = summarizeTeamAttendance(
    {
      sourceStatus: "unavailable",
      roster: [],
      errors: [{ teamName: "FUTSAL SUB17", message: "HTTP 401" }],
    },
    "FUTSAL SUB 17"
  );

  assert.equal(summary.status, "unavailable");
  assert.equal(summary.weeklyPercentage, null);
});
