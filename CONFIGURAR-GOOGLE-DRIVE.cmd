@echo off
cd /d "%~dp0"
echo Configurando acesso privado ao Google Drive...
if "%~1"=="" (
  node scripts\configure-google-drive.js
) else (
  node scripts\configure-google-drive.js --client-file="%~1"
)
echo.
pause
