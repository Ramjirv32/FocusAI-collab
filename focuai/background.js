let currentTab = null;
let startTime = null;
let authToken = null;
let userEmail = null;

// Load stored auth token and email on startup
chrome.storage.local.get(['authToken', 'userEmail'], (data) => {
  if (data.authToken && data.userEmail) {
    authToken = data.authToken;
    userEmail = data.userEmail;
    console.log('Auth loaded for:', userEmail);
  } else {
    console.log('No authentication found. Please log in via the popup.');
  }
});

// Handle tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const newTab = await chrome.tabs.get(activeInfo.tabId);

    if (currentTab && startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 0) {
        sendTabData({ ...currentTab, duration });
      }
    }

    currentTab = newTab;
    startTime = Date.now();
  } catch (err) {
    console.error("Error getting tab info:", err);
  }
});

// Handle window focus changes to track when user switches away from browser
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus, log the current tab
    if (currentTab && startTime) {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 0) {
        sendTabData({ ...currentTab, duration });
      }
      // Don't reset the tab, just update the start time
      startTime = Date.now();
    }
  } else {
    // Browser got focus again, update the current tab and start time
    try {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      if (tabs.length > 0) {
        currentTab = tabs[0];
        startTime = Date.now();
      }
    } catch (err) {
      console.error("Error querying active tab:", err);
    }
  }
});

function sendTabData(tab) {
  if (!tab || !tab.url || !tab.title) {
    console.warn("Invalid tab data, skipping...");
    return;
  }

  // Skip sending if no authentication
  if (!authToken || !userEmail) {
    console.warn("Not authenticated. Please log in via popup.");
    return;
  }

  // Format data for the server
  const tabData = {
    browser: "Chrome",
    url: tab.url,
    title: tab.title,
    duration: tab.duration || 0,
    email: userEmail,
    favicon: tab.favIconUrl || null
  };

  console.log("Sending tab data:", tabData);

  // Send to the correct endpoint with authentication
  fetch("http://localhost:5000/api/track-browser-tab", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(tabData)
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(`Server error: ${response.status}`);
    }
  })
  .then(data => {
    console.log("Tab data sent successfully:", data);
  })
  .catch(err => {
    console.error("Failed to send tab data:", err);
    
    // If unauthorized, clear auth data so user knows to log in again
    if (err.message.includes("401")) {
      chrome.storage.local.remove(['authToken', 'userEmail']);
      authToken = null;
      userEmail = null;
    }
  });
}

// Also track when tabs are updated (URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only handle the tab that's currently active and when URL changes
  if (currentTab && tabId === currentTab.id && changeInfo.url) {
    // Send data for the previous state
    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (duration > 0) {
      sendTabData({ ...currentTab, duration });
    }
    
    // Update current tab and reset timer
    currentTab = tab;
    startTime = Date.now();
  }
});

// Handle browser close
chrome.runtime.onSuspend.addListener(() => {
  if (currentTab && startTime) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (duration > 0) {
      sendTabData({ ...currentTab, duration });
    }
  }
});
