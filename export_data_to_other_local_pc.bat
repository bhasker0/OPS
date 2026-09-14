@echo off
echo ========================================================
echo   EXPORT DATA TO OTHER LOCAL PC (OPS & ETMS PLATFORM)
echo ========================================================
echo.
echo [1/3] Exporting full database snapshot (Prisma + Mongo)...
cd /d "%~dp0backend"
node scripts/export_data_snapshot.js

echo.
echo [2/3] Staging updated snapshot in Git...
cd /d "%~dp0"
git add data_snapshots/latest_snapshot.json

echo.
echo [3/3] Committing and pushing snapshot to Git...
git commit -m "chore: update data snapshot from local PC"
git push origin testing

echo.
echo ========================================================
echo   EXPORT COMPLETE! Data snapshot pushed to Git testing branch!
echo   You can now run 'import data from other local PC' on any other machine.
echo ========================================================
pause
