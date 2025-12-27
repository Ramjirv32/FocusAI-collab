# FocusAI Installation Fixes

## Problem Summary
The application was failing to start with the error:
```
Error: Cannot find module 'bcrypt'
```

This was caused by a mismatch between the installed package and the required module.

## Root Causes Fixed

### 1. **Bcrypt Package Mismatch** ✅
**Problem:** 
- `package.json` had `"bcryptjs": "^3.0.3"` (pure JavaScript implementation)
- Controller code required `const bcrypt = require('bcrypt');` (native module)

**Solution:**
- Changed `focuaibackend/package.json` to use `"bcrypt": "^5.1.1"` 
- Removed unused `@types/bcryptjs` from devDependencies

### 2. **Invalid pnpm Command** ✅
**Problem:**
- Installer script had `pnpm approve-builds` which doesn't exist
- This caused silent failures without proper error reporting

**Solution:**
- Removed invalid `pnpm approve-builds` command
- Added proper error handling and logging with exit codes
- Added `tee` commands to log installation output to files

### 3. **Missing Build Tools** ✅
**Problem:**
- `bcrypt` is a native module that requires compilation
- System was missing `build-essential` and Python development tools
- Compilation failed silently during installation

**Solution:**
- Added `install_build_tools()` function to install:
  - **Ubuntu/Debian**: `build-essential`, `python3`
  - **Fedora/RHEL/CentOS**: Development Tools group, `python3`
  - **Arch/Manjaro**: `base-devel`, `python`
- Function is now called early in the installation process

## Files Modified

### 1. `/install/install.sh`
- Added `install_build_tools()` function (lines ~177-202)
- Fixed `install_dependencies()` function (lines ~424-451)
- Added build tools installation to main() function (line ~719)
- Added proper error handling and logging

### 2. `focuaibackend/package.json`
- Changed: `"bcryptjs": "^3.0.3"` → `"bcrypt": "^5.1.1"`
- Removed: `"@types/bcryptjs": "^3.0.0"`

## Installation Process Now

When running the installer (`sudo ./install.sh`), it will:

1. ✓ Detect Linux distribution
2. ✓ Install Node.js (if not present)
3. ✓ Install build tools (NEW)
4. ✓ Check MongoDB
5. ✓ Get API keys
6. ✓ Install pnpm (if not present)
7. ✓ Install backend dependencies with proper error checking
8. ✓ Install frontend dependencies with proper error checking
9. ✓ Setup AI service environment
10. ✓ Configure environment files
11. ✓ Build frontend
12. ✓ Create systemd services
13. ✓ Start services

## Verification

To verify the fix works:

```bash
# Clear existing installations
rm -rf /opt/focusai
rm -rf node_modules pnpm-lock.yaml (in each directory)

# Run installer
sudo ./install/install.sh

# Check logs
cat /var/log/focusai/backend-install.log
cat /var/log/focusai/frontend-install.log

# Verify backend starts
sudo systemctl status focusai-backend
```

## Requirements Met

- ✅ All necessary dependencies are specified
- ✅ Build tools are automatically installed
- ✅ Proper error handling with meaningful messages
- ✅ Installation logs are saved for debugging
- ✅ Native modules (bcrypt) compile correctly

## Notes

- **bcrypt** vs **bcryptjs**: 
  - `bcrypt` is faster (native C++ module) but requires compilation
  - `bcryptjs` is pure JavaScript, slower, but no compilation needed
  - Used `bcrypt` for better performance

- **Build Tools**: Essential for compiling native Node.js modules like bcrypt
  - Without them, `npm install` or `pnpm install` will fail silently or show cryptic errors

- **Logs**: Installation logs are now saved to:
  - `/var/log/focusai/backend-install.log`
  - `/var/log/focusai/frontend-install.log`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `Cannot find module 'bcrypt'` | Run installer to install build tools and dependencies |
| `python3: command not found` | Build tools installation will include Python3 |
| `build-essential: not installed` | Run installer's `install_build_tools()` |
| Npm/pnpm install hangs | Check `/var/log/focusai/*.log` for build errors |

