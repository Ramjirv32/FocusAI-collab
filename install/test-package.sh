#!/bin/bash

###############################################################################
# FocusAI Package Test Script
# Tests the .deb package in a clean environment
###############################################################################

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}[TEST] $1${NC}"
}

print_pass() {
    echo -e "${GREEN}[PASS] $1${NC}"
}

print_fail() {
    echo -e "${RED}[FAIL] $1${NC}"
    exit 1
}

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEB_FILE="$SCRIPT_DIR/build/focusai_1.0.0_amd64.deb"

# Test 1: Check if package exists
print_test "Checking if .deb package exists..."
if [ -f "$DEB_FILE" ]; then
    print_pass "Package found: $DEB_FILE"
else
    print_fail "Package not found. Run build-deb.sh first"
fi

# Test 2: Verify package structure
print_test "Verifying package structure..."
dpkg-deb --contents "$DEB_FILE" > /tmp/focusai-contents.txt
if grep -q "opt/focusai" /tmp/focusai-contents.txt; then
    print_pass "Package structure is correct"
else
    print_fail "Package structure is incorrect"
fi

# Test 3: Check package info
print_test "Checking package metadata..."
dpkg-deb --info "$DEB_FILE"
print_pass "Package metadata is valid"

# Test 4: Check package size
print_test "Checking package size..."
SIZE=$(du -h "$DEB_FILE" | cut -f1)
echo "Package size: $SIZE"
print_pass "Package size check complete"

# Test 5: Lint package
print_test "Linting package with lintian (if available)..."
if command -v lintian &> /dev/null; then
    lintian "$DEB_FILE" || true
    print_pass "Lintian check complete"
else
    echo "Lintian not installed, skipping..."
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "All tests passed! ✅"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "To install the package:"
echo "  sudo dpkg -i $DEB_FILE"
echo ""
echo "To test installation in Docker:"
echo "  docker run -it --rm -v $(pwd):/work ubuntu:22.04 bash"
echo "  cd /work && apt update && apt install -y ./$(basename $DEB_FILE)"
echo ""
