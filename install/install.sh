#!/bin/bash

###############################################################################
# FocusAI Installation Script for Linux
# This script installs FocusAI with all dependencies and sets up auto-startup
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Installation paths
INSTALL_DIR="/opt/focusai"
CONFIG_DIR="/etc/focusai"
LOG_DIR="/var/log/focusai"
DATA_DIR="/var/lib/focusai"

# Installation state
EXISTING_INSTALLATION=false
REINSTALL_MODE=false

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "═══════════════════════════════════════════════════════"
    print_message "$BLUE" "  $1"
    print_message "$BLUE" "═══════════════════════════════════════════════════════"
    echo ""
}

print_success() {
    print_message "$GREEN" "✓ $1"
}

print_error() {
    print_message "$RED" "✗ $1"
}

print_warning() {
    print_message "$YELLOW" "⚠ $1"
}

print_info() {
    print_message "$BLUE" "ℹ $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run this installer with sudo"
        exit 1
    fi
    print_success "Running with sudo privileges"
}

# Detect existing installation
detect_existing_installation() {
    print_header "Checking for Existing Installation"
    
    if [ -f "$CONFIG_DIR/backend.env" ] && [ -d "$INSTALL_DIR/focuaibackend" ]; then
        EXISTING_INSTALLATION=true
        print_success "Existing FocusAI installation detected!"
        
        echo ""
        print_info "Found existing configuration:"
        if [ -f "$CONFIG_DIR/backend.env" ]; then
            echo "  • Backend configuration: ✓"
            # Load existing config
            source "$CONFIG_DIR/backend.env"
        fi
        if [ -f "$CONFIG_DIR/frontend.env" ]; then
            echo "  • Frontend configuration: ✓"
        fi
        if systemctl is-enabled focusai-backend.service &>/dev/null; then
            echo "  • System services: ✓"
        fi
        
        echo ""
        read -p "Do you want to reinstall using existing configuration? (y/n): " USE_EXISTING_CONFIG
        
        if [[ $USE_EXISTING_CONFIG =~ ^[Yy]$ ]]; then
            REINSTALL_MODE=true
            print_success "Reinstall mode: Will use existing configuration"
            
            # Ask if user wants to update Groq API key
            echo ""
            read -p "Do you want to update your Groq API key? (y/n): " UPDATE_API_KEY
            if [[ $UPDATE_API_KEY =~ ^[Yy]$ ]]; then
                read -p "Enter new Groq API Key: " GROQ_API_KEY
            fi
        else
            REINSTALL_MODE=false
            print_info "Will perform fresh installation with new configuration"
        fi
    else
        print_info "No existing installation found. Proceeding with fresh installation."
    fi
}

# Detect Linux distribution
detect_distro() {
    print_header "Detecting Linux Distribution"
    
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
        print_success "Detected: $NAME $VERSION"
    else
        print_error "Cannot detect Linux distribution"
        exit 1
    fi
}

# Install Node.js if not present
install_nodejs() {
    print_header "Checking Node.js Installation"
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js already installed: $NODE_VERSION"
        
        # Check if version is >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js version is too old. Installing Node.js 18..."
            INSTALL_NODE=true
        else
            INSTALL_NODE=false
        fi
    else
        print_info "Node.js not found. Installing Node.js 18..."
        INSTALL_NODE=true
    fi
    
    if [ "$INSTALL_NODE" = true ]; then
        case $DISTRO in
            ubuntu|debian)
                curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
                apt-get install -y nodejs
                ;;
            fedora|rhel|centos)
                curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
                dnf install -y nodejs
                ;;
            arch|manjaro)
                pacman -S --noconfirm nodejs npm
                ;;
            *)
                print_error "Unsupported distribution for automatic Node.js installation"
                print_info "Please install Node.js 18+ manually from https://nodejs.org"
                exit 1
                ;;
        esac
        print_success "Node.js installed successfully"
    fi
}

