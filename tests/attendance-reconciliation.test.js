const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyAttendanceActivity,
  normalizeTeamKey,
  resolveAttendanceAthlete,
} = require("../src/server/domain/attendance-reconciliation");

const athletes = [
  {
    id: "atleta-1",
    name: "BERNARDO SALES OLIVEIRA SILVA",
    category: "BASQUETE SUB14",
    latest: { timestampIso: "2026-07-20T12:00:00.000Z" },
  },
  {
    id: "atleta-2",
    name: "JOAO PEDRO SILVA MACHADO",
    category: "VOLEI MASC SUB15",
    latest: { timestampIso: "2026-07-20T12:00:00.000Z" },
  },
];

test("normaliza as dezesseis categorias sem depender de acento ou espaco", () => {
  assert.equal(normalizeTeamKey("V\u00d4LEI FEM SUB16"), normalizeTeamKey("volei fem sub 16"));
  assert.equal(normalizeTeamKey("BASQUETE SUB 15"), normalizeTeamKey("Basquete Sub15"));
});

test("vincula nome completo e abreviado somente quando o candidato e unico", () => {
  const result = resolveAttendanceAthlete("MARIA TESTE", "BASQUETE SUB14", [
    ...athletes,
    {
      id: "atleta-alias",
      name: "MARIA TESTE SILVA",
      category: "BASQUETE SUB14",
      latest: { timestampIso: "2026-07-20T12:00:00.000Z" },
    },
  ]);
  assert.equal(result.status, "alias");
  assert.equal(result.athlete.id, "atleta-alias");
});

test("prioriza a identidade canonica aprovada na planilha de unificacao", () => {
  const result = resolveAttendanceAthlete(
    "ALEXANDRE GABRIEL LOPES BEBIANO",
    "BASQUETE SUB 15",
    [
      {
        id: "atleta-aprovado",
        name: "ALEXANDRE LOPES",
        category: "BASQUETE SUB 15",
        latest: { timestampIso: "2026-08-20T12:00:00.000Z" },
      },
    ]
  );

  assert.equal(result.status, "approved");
  assert.equal(result.athlete.id, "atleta-aprovado");
});

test("usa a equipe canonica da base principal quando a chamada esta em outra categoria", () => {
  const result = resolveAttendanceAthlete(
    "EDUARDO LOUZADO ROSA DE OLIVEIRA",
    "NATAÇÃO JUV",
    [
      {
        id: "eduardo-jr",
        name: "EDUARDO LOUZADO ROSA DE OLIVEIRA",
        category: "NATAÇÃO JR",
        latest: { timestampIso: "2026-08-20T12:00:00.000Z" },
      },
    ]
  );

  assert.equal(result.status, "approved");
  assert.equal(result.athlete.id, "eduardo-jr");
});

test("presenca segura reativa atleta dentro da janela de vinte dias", () => {
  const attendanceData = {
    fetchedAt: "2026-08-21T12:00:00.000Z",
    errors: [],
    teams: [
      {
        modalityId: "basquete",
        teamName: "BASQUETE SUB14",
        sessionDates: ["2026-08-20"],
        records: [
          {
            athleteName: "BERNARDO SALES",
            teamName: "BASQUETE SUB14",
            date: "2026-08-20",
            present: true,
          },
        ],
      },
    ],
  };
  const result = applyAttendanceActivity(athletes, attendanceData, new Date("2026-08-21T12:00:00Z"), 20);
  const bernardo = result.athletes.find((athlete) => athlete.id === "atleta-1");
  const joao = result.athletes.find((athlete) => athlete.id === "atleta-2");

  assert.equal(bernardo.isActive, true);
  assert.equal(bernardo.lastActivitySource, "attendance");
  assert.equal(joao.isActive, true);
  assert.equal(joao.activityStatus, "unverified");
});

test("sugestao aproximada nao altera atividade do atleta", () => {
  const attendanceData = {
    fetchedAt: "2026-08-21T12:00:00.000Z",
    errors: [],
    teams: [
      {
        modalityId: "basquete",
        teamName: "BASQUETE SUB14",
        sessionDates: ["2026-08-20"],
        records: [
          { athleteName: "BERNARDO SALEZ OLIVEIRA SILVA", date: "2026-08-20", present: true },
        ],
      },
    ],
  };
  const result = applyAttendanceActivity(athletes, attendanceData, new Date("2026-08-21T12:00:00Z"), 20);
  assert.equal(result.reconciliation.roster[0].matchStatus, "suggested");
  assert.equal(result.athletes.find((athlete) => athlete.id === "atleta-1").isActive, false);
});
