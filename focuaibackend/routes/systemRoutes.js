const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const auth = require('../middleware/auth');

// POST /api/system/os-dnd { enabled: boolean }
router.post('/os-dnd', auth, async (req, res) => {
  try {
    if (process.env.ENABLE_OS_DND !== 'true') {
      return res.status(403).json({ success: false, error: 'OS DND control disabled by server config' });
    }
    if (process.platform !== 'win32') {
      return res.status(501).json({ success: false, error: 'OS DND only supported on Windows' });
    }

    const { enabled } = req.body || {};
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Missing or invalid enabled flag' });
    }

    // Toggle toast notifications globally via registry (best-effort)
    // 0 = disabled (DND on), 1 = enabled (DND off)
    const value = enabled ? 0 : 1;
    const regPath = 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings';
    const psCommand = `Try { \\
      # Ensure base keys exist\\
      New-Item -Path '${regPath}' -Force | Out-Null; \\
      New-ItemProperty -Path '${regPath}' -Name NOC_GLOBAL_SETTING_TOASTS_ENABLED -PropertyType DWord -Value ${value} -Force | Out-Null; \\
      # Focus Assist best-effort (2 = Alarms only, 1 = Priority only, 0 = Off)\\
      New-Item -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\QuietHours -Force | Out-Null; \\
      New-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\QuietHours -Name FocusAssist -PropertyType DWord -Value ${enabled ? 2 : 0} -Force | Out-Null; \\
      New-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\QuietHours -Name QuietHoursActive -PropertyType DWord -Value ${enabled ? 1 : 0} -Force | Out-Null; \\
      # Per-app: explicitly target Microsoft Store WhatsApp (PackageFamilyName)!App\\
      $pkg = Get-AppxPackage -Name '*WhatsApp*' -ErrorAction SilentlyContinue | Select-Object -First 1; \\
      $notifRoot = '${regPath}'; \\
      $enabledVal = ${enabled ? 0 : 1}; \\
      if ($pkg -and $pkg.PackageFamilyName) { \\
        $aumid = $pkg.PackageFamilyName + '!App'; \\
        $appKey = Join-Path $notifRoot $aumid; \\
        New-Item -Path $appKey -Force | Out-Null; \\
        New-ItemProperty -Path $appKey -Name Enabled -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
        New-ItemProperty -Path $appKey -Name ShowInActionCenter -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
        New-ItemProperty -Path $appKey -Name ShowBanner -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
        New-ItemProperty -Path $appKey -Name AllowNotificationSound -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
        New-ItemProperty -Path $appKey -Name ToastEnabled -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
      } \\
      # Fallback: enumerate any keys containing whatsapp\\
      $keys = Get-ChildItem -Path $notifRoot -ErrorAction SilentlyContinue; \\
      foreach ($k in $keys) { \\
        $name = $k.PSChildName.ToLower(); \\
        if ($name -like '*whatsapp*') { \\
          New-ItemProperty -Path $k.PSPath -Name Enabled -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
          New-ItemProperty -Path $k.PSPath -Name ShowInActionCenter -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
          New-ItemProperty -Path $k.PSPath -Name ShowBanner -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
          New-ItemProperty -Path $k.PSPath -Name AllowNotificationSound -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
          New-ItemProperty -Path $k.PSPath -Name ToastEnabled -PropertyType DWord -Value $enabledVal -Force | Out-Null; \\
        } \\
      } \\
      Exit 0 \\
    } Catch { Exit 1 }`;

    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], { windowsHide: true });

    let stderr = '';
    ps.stderr.on('data', (d) => { stderr += d.toString(); });

    ps.on('close', (code) => {
      if (code === 0) {
        return res.json({ success: true, enabled });
      }
      return res.status(500).json({ success: false, error: 'PowerShell failed', code, stderr });
    });
  } catch (error) {
    console.error('OS DND toggle error:', error);
    res.status(500).json({ success: false, error: 'Server error toggling OS DND', details: error.message });
  }
});

module.exports = router;


