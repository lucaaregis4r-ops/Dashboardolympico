const PRIMARY_ATHLETES_SOURCE = Object.freeze({
  id: "wellness-multi-sheet",
  role: "primary",
  label: "Respostas de bem-estar nas abas PSR/PSE das cinco planilhas",
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
      { sheetName: "B14", teamName: "BASQUETE SUB14", wellnessSheetName: "PSR 14" },
      { sheetName: "B15", teamName: "BASQUETE SUB 15", wellnessSheetName: "PSR 15" },
      { sheetName: "B16", teamName: "BASQUETE SUB16", wellnessSheetName: "PSR 16" },
      { sheetName: "B17", teamName: "BASQUETE SUB17", wellnessSheetName: "PSR 17" },
    ],
    ignoredSheets: [],
  }),
  attendanceSource({
    id: "1a8OyuJy2dHuGTvSJXOonRQewzXungLDjBM5xjL-Y2Go",
    title: "Chamadas Natacao 2026 - PREPARACAO FISICA",
    modalityId: "natacao",
    sheets: [
      { sheetName: "NAT JUV", teamName: "NATA\u00c7\u00c3O JUV", wellnessSheetName: "PSR JUV" },
      { sheetName: "NAT JR", teamName: "NATA\u00c7\u00c3O JR", wellnessSheetName: "PSR JR" },
    ],
    ignoredSheets: [],
  }),
  attendanceSource({
    id: "1IQP3CJED9jyfIF4l6YVzTtyiw0fTKv4h5fKypQ3Mu3g",
    title: "Chamadas Volei Feminino 2026 - PREPARACAO FISICA",
    modalityId: "volei-feminino",
    sheets: [
      { sheetName: "VF 15", teamName: "V\u00d4LEI FEM SUB15", wellnessSheetName: "PSR15" },
      { sheetName: "VF 16", teamName: "V\u00d4LEI FEM SUB16", wellnessSheetName: "PSR16" },
      { sheetName: "VF 17", teamName: "V\u00d4LEI FEM SUB17", wellnessSheetName: "PSR 17" },
      { sheetName: "VF 19", teamName: "V\u00d4LEI FEM SUB19", wellnessSheetName: "PSE19" },
    ],
    ignoredSheets: [],
  }),
  attendanceSource({
    id: "1bVI766LCsuW24u0shM2NuN1VoxScj_6rkz46CWXBzmE",
    title: "Chamadas Volei Masculino 2026 - PREPARACAO FISICA",
    modalityId: "volei-masculino",
    sheets: [
      { sheetName: "VM 15", teamName: "V\u00d4LEI MASC SUB15", wellnessSheetName: "PSR15" },
      { sheetName: "VM 16", teamName: "V\u00d4LEI MASC SUB16", wellnessSheetName: "PSR16" },
      { sheetName: "VM 17", teamName: "V\u00d4LEI MASC SUB17", wellnessSheetName: "PSR 17" },
      { sheetName: "VM 19", teamName: "V\u00d4LEI MASC SUB19", wellnessSheetName: "PSR19" },
    ],
    ignoredSheets: ["P\u00e1gina6"],
  }),
  attendanceSource({
    id: "1q0jFsumyNvhG_O_jgucIl_kdJIGr-IX1SpSPVmvplZM",
    title: "Chamadas Futsal 2026 - PREPARACAO FISICA",
    modalityId: "futsal",
    sheets: [
      { sheetName: "F15", teamName: "FUTSAL SUB15", wellnessSheetName: "PSR 15" },
      { sheetName: "F17", teamName: "FUTSAL SUB17", wellnessSheetName: "PSR 17" },
    ],
    ignoredSheets: [],
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

function listWellnessTeams() {
  return listAttendanceTeams().map(({ spreadsheetId, modalityId, teamName, wellnessSheetName }) => ({
    spreadsheetId,
    modalityId,
    teamName,
    sheetName: wellnessSheetName,
  }));
}

function validateDataSourceConfiguration() {
  const errors = [];
  const spreadsheetIds = new Set();
  const teamNames = new Set();

  if (PRIMARY_ATHLETES_SOURCE.role !== "primary") {
    errors.push("As abas de bem-estar precisam permanecer configuradas como fonte principal.");
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
    const wellnessSheetNames = new Set();
    for (const sheet of source.sheets) {
      if (!sheet.sheetName || !sheet.teamName || !sheet.wellnessSheetName) {
        errors.push(`${source.title}: aba sem sheetName, teamName ou wellnessSheetName.`);
      }
      if (sheetNames.has(sheet.sheetName)) {
        errors.push(`${source.title}: aba ${sheet.sheetName} duplicada.`);
      }
      if (wellnessSheetNames.has(sheet.wellnessSheetName)) {
        errors.push(`${source.title}: aba de bem-estar ${sheet.wellnessSheetName} duplicada.`);
      }
      if (source.ignoredSheets.includes(sheet.wellnessSheetName)) {
        errors.push(`${source.title}: aba de bem-estar ${sheet.wellnessSheetName} marcada como ignorada.`);
      }
      if (teamNames.has(sheet.teamName)) {
        errors.push(`${source.title}: categoria ${sheet.teamName} duplicada.`);
      }
      sheetNames.add(sheet.sheetName);
      wellnessSheetNames.add(sheet.wellnessSheetName);
      teamNames.add(sheet.teamName);
    }
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
  listWellnessTeams,
  validateDataSourceConfiguration,
};
