// Global variables to store user information
console.log('🚀 FocusAI Background Script Loading... Version 1.0');

let userId = null;
let userEmail = null;
let authToken = null;
let activeTabId = null;
let tabStartTime = {};
let tabTotalTime = {};
let focusModeEnabled = false;
let focusDomain = '';
let osDndEnabled = false;

console.log('✅ Variables initialized successfully');

// Add global error handler
self.addEventListener('error', (event) => {
  console.error('❌ Global error caught:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

// Initialize by retrieving stored credentials
console.log('📦 Attempting to access Chrome storage...');
chrome.storage.local.get(['userId', 'email', 'token', 'focusModeEnabled', 'focusDomain', 'osDndEnabled'], function (result) {
  console.log('📦 Chrome storage accessed successfully!');
  console.log('📦 Storage result:', result);
  if (result.userId && result.email && result.token) {
    userId = result.userId;
    userEmail = result.email;
    authToken = result.token;
    console.log('🔑 Credentials loaded from storage:', { userId, userEmail });

    // Test server connectivity
    fetch('http://localhost:5001/test-extension')
      .then(res => res.json())
      .then(data => console.log('✅ Server connectivity test passed:', data))
      .catch(err => console.error('❌ Server connectivity test failed:', err));
  } else {
    console.log('⚠️ No credentials found in storage');
  }
  if (typeof result.focusModeEnabled === 'boolean') focusModeEnabled = result.focusModeEnabled;
  if (typeof result.focusDomain === 'string') focusDomain = result.focusDomain;
  if (typeof result.osDndEnabled === 'boolean') osDndEnabled = result.osDndEnabled;
});


// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'setCredentials') {
    userId = message.userId;
    userEmail = message.email;
    authToken = message.token;
    console.log('🔑 Credentials updated from popup:', { userId, userEmail });

    // Initialize tracking with the new credentials
    if (typeof initializeTracking === 'function') {
      initializeTracking();
    }

    // Send a test log to verify connection
    setTimeout(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length > 0) {
          logTabActivity(tabs[0], 1, "test");
        }
      });
    }, 1000);
  } else if (message.action === 'clearCredentials') {
    userId = null;
    userEmail = null;
    authToken = null;
    console.log('🔑 Credentials cleared');
  } else if (message.action === 'updateFocusMode') {
    focusModeEnabled = !!message.enabled;
    focusDomain = (message.domain || '').trim();
    osDndEnabled = !!message.osDndEnabled;
    chrome.storage.local.set({ focusModeEnabled, focusDomain, osDndEnabled });
    console.log('🎯 Focus mode updated:', { focusModeEnabled, focusDomain, osDndEnabled });
    try { enforceFocusModeAllTabs(); } catch (_) { }
    try { toggleOsDndIfNeeded(); } catch (_) { }
  } else if (message.action === 'debugInfo') {
    const info = {
      credentials: {
        hasUserId: !!userId,
        hasUserEmail: !!userEmail,
        hasToken: !!authToken
      },
      activeTab: activeTabId,
      tabStartTimes: tabStartTime,
      tabTotalTimes: tabTotalTime,
      focus: { enabled: focusModeEnabled, domain: focusDomain, osDndEnabled }
    };
    console.log('🔍 Debug info requested:', info);
    sendResponse(info);
    return true; // Required for async sendResponse
  }
});


// Track when tab becomes active
chrome.tabs.onActivated.addListener(function (activeInfo) {
  const tabId = activeInfo.tabId;

  console.log(`📋 [EVENT] Tab activated: ${tabId}`);
  console.log(`   Credentials: userId=${!!userId}, email=${!!userEmail}`);

  // End timing for previous tab
  if (activeTabId && tabStartTime[activeTabId]) {
    const duration = Math.round((Date.now() - tabStartTime[activeTabId]) / 1000);
    console.log(`📊 Previous tab ${activeTabId} was active for ${duration} seconds`);

    if (duration > 0) {
      tabTotalTime[activeTabId] = (tabTotalTime[activeTabId] || 0) + duration;

      // Get tab info to log
      chrome.tabs.get(activeTabId, function (tab) {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError && chrome.runtime.lastError.message ? chrome.runtime.lastError.message : String(chrome.runtime.lastError);
          console.warn("❕ Skipping tab info (non-fatal):", msg);
          return;
        }
        console.log(`📤 About to call logTabActivity for: ${tab.title}`);
        logTabActivity(tab, duration, "tab-switch");
      });
    } else {
      console.log(`⏭️  Duration too short (${duration}s), skipping`);
    }
  } else {
    console.log(`   No previous tab to log (activeTabId: ${activeTabId}, startTime: ${tabStartTime[activeTabId]})`);
  }

  // Start timing for new tab
  activeTabId = tabId;
  tabStartTime[tabId] = Date.now();

  // Log the new active tab info
  chrome.tabs.get(tabId, function (tab) {
    if (chrome.runtime.lastError) {
      const msg = chrome.runtime.lastError && chrome.runtime.lastError.message ? chrome.runtime.lastError.message : String(chrome.runtime.lastError);
      console.warn("❕ Skipping new active tab info (non-fatal):", msg);
      return;
    }
    console.log(`🌐 New active tab: ${tab.title} (${tab.url})`);
    enforceFocusModeForTab(tab);
  });
});


