// Global variables to store user information
let userId = null;
let userEmail = null;
let authToken = null;
let activeTabId = null;
let tabStartTime = {};
let tabTotalTime = {};
let focusModeEnabled = false;
let focusDomain = '';
let osDndEnabled = false;


// Initialize by retrieving stored credentials
chrome.storage.local.get(['userId', 'email', 'token', 'focusModeEnabled', 'focusDomain', 'osDndEnabled'], function(result) {
  if (result.userId && result.email && result.token) {
    userId = result.userId;
    userEmail = result.email;
    authToken = result.token;
    console.log('🔑 Credentials loaded from storage:', { userId, userEmail });
  } else {
    console.log('⚠️ No credentials found in storage');
  }
  if (typeof result.focusModeEnabled === 'boolean') focusModeEnabled = result.focusModeEnabled;
  if (typeof result.focusDomain === 'string') focusDomain = result.focusDomain;
  if (typeof result.osDndEnabled === 'boolean') osDndEnabled = result.osDndEnabled;
});


// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'setCredentials') {
    userId = message.userId;
    userEmail = message.email;
    authToken = message.token;
    console.log('🔑 Credentials updated from popup:', { userId, userEmail });
    
    // Send a test log to verify connection
    setTimeout(() => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
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
    try { enforceFocusModeAllTabs(); } catch (_) {}
    try { toggleOsDndIfNeeded(); } catch (_) {}
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
chrome.tabs.onActivated.addListener(function(activeInfo) {
  const tabId = activeInfo.tabId;
  
  console.log(`📋 Tab activated: ${tabId}`);
  
  // End timing for previous tab
  if (activeTabId && tabStartTime[activeTabId]) {
    const duration = Math.round((Date.now() - tabStartTime[activeTabId]) / 1000);
    if (duration > 0) {
      tabTotalTime[activeTabId] = (tabTotalTime[activeTabId] || 0) + duration;
      console.log(`📊 Tab ${activeTabId} was active for ${duration} seconds`);
      
      // Get tab info to log
      chrome.tabs.get(activeTabId, function(tab) {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError && chrome.runtime.lastError.message ? chrome.runtime.lastError.message : String(chrome.runtime.lastError);
        console.warn("❕ Skipping tab info (non-fatal):", msg);
        return;
      }
        logTabActivity(tab, duration, "tab-switch");
      });
    }
  }
  
  // Start timing for new tab
  activeTabId = tabId;
  tabStartTime[tabId] = Date.now();
  
  // Log the new active tab info
  chrome.tabs.get(tabId, function(tab) {
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
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    console.log(`🔄 Tab ${tabId} URL updated: ${tab.url}`);
    
    // If the tab was already being tracked, log the previous session
    if (tabStartTime[tabId]) {
      const duration = Math.round((Date.now() - tabStartTime[tabId]) / 1000);
      if (duration > 0) {
        logTabActivity(tab, duration, "url-change");
      }
    }
    
    // Reset timing for this tab as it's a new page
    tabStartTime[tabId] = Date.now();
    enforceFocusModeForTab(tab);
  }
});


// Track when browser loses/gains focus
chrome.windows.onFocusChanged.addListener(function(windowId) {
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
        chrome.tabs.get(activeTabId, function(tab) {
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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
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
  // Only log if we have user credentials and significant duration
  if (!userId || !userEmail || duration < 1) {
    console.log(`⚠️ Not logging tab - credentials missing or duration too short (${duration}s)`);
    return;
  }
  
  console.log(`📝 Logging activity for tab: ${tab.title} (${duration}s) - Reason: ${reason}`);
  
  // Prepare data for API
  const tabData = {
    url: tab.url,
    title: tab.title,
    duration: duration,
    userId: userId,
    email: userEmail
  };
  
  // Create headers - include auth token if available
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
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
    return response.json();
  })
  .then(data => {
    console.log("✅ Tab activity logged successfully:", data);
  })
  .catch(error => {
    console.error("❌ Error logging tab activity:", error);
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
    chrome.tabs.update(tab.id, { muted: !matches }, function() {
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
        }, () => {});
      } catch (_) {}
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
              const noop = function() {};
              try {
                window.alert = noop;
                window.confirm = function() { return false; };
                window.prompt = function() { return null; };
              } catch(_) {}
              try {
                // Deny notifications
                const DeniedNotification = function() { return null; };
                DeniedNotification.requestPermission = function(cb) {
                  const result = 'denied';
                  if (typeof cb === 'function') cb(result);
                  return Promise.resolve(result);
                };
                Object.defineProperty(DeniedNotification, 'permission', { get: () => 'denied' });
                // Best-effort replace
                window.Notification = DeniedNotification;
              } catch(_) {}
              // Mute media elements continuously
              const muteMedia = () => {
                try {
                  document.querySelectorAll('video,audio').forEach(el => { try { el.muted = true; el.volume = 0; } catch(_){} });
                } catch(_) {}
              };
              muteMedia();
              try { new MutationObserver(muteMedia).observe(document.documentElement, { childList: true, subtree: true }); } catch(_) {}
            } catch(_) {}
          }
        });
      } catch (_) {}
    }
  } catch (_) {}
}

// Apply focus mode rules to all tabs (used when toggled)
function enforceFocusModeAllTabs() {
  if (!focusModeEnabled || !focusDomain) return;
  try {
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(t => {
        const u = t && t.url ? t.url : '';
        if (!u || u.startsWith('chrome://') || u.startsWith('edge://') || u.startsWith('about:') || u.startsWith('chrome-extension://')) return;
        enforceFocusModeForTab(t);
      });
    });
  } catch (_) {}
}

// Periodic enforcement to handle missed events or dynamic changes
setInterval(() => {
  try {
    if (focusModeEnabled && focusDomain) {
      enforceFocusModeAllTabs();
    }
  } catch (_) {}
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
setInterval(function() {
  if (activeTabId && tabStartTime[activeTabId]) {
    chrome.tabs.get(activeTabId, function(tab) {
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
  console.log('💓 Extension heartbeat - Active tab:', activeTabId);
}, 60000);

// Log when extension is loaded
console.log('🚀 Tab tracker extension loaded - version 1.1');
