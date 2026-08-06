$nodeCandidates = @(
  "C:\Program Files\nodejs\node.exe",
  "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodePath = $nodeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $nodePath) {
  Write-Error "Nao encontrei o Node.js instalado. Instale o Node 18+ para iniciar o dashboard."
  exit 1
}

& $nodePath "$PSScriptRoot\src\server\index.js"
