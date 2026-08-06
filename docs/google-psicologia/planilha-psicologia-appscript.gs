const SHEETS = {
  athletes: "Atletas",
  treatment: "Em_Acompanhamento",
  history: "Historico_Movimentacoes",
  lists: "Listas",
};

const HEADERS = {
  athletes: [
    "enviar_para_acompanhamento",
    "athlete_id",
    "nome_atleta",
    "categoria",
    "modalidade",
  ],
  treatment: [
    "ativo",
    "alta",
    "data_entrada",
    "athlete_id",
    "nome_atleta",
    "categoria",
    "modalidade",
    "fase",
    "demanda",
    "risco",
    "profissional",
    "responsavel_proximo_passo",
    "proxima_sessao",
    "observacoes",
    "ultima_atualizacao",
  ],
  history: [
    "movement_id",
    "data_movimentacao",
    "tipo_movimentacao",
    "athlete_id",
    "nome_atleta",
    "categoria",
    "modalidade",
    "status",
    "fase",
    "demanda",
    "risco",
    "profissional",
    "observacoes",
  ],
  lists: ["tipo_lista", "valor"],
};

const LIST_VALUES = [
  ["status", "em_acompanhamento"],
  ["status", "alta"],
  ["fase", "triagem"],
  ["fase", "acompanhamento"],
  ["fase", "intervencao"],
  ["fase", "retorno"],
  ["fase", "encerramento"],
  ["demanda", "ansiedade"],
  ["demanda", "estresse"],
  ["demanda", "motivacao"],
  ["demanda", "foco"],
  ["demanda", "relacionamento"],
  ["demanda", "adaptacao"],
  ["demanda", "outra"],
  ["risco", "baixo"],
  ["risco", "medio"],
  ["risco", "alto"],
  ["tipo_movimentacao", "entrada"],
  ["tipo_movimentacao", "atualizacao"],
  ["tipo_movimentacao", "alta"],
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Psicologia")
    .addItem("Criar/ajustar estrutura", "setupPsychologyWorkbook")
    .addItem("Enviar selecionados", "sendSelectedAthletesToTreatment")
    .addItem("Registrar atualizacoes", "logTreatmentUpdates")
    .addItem("Dar alta selecionados", "dischargeSelectedAthletes")
    .addToUi();
}

function onEdit(event) {
  if (!event || !event.range || event.value !== "TRUE") {
    return;
  }

  const sheetName = event.range.getSheet().getName();
  const row = event.range.getRow();
  const column = event.range.getColumn();

  if (sheetName === SHEETS.treatment && column === 2 && row > 1) {
    dischargeTreatmentRow(row);
  }
}

function setupPsychologyWorkbook() {
  const ss = SpreadsheetApp.getActive();

  ensureSheet(ss, SHEETS.athletes, HEADERS.athletes);
  ensureSheet(ss, SHEETS.treatment, HEADERS.treatment);
  ensureSheet(ss, SHEETS.history, HEADERS.history);
  const listSheet = ensureSheet(ss, SHEETS.lists, HEADERS.lists);

  if (listSheet.getLastRow() < 2) {
    listSheet.getRange(2, 1, LIST_VALUES.length, 2).setValues(LIST_VALUES);
  }

  applySheetFormatting_(ss.getSheetByName(SHEETS.athletes));
  applySheetFormatting_(ss.getSheetByName(SHEETS.treatment));
  applySheetFormatting_(ss.getSheetByName(SHEETS.history));
  applySheetFormatting_(listSheet);
  applyValidations_();
}

function sendSelectedAthletesToTreatment() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.athletes);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const selectedRows = sheet
    .getRange(2, 1, lastRow - 1, HEADERS.athletes.length)
    .getValues()
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter((item) => item.row[0] === true);

  selectedRows.forEach((item) => {
    sendAthleteRowToTreatment(item.rowNumber);
    sheet.getRange(item.rowNumber, 1).setValue(false);
  });
}

