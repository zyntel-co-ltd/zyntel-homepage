# Run start-production-pm2.bat after delay (VM boot: wait for network/services)
# Logs to backend\logs\startup-on-boot.log for debugging
$logDir = "C:\Users\TempAdmin\zyntel\zyntel-dashboard\backend\logs"
$logFile = Join-Path $logDir "startup-on-boot.log"
$batPath = "C:\Users\TempAdmin\zyntel\zyntel-dashboard\scripts\start-production-pm2.bat"
$workDir = "C:\Users\TempAdmin\zyntel\zyntel-dashboard"

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
function Log { param($m) "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $m" | Add-Content $logFile }
Log "=== Startup ==="
Log "Waiting 2 min for VM init..."
Start-Sleep -Seconds 120
Log "Starting production..."

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c `"$batPath`""
$psi.WorkingDirectory = $workDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
try {
  $p = [System.Diagnostics.Process]::Start($psi)
  $p.WaitForExit(300000)
  Log "Exit: $($p.ExitCode)"
  exit $p.ExitCode
} catch { Log "ERROR: $_"; exit 1 }
