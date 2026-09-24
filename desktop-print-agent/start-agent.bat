@echo off
title Morante Hub - Agente de Impressao Windows
cd /d "%~dp0"
echo =======================================================
echo   Iniciando Morante Hub Print Agent...
echo =======================================================
node dist/server.js
pause
