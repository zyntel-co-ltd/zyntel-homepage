@echo off
REM Zyntel Dashboard - Production startup with PM2
REM Run this for first-time setup or after VM reboot.
REM For deploying updates without stopping, use: scripts\deploy.bat

cd /d "%~dp0.."

REM Build frontend
echo Building frontend...
call npm run build --prefix frontend
if errorlevel 1 (
  echo Frontend build failed.
  exit /b 1
)

REM Build backend
cd backend
echo Building backend...
call npm run build
if errorlevel 1 (
  echo Backend build failed.
  exit /b 1
)
cd ..

REM Start or restart with PM2 (no need to stop first)
echo Starting production server with PM2...
call pm2 restart ecosystem.config.cjs --env production 2>nul
if errorlevel 1 (
  call pm2 start ecosystem.config.cjs --env production
)
if errorlevel 1 (
  echo PM2 not found. Install with: npm install -g pm2
  exit /b 1
)

echo.
echo Done. Server running. Use "pm2 status" to check. Use "scripts\deploy.bat" for future updates.
