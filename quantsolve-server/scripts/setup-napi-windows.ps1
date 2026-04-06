param(
    [switch]$Install
)

$ErrorActionPreference = 'Stop'

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) {
    Write-Host "vswhere not found. Install Visual Studio Installer first." -ForegroundColor Red
    exit 1
}

$vs = & $vswhere -latest -products * -format json | ConvertFrom-Json | Select-Object -First 1
if (-not $vs) {
    Write-Host "No Visual Studio installation found." -ForegroundColor Red
    exit 1
}

$installPath = $vs.installationPath
$vcToolsPath = Join-Path $installPath "VC\Tools\MSVC"
$sdkPath = "C:\Program Files (x86)\Windows Kits\10\Include"
$installer = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe"

$hasVcTools = Test-Path $vcToolsPath
$hasSdk = Test-Path $sdkPath

Write-Host "Visual Studio: $($vs.displayName)" -ForegroundColor Cyan
Write-Host "Install path : $installPath" -ForegroundColor Cyan
Write-Host "MSVC tools   : $hasVcTools"
Write-Host "Windows SDK  : $hasSdk"

if ($hasVcTools -and $hasSdk) {
    Write-Host "N-API toolchain prerequisites look good." -ForegroundColor Green
    exit 0
}

Write-Host "Missing required components for node-gyp." -ForegroundColor Yellow
Write-Host "Need: Desktop development with C++ workload, MSVC v143 toolset, Windows 10/11 SDK." -ForegroundColor Yellow

if (-not $Install) {
    Write-Host "Run with -Install to attempt unattended install via vs_installer." -ForegroundColor Yellow
    exit 2
}

if (-not (Test-Path $installer)) {
    Write-Host "vs_installer.exe not found: $installer" -ForegroundColor Red
    exit 1
}

Write-Host "Installing required Visual Studio C++ components..." -ForegroundColor Cyan

& $installer modify `
    --installPath "$installPath" `
    --add Microsoft.VisualStudio.Workload.NativeDesktop `
    --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    --add Microsoft.VisualStudio.Component.Windows11SDK.22621 `
    --includeRecommended `
    --passive `
    --norestart

Write-Host "Installer command completed. A reboot may be required." -ForegroundColor Cyan
