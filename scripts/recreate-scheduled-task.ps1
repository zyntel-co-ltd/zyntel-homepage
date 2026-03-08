# Recreate Zyntel Dashboard scheduled task for VM boot
# Run this script as Administrator to fix app not restarting on VM reboot.
# The task will run 2 minutes after system startup to allow services to initialize.

$taskName = "ZyntelDashboardPipeline"
$scriptPath = "C:\Users\TempAdmin\zyntel\zyntel-dashboard\scripts\task-scheduler-launch.ps1"
$workDir = "C:\Users\TempAdmin\zyntel\zyntel-dashboard"

Write-Host "Deleting existing task '$taskName'..." -ForegroundColor Yellow
schtasks /delete /tn $taskName /f 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  (Task may not have existed)" -ForegroundColor Gray }

Write-Host "Creating new task '$taskName'..." -ForegroundColor Green
# /sc ONSTART = at system startup
# /ru = run as current user (omit to use current user, or use SYSTEM for machine context)
$result = schtasks /create /tn $taskName /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`"" /sc ONSTART /f

if ($LASTEXITCODE -eq 0) {
    Write-Host "Task created successfully." -ForegroundColor Green
    Write-Host "The app will start ~2 minutes after VM boot. Check backend\logs\startup-on-boot.log if it fails."
} else {
    Write-Host "Task creation failed. You may need to run as Administrator." -ForegroundColor Red
    Write-Host "If NHL user requires 'Run whether user is logged on', run schtasks interactively and enter password."
}
