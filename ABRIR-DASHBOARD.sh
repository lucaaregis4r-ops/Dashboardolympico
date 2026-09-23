#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd -- "$PROJECT_DIR"

# Atalhos do menu nao carregam o perfil do terminal nem o PATH do nvm.
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nao encontrado. Instale o Node.js 22 ou superior e tente novamente."
  exit 1
fi
if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 18 ? 0 : 1)'; then
  echo "Este dashboard precisa do Node.js 18 ou superior (recomendado: 22)."
  exit 1
fi

if [ "${1:-}" = "--install-shortcut" ]; then
  exec node scripts/install-linux-launcher.js
fi

echo "Iniciando Dashboard Olympico. Mantenha este terminal aberto; Ctrl+C encerra o servidor."
exec node src/server/index.js --open "$@"
