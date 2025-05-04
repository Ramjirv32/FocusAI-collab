
let userCredentials = {
  userId: null,
  email: null,
  token: null
};

chrome.storage.local.get(['userId', 'email', 'token'], function(result) {
  if (result.userId && result.email && result.token) {
    userCredentials = {
      userId: result.userId,
      email: result.email,
      token: result.token
    };
    console.log('Loaded saved credentials for:', result.email);
  }
});


chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'setCredentials') {
    userCredentials = {
      userId: message.userId,
      email: message.email,
      token: message.token
    };
    console.log('Updated credentials for:', message.email);
  } else if (message.action === 'clearCredentials') {
    userCredentials = {
      userId: null,
      email: null,
      token: null
    };
    console.log('Cleared credentials');
  }
});


let activeTabId = null;
let tabStartTime = {};
let lastSentTime = {};


chrome.tabs.onActivated.addListener(activeInfo => {
  const tabId = activeInfo.tabId;
  activeTabId = tabId;
  
  if (!tabStartTime[tabId]) {
    tabStartTime[tabId] = Date.now();
  }
  
  chrome.tabs.get(tabId, tab => {
    console.log(`Tab activated: ${tab.title}`);
  });
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    activeTabId = tabId;
    tabStartTime[tabId] = Date.now();
    console.log(`Tab updated: ${tab.title}`);
    

    if (changeInfo.url) {
      lastSentTime[tabId] = 0;
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabStartTime[tabId]) {
    sendTabData(null, tabId);
    delete tabStartTime[tabId];
    delete lastSentTime[tabId];
  }
});



function extractDomainFromUrl(url) {
  try {
    if (!url || url.startsWith('chrome://')) return 'chrome';
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace('www.', '');
  } catch (e) {
    return 'unknown';
  }
}

function sendTabData(tab, closedTabId = null) {
  let currentTab = tab;
  let tabId = tab ? tab.id : closedTabId;
  
 
  if (closedTabId !== null && !tab) {
    const duration = (Date.now() - tabStartTime[closedTabId]) / 1000;
    
    
    if (duration < 1) return;
    
    chrome.tabs.get(closedTabId, (closedTab) => {
      if (chrome.runtime.lastError) {
        console.log('Tab was closed, cannot access data');
        return;
      }
      
      const domain = extractDomainFromUrl(closedTab.url);
      
      const tabData = {
        userId: userCredentials.userId || 'anonymous',
        email: userCredentials.email || 'anonymous@example.com',
        title: closedTab.title || 'Unnamed Tab',
        url: closedTab.url || 'unknown',
        domain: domain,
        duration: duration,
        timestamp: new Date().toISOString()
      };
      
      sendToServer(tabData);
    });
    return;
  }
  
  // Handle active tab
  if (!tab) return;
  
  // Only send data every few seconds to avoid spamming
  const now = Date.now();
  const timeSinceLastSent = lastSentTime[tabId] ? (now - lastSentTime[tabId]) / 1000 : Infinity;
  
  // Don't send updates too frequently for the same tab
  if (timeSinceLastSent < 10) {
    return;
  }
  
  const duration = (now - tabStartTime[tabId]) / 1000;
  
  // Skip very short durations
  if (duration < 1) return;
  
  // Update last sent time
  lastSentTime[tabId] = now;
  
  // Get domain
  const domain = extractDomainFromUrl(tab.url);
  
  const tabData = {
    userId: userCredentials.userId || 'anonymous',
    email: userCredentials.email || 'anonymous@example.com',
    title: tab.title || 'Unnamed Tab',
    url: tab.url || 'unknown',
    domain: domain,
    duration: duration,
    timestamp: new Date().toISOString()
  };
  
  sendToServer(tabData);
  
 
  tabStartTime[tabId] = now;
}

function sendToServer(tabData) {
  console.log('Sending tab data:', tabData);
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
 
  if (userCredentials.token) {
    headers['Authorization'] = `Bearer ${userCredentials.token}`;
  }
  
  fetch("http://localhost:5000/log-tab", {
    method: "POST",
    headers: headers,
    body: JSON.stringify(tabData)
  })

  .then(response => {
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return response.text();
  })
  .then(data => console.log('Server response:', data))
  .catch(error => console.error('Error sending tab data:', error));
}

// Periodically check active tab (every 5 seconds)
setInterval(() => {
  if (activeTabId !== null) {
    chrome.tabs.get(activeTabId, tab => {
      if (!chrome.runtime.lastError && tab) {
        sendTabData(tab);
      }
    });
  }
}, 5000);

// Initial check after extension loads
setTimeout(() => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length > 0) {
      activeTabId = tabs[0].id;
      tabStartTime[activeTabId] = Date.now();
    }
  });
}, 1000);
