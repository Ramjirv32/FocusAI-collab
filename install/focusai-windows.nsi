; FocusAI Windows Installer Script
; Requires NSIS (Nullsoft Scriptable Install System)

!define APP_NAME "FocusAI"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "FocusAI Team"
!define APP_URL "https://github.com/yourusername/focusai"
!define INSTALL_DIR "$PROGRAMFILES64\FocusAI"

; Installer settings
Name "${APP_NAME} ${APP_VERSION}"
OutFile "FocusAI-Setup-${APP_VERSION}.exe"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin

; Modern UI
!include "MUI2.nsh"
!include "LogicLib.nsh"

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Version Information
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "FileDescription" "${APP_NAME} Installer"

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all project files
  File /r "..\ai"
  File /r "..\focuaibackend"
  File /r "..\Frontend"
  File /r "..\focuai"
  File "..\package.json"
  File "..\README.md"
  File "..\LICENSE"
  
  ; Create installation script
  FileOpen $0 "$INSTDIR\install.ps1" w
  FileWrite $0 "# FocusAI Windows Installation Script$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Write-Host '═══════════════════════════════════════════════════════' -ForegroundColor Blue$\r$\n"
  FileWrite $0 "Write-Host '  FocusAI Installation Wizard' -ForegroundColor Blue$\r$\n"
  FileWrite $0 "Write-Host '═══════════════════════════════════════════════════════' -ForegroundColor Blue$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Check for Node.js$\r$\n"
  FileWrite $0 "if (-not (Get-Command node -ErrorAction SilentlyContinue)) {$\r$\n"
  FileWrite $0 "    Write-Host 'Installing Node.js...' -ForegroundColor Yellow$\r$\n"
  FileWrite $0 "    winget install OpenJS.NodeJS.LTS$\r$\n"
  FileWrite $0 "}$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Check for Python$\r$\n"
  FileWrite $0 "if (-not (Get-Command python -ErrorAction SilentlyContinue)) {$\r$\n"
  FileWrite $0 "    Write-Host 'Installing Python...' -ForegroundColor Yellow$\r$\n"
  FileWrite $0 "    winget install Python.Python.3.12$\r$\n"
  FileWrite $0 "}$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Install pnpm$\r$\n"
  FileWrite $0 "npm install -g pnpm$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Get Groq API Key$\r$\n"
  FileWrite $0 "$$groqKey = Read-Host 'Enter your Groq API Key'$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Setup backend$\r$\n"
  FileWrite $0 "Write-Host 'Setting up backend...' -ForegroundColor Cyan$\r$\n"
  FileWrite $0 "cd focuaibackend$\r$\n"
  FileWrite $0 "pnpm install$\r$\n"
  FileWrite $0 "(Get-Content .env.example) -replace 'GROQ_API_KEY=.*', \"GROQ_API_KEY=$$groqKey\" | Set-Content .env$\r$\n"
  FileWrite $0 "cd ..$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Setup frontend$\r$\n"
  FileWrite $0 "Write-Host 'Setting up frontend...' -ForegroundColor Cyan$\r$\n"
  FileWrite $0 "cd Frontend$\r$\n"
  FileWrite $0 "pnpm install$\r$\n"
  FileWrite $0 "(Get-Content .env.example) -replace 'VITE_GROQ_API_KEY=.*', \"VITE_GROQ_API_KEY=$$groqKey\" | Set-Content .env$\r$\n"
  FileWrite $0 "cd ..$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "# Setup AI service$\r$\n"
  FileWrite $0 "Write-Host 'Setting up AI service...' -ForegroundColor Cyan$\r$\n"
  FileWrite $0 "cd ai$\r$\n"
  FileWrite $0 "python -m venv venv$\r$\n"
  FileWrite $0 ".\venv\Scripts\Activate.ps1$\r$\n"
  FileWrite $0 "pip install -r requirements.txt$\r$\n"
  FileWrite $0 "(Get-Content .env.example) -replace 'GROQ_API_KEY=.*', \"GROQ_API_KEY=$$groqKey\" | Set-Content .env$\r$\n"
  FileWrite $0 "deactivate$\r$\n"
  FileWrite $0 "cd ..$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Write-Host '✓ Installation complete!' -ForegroundColor Green$\r$\n"
  FileWrite $0 "Write-Host 'Run start-focusai.bat to launch FocusAI' -ForegroundColor Cyan$\r$\n"
  FileClose $0
  
  ; Create startup script
  FileOpen $0 "$INSTDIR\start-focusai.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "title FocusAI$\r$\n"
  FileWrite $0 "echo Starting FocusAI...$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "start /B cmd /c 'cd focuaibackend && node server.js'$\r$\n"
  FileWrite $0 "timeout /t 3 /nobreak > nul$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "start /B cmd /c 'cd Frontend && pnpm dev'$\r$\n"
  FileWrite $0 "timeout /t 3 /nobreak > nul$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "start /B cmd /c 'cd ai && venv\Scripts\activate && python main.py'$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "echo FocusAI is starting...$\r$\n"
  FileWrite $0 "echo Backend: http://localhost:5001$\r$\n"
  FileWrite $0 "echo Frontend: http://localhost:8080$\r$\n"
  FileWrite $0 "echo.$\r$\n"
  FileWrite $0 "echo Opening browser in 5 seconds...$\r$\n"
  FileWrite $0 "timeout /t 5 /nobreak > nul$\r$\n"
  FileWrite $0 "start http://localhost:8080$\r$\n"
  FileClose $0
  
  ; Create desktop shortcut
  CreateShortcut "$DESKTOP\FocusAI.lnk" "$INSTDIR\start-focusai.bat" "" "$INSTDIR\focuai\icon.png"
  
  ; Create start menu shortcuts
  CreateDirectory "$SMPROGRAMS\FocusAI"
  CreateShortcut "$SMPROGRAMS\FocusAI\FocusAI.lnk" "$INSTDIR\start-focusai.bat"
  CreateShortcut "$SMPROGRAMS\FocusAI\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusAI" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusAI" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusAI" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusAI" "Publisher" "${APP_PUBLISHER}"
  
  ; Run installation script
  MessageBox MB_YESNO "Do you want to install dependencies now? (Requires Node.js, Python, and internet connection)" IDYES install_deps IDNO skip_deps
  install_deps:
    ExecWait 'powershell -ExecutionPolicy Bypass -File "$INSTDIR\install.ps1"'
  skip_deps:
  
SectionEnd

Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR\ai"
  RMDir /r "$INSTDIR\focuaibackend"
  RMDir /r "$INSTDIR\Frontend"
  RMDir /r "$INSTDIR\focuai"
  Delete "$INSTDIR\*.*"
  RMDir "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\FocusAI.lnk"
  RMDir /r "$SMPROGRAMS\FocusAI"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusAI"
  
SectionEnd