# Install build tools for native modules
install_build_tools() {
    print_header "Installing Build Tools"
    
    case $DISTRO in
        ubuntu|debian)
            print_info "Installing build-essential (required for bcrypt compilation)..."
            apt-get update
            apt-get install -y build-essential python3
            ;;
        fedora|rhel|centos)
            print_info "Installing development tools (required for bcrypt compilation)..."
            dnf groupinstall -y "Development Tools"
            dnf install -y python3
            ;;
        arch|manjaro)
            print_info "Installing build tools (required for bcrypt compilation)..."
            pacman -S --noconfirm base-devel python
            ;;
        *)
            print_warning "Skipping build tools installation for unsupported distribution"
            ;;
    esac
    
    print_success "Build tools installed"
}

# Check MongoDB installation
check_mongodb() {
    print_header "Checking MongoDB Installation"
    
    MONGODB_INSTALLED=false
    MONGODB_RUNNING=false
    
    # Check if MongoDB is installed
    if command -v mongod &> /dev/null; then
        MONGODB_INSTALLED=true
        print_success "MongoDB is installed"
        
        # Check if MongoDB is running
        if systemctl is-active --quiet mongod 2>/dev/null || pgrep -x mongod > /dev/null; then
            MONGODB_RUNNING=true
            print_success "MongoDB is running"
        else
            print_warning "MongoDB is installed but not running"
        fi
    else
        print_info "MongoDB is not installed"
    fi
}

# Ask user for MongoDB preference
configure_mongodb() {
    # Skip if reinstalling with existing config
    if [ "$REINSTALL_MODE" = true ] && [ -n "$MONGODB_URI" ]; then
        print_header "MongoDB Configuration"
        print_success "Using existing MongoDB configuration: $MONGODB_URI"
        return
    fi
    
    print_header "MongoDB Configuration"
    
    if [ "$MONGODB_INSTALLED" = true ] && [ "$MONGODB_RUNNING" = true ]; then
        echo ""
        print_info "MongoDB is already running on your system."
        read -p "Do you want to use the existing MongoDB installation? (y/n): " USE_EXISTING
        
        if [[ $USE_EXISTING =~ ^[Yy]$ ]]; then
            read -p "Enter MongoDB connection URL [mongodb://localhost:27017/focusai]: " MONGODB_INPUT
            if [[ "$MONGODB_INPUT" =~ ^[YyNn]$ ]] || [ -z "$MONGODB_INPUT" ]; then
                MONGODB_URI="mongodb://localhost:27017/focusai"
            else
                MONGODB_URI="$MONGODB_INPUT"
            fi
            USE_DOCKER_MONGO=false
        else
            USE_DOCKER_MONGO=true
        fi
    else
        echo ""
        print_info "MongoDB is not running. Choose an option:"
        echo "  1) Install MongoDB using Docker (recommended)"
        echo "  2) Install MongoDB natively on this system"
        echo "  3) Use a remote MongoDB (e.g., MongoDB Atlas)"
        read -p "Enter your choice (1-3): " MONGO_CHOICE
        
        case $MONGO_CHOICE in
            1)
                USE_DOCKER_MONGO=true
                ;;
            2)
                install_mongodb_native
                MONGODB_URI="mongodb://localhost:27017/focusai"
                USE_DOCKER_MONGO=false
                ;;
            3)
                read -p "Enter MongoDB connection URL: " MONGODB_URI
                USE_DOCKER_MONGO=false
                ;;
            *)
                print_error "Invalid choice"
                exit 1
                ;;
        esac
    fi
}

# Install Docker if needed for MongoDB
install_docker_mongodb() {
    if [ "$USE_DOCKER_MONGO" = true ]; then
        print_header "Setting up MongoDB with Docker"
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            print_info "Docker not found. Installing Docker..."
            
            case $DISTRO in
                ubuntu|debian)
                    apt-get update
                    apt-get install -y ca-certificates curl gnupg
                    install -m 0755 -d /etc/apt/keyrings
                    curl -fsSL https://download.docker.com/linux/$DISTRO/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                    chmod a+r /etc/apt/keyrings/docker.gpg
                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$DISTRO $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
                    apt-get update
                    apt-get install -y docker-ce docker-ce-cli containerd.io
                    ;;
                fedora|rhel|centos)
                    dnf -y install dnf-plugins-core
                    dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
                    dnf install -y docker-ce docker-ce-cli containerd.io
                    ;;
                *)
                    print_error "Automatic Docker installation not supported for $DISTRO"
                    print_info "Please install Docker manually from https://docs.docker.com/engine/install/"
                    exit 1
                    ;;
            esac
            
            systemctl start docker
            systemctl enable docker
            print_success "Docker installed and started"
        else
            print_success "Docker is already installed"
        fi
        
        # Pull and run MongoDB container
        print_info "Pulling MongoDB Docker image..."
        docker pull mongo:latest
        
        print_info "Starting MongoDB container..."
        docker run -d \
            --name focusai-mongodb \
            --restart unless-stopped \
            -p 27017:27017 \
            -v focusai-mongodb-data:/data/db \
            -e MONGO_INITDB_DATABASE=focusai \
            mongo:latest
        
        MONGODB_URI="mongodb://localhost:27017/focusai"
        print_success "MongoDB container started successfully"
    fi
}

