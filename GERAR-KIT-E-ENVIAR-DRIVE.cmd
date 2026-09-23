@echo off
cd /d "%~dp0"
echo Gerando o kit de PDFs e enviando para o Google Drive...
node scripts\create-report-kit.js --upload-drive
echo.
pause
