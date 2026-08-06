@echo off
cd /d "%~dp0"
echo Preparando controle de envio dos relatorios...
node scripts\prepare-report-delivery.js "Relatório dia 18 Junho"
echo.
pause
