const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(ROOT, "output", "reports");
const DEFAULT_REPORTS_DIR = path.join(REPORTS_ROOT, "2026-06-18-original");
const FALLBACK_REPORTS_DIR = path.join(REPORTS_ROOT, "2026-06-18-copy");
const OUTPUT_DIR_NAME = "_envio";
const MANIFEST_FILE = "controle-envio-relatorios.csv";
const WHATSAPP_FILE = "links-whatsapp.md";

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripPdfExtension(fileName) {
  return fileName.replace(/\.pdf$/i, "");
}

function teamFromFileName(fileName) {
  return normalizeText(stripPdfExtension(fileName).replace(/^Relat[oó]rio\s+/i, ""));
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

function readExistingManifest(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return new Map();
  }

  const text = fsSync.readFileSync(filePath, "utf8");
  const rows = parseCsv(text).filter((row) => row.some((cell) => normalizeText(cell)));
  const [header = [], ...items] = rows;
  const indexes = header.reduce((map, column, index) => {
    map[normalizeText(column)] = index;
    return map;
  }, {});

  return items.reduce((map, row) => {
    const team = normalizeText(row[indexes.equipe]);
    if (!team) {
      return map;
    }

    map.set(team.toUpperCase(), {
      treinador: normalizeText(row[indexes.treinador]),
      telefone: normalizeText(row[indexes.telefone]),
      link_drive: normalizeText(row[indexes.link_drive]),
      status_envio: normalizeText(row[indexes.status_envio]),
      observacoes: normalizeText(row[indexes.observacoes]),
    });
    return map;
  }, new Map());
}

function cleanPhone(value) {
  return normalizeText(value).replace(/[^\d]/g, "");
}

function buildMessage(row) {
  const greeting = row.treinador ? `Ola, ${row.treinador}.` : "Ola.";
  const linkLine = row.link_drive
    ? `Segue o relatorio da equipe ${row.equipe}: ${row.link_drive}`
    : `Segue o relatorio da equipe ${row.equipe}.`;

  return `${greeting}\n${linkLine}\n\nQualquer duvida, fico a disposicao.`;
}

function buildWhatsappUrl(row) {
  const phone = cleanPhone(row.telefone);
  if (!phone) {
    return "";
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(row.mensagem)}`;
}

function toCsv(rows) {
  const header = [
    "equipe",
    "arquivo_pdf",
    "treinador",
    "telefone",
    "link_drive",
    "status_envio",
    "observacoes",
    "mensagem",
    "whatsapp_url",
  ];
  const lines = [header.join(",")];

  rows.forEach((row) => {
    lines.push(header.map((column) => escapeCsv(row[column])).join(","));
  });

  return `${lines.join("\n")}\n`;
}

function buildWhatsappMarkdown(rows, reportsDir) {
  const lines = [
    "# Links de envio dos relatorios",
    "",
    `Pasta de origem: ${reportsDir}`,
    "",
    "Preencha `treinador`, `telefone` e `link_drive` no CSV, depois rode o script de novo para gerar links completos.",
    "",
  ];

  rows.forEach((row) => {
    lines.push(`## ${row.equipe}`);
    lines.push(`- PDF: ${row.arquivo_pdf}`);
    lines.push(`- Treinador: ${row.treinador || "preencher"}`);
    lines.push(`- Drive: ${row.link_drive || "preencher"}`);
    lines.push(`- Status: ${row.status_envio || "pendente"}`);
    lines.push(row.whatsapp_url ? `- WhatsApp: ${row.whatsapp_url}` : "- WhatsApp: preencher telefone no CSV");
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

function resolveReportsDir() {
  const argPath = process.argv.slice(2).join(" ");
  if (argPath) {
    return path.resolve(ROOT, argPath);
  }

  if (fsSync.existsSync(FALLBACK_REPORTS_DIR)) {
    return FALLBACK_REPORTS_DIR;
  }

  return DEFAULT_REPORTS_DIR;
}

async function main() {
  const reportsDir = resolveReportsDir();
  const entries = await fs.readdir(reportsDir, { withFileTypes: true });
  const pdfFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, "pt-BR"));

  if (!pdfFiles.length) {
    throw new Error(`Nenhum PDF encontrado em ${reportsDir}`);
  }

  const outputDir = path.join(reportsDir, OUTPUT_DIR_NAME);
  const manifestPath = path.join(outputDir, MANIFEST_FILE);
  const whatsappPath = path.join(outputDir, WHATSAPP_FILE);
  const existing = readExistingManifest(manifestPath);

  const rows = pdfFiles.map((fileName) => {
    const equipe = teamFromFileName(fileName);
    const previous = existing.get(equipe.toUpperCase()) || {};
    const row = {
      equipe,
      arquivo_pdf: fileName,
      treinador: previous.treinador || "",
      telefone: previous.telefone || "",
      link_drive: previous.link_drive || "",
      status_envio: previous.status_envio || "pendente",
      observacoes: previous.observacoes || "",
      mensagem: "",
      whatsapp_url: "",
    };
    row.mensagem = buildMessage(row);
    row.whatsapp_url = buildWhatsappUrl(row);
    return row;
  });

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(manifestPath, toCsv(rows), "utf8");
  await fs.writeFile(whatsappPath, buildWhatsappMarkdown(rows, reportsDir), "utf8");

  console.log(`PDFs encontrados: ${rows.length}`);
  console.log(`Controle: ${manifestPath}`);
  console.log(`Links: ${whatsappPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