// Track when tab URL changes
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log(`🔄 [EVENT] Tab ${tabId} updated:`, changeInfo);

  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    console.log(`✅ Tab ${tabId} URL loaded completely: ${tab.url}`);

    // If the tab was already being tracked, log the previous session
    if (tabStartTime[tabId]) {
      const duration = Math.round((Date.now() - tabStartTime[tabId]) / 1000);
      console.log(`📊 Previous session duration: ${duration}s`);

      if (duration > 0) {
        console.log(`📤 About to call logTabActivity for URL change: ${tab.title}`);
        logTabActivity(tab, duration, "url-change");
      }
    }

    // Reset timing for this tab as it's a new page
    tabStartTime[tabId] = Date.now();
    console.log(`⏱️  Started timing for tab ${tabId}`);
    enforceFocusModeForTab(tab);
  }
});


// Track when browser loses/gains focus
chrome.windows.onFocusChanged.addListener(function (windowId) {
  console.log(`🪟 Window focus changed: ${windowId}`);

  // Browser lost focus (windowId === -1) or gained focus
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log("👋 Browser lost focus");

    // Browser lost focus, end timing for active tab
    if (activeTabId && tabStartTime[activeTabId]) {
      const duration = Math.round((Date.now() - tabStartTime[activeTabId]) / 1000);
      if (duration > 0) {
        tabTotalTime[activeTabId] = (tabTotalTime[activeTabId] || 0) + duration;

        // Get tab info to log
        chrome.tabs.get(activeTabId, function (tab) {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError && chrome.runtime.lastError.message ? chrome.runtime.lastError.message : String(chrome.runtime.lastError);
            console.warn("❕ Skipping tab info on blur (non-fatal):", msg);
            return;
          }
          logTabActivity(tab, duration, "window-blur");
        });
      }

      // Clear active tab
      tabStartTime[activeTabId] = null;
      activeTabId = null;
    }
  } else {
    console.log("👋 Browser gained focus");

    // Browser gained focus, get the active tab and start timing
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        activeTabId = tabs[0].id;
        tabStartTime[activeTabId] = Date.now();
        console.log(`🔍 Focus returned to tab: ${tabs[0].title} (${tabs[0].url})`);
      } else {
        console.log("⚠️ No active tab found after regaining focus");
      }
    });
  }
});


// Function to log tab activity to backend
function logTabActivity(tab, duration, reason) {
  console.log(`🎯 [logTabActivity] CALLED - Tab: ${tab.title}, Duration: ${duration}s, Reason: ${reason}`);

  // Skip if duration is too short
  if (duration < 1) {
    console.log(`⚠️ Not logging tab - duration too short (${duration}s)`);
    return;
  }

  // Skip internal browser pages - they have no URL and no value to track
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('moz-extension://')) {
    console.log(`⚠️ Skipping internal browser page: ${tab.url || 'NO_URL'}`);
    return;
  }

  console.log(`📝 Logging activity for tab: ${tab.title} (${duration}s) - Reason: ${reason}`);
  console.log(`   Tab URL: ${tab.url}`);

  // Prepare data for API - ENSURE URL is ALWAYS present
  const tabData = {
    url: tab.url || 'unknown',  // Always provide URL, use 'unknown' as fallback
    title: tab.title || 'Untitled',
    duration: duration
    // Backend will auto-detect user via fallback mechanism
  };

  // Create headers
  const headers = {
    'Content-Type': 'application/json'
  };

  console.log('🌐 Sending data to server:', {
    endpoint: 'http://localhost:5001/log-tab',
    data: tabData
  });

  // Send data to backend
  fetch("http://localhost:5001/log-tab", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(tabData)
  })
    .then(response => {
      console.log(`🌐 Server response status: ${response.status}`);
      if (!response.ok) {
        console.error(`❌ Server error: ${response.status} ${response.statusText}`);
        return response.text();
      }
      return response.json();
    })
    .then(data => {
      if (typeof data === 'string') {
        console.error(`❌ Error response from server:`, data);
      } else {
        console.log("✅ Tab activity logged successfully:", data);
      }
    })
    .catch(error => {
      console.error("❌ Error logging tab activity:", error);
      console.error("❌ Stack trace:", error.stack);
    });
}


