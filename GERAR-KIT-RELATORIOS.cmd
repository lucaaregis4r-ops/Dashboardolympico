@echo off
cd /d "%~dp0"
echo Gerando kit de PDFs dos relatorios...
node scripts\create-report-kit.js
echo.
pause
