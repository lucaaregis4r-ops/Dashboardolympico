const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ATHLETES_CSV = path.join(ROOT, "docs", "atletas.csv");
const ATHLETE_IDENTIFIERS_CSV = path.join(ROOT, "atletas_identificadores.csv");
const OUTPUT_XLS = path.join(
  ROOT,
  "docs",
  "google-fisioterapia",
  "modelo-fisioterapia-olympico.xls"
);
const OUTPUT_XLSX = path.join(
  ROOT,
  "docs",
  "google-fisioterapia",
  "modelo-fisioterapia-olympico.xlsx"
);
const PSYCHOLOGY_DIR = path.join(ROOT, "docs", "google-psicologia");
const PSYCHOLOGY_OUTPUT_XLS = path.join(PSYCHOLOGY_DIR, "modelo-psicologia-olympico.xls");
const PSYCHOLOGY_OUTPUT_XLSX = path.join(PSYCHOLOGY_DIR, "modelo-psicologia-olympico.xlsx");

const ATHLETES_HEADERS = [
  "enviar_para_tratamento",
  "athlete_id",
  "nome_atleta",
  "categoria",
  "modalidade",
];

const TREATMENT_HEADERS = [
  "ativo",
  "alta",
  "data_entrada",
  "athlete_id",
  "nome_atleta",
  "categoria",
  "modalidade",
  "fase",
  "lesao",
  "regiao_corporal",
  "dor_0_10",
  "profissional",
  "responsavel_proximo_passo",
  "proxima_reavaliacao",
  "observacoes",
  "ultima_atualizacao",
];

const HISTORY_HEADERS = [
  "movement_id",
  "data_movimentacao",
  "tipo_movimentacao",
  "athlete_id",
  "nome_atleta",
  "categoria",
  "modalidade",
  "status",
  "fase",
  "lesao",
  "regiao_corporal",
  "dor_0_10",
  "profissional",
  "observacoes",
];

const LIST_ROWS = [
  ["tipo_lista", "valor"],
  ["status", "em_tratamento"],
  ["status", "alta"],
  ["fase", "avaliacao"],
  ["fase", "fase_aguda"],
  ["fase", "reabilitacao"],
  ["fase", "transicao"],
  ["fase", "retorno_ao_treino"],
  ["lesao", "entorse"],
  ["lesao", "distensao"],
  ["lesao", "contusao"],
  ["lesao", "tendinopatia"],
  ["lesao", "dor_lombar"],
  ["lesao", "dor_no_joelho"],
  ["lesao", "dor_no_ombro"],
  ["lesao", "sobrecarga"],
  ["lesao", "outra"],
  ["tipo_movimentacao", "entrada"],
  ["tipo_movimentacao", "atualizacao"],
  ["tipo_movimentacao", "alta"],
];

const PSYCHOLOGY_TREATMENT_HEADERS = [
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
];

const PSYCHOLOGY_HISTORY_HEADERS = [
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
];

const PSYCHOLOGY_LIST_ROWS = [
  ["tipo_lista", "valor"],
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

function normalize(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function athleteIdentifierKey(name, category) {
  return `${normalizeKey(name)}|${normalizeKey(category)}`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnName(index) {
  let name = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function rowsToObjects(rows) {
  const headers = rows[0].map(normalize);
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => normalize(cell)))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, normalize(row[index])]))
    );
}

function loadOfficialAthleteIdentifiers() {
  if (!fs.existsSync(ATHLETE_IDENTIFIERS_CSV)) {
    return new Map();
  }

  const csv = fs.readFileSync(ATHLETE_IDENTIFIERS_CSV, "utf8");
  const identifiers = rowsToObjects(parseCsv(csv));
  return new Map(
    identifiers.map((athlete) => [
      athleteIdentifierKey(athlete.nome, athlete.categoria),
      athlete.id,
    ])
  );
}

function cell(value, styleId) {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  return `<Cell${style}><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`;
}

function row(cells, styleId) {
  return `      <Row>${cells.map((value) => cell(value, styleId)).join("")}</Row>`;
}

function columns(widths) {
  return widths.map((width) => `      <Column ss:Width="${width}"/>`).join("\n");
}

function worksheet(name, headers, rows, widths) {
  return `  <Worksheet ss:Name="${name}">
    <Table>
${columns(widths)}
${row(headers, "Header")}
${rows.map((item) => row(item)).join("\n")}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>`;
}

function buildAthleteRows() {
  const csv = fs.readFileSync(ATHLETES_CSV, "utf8");
  const officialIdentifiers = loadOfficialAthleteIdentifiers();
  return rowsToObjects(parseCsv(csv)).map((athlete) => [
    "FALSE",
    officialIdentifiers.get(athleteIdentifierKey(athlete.nome, athlete.categoria)) ||
      athlete.athlete_id,
    athlete.nome,
    athlete.categoria,
    athlete.modalidade_id,
  ]);
}

