# FocusAI Installation Package

This directory contains the installation scripts and package builders for FocusAI.

## 📦 Installation Methods

### Method 1: Direct Installation Script (Recommended for Testing)

```bash
cd installer
sudo bash install.sh
```

This will:
- ✅ Detect your Linux distribution
- ✅ Install Node.js 18+ if not present
- ✅ Ask for MongoDB preference (Docker/Native/Remote)
- ✅ Install MongoDB if needed
- ✅ Ask for Groq API key
- ✅ Install all dependencies
- ✅ Build the frontend
- ✅ Create systemd services for auto-startup
- ✅ Start all services

### Method 2: Debian Package (.deb)

#### Build the Package

```bash
cd installer
sudo bash build-deb.sh
```

This creates: `installer/build/focusai_1.0.0_amd64.deb`

#### Install the Package

```bash
sudo dpkg -i installer/build/focusai_1.0.0_amd64.deb
```

#### Remove the Package

```bash
# Remove but keep configuration
sudo apt remove focusai

# Remove everything including configuration
sudo apt purge focusai
```

## 🎯 What Gets Installed

### Installation Locations

- **Application**: `/opt/focusai/`
- **Configuration**: `/etc/focusai/`
- **Logs**: `/var/log/focusai/`
- **Data**: `/var/lib/focusai/`

### Systemd Services

Three services are created and enabled for auto-startup:

1. **focusai-backend.service** - Backend API server (Port 5001)
2. **focusai-frontend.service** - Frontend web app (Port 8080)
3. **focusai-ai.service** - AI service (Port 5002)

### Service Management

```bash
# Check status
sudo systemctl status focusai-backend
sudo systemctl status focusai-frontend
sudo systemctl status focusai-ai

# Start/Stop services
sudo systemctl start focusai-backend
sudo systemctl stop focusai-backend

# Restart services
sudo systemctl restart focusai-backend

# View logs
sudo journalctl -u focusai-backend -f
sudo journalctl -u focusai-frontend -f

# Or view log files directly
tail -f /var/log/focusai/backend.log
tail -f /var/log/focusai/frontend.log
```

## 🔧 Configuration

Configuration files are stored in `/etc/focusai/`:

- `backend.env` - Backend environment variables
- `frontend.env` - Frontend environment variables
- `ai.env` - AI service environment variables

You can edit these files and restart the services:

```bash
sudo nano /etc/focusai/backend.env
sudo systemctl restart focusai-backend
```

## 🗑️ Uninstallation

### If installed via script:

```bash
sudo focusai-uninstall
```

### If installed via .deb package:

```bash
# Remove but keep configuration
sudo apt remove focusai

# Remove everything
sudo apt purge focusai
```

## 📋 Requirements

### Supported Linux Distributions

- Ubuntu 20.04+
- Debian 10+
- Fedora 35+
- RHEL/CentOS 8+
- Arch Linux
- Manjaro

### Dependencies (Auto-installed)

- Node.js 18+
- npm
- MongoDB (via Docker or native)
- Docker (optional, for MongoDB)

## 🚀 Post-Installation

After installation, FocusAI will be accessible at:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5001
- **AI Service**: http://localhost:5002

All services start automatically on system boot!

## 🔑 API Keys

During installation, you'll be asked for:

1. **Groq API Key** - Required for AI features
   - Get one from: https://console.groq.com/keys

2. **JWT Secret** - Auto-generated if not provided

3. **MongoDB URL** - Auto-configured based on your choice

## 📊 MongoDB Options

The installer offers three MongoDB options:

### 1. Docker MongoDB (Recommended)
- Easiest setup
- Isolated from system
- Auto-managed container
- No manual configuration needed

### 2. Native MongoDB
- Installed directly on your system
- Better performance
- Requires more setup

### 3. Remote MongoDB
- Use MongoDB Atlas or other remote service
- Best for production
- You provide the connection URL

## 🛠️ Troubleshooting

### Services won't start

```bash
# Check service status
sudo systemctl status focusai-backend

# View detailed logs
sudo journalctl -u focusai-backend -n 50

# Check if ports are available
sudo netstat -tlnp | grep -E '5001|8080|5002'
```

### MongoDB connection issues

```bash
# If using Docker MongoDB
docker ps | grep focusai-mongodb
docker logs focusai-mongodb

# If using native MongoDB
sudo systemctl status mongod
```

### Permission issues

```bash
# Fix ownership
sudo chown -R root:root /opt/focusai
sudo chmod -R 755 /opt/focusai
```

## 📝 Building Custom Packages

### Modify Package Version

Edit `build-deb.sh`:

```bash
VERSION="1.0.1"  # Change this
```

### Add Custom Dependencies

Edit the `Depends:` line in `build-deb.sh`:

```bash
Depends: curl, gnupg, ca-certificates, your-package
```

## 🔄 Updating FocusAI

To update an existing installation:

```bash
# Stop services
sudo systemctl stop focusai-backend focusai-frontend focusai-ai

# Pull latest code
cd /opt/focusai
git pull  # or copy new files

# Update dependencies
cd /opt/focusai/focuaibackend && npm install
cd /opt/focusai/Frontend && npm install && npm run build
cd /opt/focusai/ai && npm install

# Restart services
sudo systemctl start focusai-backend focusai-frontend focusai-ai
```

## 📞 Support

For issues or questions:
- Check logs: `/var/log/focusai/`
- View service status: `systemctl status focusai-*`
- GitHub Issues: [Your Repository]

## 📄 License

[Your License Here]
