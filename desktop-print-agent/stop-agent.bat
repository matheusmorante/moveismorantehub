@echo off
title Parar Agente de Impressao Windows
echo ============================================================
echo   Encerrando Morante Hub Print Agent (Porta 40405)...
echo ============================================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :40405') do (
    echo Finalizando processo PID %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo [OK] Agente de impressao finalizado com sucesso.
pause
