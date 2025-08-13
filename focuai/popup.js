document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const loggedInDiv = document.getElementById('logged-in');
  const userEmailEl = document.getElementById('user-email');
  const statusDiv = document.getElementById('status');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const focusToggle = document.getElementById('focus-toggle');
  const focusDomainInput = document.getElementById('focus-domain');
  const osDndToggle = document.getElementById('os-dnd-toggle');
  
  // Check if user is already logged in
  chrome.storage.local.get(['token', 'userId', 'email'], function(result) {
    if (result.token && result.userId && result.email) {
      // User is logged in
      loginForm.classList.add('hidden');
      loggedInDiv.classList.remove('hidden');
      userEmailEl.textContent = result.email;
      
      // Send the credentials to background script
      chrome.runtime.sendMessage({
        action: 'setCredentials',
        userId: result.userId,
        email: result.email,
        token: result.token
      });
    }
  });

  // Load existing focus settings
  chrome.storage.local.get(['focusModeEnabled', 'focusDomain', 'osDndEnabled'], function(result) {
    if (typeof result.focusModeEnabled === 'boolean') {
      focusToggle.checked = result.focusModeEnabled;
    }
    if (typeof result.focusDomain === 'string') {
      focusDomainInput.value = result.focusDomain;
    }
    if (typeof result.osDndEnabled === 'boolean') {
      osDndToggle.checked = result.osDndEnabled;
    }
  });
  
  // Handle login
  async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (data && data.token && data.user && data.user.id) {
        chrome.storage.local.set({ userId: data.user.id, email: data.user.email, token: data.token });
        chrome.runtime.sendMessage({ action: 'setCredentials', userId: data.user.id, email: data.user.email, token: data.token });
        loginForm.classList.add('hidden');
        loggedInDiv.classList.remove('hidden');
        userEmailEl.textContent = data.user.email;
        showStatus('Logged in! Tab tracking enabled.', 'success');
      } else {
        showStatus('Login failed: ' + (data && (data.error || 'Unknown error')), 'error');
      }
    } catch (error) {
      showStatus('Error connecting to server', 'error');
    }
  }

  // Support both true form submit and button click (the container is a div)
  loginForm.addEventListener('submit', function(e) { e.preventDefault(); handleLogin(); });
  loginButton.addEventListener('click', function(e) { e.preventDefault(); handleLogin(); });
  
  // Handle logout
  logoutButton.addEventListener('click', function() {
    chrome.storage.local.remove(['token', 'userId', 'email'], function() {
      // Send message to background script
      chrome.runtime.sendMessage({ action: 'clearCredentials' });
      
      // Update UI
      loginForm.classList.remove('hidden');
      loggedInDiv.classList.add('hidden');
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
      showStatus('Logged out successfully', 'success');
    });
  });

  // Handle focus toggle changes
  function saveFocusSettings() {
    let domain = (focusDomainInput.value || '').trim();
    try {
      if (domain.includes('://')) {
        const u = new URL(domain);
        domain = u.hostname || domain;
      }
      if (domain.startsWith('www.')) domain = domain.slice(4);
    } catch (_) {}
    const enabled = !!focusToggle.checked;
    const osDndEnabled = !!osDndToggle.checked;
    chrome.storage.local.set({ focusModeEnabled: enabled, focusDomain: domain, osDndEnabled }, function() {
      chrome.runtime.sendMessage({ action: 'updateFocusMode', enabled, domain, osDndEnabled });
      showStatus(`Focus Mode ${enabled ? 'enabled' : 'disabled'}${domain ? ' for ' + domain : ''}`, 'success');
    });
  }

  focusToggle.addEventListener('change', saveFocusSettings);
  focusDomainInput.addEventListener('change', saveFocusSettings);
  osDndToggle.addEventListener('change', saveFocusSettings);
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
  
  const openDebugEl = document.getElementById('openDebug');
  if (openDebugEl) {
    openDebugEl.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: chrome.runtime.getURL('debug.html') });
    });
  }
});
