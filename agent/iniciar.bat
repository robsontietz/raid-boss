@echo off
chcp 65001 >nul
title GUARDIAN RAID WATCH - Agente
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo O agente ainda nao foi instalado. Executando instalar.bat ...
  call instalar.bat
)

".venv\Scripts\python.exe" agent.py
echo.
echo O agente foi encerrado.
pause
