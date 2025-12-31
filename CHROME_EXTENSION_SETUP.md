# 🌐 Chrome Extension Setup Guide

## The Problem
Your FocusAI backend is running perfectly on port 5001, but **NO TAB or APP usage data is being collected** because:
- The Chrome extension is not installed/enabled
- Without the extension, the system has no way to track:
  - Browser tabs you visit
  - Time spent on websites
  - Application window focus
  - Productivity patterns

## ✅ Quick Fix: Install Chrome Extension

### Step 1: Load the Extension in Chrome

1. **Open Chrome** and go to:
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Navigate to and select**:
   ```
   /opt/focusai/focuai
   ```
   
   OR if not installed via .deb:
   ```
   /home/ramji/Desktop/projects/old-os-files-project-dir/focus/FocusAI-collab/focuai
   ```

5. **The FocusAI extension should now appear** with the icon

### Step 2: Configure the Extension

1. **Click the FocusAI extension icon** in Chrome toolbar

2. **Login with your credentials**:
   - Email: `r@gmail.com`
   - Password: (your password)

3. **Verify connection**:
   - The popup should show "Connected"
   - Backend URL should be: `http://localhost:5001`

### Step 3: Verify Data Collection

**Wait 2-3 minutes**, then check the backend logs:

```bash
sudo tail -f /var/log/focusai/backend.log | grep -E "tabs|app usage"
```

You should see lines like:
```
Found 10 tabs for user r@gmail.com
Found 5 app usage records for today
```

## 🔧 Alternative: Test Without Extension (Manual Data Injection)

If you want to test the system without the extension:

```bash
# Inject test tab data
curl -X POST http://localhost:5001/api/tabs/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "r@gmail.com",
    "url": "https://github.com/FocusAI-collab",
    "title": "GitHub Repository",
    "activeTime": 300000
  }'

# Inject test app usage
curl -X POST http://localhost:5001/api/appUsage/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "r@gmail.com",
    "appName": "VS Code",
    "windowTitle": "main.py - FocusAI",
    "duration": 600000
  }'
```

## 📊 Expected Behavior After Extension Setup

Once the extension is running:

1. **Every 5 minutes**: Extension sends tab usage data to backend
2. **Backend receives**: Tab URL, title, active time
3. **Backend stores**: Data in MongoDB (`tabusages` collection)
4. **AI service analyzes**: Productivity patterns every 30 seconds
5. **Frontend displays**: Charts, focus scores, recommendations

## 🐛 Troubleshooting

### Extension not connecting?

Check `background.js` logs in Chrome:
1. Go to `chrome://extensions/`
2. Find FocusAI extension
3. Click "background.html" or "Service Worker" (inspect)
4. Check Console for errors

### Still showing 0 tabs?

```bash
# Check MongoDB directly
mongosh focusai --eval "db.tabusages.find({email: 'r@gmail.com'}).pretty()"

# Check backend can reach MongoDB
mongosh focusai --eval "db.stats()"
```

### Backend port 5001 not accessible from extension?

The extension runs in the browser and connects to `http://localhost:5001`. Make sure:
- Backend is running: `systemctl status focusai-backend`
- Port is open: `netstat -tlnp | grep 5001`
- No firewall blocking: `sudo ufw status`

## 🎯 Quick Verification Commands

```bash
# 1. Check services are running
sudo systemctl status focusai-backend focusai-ai

# 2. Verify backend is receiving requests
sudo tail -20 /var/log/focusai/backend.log

# 3. Check MongoDB has data
mongosh focusai --eval "db.tabusages.countDocuments()"
mongosh focusai --eval "db.appusages.countDocuments()"

# 4. Test AI service endpoint
curl "http://localhost:8000/user/$(mongosh focusai --quiet --eval "db.users.findOne({email: 'r@gmail.com'})._id")/quick-stats?date=$(date +%Y-%m-%d)"
```

## ✨ After Setup

Once data starts flowing, you'll see:
- **Focus Analytics**: Real productivity scores based on your activity
- **AI Recommendations**: Personalized tips based on your patterns
- **App Usage Charts**: Time spent in different applications
- **Tab Insights**: Most visited sites, productive vs distracting

---

**Need Help?** Check the logs:
```bash
# AI service logs
sudo journalctl -u focusai-ai -f

# Backend logs  
sudo journalctl -u focusai-backend -f

# Frontend logs
sudo journalctl -u focusai-frontend -f
```
