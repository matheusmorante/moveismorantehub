@echo off
chcp 65001
mkdir assets 2>nul
copy /y "assets\icon.png" "assets\adaptive-icon.png"
copy /y "assets\icon.png" "assets\favicon.png"
copy /y "assets\icon.png" "assets\logo-morante.png"
echo Assets atualizados com sucesso.
