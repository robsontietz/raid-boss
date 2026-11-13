@echo off
chcp 65001 >nul
title GUARDIAN RAID WATCH - Agente

rem O Lineage 2 costuma rodar como administrador. Sem a mesma permissao,
rem o Windows descarta os cliques do agente no botao RAID.
net session >nul 2>&1
if errorlevel 1 (
  echo Pedindo permissao de administrador para poder clicar no jogo...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo O agente ainda nao foi instalado. Executando instalar.bat ...
  call instalar.bat
)

".venv\Scripts\python.exe" agent.py
echo.
echo O agente foi encerrado.
pause
