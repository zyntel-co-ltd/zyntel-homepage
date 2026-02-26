@echo off
REM Zyntel Dashboard - Deploy without stopping the server
REM Pulls latest code, rebuilds, and reloads PM2 (zero-downtime).
REM Server stays online during the entire process.

cd /d "%~dp0.."

echo === Pulling latest code ===
call git pull origin main
if errorlevel 1 (
  echo Git pull failed. Fix conflicts or check network.
  exit /b 1
)

echo.
echo === Building frontend ===
call npm run build --prefix frontend
if errorlevel 1 (
  echo Frontend build failed.
  exit /b 1
)

echo.
echo === Building backend ===
cd backend
call npm run build
if errorlevel 1 (
  echo Backend build failed.
  exit /b 1
)
cd ..

echo.
echo === Reloading PM2 (zero-downtime) ===
call pm2 reload ecosystem.config.cjs --env production
if errorlevel 1 (
  echo PM2 reload failed. Is the app running? Try "scripts\start-production-pm2.bat" first.
  exit /b 1
)

echo.
echo === Deploy complete. Server was never offline. ===
call pm2 status
