const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INPUT_FILE = path.join(ROOT, "docs", "fisioterapia_atendimentos.csv");
const OUTPUT_DIR = path.join(ROOT, "docs", "relatorios");

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeReportKey(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function loadAttendanceRows(text) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => normalizeText(cell)));
  if (!rows.length) {
    return [];
  }

  const header = rows[0].map((value) => normalizeText(value));
  return rows.slice(1).map((row) =>
    Object.fromEntries(header.map((column, index) => [column, normalizeText(row[index])]))
  );
}

function countBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries()).sort((left, right) => left[0].localeCompare(right[0], "pt-BR"));
}

function isAttentionCase(row) {
  const pain = Number(row.pain_scale_0_10 || "");
  const status = normalizeText(row.session_status).toLowerCase();
  const training = normalizeText(row.return_to_training).toLowerCase();

  return (
    (Number.isFinite(pain) && pain >= 5) ||
    ["em acompanhamento", "encaminhado", "retorno parcial"].includes(status) ||
    training === "nao" ||
    training === "parcial"
  );
}

function isExcludedFromPhysioReport(row) {
  const values = [
    row.attendance_type,
    row.tipo,
    row.tipo_movimentacao,
    row.movement_type,
  ].map(normalizeReportKey);

  return values.some(
    (value) =>
      value === "historico" ||
      value === "historico de atendimento" ||
      value === "historico de atendimentos"
  );
}

function buildReport(rows, weekReference) {
  const weekRows = rows.filter((row) => row.week_reference === weekReference && !isExcludedFromPhysioReport(row));
  const uniqueAthletes = new Set(weekRows.map((row) => row.athlete_id).filter(Boolean));
  const uniqueModalities = new Set(weekRows.map((row) => row.modality_id).filter(Boolean));
  const newCases = weekRows.filter((row) => normalizeText(row.attendance_type).toLowerCase() === "avaliacao").length;
  const followUps = weekRows.filter(
    (row) => normalizeText(row.session_status).toLowerCase() === "em acompanhamento"
  ).length;

  const modalities = countBy(weekRows, (row) => row.modality_id);
  const procedures = countBy(
    weekRows.flatMap((row) => [row.procedure_1, row.procedure_2, row.procedure_3]),
    (value) => normalizeText(value)
  );
  const attentionCases = weekRows.filter(isAttentionCase);

  const lines = [
    "# Relatorio semanal de fisioterapia",
    "",
    "## Identificacao da semana",
    "",
    `- Semana de referencia: ${weekReference}`,
    `- Total de atendimentos: ${weekRows.length}`,
    `- Total de atletas atendidos: ${uniqueAthletes.size}`,
    `- Modalidades atendidas: ${uniqueModalities.size}`,
    "",
    "## Resumo geral",
    "",
    `- Novos casos na semana: ${newCases}`,
    `- Casos que seguem em acompanhamento: ${followUps}`,
    "",
    "## Distribuicao por modalidade",
    "",
    "| Modalidade | Total de atendimentos |",
    "| --- | --- |",
    ...modalities.map(([modality, total]) => `| ${modality} | ${total} |`),
    "",
    "## Casos que exigem atencao",
    "",
    "| Athlete ID | Atleta | Modalidade | Queixa principal | Status | Proximo passo |",
    "| --- | --- | --- | --- | --- | --- |",
    ...(
      attentionCases.length
        ? attentionCases.map(
            (row) =>
              `| ${row.athlete_id || ""} | ${row.athlete_name || ""} | ${row.modality_id || ""} | ${row.main_complaint || ""} | ${row.session_status || ""} | ${row.next_step || ""} |`
          )
        : ["| - | - | - | - | - | - |"]
    ),
    "",
    "## Procedimentos mais utilizados",
    "",
    "| Procedimento | Quantidade |",
    "| --- | --- |",
    ...(
      procedures.length
        ? procedures.map(([procedure, total]) => `| ${procedure} | ${total} |`)
        : ["| - | 0 |"]
    ),
    "",
    "## Observacoes finais",
    "",
    "- Revisar os casos sinalizados em atencao.",
    "- Atualizar a conduta dos atletas sem liberacao completa.",
    "",
  ];

  return lines.join("\n");
}

async function main() {
  const csv = await fs.readFile(INPUT_FILE, "utf8");
  const rows = loadAttendanceRows(csv);

  if (!rows.length) {
    throw new Error("A planilha de atendimentos esta vazia. Preencha ao menos uma linha antes de gerar o relatorio.");
  }

  const requestedWeek = normalizeText(process.argv[2]);
  const availableWeeks = Array.from(new Set(rows.map((row) => row.week_reference).filter(Boolean))).sort();
  const weekReference = requestedWeek || availableWeeks[availableWeeks.length - 1];

  if (!weekReference) {
    throw new Error("Nenhuma week_reference foi encontrada na planilha de atendimentos.");
  }

  const report = buildReport(rows, weekReference);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const outputFile = path.join(OUTPUT_DIR, `fisioterapia-semanal-${weekReference}.md`);
  await fs.writeFile(outputFile, report, "utf8");

  console.log(`Relatorio gerado: ${outputFile}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
