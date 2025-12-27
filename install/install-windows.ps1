# FocusAI Windows Installer (PowerShell)
# Run as Administrator: powershell -ExecutionPolicy Bypass -File install-windows.ps1

param(
    [string]$InstallPath = "$env:ProgramFiles\FocusAI"
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    Write-Info "Right-click PowerShell and select 'Run as Administrator'"
    exit 1
}

Write-Header "FocusAI Windows Installation Wizard"

# Check for Node.js
Write-Info "Checking for Node.js..."
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Node.js not found. Installing..."
    try {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        Write-Success "Node.js installed"
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error "Failed to install Node.js. Please install manually from https://nodejs.org"
        exit 1
    }
} else {
    $nodeVersion = node --version
    Write-Success "Node.js already installed: $nodeVersion"
}

# Check for Python
Write-Info "Checking for Python..."
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Warning "Python not found. Installing..."
    try {
        winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
        Write-Success "Python installed"
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } catch {
        Write-Error "Failed to install Python. Please install manually from https://python.org"
        exit 1
    }
} else {
    $pythonVersion = python --version
    Write-Success "Python already installed: $pythonVersion"
}

# Install pnpm
Write-Info "Installing pnpm..."
npm install -g pnpm | Out-Null
Write-Success "pnpm installed"

# Create installation directory
Write-Info "Creating installation directory: $InstallPath"
if (Test-Path $InstallPath) {
    Write-Warning "Installation directory already exists. Removing..."
    Remove-Item -Path $InstallPath -Recurse -Force
}
New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null

# Copy files
Write-Info "Copying application files..."
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Copy-Item -Path "$scriptDir\ai" -Destination "$InstallPath\ai" -Recurse -Force
Copy-Item -Path "$scriptDir\focuaibackend" -Destination "$InstallPath\focuaibackend" -Recurse -Force
Copy-Item -Path "$scriptDir\Frontend" -Destination "$InstallPath\Frontend" -Recurse -Force
Copy-Item -Path "$scriptDir\focuai" -Destination "$InstallPath\focuai" -Recurse -Force
Copy-Item -Path "$scriptDir\package.json" -Destination "$InstallPath\" -Force
Copy-Item -Path "$scriptDir\README.md" -Destination "$InstallPath\" -Force
Write-Success "Files copied"

# Get API Key
Write-Header "API Configuration"
Write-Info "You can get a Groq API key from: https://console.groq.com/keys"
$groqKey = Read-Host "Enter your Groq API Key"

if ([string]::IsNullOrWhiteSpace($groqKey)) {
    Write-Error "Groq API key is required"
    exit 1
}

# Setup Backend
Write-Header "Setting up Backend"
Set-Location "$InstallPath\focuaibackend"
Write-Info "Installing backend dependencies... (this may take a few minutes)"
pnpm install --no-frozen-lockfile | Out-Null
if (Test-Path ".env.example") {
    (Get-Content ".env.example") -replace 'GROQ_API_KEY=.*', "GROQ_API_KEY=$groqKey" | Set-Content ".env"
} else {
    "GROQ_API_KEY=$groqKey" | Set-Content ".env"
}
Write-Success "Backend ready"

# Setup Frontend
Write-Header "Setting up Frontend"
Set-Location "$InstallPath\Frontend"
Write-Info "Installing frontend dependencies... (please wait)"
pnpm install --no-frozen-lockfile | Out-Null
if (Test-Path ".env.example") {
    (Get-Content ".env.example") -replace 'VITE_GROQ_API_KEY=.*', "VITE_GROQ_API_KEY=$groqKey" | Set-Content ".env"
} else {
    "VITE_GROQ_API_KEY=$groqKey" | Set-Content ".env"
}
Write-Success "Frontend ready"

# Setup AI Service
Write-Header "Setting up AI Service"
Set-Location "$InstallPath\ai"
Write-Info "Creating Python virtual environment..."
python -m venv venv
Write-Info "Installing AI dependencies... (this will take a moment)"
& ".\venv\Scripts\Activate.ps1"
pip install -r requirements.txt | Out-Null
if (Test-Path ".env.example") {
    (Get-Content ".env.example") -replace 'GROQ_API_KEY=.*', "GROQ_API_KEY=$groqKey" | Set-Content ".env"
} else {
    "GROQ_API_KEY=$groqKey" | Set-Content ".env"
}
deactivate
Write-Success "AI service ready"

# Create startup script
Write-Info "Creating startup script..."
$startScript = @"
@echo off
title FocusAI
echo Starting FocusAI...
echo.

start /B cmd /c "cd /d `"$InstallPath\focuaibackend`" && node server.js"
timeout /t 3 /nobreak > nul

start /B cmd /c "cd /d `"$InstallPath\Frontend`" && pnpm dev"
timeout /t 3 /nobreak > nul

start /B cmd /c "cd /d `"$InstallPath\ai`" && venv\Scripts\activate && python main.py"

echo.
echo FocusAI is starting...
echo Backend: http://localhost:5001
echo Frontend: http://localhost:8080
echo.
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak > nul
start http://localhost:8080
"@

$startScript | Out-File -FilePath "$InstallPath\start-focusai.bat" -Encoding ASCII

# Create desktop shortcut
Write-Info "Creating desktop shortcut..."
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\FocusAI.lnk")
$Shortcut.TargetPath = "$InstallPath\start-focusai.bat"
$Shortcut.WorkingDirectory = "$InstallPath"
$Shortcut.Description = "FocusAI - AI-Powered Productivity Assistant"
$Shortcut.Save()

# Create Start Menu shortcut
Write-Info "Creating Start Menu shortcut..."
$startMenuPath = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\FocusAI"
New-Item -ItemType Directory -Path $startMenuPath -Force | Out-Null
$Shortcut = $WshShell.CreateShortcut("$startMenuPath\FocusAI.lnk")
$Shortcut.TargetPath = "$InstallPath\start-focusai.bat"
$Shortcut.WorkingDirectory = "$InstallPath"
$Shortcut.Description = "FocusAI - AI-Powered Productivity Assistant"
$Shortcut.Save()

Write-Header "Installation Complete!"
Write-Success "FocusAI has been installed successfully!"
Write-Host ""
Write-Info "Installation Details:"
Write-Host "  • Installation Directory: $InstallPath"
Write-Host "  • Desktop Shortcut: Created"
Write-Host "  • Start Menu: FocusAI"
Write-Host ""
Write-Info "To start FocusAI:"
Write-Host "  • Double-click the desktop shortcut, OR"
Write-Host "  • Run: $InstallPath\start-focusai.bat"
Write-Host ""
Write-Info "Access FocusAI:"
Write-Host "  • Frontend: http://localhost:8080"
Write-Host "  • Backend API: http://localhost:5001"
Write-Host ""
Write-Success "Enjoy using FocusAI! 🚀"
Write-Host ""

# Ask to start now
$response = Read-Host "Do you want to start FocusAI now? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    Start-Process "$InstallPath\start-focusai.bat"
}
