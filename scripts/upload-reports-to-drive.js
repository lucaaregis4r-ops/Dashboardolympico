const path = require("path");
const fs = require("fs");
const { uploadReportDirectory } = require("./google-drive");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_ROOT = path.join(ROOT, "output", "reports");

function getArgValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function latestReportDirectory() {
  const candidates = fs
    .readdirSync(REPORTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      path: path.join(REPORTS_ROOT, entry.name),
      modifiedAt: fs.statSync(path.join(REPORTS_ROOT, entry.name)).mtimeMs,
    }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
  if (!candidates.length) throw new Error(`Nenhuma pasta de relatorios encontrada em ${REPORTS_ROOT}`);
  return candidates[0].path;
}

const requestedDirectory = getArgValue("dir");
const reportDirectory = requestedDirectory ? path.resolve(requestedDirectory) : latestReportDirectory();

uploadReportDirectory(reportDirectory, {
  parentFolderId: getArgValue("drive-parent-id"),
}).then((result) => {
  console.log(`Upload concluido: ${result.folder.webViewLink || result.folder.id}`);
}).catch((error) => {
  console.error(error.message || error);
  if (String(error.message || error).includes("Credencial OAuth nao encontrado")) {
    console.error("Execute CONFIGURAR-GOOGLE-DRIVE.cmd uma vez antes do primeiro envio.");
  }
  process.exitCode = 1;
});
