# FocusAI Windows Installation Guide

## 📦 Installation Methods

### Method 1: PowerShell Installer (Recommended - No additional tools needed)

1. **Download the project** or extract the ZIP file
2. **Open PowerShell as Administrator**:
   - Press `Win + X`
   - Select "Windows PowerShell (Admin)" or "Terminal (Admin)"

3. **Navigate to the project directory**:
   ```powershell
   cd C:\path\to\FocusAI-collab
   ```

4. **Run the installer**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File install\install-windows.ps1
   ```

5. **Follow the prompts**:
   - The installer will automatically install Node.js and Python if needed
   - Enter your Groq API key when prompted
   - Wait for dependencies to install

6. **Launch FocusAI**:
   - Double-click the desktop shortcut, OR
   - Search for "FocusAI" in Start Menu

### Method 2: NSIS Installer (.exe) - Coming Soon

Build the installer on Linux:
```bash
cd install
bash build-windows.sh
```

This creates `FocusAI-Setup-1.0.0.exe` which you can distribute.

## 🎯 What Gets Installed

### Installation Location
- **Default**: `C:\Program Files\FocusAI\`

### Components Installed
1. **Node.js 18+** (via winget if not present)
2. **Python 3.12** (via winget if not present)
3. **pnpm** (Node package manager)
4. **Backend Service** (Node.js server on port 5001)
5. **Frontend** (Vite dev server on port 8080)
6. **AI Service** (Python FastAPI on port 5002)

### Shortcuts Created
- Desktop shortcut: `FocusAI.lnk`
- Start Menu: `Programs > FocusAI`

## 🚀 Starting FocusAI

### Option 1: Desktop Shortcut
Double-click the "FocusAI" icon on your desktop

### Option 2: Start Menu
1. Press `Win` key
2. Type "FocusAI"
3. Click on FocusAI

### Option 3: Manual Start
Open Command Prompt and run:
```cmd
cd "C:\Program Files\FocusAI"
start-focusai.bat
```

## 🔧 Configuration

### Update API Key
1. Open FocusAI in your browser (http://localhost:8080)
2. Click the Key icon in the header
3. Enter your new Groq API key
4. Click "Test API Key" to verify
5. Click "Save API Key"
6. Restart FocusAI

### Manual Configuration
Edit the `.env` files in:
- `C:\Program Files\FocusAI\focuaibackend\.env`
- `C:\Program Files\FocusAI\Frontend\.env`
- `C:\Program Files\FocusAI\ai\.env`

## 🛑 Stopping FocusAI

### Option 1: Task Manager
1. Press `Ctrl + Shift + Esc`
2. Find processes: `node.exe` and `python.exe`
3. Right-click → End Task

### Option 2: Command Line
```cmd
taskkill /F /IM node.exe
taskkill /F /IM python.exe
```

## 🗑️ Uninstallation

### Manual Uninstall
1. Stop all FocusAI processes (see above)
2. Delete the installation folder:
   ```cmd
   rmdir /s "C:\Program Files\FocusAI"
   ```
3. Delete shortcuts:
   - Desktop: `%USERPROFILE%\Desktop\FocusAI.lnk`
   - Start Menu: `%ProgramData%\Microsoft\Windows\Start Menu\Programs\FocusAI`

### Using PowerShell
```powershell
# Stop processes
Get-Process | Where-Object {$_.Path -like "*FocusAI*"} | Stop-Process -Force

# Remove installation
Remove-Item -Path "C:\Program Files\FocusAI" -Recurse -Force

# Remove shortcuts
Remove-Item -Path "$env:USERPROFILE\Desktop\FocusAI.lnk" -Force
Remove-Item -Path "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\FocusAI" -Recurse -Force
```

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10 or Windows 11
- **RAM**: 4 GB
- **Disk Space**: 2 GB free space
- **Internet**: Required for installation and AI features

### Software Requirements (Auto-installed)
- Node.js 18+
- Python 3.12+
- pnpm (Node package manager)

## 🔑 Getting a Groq API Key

1. Visit https://console.groq.com/keys
2. Sign up or log in
3. Click "Create API Key"
4. Copy the key
5. Use it during installation or in the API Key Manager

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```cmd
netstat -ano | findstr :5001
netstat -ano | findstr :8080
taskkill /F /PID <PID_NUMBER>
```

### Node.js or Python Not Found
After installation, restart your terminal or computer to refresh the PATH.

### Permission Errors
Make sure you're running PowerShell or Command Prompt as Administrator.

### Firewall Warnings
Allow Node.js and Python through Windows Firewall when prompted.

## 📞 Support

For issues or questions:
- Check logs in: `C:\Program Files\FocusAI\`
- GitHub Issues: [Your Repository]

## 📄 License

[Your License Here]

---

**Happy Productivity! 🚀**
