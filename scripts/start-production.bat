@echo off
REM Zyntel Dashboard - Production startup script
REM Run this via Task Scheduler at system startup for auto-restart on VM reboot

cd /d "%~dp0.."

REM Build frontend
echo Building frontend...
call npm run build --prefix frontend
if errorlevel 1 (
  echo Frontend build failed.
  exit /b 1
)

REM Build and start backend (serves frontend in production)
cd backend
echo Building backend...
call npm run build
if errorlevel 1 (
  echo Backend build failed.
  exit /b 1
)

echo Starting production server...
set NODE_ENV=production
set PORT=5000
call npm start
