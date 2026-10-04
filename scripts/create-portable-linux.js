const fs = require("fs/promises");
const path = require("path");

const root = path.resolve(__dirname, "..");
const target = path.join(root, "dist-linux");
const launcher = `#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${'${BASH_SOURCE[0]}'}")" && pwd)"
cd -- "$PROJECT_DIR"
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${'${NVM_DIR:-$HOME/.nvm}'}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then set +u; . "$NVM_DIR/nvm.sh"; set -u; fi
fi
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo "Node.js 18 ou superior é necessário (recomendado: 22)." >&2
  exit 1
fi
exec node "$PROJECT_DIR/src/server/index.js" --open "$@"
`;

async function main() {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  for (const directory of ["src", "assets", "data", "docs"]) {
    await fs.cp(path.join(root, directory), path.join(target, directory), { recursive: true });
  }
  const script = path.join(target, "Dashboard-Olympico");
  await fs.writeFile(script, launcher);
  await fs.chmod(script, 0o755);
  await fs.writeFile(path.join(target, "LEIA-ME.txt"), "Dashboard Olympico para Linux. Requer Node.js 18+ (recomendado: 22). Execute ./Dashboard-Olympico. Copie a pasta dist-linux inteira. PDFs requerem Chrome ou Chromium.\n");
  console.log(`Pacote Linux criado em ${target}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
