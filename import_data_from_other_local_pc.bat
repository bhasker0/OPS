@echo off
echo ========================================================
echo   IMPORT DATA FROM OTHER LOCAL PC (OPS & ETMS PLATFORM)
echo ========================================================
echo.
echo [1/4] Pulling latest git repository updates and snapshots...
cd /d "%~dp0"
git pull origin testing

echo.
echo [2/4] Verifying database dependencies...
cd backend
call npm install --silent

echo.
echo [3/4] Ensuring database schema is up-to-date...
call npx prisma db push --skip-generate

echo.
echo [4/4] Importing latest database records, seed parameters, and users...
node scripts/import_data_from_other_local_pc.js

echo.
echo ========================================================
echo   IMPORT COMPLETE! All data from the other PC is synced!
echo ========================================================
pause
