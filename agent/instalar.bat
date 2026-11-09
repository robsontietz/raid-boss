@echo off
chcp 65001 >nul
title GUARDIAN RAID WATCH - Instalacao
cd /d "%~dp0"

echo ============================================================
echo   GUARDIAN RAID WATCH - instalacao do agente
echo ============================================================
echo.

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY (
  where python >nul 2>nul && set "PY=python"
)
if not defined PY (
  echo [ERRO] Python nao encontrado.
  echo Instale o Python 3.10 ou mais novo em https://www.python.org/downloads/
  echo e marque a opcao "Add python.exe to PATH" durante a instalacao.
  pause
  exit /b 1
)

echo Criando ambiente Python em .venv ...
%PY% -m venv .venv
if errorlevel 1 (
  echo [ERRO] Nao foi possivel criar o ambiente Python.
  pause
  exit /b 1
)

echo Instalando dependencias (pode levar alguns minutos)...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERRO] Falha ao instalar as dependencias. Verifique sua internet e tente de novo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Instalacao concluida! Agora execute: iniciar.bat
echo ============================================================
pause
