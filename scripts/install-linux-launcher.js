const fs = require("fs/promises");
const os = require("os");
const path = require("path");

// Escape separado para valores .desktop e argumentos do campo Exec.
function desktopValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

function execArgument(value) {
  return desktopValue(`"${value.replace(/[\\"`$]/g, "\\$&").replace(/%/g, "%%")}"`);
}

async function main() {
  if (process.platform !== "linux") throw new Error("Este atalho e exclusivo do Linux.");
  const root = path.resolve(__dirname, "..");
  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  const target = path.join(dataHome, "applications", "dashboard-olympico.desktop");
  const contents = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=Dashboard Olympico",
    "Comment=Atletas, presenca e fisioterapia do Olympico Club",
    `Exec=${execArgument(process.execPath)} ${execArgument(path.join(root, "src", "server", "index.js"))} --open`,
    `Path=${desktopValue(root)}`,
    `Icon=${desktopValue(path.join(root, "assets", "olympico-crest.png"))}`,
    "Terminal=true",
    "Categories=Office;",
    "",
  ].join("\n");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents, { mode: 0o755 });
  console.log(`Atalho instalado: ${target}`);
  console.log('Procure "Dashboard Olympico" no menu de aplicativos.');
  console.log("Se mover a pasta ou trocar a instalacao do Node.js, instale o atalho novamente.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
