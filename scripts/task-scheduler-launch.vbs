' Run start-production-pm2.bat hidden (no CMD window popup)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\TempAdmin\zyntel\zyntel-dashboard"
WshShell.Run "cmd.exe /c scripts\start-production-pm2.bat", 0, False
