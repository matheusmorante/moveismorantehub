@echo off
title Instalar Agente de Impressao na Inicializacao do Windows
echo ============================================================
echo   Instalando Morante Hub Print Agent no Inicializar...
echo ============================================================

set SCRIPT_DIR=%~dp0
set TARGET_VBS=%SCRIPT_DIR%start-silent.vbs
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MoranteHubPrintAgent.lnk

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_VBS%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.WindowStyle = 7; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo [SUCESSO] O Agente de Impressao foi configurado para iniciar automaticamente com o Windows!
    echo Local: %SHORTCUT_PATH%
) else (
    echo.
    echo [ERRO] Falha ao criar o atalho de inicializacao.
)

echo.
pause