function buildWorkbook() {
  const athleteRows = buildAthleteRows();
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Dashboard Olympico</Author>
    <Created>2026-05-29T00:00:00Z</Created>
    <Company>Olympico Club</Company>
    <Version>1.0</Version>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#171D49" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
  </Styles>
${worksheet("Atletas", ATHLETES_HEADERS, athleteRows, [140, 120, 260, 180, 140])}
${worksheet("Em_Tratamento", TREATMENT_HEADERS, [["TRUE", "FALSE"]], [80, 80, 120, 210, 260, 180, 140, 150, 160, 160, 90, 150, 190, 150, 300, 160])}
${worksheet("Historico_Movimentacoes", HISTORY_HEADERS, [], [230, 160, 140, 210, 260, 180, 140, 130, 150, 160, 160, 90, 150, 300])}
${worksheet("Listas", LIST_ROWS[0], LIST_ROWS.slice(1), [150, 190])}
</Workbook>
`;
}

function buildPsychologyWorkbook() {
  const athleteRows = buildAthleteRows();
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Dashboard Olympico</Author>
    <Created>2026-05-29T00:00:00Z</Created>
    <Company>Olympico Club</Company>
    <Version>1.0</Version>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#171D49" ss:Pattern="Solid"/>
      <Alignment ss:Vertical="Center" ss:WrapText="1"/>
    </Style>
  </Styles>
${worksheet("Atletas", ATHLETES_HEADERS, athleteRows, [140, 120, 260, 180, 140])}
${worksheet("Em_Acompanhamento", PSYCHOLOGY_TREATMENT_HEADERS, [["TRUE", "FALSE"]], [80, 80, 120, 120, 260, 180, 140, 150, 170, 100, 150, 190, 150, 300, 160])}
${worksheet("Historico_Movimentacoes", PSYCHOLOGY_HISTORY_HEADERS, [], [230, 160, 140, 120, 260, 180, 140, 150, 150, 170, 100, 150, 300])}
${worksheet("Listas", PSYCHOLOGY_LIST_ROWS[0], PSYCHOLOGY_LIST_ROWS.slice(1), [150, 190])}
</Workbook>
`;
}

function xlsxCell(value, rowIndex, columnIndex, styleIndex = 0) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  const style = styleIndex ? ` s="${styleIndex}"` : "";
  return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(value)}</t></is></c>`;
}

function xlsxRows(rows, header) {
  const allRows = [header, ...rows];
  return allRows
    .map((cells, rowIndex) => {
      const excelRow = rowIndex + 1;
      const styleIndex = rowIndex === 0 ? 1 : 0;
      return `<row r="${excelRow}">${cells
        .map((value, columnIndex) => xlsxCell(value, excelRow, columnIndex + 1, styleIndex))
        .join("")}</row>`;
    })
    .join("");
}

function xlsxColumns(widths) {
  return `<cols>${widths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${Math.round(width / 7)}" customWidth="1"/>`
    )
    .join("")}</cols>`;
}

function xlsxWorksheet(headers, rows, widths) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  ${xlsxColumns(widths)}
  <sheetData>${xlsxRows(rows, headers)}</sheetData>
</worksheet>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = getDosDateTime();

  files.forEach((file) => {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.content, "utf8");
    const checksum = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localDirectory.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, end]);
}

function buildXlsxFiles() {
  const athleteRows = buildAthleteRows();
  const sheets = [
    {
      name: "Atletas",
      headers: ATHLETES_HEADERS,
      rows: athleteRows,
      widths: [140, 120, 260, 180, 140],
    },
    {
      name: "Em_Tratamento",
      headers: TREATMENT_HEADERS,
      rows: [["TRUE", "FALSE"]],
      widths: [80, 80, 120, 210, 260, 180, 140, 150, 160, 160, 90, 150, 190, 150, 300, 160],
    },
    {
      name: "Historico_Movimentacoes",
      headers: HISTORY_HEADERS,
      rows: [],
      widths: [230, 160, 140, 210, 260, 180, 140, 130, 150, 160, 160, 90, 150, 300],
    },
    {
      name: "Listas",
      headers: LIST_ROWS[0],
      rows: LIST_ROWS.slice(1),
      widths: [150, 190],
    },
  ];

  return [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n  ")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("\n    ")}
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("\n  ")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF171D49"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: xlsxWorksheet(sheet.headers, sheet.rows, sheet.widths),
    })),
  ];
}

function buildPsychologyXlsxFiles() {
  const athleteRows = buildAthleteRows();
  const sheets = [
    {
      name: "Atletas",
      headers: ATHLETES_HEADERS,
      rows: athleteRows,
      widths: [140, 120, 260, 180, 140],
    },
    {
      name: "Em_Acompanhamento",
      headers: PSYCHOLOGY_TREATMENT_HEADERS,
      rows: [["TRUE", "FALSE"]],
      widths: [80, 80, 120, 120, 260, 180, 140, 150, 170, 100, 150, 190, 150, 300, 160],
    },
    {
      name: "Historico_Movimentacoes",
      headers: PSYCHOLOGY_HISTORY_HEADERS,
      rows: [],
      widths: [230, 160, 140, 120, 260, 180, 140, 150, 150, 170, 100, 150, 300],
    },
    {
      name: "Listas",
      headers: PSYCHOLOGY_LIST_ROWS[0],
      rows: PSYCHOLOGY_LIST_ROWS.slice(1),
      widths: [150, 190],
    },
  ];

  return [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n  ")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (sheet, index) =>
          `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
      )
      .join("\n    ")}
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("\n  ")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF171D49"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`,
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: xlsxWorksheet(sheet.headers, sheet.rows, sheet.widths),
    })),
  ];
}

fs.writeFileSync(OUTPUT_XLS, buildWorkbook(), "utf8");
fs.writeFileSync(OUTPUT_XLSX, createZip(buildXlsxFiles()));
fs.mkdirSync(PSYCHOLOGY_DIR, { recursive: true });
fs.writeFileSync(PSYCHOLOGY_OUTPUT_XLS, buildPsychologyWorkbook(), "utf8");
fs.writeFileSync(PSYCHOLOGY_OUTPUT_XLSX, createZip(buildPsychologyXlsxFiles()));
console.log(`Workbook XLS criado em ${OUTPUT_XLS}`);
console.log(`Workbook XLSX criado em ${OUTPUT_XLSX}`);
console.log(`Workbook Psicologia XLS criado em ${PSYCHOLOGY_OUTPUT_XLS}`);
console.log(`Workbook Psicologia XLSX criado em ${PSYCHOLOGY_OUTPUT_XLSX}`);
