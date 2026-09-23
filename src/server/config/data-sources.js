const PRIMARY_ATHLETES_SOURCE = Object.freeze({
  id: "athletes-load-checkins",
  role: "primary",
  label: "Base principal de atletas, carga e check-ins",
  csvUrl:
    "https://docs.google.com/spreadsheets/d/15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY/export?format=csv&gid=1847097737",
});

const ATTENDANCE_FOLDER = Object.freeze({
  id: "1JWrUMVtkYrH2geuaoPN3hiFWz4zncno0",
  role: "supplementary",
  label: "Presenca da preparacao fisica",
  url: "https://drive.google.com/drive/folders/1JWrUMVtkYrH2geuaoPN3hiFWz4zncno0",
});

const ATHLETE_IDENTITY_REVIEW_SOURCE = Object.freeze({
  id: "1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw",
  role: "review",
  purpose: "athlete-identity-unification",
  label: "Unificacao de atletas e equipes - Olympico 2026",
  url: "https://docs.google.com/spreadsheets/d/1A-B0WNGsiQa-yZsPsoUNieP926QqfioV-WDX9zEdIlw/edit",
});

function attendanceSource({ id, title, modalityId, sheets, ignoredSheets }) {
  return Object.freeze({
    id,
    role: "supplementary",
    purpose: "physical-preparation-attendance",
    title,
    year: 2026,
    modalityId,
    sheets: Object.freeze(sheets.map((sheet) => Object.freeze(sheet))),
    ignoredSheets: Object.freeze([...ignoredSheets]),
  });
}

const ATTENDANCE_SOURCES = Object.freeze([
  attendanceSource({
    id: "1RbDUQjz_SogM231bqWMTaUBjyr3ibALbjAi-V4pHOr0",
    title: "Chamadas Basquete 2026 - PREPARACAO FISICA",
    modalityId: "basquete",
    sheets: [
      { sheetName: "B14", teamName: "BASQUETE SUB14" },
      { sheetName: "B15", teamName: "BASQUETE SUB 15" },
      { sheetName: "B16", teamName: "BASQUETE SUB16" },
      { sheetName: "B17", teamName: "BASQUETE SUB17" },
    ],
    ignoredSheets: ["PSR 14", "PSR 15", "PSR 16", "PSR 17"],
  }),
  attendanceSource({
    id: "1a8OyuJy2dHuGTvSJXOonRQewzXungLDjBM5xjL-Y2Go",
    title: "Chamadas Natacao 2026 - PREPARACAO FISICA",
    modalityId: "natacao",
    sheets: [
      { sheetName: "NAT JUV", teamName: "NATA\u00c7\u00c3O JUV" },
      { sheetName: "NAT JR", teamName: "NATA\u00c7\u00c3O JR" },
    ],
    ignoredSheets: ["PSR JUV", "PSR JR"],
  }),
  attendanceSource({
    id: "1IQP3CJED9jyfIF4l6YVzTtyiw0fTKv4h5fKypQ3Mu3g",
    title: "Chamadas Volei Feminino 2026 - PREPARACAO FISICA",
    modalityId: "volei-feminino",
    sheets: [
      { sheetName: "VF 15", teamName: "V\u00d4LEI FEM SUB15" },
      { sheetName: "VF 16", teamName: "V\u00d4LEI FEM SUB16" },
      { sheetName: "VF 17", teamName: "V\u00d4LEI FEM SUB17" },
      { sheetName: "VF 19", teamName: "V\u00d4LEI FEM SUB19" },
    ],
    ignoredSheets: ["PSR15", "PSR16", "PSR 17", "PSE19"],
  }),
  attendanceSource({
    id: "1bVI766LCsuW24u0shM2NuN1VoxScj_6rkz46CWXBzmE",
    title: "Chamadas Volei Masculino 2026 - PREPARACAO FISICA",
    modalityId: "volei-masculino",
    sheets: [
      { sheetName: "VM 15", teamName: "V\u00d4LEI MASC SUB15" },
      { sheetName: "VM 16", teamName: "V\u00d4LEI MASC SUB16" },
      { sheetName: "VM 17", teamName: "V\u00d4LEI MASC SUB17" },
      { sheetName: "VM 19", teamName: "V\u00d4LEI MASC SUB19" },
    ],
    ignoredSheets: ["PSR15", "PSR16", "PSR 17", "PSR19", "P\u00e1gina6"],
  }),
  attendanceSource({
    id: "1q0jFsumyNvhG_O_jgucIl_kdJIGr-IX1SpSPVmvplZM",
    title: "Chamadas Futsal 2026 - PREPARACAO FISICA",
    modalityId: "futsal",
    sheets: [
      { sheetName: "F15", teamName: "FUTSAL SUB15" },
      { sheetName: "F17", teamName: "FUTSAL SUB17" },
    ],
    ignoredSheets: ["PSR 15", "PSR 17"],
  }),
]);

function listAttendanceTeams() {
  return ATTENDANCE_SOURCES.flatMap((source) =>
    source.sheets.map((sheet) => ({
      spreadsheetId: source.id,
      modalityId: source.modalityId,
      ...sheet,
    }))
  );
}

function validateDataSourceConfiguration() {
  const errors = [];
  const spreadsheetIds = new Set();
  const teamNames = new Set();

  if (PRIMARY_ATHLETES_SOURCE.role !== "primary" || !PRIMARY_ATHLETES_SOURCE.csvUrl) {
    errors.push("A base principal de atletas precisa permanecer configurada como primary.");
  }

  for (const source of ATTENDANCE_SOURCES) {
    if (source.role !== "supplementary") {
      errors.push(`${source.title}: a fonte de presenca precisa ser supplementary.`);
    }
    if (!Number.isInteger(source.year)) {
      errors.push(`${source.title}: ano de referencia invalido.`);
    }
    if (spreadsheetIds.has(source.id)) {
      errors.push(`${source.title}: spreadsheetId duplicado.`);
    }
    spreadsheetIds.add(source.id);

    const sheetNames = new Set();
    for (const sheet of source.sheets) {
      if (!sheet.sheetName || !sheet.teamName) {
        errors.push(`${source.title}: aba sem sheetName ou teamName.`);
      }
      if (sheetNames.has(sheet.sheetName)) {
        errors.push(`${source.title}: aba ${sheet.sheetName} duplicada.`);
      }
      if (teamNames.has(sheet.teamName)) {
        errors.push(`${source.title}: categoria ${sheet.teamName} duplicada.`);
      }
      sheetNames.add(sheet.sheetName);
      teamNames.add(sheet.teamName);
    }
  }

  if (spreadsheetIds.has("15B29MdEXNsDVq4fCJVUffznul--C1Mb5B7pZtmWqmOY")) {
    errors.push("A base principal nao pode ser cadastrada como fonte suplementar de presenca.");
  }

  return {
    valid: errors.length === 0,
    errors,
    attendanceSourceCount: ATTENDANCE_SOURCES.length,
    attendanceTeamCount: teamNames.size,
  };
}

module.exports = {
  ATTENDANCE_FOLDER,
  ATTENDANCE_SOURCES,
  ATHLETE_IDENTITY_REVIEW_SOURCE,
  PRIMARY_ATHLETES_SOURCE,
  listAttendanceTeams,
  validateDataSourceConfiguration,
};