// Enforce focus mode: if enabled and current tab domain does not match focusDomain, mute the tab (similar to DND)
function enforceFocusModeForTab(tab) {
  try {
    if (!focusModeEnabled) return;
    const rawUrl = tab && tab.url ? tab.url : '';
    if (!rawUrl || rawUrl.startsWith('chrome://') || rawUrl.startsWith('edge://') || rawUrl.startsWith('about:') || rawUrl.startsWith('chrome-extension://')) {
      return; // skip restricted/internal pages
    }
    const url = new URL(rawUrl);
    const host = url.hostname || '';
    if (!focusDomain) return;
    const matches = host === focusDomain || host.endsWith('.' + focusDomain);
    // If not focused domain, try to mute the tab
    chrome.tabs.update(tab.id, { muted: !matches }, function () {
      if (chrome.runtime.lastError) {
        // ignore error
      }
    });
    // Additionally, block notifications and sound at the Chrome level for non-focused origins
    if (!matches) {
      try {
        chrome.contentSettings['notifications'].set({
          primaryPattern: `${url.origin}/*`,
          setting: 'block'
        }, () => { });
      } catch (_) { }
    }
    // If not focused domain, inject suppression into the page's MAIN world
    if (!matches) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          world: 'MAIN',
          func: () => {
            try {
              const OriginalNotification = window.Notification;
              const noop = function () { };
              try {
                window.alert = noop;
                window.confirm = function () { return false; };
                window.prompt = function () { return null; };
              } catch (_) { }
              try {
                // Deny notifications
                const DeniedNotification = function () { return null; };
                DeniedNotification.requestPermission = function (cb) {
                  const result = 'denied';
                  if (typeof cb === 'function') cb(result);
                  return Promise.resolve(result);
                };
                Object.defineProperty(DeniedNotification, 'permission', { get: () => 'denied' });
                // Best-effort replace
                window.Notification = DeniedNotification;
              } catch (_) { }
              // Mute media elements continuously
              const muteMedia = () => {
                try {
                  document.querySelectorAll('video,audio').forEach(el => { try { el.muted = true; el.volume = 0; } catch (_) { } });
                } catch (_) { }
              };
              muteMedia();
              try { new MutationObserver(muteMedia).observe(document.documentElement, { childList: true, subtree: true }); } catch (_) { }
            } catch (_) { }
          }
        });
      } catch (_) { }
    }
  } catch (_) { }
}

// Apply focus mode rules to all tabs (used when toggled)
function enforceFocusModeAllTabs() {
  if (!focusModeEnabled || !focusDomain) return;
  try {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(t => {
        const u = t && t.url ? t.url : '';
        if (!u || u.startsWith('chrome://') || u.startsWith('edge://') || u.startsWith('about:') || u.startsWith('chrome-extension://')) return;
        enforceFocusModeForTab(t);
      });
    });
  } catch (_) { }
}

// Periodic enforcement to handle missed events or dynamic changes
setInterval(() => {
  try {
    if (focusModeEnabled && focusDomain) {
      enforceFocusModeAllTabs();
    }
  } catch (_) { }
}, 7000);

// Toggle OS-level DND via backend (Windows only)
function toggleOsDndIfNeeded() {
  if (!userEmail || !authToken) return; // must be logged in
  const desired = !!(focusModeEnabled && osDndEnabled);
  fetch('http://localhost:5001/api/system/os-dnd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ enabled: desired })
  }).then(r => r.json()).then(d => {
    console.log('🖥️ OS DND toggled:', d);
  }).catch(err => {
    console.warn('OS DND toggle failed:', err);
  });
}

// Periodically check and log the current active tab
setInterval(function () {
  if (activeTabId && tabStartTime[activeTabId]) {
    chrome.tabs.get(activeTabId, function (tab) {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError && chrome.runtime.lastError.message ? chrome.runtime.lastError.message : String(chrome.runtime.lastError);
        console.warn("❕ Skipping periodic tab (non-fatal):", msg);
        return;
      }

      const duration = Math.round((Date.now() - tabStartTime[activeTabId]) / 1000);
      if (duration >= 5) { // Only log if at least 5 seconds have passed
        console.log(`⏱️ Periodic update for tab ${tab.title}: ${duration}s`);
        logTabActivity(tab, duration, "periodic");

        // Reset the start time but keep the tab active
        tabStartTime[activeTabId] = Date.now();
      }
    });
  }
}, 10000); // Check every 10 seconds

// Add a debug heartbeat to check if extension is running
setInterval(() => {
  if (activeTabId) {
    chrome.tabs.get(activeTabId, function (tab) {
      if (!chrome.runtime.lastError && tab) {
        console.log(`💓 Extension heartbeat - Active tab: ${activeTabId} (${tab.title}) [${tab.url}]`);
      } else {
        console.log('💓 Extension heartbeat - Active tab:', activeTabId, '(could not retrieve info)');
      }
    });
  } else {
    console.log('💓 Extension heartbeat - Active tab: null (not tracking)');
  }
}, 60000);

// Initialize tracking - find and start tracking the current active tab
function initializeTracking() {
  console.log('🔄 Initializing tab tracking...');
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      activeTabId = tabs[0].id;
      tabStartTime[activeTabId] = Date.now();
      console.log(`✅ Tracking initialized for tab: ${tabs[0].title} (${tabs[0].url})`);
      console.log(`   Tab ID: ${activeTabId}`);
    } else {
      console.log('⚠️ No active tab found during initialization');
    }
  });
}

// Log when extension is loaded
console.log('🚀 Tab tracker extension loaded - version 1.2');

// Initialize tracking when extension loads
initializeTracking();
