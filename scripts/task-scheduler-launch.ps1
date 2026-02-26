# Run start-production-pm2.bat hidden - no window popup
$batPath = "C:\Users\TempAdmin\zyntel\zyntel-dashboard\scripts\start-production-pm2.bat"
$workDir = "C:\Users\TempAdmin\zyntel\zyntel-dashboard"
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/c `"$batPath`""
$psi.WorkingDirectory = $workDir
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
[System.Diagnostics.Process]::Start($psi) | Out-Null
