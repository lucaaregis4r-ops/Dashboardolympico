@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_EXE="

if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE_EXE (
  echo.
  echo Nao encontrei o Node.js instalado nesta maquina.
  echo Instale o Node.js 18+ e tente novamente.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "& { $listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if ($listener) { $processIds = $listener | ForEach-Object { $_.OwningProcess } | Where-Object { $_ } | Select-Object -Unique; foreach ($processId in $processIds) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Seconds 2 }; $attempt = 0; while ($attempt -lt 10 -and (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 500; $attempt++ }; Start-Process -FilePath '%NODE_EXE%' -ArgumentList '\"%ROOT%server.js\"' -WorkingDirectory '%ROOT%' -WindowStyle Minimized; Start-Sleep -Seconds 3; $url = 'http://localhost:3000/?v=' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString(); Start-Process $url }"

exit /b 0
