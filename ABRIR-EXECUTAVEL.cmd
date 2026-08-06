@echo off
setlocal

set "ROOT=%~dp0"
set "APP=%ROOT%dist\Dashboard-Olympico.exe"

if not exist "%APP%" (
  echo.
  echo Ainda nao existe dist\Dashboard-Olympico.exe.
  echo Rode COMPILAR-EXECUTAVEL.cmd primeiro.
  echo.
  pause
  exit /b 1
)

start "" "%APP%" --open
exit /b 0