# Install MongoDB natively
install_mongodb_native() {
    print_header "Installing MongoDB Natively"
    
    case $DISTRO in
        ubuntu|debian)
            wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
            echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            apt-get update
            apt-get install -y mongodb-org
            systemctl start mongod
            systemctl enable mongod
            ;;
        fedora|rhel|centos)
            cat > /etc/yum.repos.d/mongodb-org-7.0.repo <<EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
            dnf install -y mongodb-org
            systemctl start mongod
            systemctl enable mongod
            ;;
        *)
            print_error "Automatic MongoDB installation not supported for $DISTRO"
            exit 1
            ;;
    esac
    
    print_success "MongoDB installed and started"
}

# Get API keys from user
get_api_keys() {
    print_header "API Configuration"
    
    echo ""
    print_info "Please enter your Groq API key"
    print_info "You can get one from: https://console.groq.com/keys"
    read -p "Groq API Key: " GROQ_API_KEY
    
    if [ -z "$GROQ_API_KEY" ]; then
        print_error "Groq API key is required"
        exit 1
    fi

    # Killing existing ports
    print_info "Checking for running services on ports 5001, 8000, 8080..."
    for port in 5001 8000 8080; do
        PID=$(fuser $port/tcp 2>/dev/null | awk '{print $NF}')
        if [ -n "$PID" ]; then
            print_warning "Killing process $PID on port $port"
            kill -9 $PID || true
        fi
    done
}

# Create installation directories
create_directories() {
    print_header "Creating Installation Directories"
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    
    print_success "Directories created"
}

# Copy application files
copy_files() {
    print_header "Copying Application Files"
    
    # When installed via .deb package, files are already in /opt/focusai
    # We just need to ensure they're in the right place
    if [ -d "/opt/focusai/focuaibackend" ]; then
        print_success "Application files already in place from package"
        return
    fi
    
    # For manual installation, find the source directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
    # Check if we're running from the package location
    if [ -d "$SCRIPT_DIR/../focuaibackend" ]; then
        SOURCE_DIR="$SCRIPT_DIR/.."
    elif [ -d "$(dirname "$SCRIPT_DIR")/focuaibackend" ]; then
        SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
    else
        print_error "Cannot find source files"
        print_info "Expected to find focuaibackend in parent directory"
        exit 1
    fi
    
    print_info "Copying backend files..."
    cp -r "$SOURCE_DIR/focuaibackend" "$INSTALL_DIR/"
    
    print_info "Copying frontend files..."
    cp -r "$SOURCE_DIR/Frontend" "$INSTALL_DIR/"
    
    if [ -d "$SOURCE_DIR/ai" ]; then
        print_info "Copying AI service files..."
        cp -r "$SOURCE_DIR/ai" "$INSTALL_DIR/"
    fi
    
    print_success "Files copied successfully"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Application Dependencies"
    
    # Install pnpm if not present
    if ! command -v pnpm &> /dev/null; then
        print_info "Installing pnpm..."
        npm install -g pnpm
    fi

    print_info "Setting up backend... (this may take a few minutes)"
    cd "$INSTALL_DIR/focuaibackend"
    pnpm install --no-frozen-lockfile > "$LOG_DIR/backend-install.log" 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Backend setup failed"
        print_info "Check log at: $LOG_DIR/backend-install.log"
        exit 1
    fi
    print_success "Backend ready"
    
    print_info "Setting up frontend... (please wait)"
    cd "$INSTALL_DIR/Frontend"
    pnpm install --no-frozen-lockfile > "$LOG_DIR/frontend-install.log" 2>&1
    
    if [ $? -ne 0 ]; then
        print_error "Frontend setup failed"
        print_info "Check log at: $LOG_DIR/frontend-install.log"
        exit 1
    fi
    print_success "Frontend ready"
    
    if [ -d "$INSTALL_DIR/ai" ]; then
        print_info "Preparing AI service..."
        cd "$INSTALL_DIR/ai"
        if [ ! -d "venv" ]; then
            print_info "Setting up AI environment... (this will take a moment)"
            python3 -m venv venv > /dev/null 2>&1
            source venv/bin/activate
            pip install -r requirements.txt > "$LOG_DIR/ai-install.log" 2>&1
            deactivate
        fi
        print_success "AI service ready"
    fi
    
    print_success "Dependencies installed"
}

