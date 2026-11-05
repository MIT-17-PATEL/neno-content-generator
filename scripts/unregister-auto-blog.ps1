# Removes the "Neno Auto Blog" scheduled task. Run from an Administrator PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\unregister-auto-blog.ps1
$ErrorActionPreference = "Stop"
$TaskName = "Neno Auto Blog"
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed '$TaskName'."
} else {
    Write-Host "'$TaskName' is not registered."
}
