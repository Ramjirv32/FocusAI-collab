document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const statusArea = document.getElementById('statusArea');
  const statusEl = document.getElementById('status');
  const tabsTrackedEl = document.getElementById('tabsTracked');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');

  // Check if already authenticated
  chrome.storage.local.get(['authToken', 'userEmail'], (data) => {
    if (data.authToken && data.userEmail) {
      showLoggedInState(data.userEmail);
      checkTabsTracked(data.authToken);
    } else {
      showLoginForm();
    }
  });

  // Handle login button click
  loginButton.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }
    
    loginButton.textContent = 'Logging in...';
    loginButton.disabled = true;
    
    fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.token) {
        // Save auth data
        chrome.storage.local.set({ 
          authToken: data.token,
          userEmail: email 
        }, () => {
          console.log('Authentication saved');
          showLoggedInState(email);
          checkTabsTracked(data.token);
        });
      } else {
        throw new Error('No token received');
      }
    })
    .catch(error => {
      console.error('Login error:', error);
      alert(error.message);
      loginButton.textContent = 'Login';
      loginButton.disabled = false;
    });
  });

  // Handle logout
  logoutButton.addEventListener('click', () => {
    chrome.storage.local.remove(['authToken', 'userEmail'], () => {
      showLoginForm();
    });
  });

  // Helper to show logged in state
  function showLoggedInState(email) {
    loginForm.classList.add('hidden');
    statusArea.classList.remove('hidden');
    statusEl.textContent = `Connected as: ${email}`;
    statusEl.className = 'status connected';
  }

  // Helper to show login form
  function showLoginForm() {
    loginForm.classList.remove('hidden');
    statusArea.classList.add('hidden');
    emailInput.value = '';
    passwordInput.value = '';
    loginButton.textContent = 'Login';
    loginButton.disabled = false;
  }

  // Check how many tabs we've tracked
  function checkTabsTracked(token) {
    fetch('http://localhost:5000/api/debug/browser-tabs', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      if (data && data.count !== undefined) {
        tabsTrackedEl.textContent = `Tabs tracked: ${data.count}`;
        tabsTrackedEl.className = 'status';
      }
    })
    .catch(error => {
      console.error('Error checking tabs:', error);
      tabsTrackedEl.textContent = 'Could not check tracked tabs';
      tabsTrackedEl.className = 'status disconnected';
    });
  }

  // Show active tab info for debugging
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Current active tab:", tabs[0]);
  });
});
