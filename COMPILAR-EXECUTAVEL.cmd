@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo Nao encontrei o npm nesta maquina.
  echo Instale o Node.js 20+ para compilar o executavel.
  echo.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%v"
if %NODE_MAJOR% LSS 14 (
  echo.
  echo Node.js encontrado, mas a versao e antiga.
  node --version
  echo.
  echo Instale o Node.js 14 ou superior para montar o pacote portatil.
  echo.
  pause
  exit /b 1
)

echo.
echo Gerando pacote portatil em dist\...
call npm run build:win
if errorlevel 1 (
  echo.
  echo Falha ao gerar o pacote portatil.
  pause
  exit /b 1
)

echo.
echo Pacote gerado em:
echo %ROOT%dist
echo.
echo Copie a pasta dist inteira para outros computadores.
echo.
pause
