@echo off
echo Starting AEVORA...
echo.

echo [1/3] Starting Ollama...
start "Ollama" cmd /k "ollama serve"
timeout /t 3 /nobreak > nul

echo [2/3] Starting API...
start "AEVORA API" cmd /k "cd apps\api && npm run dev"
timeout /t 5 /nobreak > nul

echo [3/3] Starting Web Dashboard...
start "AEVORA Web" cmd /k "cd apps\web && npm run dev"

echo.
echo AEVORA is starting...
echo API:  http://localhost:3000
echo Web:  http://localhost:3001
echo.
echo Open Chrome and go to http://localhost:3001
pause