function sendAthleteRowToTreatment(rowNumber) {
  const ss = SpreadsheetApp.getActive();
  const athleteSheet = ss.getSheetByName(SHEETS.athletes);
  const treatmentSheet = ss.getSheetByName(SHEETS.treatment);
  const row = athleteSheet.getRange(rowNumber, 1, 1, HEADERS.athletes.length).getValues()[0];
  const athleteId = row[1];

  if (!athleteId || isAthleteActive_(athleteId)) {
    return;
  }

  const now = new Date();
  const treatmentRow = [
    true,
    false,
    now,
    row[1],
    row[2],
    row[3],
    row[4],
    "triagem",
    "",
    "baixo",
    "",
    "",
    "",
    "",
    now,
  ];

  treatmentSheet.appendRow(treatmentRow);
  appendHistory_("entrada", treatmentRow);
}

function logTreatmentUpdates() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.treatment);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.treatment.length).getValues();
  rows
    .filter((row) => row[0] === true && row[3])
    .forEach((row) => appendHistory_("atualizacao", row));
}

function dischargeSelectedAthletes() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.treatment);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.treatment.length).getValues();
  rows.forEach((row, index) => {
    if (row[1] === true) {
      dischargeTreatmentRow(index + 2);
    }
  });
}

function dischargeTreatmentRow(rowNumber) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.treatment);
  const row = sheet.getRange(rowNumber, 1, 1, HEADERS.treatment.length).getValues()[0];
  if (!row[3]) {
    return;
  }

  row[0] = false;
  row[1] = true;
  row[14] = new Date();
  sheet.getRange(rowNumber, 1, 1, HEADERS.treatment.length).setValues([row]);
  appendHistory_("alta", row);
}

function ensureSheet(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = currentHeaders.join("") === "" || currentHeaders.join("|") !== headers.join("|");

  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return sheet;
}

function applySheetFormatting_(sheet) {
  const lastColumn = Math.max(1, sheet.getLastColumn());
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight("bold").setBackground("#171d49").setFontColor("#ffffff");
  sheet.autoResizeColumns(1, lastColumn);
}

function applyValidations_() {
  const ss = SpreadsheetApp.getActive();
  const athletes = ss.getSheetByName(SHEETS.athletes);
  const treatment = ss.getSheetByName(SHEETS.treatment);
  const lists = ss.getSheetByName(SHEETS.lists);

  athletes.getRange("A2:A").insertCheckboxes();
  treatment.getRange("A2:B").insertCheckboxes();

  const lastListRow = Math.max(2, lists.getLastRow());
  const listValues = lists.getRange(2, 1, lastListRow - 1, 2).getValues();
  const phases = listValues.filter((row) => row[0] === "fase").map((row) => row[1]);
  const demands = listValues.filter((row) => row[0] === "demanda").map((row) => row[1]);
  const risks = listValues.filter((row) => row[0] === "risco").map((row) => row[1]);

  treatment
    .getRange("H2:H")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(phases, true).build());
  treatment
    .getRange("I2:I")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(demands, true).build());
  treatment
    .getRange("J2:J")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(risks, true).build());
}

function isAthleteActive_(athleteId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.treatment);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  return sheet
    .getRange(2, 1, lastRow - 1, HEADERS.treatment.length)
    .getValues()
    .some((row) => row[0] === true && row[3] === athleteId);
}

function appendHistory_(movementType, treatmentRow) {
  const historySheet = SpreadsheetApp.getActive().getSheetByName(SHEETS.history);
  historySheet.appendRow([
    Utilities.getUuid(),
    new Date(),
    movementType,
    treatmentRow[3],
    treatmentRow[4],
    treatmentRow[5],
    treatmentRow[6],
    movementType === "alta" ? "alta" : "em_acompanhamento",
    treatmentRow[7],
    treatmentRow[8],
    treatmentRow[9],
    treatmentRow[10],
    treatmentRow[13],
  ]);
}
