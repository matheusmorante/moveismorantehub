@echo off
echo Fetching... > reset_log.txt
git fetch --all >> reset_log.txt 2>&1
echo Resetting... >> reset_log.txt
git reset --hard @{u} >> reset_log.txt 2>&1
echo Installing... >> reset_log.txt
npm install >> reset_log.txt 2>&1
echo Done. >> reset_log.txt

