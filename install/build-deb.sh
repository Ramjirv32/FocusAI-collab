#!/bin/bash

###############################################################################
# FocusAI .deb Package Builder
# Creates a Debian package for easy installation
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Package information
PACKAGE_NAME="focusai"
VERSION="1.0.0"
ARCHITECTURE="amd64"
MAINTAINER="FocusAI Team <support@focusai.com>"
DESCRIPTION="FocusAI - Productivity and Focus Tracking Application"

# Directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$SCRIPT_DIR/build"
DEB_DIR="$BUILD_DIR/${PACKAGE_NAME}_${VERSION}_${ARCHITECTURE}"

print_info "Building FocusAI .deb package..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Create package structure
mkdir -p "$DEB_DIR/DEBIAN"
mkdir -p "$DEB_DIR/opt/focusai"
mkdir -p "$DEB_DIR/usr/local/bin"
mkdir -p "$DEB_DIR/etc/focusai"

# Copy entire project directory
print_info "Copying all project files..."
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='build' \
          --exclude='.git' \
          --exclude='install/build' \
          --exclude='*.log' \
          --exclude='__pycache__' \
          --exclude='.env' \
          "$PROJECT_DIR/" "$DEB_DIR/opt/focusai/"

# Copy installer script
cp "$SCRIPT_DIR/install.sh" "$DEB_DIR/opt/focusai/install.sh"
chmod +x "$DEB_DIR/opt/focusai/install.sh"

# Create control file
cat > "$DEB_DIR/DEBIAN/control" <<EOF
Package: $PACKAGE_NAME
Version: $VERSION
Section: utils
Priority: optional
Architecture: $ARCHITECTURE
Depends: curl, gnupg, ca-certificates, psmisc, lsof, python3
Maintainer: $MAINTAINER
Description: $DESCRIPTION
 FocusAI is a comprehensive productivity and focus tracking application
 that helps you monitor your work habits, track application usage,
 and improve your productivity with AI-powered insights.
 .
 Features:
  - Real-time application and tab tracking
  - AI-powered productivity insights
  - Focus mode and distraction blocking
  - Detailed analytics and reports
  - Gamification and achievements
EOF

# Create postinst script (runs after installation)
cat > "$DEB_DIR/DEBIAN/postinst" <<'EOF'
#!/bin/bash
set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║              Welcome to FocusAI Installation               ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Run the installation script
cd /opt/focusai
bash install.sh

exit 0
EOF

chmod 755 "$DEB_DIR/DEBIAN/postinst"

# Create prerm script (runs before removal)
cat > "$DEB_DIR/DEBIAN/prerm" <<'EOF'
#!/bin/bash
set -e

echo "Stopping FocusAI services..."
systemctl stop focusai-backend.service focusai-frontend.service focusai-ai.service 2>/dev/null || true
systemctl disable focusai-backend.service focusai-frontend.service focusai-ai.service 2>/dev/null || true

exit 0
EOF

chmod 755 "$DEB_DIR/DEBIAN/prerm"

# Create postrm script (runs after removal)
cat > "$DEB_DIR/DEBIAN/postrm" <<'EOF'
#!/bin/bash
set -e

if [ "$1" = "purge" ]; then
    echo "Removing FocusAI configuration and data..."
    rm -rf /etc/focusai
    rm -rf /var/log/focusai
    rm -rf /var/lib/focusai
    rm -f /etc/systemd/system/focusai-*.service
    systemctl daemon-reload
    
    # Ask about MongoDB container
    if docker ps -a | grep -q focusai-mongodb; then
        read -p "Remove FocusAI MongoDB container? (y/n): " REMOVE_MONGO
        if [[ $REMOVE_MONGO =~ ^[Yy]$ ]]; then
            docker stop focusai-mongodb 2>/dev/null || true
            docker rm focusai-mongodb 2>/dev/null || true
            docker volume rm focusai-mongodb-data 2>/dev/null || true
        fi
    fi
fi

exit 0
EOF

chmod 755 "$DEB_DIR/DEBIAN/postrm"

# Build the package
print_info "Building .deb package..."
dpkg-deb --build "$DEB_DIR"

# The package is already in the right location
OUTPUT_FILE="$BUILD_DIR/${PACKAGE_NAME}_${VERSION}_${ARCHITECTURE}.deb"

print_success "Package built successfully!"
echo ""
echo "Package: $OUTPUT_FILE"
echo "Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "To install:"
echo "  sudo dpkg -i $OUTPUT_FILE"
echo ""
echo "To remove:"
echo "  sudo apt remove $PACKAGE_NAME"
echo ""
echo "To purge (remove with config):"
echo "  sudo apt purge $PACKAGE_NAME"
echo ""