# Create configuration files
# Create configuration files
create_config() {
    print_header "Updating Configuration Files"
    
    # List of environments to setup
    declare -A env_map=(
        ["$INSTALL_DIR/ai/.env"]="$INSTALL_DIR/ai/.env.example"
        ["$INSTALL_DIR/focuaibackend/.env"]="$INSTALL_DIR/focuaibackend/.env.example"
        ["$INSTALL_DIR/Frontend/.env"]="$INSTALL_DIR/Frontend/.env.example"
    )

    for env_file in "${!env_map[@]}"; do
        env_example="${env_map[$env_file]}"
        
        # If .env doesn't exist but .env.example does, copy it
        if [ ! -f "$env_file" ] && [ -f "$env_example" ]; then
            print_info "Creating $env_file from example..."
            cp "$env_example" "$env_file"
        fi

        if [ -f "$env_file" ]; then
            print_info "Updating $env_file with API key..."
            # Replace Groq API Key
            sed -i "s|GROQ_API_KEY=.*|GROQ_API_KEY=$GROQ_API_KEY|g" "$env_file"
            sed -i "s|VITE_GROQ_API_KEY=.*|VITE_GROQ_API_KEY=$GROQ_API_KEY|g" "$env_file"
            
            # Also update MONGODB_URI if it was set
            if [ -n "$MONGODB_URI" ]; then
                sed -i "s|MONGODB_URI=.*|MONGODB_URI=$MONGODB_URI|g" "$env_file"
            fi
        else
            print_warning "Environment file not found: $env_file"
        fi
    done
    
    print_success "Configuration files updated"
}

# Build frontend
build_frontend() {
    print_header "Building Frontend..."
    # Skipping heavy build as requested to use pnpm dev in daemon
    print_success "Ready for development mode"
}

# Create systemd services
create_systemd_services() {
    print_header "Creating Systemd Services"
    
    # Backend service
    cat > /etc/systemd/system/focusai-backend.service <<EOF
[Unit]
Description=FocusAI Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/focuaibackend
EnvironmentFile=$INSTALL_DIR/focuaibackend/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/backend.log
StandardError=append:$LOG_DIR/backend-error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # Frontend service
    cat > /etc/systemd/system/focusai-frontend.service <<EOF
[Unit]
Description=FocusAI Frontend Service
After=network.target focusai-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/Frontend
EnvironmentFile=$INSTALL_DIR/Frontend/.env
ExecStart=/usr/bin/pnpm dev
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/frontend.log
StandardError=append:$LOG_DIR/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # AI service
    if [ -d "$INSTALL_DIR/ai" ]; then
        cat > /etc/systemd/system/focusai-ai.service <<EOF
[Unit]
Description=FocusAI AI Service
After=network.target focusai-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/ai
EnvironmentFile=$INSTALL_DIR/ai/.env
ExecStart=$INSTALL_DIR/ai/venv/bin/python3 main.py
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/ai.log
StandardError=append:$LOG_DIR/ai-error.log

[Install]
WantedBy=multi-user.target
EOF
    fi
    
    print_success "Systemd services created"
}

