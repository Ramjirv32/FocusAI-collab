# 🚀 FocusAI Quick Start Guide

## For End Users

### Linux Installation (.deb package)

1. **Download the package** (when available):
   ```bash
   wget https://your-domain.com/focusai_1.0.0_amd64.deb
   ```

2. **Install**:
   ```bash
   sudo dpkg -i focusai_1.0.0_amd64.deb
   ```

3. **Follow the interactive installer**:
   - It will ask for your Groq API key
   - Choose MongoDB option (Docker recommended)
   - Wait for installation to complete

4. **Access FocusAI**:
   - Open browser: http://localhost:8080
   - FocusAI starts automatically on boot!

### Linux Installation (Direct Script)

1. **Download and extract**:
   ```bash
   wget https://your-domain.com/focusai.tar.gz
   tar -xzf focusai.tar.gz
   cd focusai
   ```

2. **Run installer**:
   ```bash
   cd installer
   sudo bash install.sh
   ```

3. **Follow the prompts** and enjoy!

---

## For Developers

### Building the .deb Package

1. **Ensure you have the source code**:
   ```bash
   git clone <your-repo>
   cd FocusAI-collab
   ```

2. **Build the package**:
   ```bash
   cd installer
   sudo bash build-deb.sh
   ```

3. **Package location**:
   ```
   installer/build/focusai_1.0.0_amd64.deb
   ```

4. **Test the package**:
   ```bash
   sudo dpkg -i installer/build/focusai_1.0.0_amd64.deb
   ```

### What the Installer Does

```
┌─────────────────────────────────────────────────┐
│  1. Detect Linux Distribution                  │
│  2. Install Node.js 18+ (if needed)            │
│  3. Check MongoDB Installation                 │
│  4. Ask User Preferences:                      │
│     • Use existing MongoDB?                    │
│     • Install via Docker?                      │
│     • Install natively?                        │
│     • Use remote MongoDB?                      │
│  5. Install Docker (if MongoDB via Docker)     │
│  6. Get Groq API Key from user                 │
│  7. Generate JWT Secret (or use provided)      │
│  8. Copy application files to /opt/focusai     │
│  9. Install npm dependencies                   │
│ 10. Build frontend (Vite)                      │
│ 11. Create configuration files in /etc/focusai │
│ 12. Create systemd services:                   │
│     • focusai-backend.service                  │
│     • focusai-frontend.service                 │
│     • focusai-ai.service                       │
│ 13. Enable auto-startup                        │
│ 14. Start all services                         │
│ 15. Create uninstaller                         │
└─────────────────────────────────────────────────┘
```

### Distribution Strategy

#### Option 1: GitHub Releases
```bash
# Build the package
cd installer
sudo bash build-deb.sh

# Upload to GitHub Releases
# Users download and install
```

#### Option 2: PPA (Personal Package Archive)
```bash
# For Ubuntu/Debian users
sudo add-apt-repository ppa:focusai/stable
sudo apt update
sudo apt install focusai
```

#### Option 3: Direct Download
Host the .deb file on your website:
```bash
wget https://focusai.com/downloads/focusai_1.0.0_amd64.deb
sudo dpkg -i focusai_1.0.0_amd64.deb
```

### Testing the Installation

```bash
# After installation, verify services
sudo systemctl status focusai-backend
sudo systemctl status focusai-frontend
sudo systemctl status focusai-ai

# Check if accessible
curl http://localhost:5001/api/health
curl http://localhost:8080

# View logs
sudo journalctl -u focusai-backend -f
```

### Customizing the Package

#### Change Version
Edit `installer/build-deb.sh`:
```bash
VERSION="1.0.1"
```

#### Change Installation Paths
Edit `installer/install.sh`:
```bash
INSTALL_DIR="/opt/focusai"      # Application files
CONFIG_DIR="/etc/focusai"        # Configuration
LOG_DIR="/var/log/focusai"       # Logs
DATA_DIR="/var/lib/focusai"      # Data
```

#### Add Pre-installation Checks
Edit `installer/install.sh` and add to `main()` function.

### Creating Windows Installer (Coming Soon)

The Windows installer will:
- Use NSIS (Nullsoft Scriptable Install System)
- Install Node.js via chocolatey if needed
- Set up MongoDB via Docker Desktop
- Create Windows Services
- Add to startup programs
- Create Start Menu shortcuts

---

## 📊 Installation Flow Diagram

```
User Downloads Package
         ↓
    Runs Installer
         ↓
    ┌─────────────────┐
    │ System Check    │
    │ - OS Detection  │
    │ - Node.js Check │
    │ - MongoDB Check │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ User Input      │
    │ - Groq API Key  │
    │ - MongoDB Choice│
    │ - JWT Secret    │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Install Deps    │
    │ - Node.js       │
    │ - MongoDB       │
    │ - Docker (opt)  │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Setup App       │
    │ - Copy Files    │
    │ - npm install   │
    │ - Build Frontend│
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Configure       │
    │ - Create .env   │
    │ - Systemd       │
    │ - Auto-startup  │
    └────────┬────────┘
             ↓
    ┌─────────────────┐
    │ Start Services  │
    │ - Backend       │
    │ - Frontend      │
    │ - AI Service    │
    └────────┬────────┘
             ↓
        ✅ Done!
   Access: localhost:8080
```

---

## 🎯 Next Steps

### For Linux (Current)
- ✅ Installation script created
- ✅ .deb package builder created
- ✅ Systemd services configured
- ✅ Auto-startup enabled
- 🔄 Test on different distributions
- 🔄 Create RPM package for Fedora/RHEL
- 🔄 Create AUR package for Arch Linux

### For Windows (Next)
- 📝 Create NSIS installer script
- 📝 Windows Service wrapper
- 📝 Registry entries for startup
- 📝 Start Menu shortcuts
- 📝 Desktop shortcut
- 📝 System tray application

### For macOS (Future)
- 📝 Create .dmg installer
- 📝 LaunchAgent for auto-startup
- 📝 Homebrew formula
- 📝 Code signing

---

## 📦 Package Contents

```
focusai_1.0.0_amd64.deb
├── opt/focusai/
│   ├── focuaibackend/      # Backend source
│   ├── Frontend/           # Frontend source
│   ├── ai/                 # AI service source
│   └── install.sh          # Installation script
├── etc/focusai/
│   ├── backend.env         # Backend config
│   ├── frontend.env        # Frontend config
│   └── ai.env              # AI config
└── DEBIAN/
    ├── control             # Package metadata
    ├── postinst            # Post-installation script
    ├── prerm               # Pre-removal script
    └── postrm              # Post-removal script
```

---

## 🔒 Security Considerations

1. **API Keys**: Stored in `/etc/focusai/*.env` with 600 permissions
2. **Services**: Run as root (consider creating dedicated user)
3. **MongoDB**: Authentication enabled by default
4. **Firewall**: Configure to restrict external access if needed

---

## 📞 Support & Contribution

- **Issues**: GitHub Issues
- **Docs**: Full documentation in `installer/README.md`
- **Contribute**: Pull requests welcome!

---

**Happy Installing! 🚀**
