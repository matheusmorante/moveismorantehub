@echo off
title Configurar Agente de Impressao MoranteHub
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js LTS antes de configurar o agente.
  pause
  exit /b 1
)

echo Instalando dependencias do agente...
call npm install
if errorlevel 1 goto :failed

echo Instalando o Chromium necessario para gerar as folhas...
call npx playwright install chromium
if errorlevel 1 goto :failed

echo Compilando o agente...
call npm run build
if errorlevel 1 goto :failed

echo Configurando a inicializacao automatica do Windows...
call install-startup.bat
if errorlevel 1 goto :failed

echo Configuracao concluida. Abra o ERP neste computador e conecte esta estacao na tela Etiquetas.
pause
exit /b 0

:failed
echo A configuracao nao foi concluida. Confira a mensagem acima e tente novamente.
pause
exit /b 1