# Enable and start services
start_services() {
    print_header "Starting FocusAI Services"
    
    systemctl daemon-reload
    
    print_info "Enabling services for auto-startup..."
    systemctl enable focusai-backend.service
    systemctl enable focusai-frontend.service
    if [ -d "$INSTALL_DIR/ai" ]; then
        systemctl enable focusai-ai.service
    fi
    
    print_info "Starting backend service..."
    systemctl start focusai-backend.service
    sleep 3
    
    print_info "Starting frontend service..."
    systemctl start focusai-frontend.service
    
    if [ -d "$INSTALL_DIR/ai" ]; then
        print_info "Starting AI service..."
        systemctl start focusai-ai.service
    fi
    
    print_success "All services started"
}

# Create uninstaller
create_uninstaller() {
    cat > /usr/local/bin/focusai-uninstall <<'EOF'
#!/bin/bash

echo "Uninstalling FocusAI..."

# Stop services
systemctl stop focusai-backend.service focusai-frontend.service focusai-ai.service 2>/dev/null
systemctl disable focusai-backend.service focusai-frontend.service focusai-ai.service 2>/dev/null

# Remove systemd services
rm -f /etc/systemd/system/focusai-*.service
systemctl daemon-reload

# Remove Docker container if exists
docker stop focusai-mongodb 2>/dev/null
docker rm focusai-mongodb 2>/dev/null

# Remove files
rm -rf /opt/focusai
rm -rf /etc/focusai
rm -rf /var/log/focusai
rm -rf /var/lib/focusai

# Remove uninstaller
rm -f /usr/local/bin/focusai-uninstall

echo "FocusAI has been uninstalled successfully"
EOF
    
    chmod +x /usr/local/bin/focusai-uninstall
    print_success "Uninstaller created at /usr/local/bin/focusai-uninstall"
}

# Print installation summary
print_summary() {
    print_header "Installation Complete!"
    
    echo ""
    print_success "FocusAI has been installed successfully!"
    echo ""
    print_info "Installation Details:"
    echo "  • Installation Directory: $INSTALL_DIR"
    echo "  • Configuration Directory: $CONFIG_DIR"
    echo "  • Log Directory: $LOG_DIR"
    echo ""
    print_info "Services:"
    echo "  • Backend: systemctl status focusai-backend"
    echo "  • Frontend: systemctl status focusai-frontend"
    if [ -d "$INSTALL_DIR/ai" ]; then
        echo "  • AI Service: systemctl status focusai-ai"
    fi
    echo ""
    print_info "Access FocusAI:"
    echo "  • Frontend: http://localhost:8080"
    echo "  • Backend API: http://localhost:5001"
    echo ""
    print_info "MongoDB:"
    echo "  • Connection: ${MONGODB_URI:-mongodb://localhost:27017/focusai}"
    echo ""
    print_info "Logs:"
    echo "  • View logs: journalctl -u focusai-backend -f"
    echo "  • Log files: $LOG_DIR/"
    echo ""
    print_info "Uninstall:"
    echo "  • Run: sudo focusai-uninstall"
    echo ""
    print_success "FocusAI will start automatically on system boot!"
    echo ""
    
    # Restart services to ensure everything is running with the latest configuration
    print_info "Restarting services to apply all configurations..."
    systemctl restart focusai-backend focusai-frontend focusai-ai
    sleep 2
    
    # Verify services are running
    if systemctl is-active --quiet focusai-backend && \
       systemctl is-active --quiet focusai-frontend && \
       systemctl is-active --quiet focusai-ai; then
        print_success "All services are running!"
    else
        print_warning "Some services may not be running. Check status with:"
        echo "  sudo systemctl status focusai-backend"
        echo "  sudo systemctl status focusai-frontend"
        echo "  sudo systemctl status focusai-ai"
    fi
    echo ""
}

# Main installation flow
main() {
    print_header "FocusAI Installation Wizard"
    
    check_root
    detect_existing_installation
    detect_distro
    install_nodejs
    # install_build_tools  # Disabled: not needed for bcryptjs and avoids APT errors
    check_mongodb
    configure_mongodb
    install_docker_mongodb
    get_api_keys
    create_directories
    copy_files
    install_dependencies
    create_config
    build_frontend
    create_systemd_services
    start_services
    create_uninstaller
    print_summary
}

# Run main installation
main
