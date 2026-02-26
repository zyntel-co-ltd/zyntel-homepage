@echo off
REM Launcher for Task Scheduler - no arguments needed.
REM Use this as the Program in Task Scheduler; leave Arguments blank.
cd /d "%~dp0.."
call scripts\start-production-pm2.bat
