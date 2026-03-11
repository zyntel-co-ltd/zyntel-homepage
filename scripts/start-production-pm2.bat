@echo off
REM Zyntel Dashboard - Production startup with PM2
REM Run this for first-time setup or after VM reboot.
REM For deploying updates without stopping, use: scripts\deploy.bat

cd /d "%~dp0.."

REM Ensure Python is available for LabGuru scripts (PM2/Task Scheduler may not inherit PATH)
REM Try to get full Python path so Node can spawn it reliably
set PYTHON_PATH=
for /f "delims=" %%i in ('py -3.11 -c "import sys; print(sys.executable)" 2^>nul') do set PYTHON_PATH=%%i
if not defined PYTHON_PATH for /f "delims=" %%i in ('python -c "import sys; print(sys.executable)" 2^>nul') do set PYTHON_PATH=%%i
if not defined PYTHON_PATH for /f "delims=" %%i in ('where python 2^>nul') do set PYTHON_PATH=%%i
if defined PYTHON_PATH (
  echo Python found: %PYTHON_PATH%
) else (
  echo WARNING: Python not found. LabGuru insights will show partial data. Set PYTHON_PATH in backend\.env to full path.
)

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
