document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const loggedInDiv = document.getElementById('logged-in');
  const userEmailEl = document.getElementById('user-email');
  const statusDiv = document.getElementById('status');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  
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
  
  // Handle login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (data.token) {
        // Store credentials locally
        chrome.storage.local.set({
          userId: data.user.id,
          email: data.user.email,
          token: data.token
        });
        
        // Send to background script
        chrome.runtime.sendMessage({
          action: 'setCredentials',
          userId: data.user.id,
          email: data.user.email,
          token: data.token
        });
        
        // Update UI
        loginForm.classList.add('hidden');
        loggedInDiv.classList.remove('hidden');
        userEmailEl.textContent = data.user.email;
        showStatus('Logged in! Tab tracking enabled.', 'success');
      } else {
        showStatus('Login failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      showStatus('Error connecting to server', 'error');
    }
  });
  
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
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
      statusDiv.classList.add('hidden');
    }, 3000);
  }
});
