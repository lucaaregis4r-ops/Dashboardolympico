@echo off
cd /d "%~dp0"
echo Preparando controle de envio dos relatorios...
node scripts\prepare-report-delivery.js "output\reports\2026-06-18-original"
echo.
pause
