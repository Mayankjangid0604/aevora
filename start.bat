@echo off
title AEVORA - SAAHVIK Tech
echo.
echo  ================================================
echo   AEVORA - SAAHVIK Tech AI Business System
echo  ================================================
echo.

echo [1/3] Checking Ollama...
ollama list > nul 2>&1
if errorlevel 1 (
  echo ERROR: Ollama not running. Starting it...
  start "Ollama" cmd /k "ollama serve"
  timeout /t 5 /nobreak > nul
) else (
  echo Ollama: OK
)

echo [2/3] Starting API backend...
start "AEVORA API" cmd /k "cd /d %~dp0apps\api && npm run dev"
timeout /t 8 /nobreak > nul

echo [3/3] Starting Web dashboard...
start "AEVORA Web" cmd /k "cd /d %~dp0apps\web && npm run dev"
timeout /t 5 /nobreak > nul

echo.
echo  ================================================
echo   AEVORA is starting up...
echo.
echo   Dashboard: http://localhost:3001
echo   API:       http://localhost:13000
echo   Health:    http://localhost:13000/health
echo.
echo   Login: jangidmayank768@gmail.com
echo  ================================================
echo.
echo Opening Chrome...
timeout /t 8 /nobreak > nul
start chrome http://localhost:3001
