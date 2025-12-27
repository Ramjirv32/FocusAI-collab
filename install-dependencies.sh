#!/bin/bash

# Quick dependency installer for FocusAI
# Use this if you want to manually install dependencies without the full installer

set -e

echo "═══════════════════════════════════════════════════════"
echo "  FocusAI - Quick Dependency Installer"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root for build tools installation
if [ "$EUID" -eq 0 ]; then
    echo -e "${BLUE}ℹ Installing system build tools...${NC}"
    
    # Detect distro
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
    fi
    
    case $DISTRO in
        ubuntu|debian)
            apt-get update
            apt-get install -y build-essential python3
            ;;
        fedora|rhel|centos)
            dnf groupinstall -y "Development Tools"
            dnf install -y python3
            ;;
        arch|manjaro)
            pacman -S --noconfirm base-devel python
            ;;
    esac
    
    echo -e "${GREEN}✓ System build tools installed${NC}"
    echo ""
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${BLUE}ℹ Installing pnpm...${NC}"
    npm install -g pnpm
    echo -e "${GREEN}✓ pnpm installed${NC}"
else
    PNPM_VERSION=$(pnpm -v)
    echo -e "${GREEN}✓ pnpm already installed: v${PNPM_VERSION}${NC}"
fi

echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Install backend dependencies
if [ -d "$PROJECT_ROOT/focuaibackend" ]; then
    echo -e "${BLUE}ℹ Installing backend dependencies...${NC}"
    cd "$PROJECT_ROOT/focuaibackend"
    
    # Remove old node_modules and lock file if needed
    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ Removing old node_modules...${NC}"
        rm -rf node_modules
    fi
    
    pnpm install --no-frozen-lockfile
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    echo ""
fi

# Install frontend dependencies
if [ -d "$PROJECT_ROOT/Frontend" ]; then
    echo -e "${BLUE}ℹ Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/Frontend"
    
    # Remove old node_modules and lock file if needed
    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}⚠ Removing old node_modules...${NC}"
        rm -rf node_modules
    fi
    
    pnpm install --no-frozen-lockfile
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    echo ""
fi

# Setup AI service
if [ -d "$PROJECT_ROOT/ai" ]; then
    echo -e "${BLUE}ℹ Setting up AI service...${NC}"
    cd "$PROJECT_ROOT/ai"
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        deactivate
        echo -e "${GREEN}✓ AI service environment created${NC}"
    else
        echo -e "${GREEN}✓ AI service environment already exists${NC}"
    fi
    echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  Backend:  cd focuaibackend && npm run dev"
echo "  Frontend: cd Frontend && npm run dev"
echo "  AI:       cd ai && source venv/bin/activate && python run_server.py"
echo ""
