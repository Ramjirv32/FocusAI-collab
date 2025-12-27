#!/bin/bash

###############################################################################
# FocusAI Windows Installer Builder
# This script creates a Windows .exe installer using NSIS
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header "Building FocusAI Windows Installer"

# Check if NSIS is installed
if ! command -v makensis &> /dev/null; then
    print_error "NSIS is not installed"
    print_info "Install NSIS:"
    print_info "  Ubuntu/Debian: sudo apt install nsis"
    print_info "  Fedora: sudo dnf install nsis"
    print_info "  macOS: brew install nsis"
    print_info "  Windows: Download from https://nsis.sourceforge.io/"
    exit 1
fi

print_success "NSIS found"

# Get project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
BUILD_DIR="$PROJECT_DIR/install/build/windows"

# Create build directory
print_info "Creating build directory..."
mkdir -p "$BUILD_DIR"

# Copy NSIS script
print_info "Preparing installer script..."
cp "$PROJECT_DIR/install/focusai-windows.nsi" "$BUILD_DIR/"
cp "$PROJECT_DIR/LICENSE" "$BUILD_DIR/"

# Build the installer
print_info "Building Windows installer..."
cd "$BUILD_DIR"
makensis focusai-windows.nsi

if [ $? -eq 0 ]; then
    print_success "Windows installer built successfully!"
    echo ""
    print_info "Installer location:"
    echo "  $BUILD_DIR/FocusAI-Setup-1.0.0.exe"
    echo ""
    print_info "To distribute:"
    echo "  1. Copy FocusAI-Setup-1.0.0.exe to a Windows machine"
    echo "  2. Run as Administrator"
    echo "  3. Follow the installation wizard"
    echo ""
else
    print_error "Failed to build Windows installer"
    exit 1
fi
