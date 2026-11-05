# Registers the "Neno Auto Blog" scheduled task: runs `npm run blog:auto` in this project every 15 minutes.
# Each check exits in seconds unless a post is due (the schedule itself - every N days after the preferred time,
# or this week's random "posts per week" plan - lives in the database and is applied by runAutoBlog()).
# Run from an Administrator PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\register-auto-blog.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\register-auto-blog.ps1 -WakeToRun
# -WakeToRun wakes a sleeping PC for every check (96 times a day), which in practice keeps it from sleeping.
# Without it, a slot missed while asleep runs at the next check after the PC wakes (or moves to another day).
# Re-running the script replaces the existing task.
param(
    [switch]$WakeToRun
)
$ErrorActionPreference = "Stop"

$TaskName = "Neno Auto Blog"
$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $Npm) { throw "npm.cmd not found in PATH. Install Node.js or open a new terminal." }

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw "Run this script from PowerShell opened with 'Run as administrator'." }

$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"`"$Npm`" run blog:auto`"" -WorkingDirectory $ProjectDir
# Starts today at 00:00 and repeats every 15 minutes indefinitely (no -RepetitionDuration = no end).
$trigger = New-ScheduledTaskTrigger -Once -At ([DateTime]::Today) -RepetitionInterval (New-TimeSpan -Minutes 15)
$settingsArgs = @{
    StartWhenAvailable         = $true
    ExecutionTimeLimit         = (New-TimeSpan -Hours 2)  # "All at once" batches of up to 10 posts
    AllowStartIfOnBatteries    = $true
    DontStopIfGoingOnBatteries = $true
    MultipleInstances          = "IgnoreNew"
}
if ($WakeToRun) { $settingsArgs.WakeToRun = $true }
$settings = New-ScheduledTaskSettingsSet @settingsArgs

# S4U = "Run whether user is logged on or not" + "Do not store password". Internet access works;
# Windows toasts can't show while logged off (email via RESEND_API_KEY still does).
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
    -Description "Neno Content Engine: checks every 15 minutes and writes a blog post when one is due (npm run blog:auto)" -Force | Out-Null

Write-Host "Registered '$TaskName': every 15 minutes, in $ProjectDir (wake PC: $([bool]$WakeToRun))"
Write-Host "Test it now:  Start-ScheduledTask -TaskName '$TaskName'   (logs: $ProjectDir\logs\auto-blog)"
