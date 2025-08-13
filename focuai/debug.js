let debugLog = [];

function logToPage(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  debugLog.unshift(`[${timestamp}] ${message}`);
  if (debugLog.length > 100) debugLog.pop();
  
  document.getElementById('debugLog').textContent = debugLog.join('\n');
}

document.addEventListener('DOMContentLoaded', function() {
  const resultsEl = document.getElementById('results');
  const responseEl = document.getElementById('response');
  
  // Check extension status
  function checkStatus() {
    const statusDiv = document.getElementById('status');
    
    if (chrome && chrome.runtime && chrome.runtime.id) {
      statusDiv.innerHTML = '<span class="success">Extension is running. ID: ' + chrome.runtime.id + '</span>';
      logToPage('Extension status checked: Running', 'success');
    } else {
      statusDiv.innerHTML = '<span class="error">Extension is not properly initialized</span>';
      logToPage('Extension status checked: Not running', 'error');
    }
  }
  
  // Check credentials
  function checkCredentials() {
    const credentialsDiv = document.getElementById('credentials');
    
    chrome.storage.local.get(['userId', 'email', 'token'], function(result) {
      if (result.userId && result.email && result.token) {
        credentialsDiv.innerHTML = `
          <p class="success">✓ User is logged in</p>
          <p>User ID: ${result.userId.substring(0, 10)}...</p>
          <p>Email: ${result.email}</p>
          <p>Token: ${result.token.substring(0, 15)}...</p>
        `;
        logToPage(`Credentials found for user: ${result.email}`, 'success');
      } else {
        credentialsDiv.innerHTML = '<p class="error">No credentials found. Please login via the popup.</p>';
        logToPage('No credentials found', 'warning');
      }
    });
  }
  
  // Check active tab
  function checkActiveTab() {
    const activeTabDiv = document.getElementById('activeTab');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        activeTabDiv.innerHTML = `
          <p>Title: ${tab.title}</p>
          <p>URL: ${tab.url}</p>
          <p>Tab ID: ${tab.id}</p>
        `;
        logToPage(`Active tab: "${tab.title}"`, 'info');
      } else {
        activeTabDiv.innerHTML = '<p class="warning">No active tab found</p>';
        logToPage('No active tab found', 'warning');
      }
    });
    
    // Also get debug info from background script
    chrome.runtime.sendMessage({action: 'debugInfo'}, function(response) {
      if (response) {
        activeTabDiv.innerHTML += `
          <p>Background tracking:</p>
          <pre>${JSON.stringify(response, null, 2)}</pre>
        `;
        logToPage('Retrieved background tracking info', 'info');
      } else {
        activeTabDiv.innerHTML += `<p class="error">Could not retrieve background tracking info</p>`;
        logToPage('Failed to retrieve background tracking info', 'error');
      }
    });
  }
  
  // Test tab logging
  function testTabLogging() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        
        chrome.storage.local.get(['userId', 'email', 'token'], function(result) {
          if (!result.userId || !result.email) {
            logToPage('Cannot test logging: No credentials found', 'error');
            return;
          }
          
          // Build test data
          const testData = {
            url: tab.url,
            title: tab.title,
            duration: 10, // 10 seconds test duration
            userId: result.userId,
            email: result.email
          };
          
          // Build headers
          const headers = {
            'Content-Type': 'application/json'
          };
          
          if (result.token) {
            headers['Authorization'] = `Bearer ${result.token}`;
          }
          
          logToPage(`Sending test data for tab: "${tab.title}"`, 'info');
          
          // Send request
          fetch('http://localhost:5001/log-tab', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testData)
          })
          .then(response => response.json())
          .then(data => {
            logToPage(`Server response: ${JSON.stringify(data)}`, 'success');
          })
          .catch(error => {
            logToPage(`Error sending test data: ${error.message}`, 'error');
          });
        });
      } else {
        logToPage('No active tab to test with', 'error');
      }
    });
  }
  
  // Clear stored timings
  function clearStoredData() {
    chrome.runtime.sendMessage({action: 'clearTimings'}, function(response) {
      logToPage('Request sent to clear timing data', 'info');
    });
  }
  
  // Initialize
  checkStatus();
  checkCredentials();
  checkActiveTab();
  
  // Add event listeners
  document.getElementById('refreshStatus').addEventListener('click', checkStatus);
  document.getElementById('checkCredentials').addEventListener('click', checkCredentials);
  document.getElementById('checkActiveTab').addEventListener('click', checkActiveTab);
  document.getElementById('testTabLogging').addEventListener('click', testTabLogging);
  document.getElementById('clearStoredData').addEventListener('click', clearStoredData);
  document.getElementById('clearLog').addEventListener('click', function() {
    debugLog = [];
    document.getElementById('debugLog').textContent = 'Log cleared';
  });
  
  logToPage('Debug page initialized', 'info');
});