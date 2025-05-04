let currentTab = null;
let startTime = null;

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const newTab = await chrome.tabs.get(activeInfo.tabId);

    if (currentTab && startTime) {
      const duration = (Date.now() - startTime) / 1000;
      sendTabData({ ...currentTab, duration });
    }

    currentTab = newTab;
    startTime = Date.now();
  } catch (err) {
    console.error("Error getting tab info:", err);
  }
});

function sendTabData(tab) {
  if (!tab || !tab.url || !tab.title) {
    console.warn("Invalid tab data, skipping...");
    return;
  }

  const tabData = {
    title: tab.title,
    url: tab.url,
    duration: tab.duration || 0,
    timestamp: new Date().toISOString(),
    favicon: tab.favIconUrl || null
  };

  console.log("Sending tab data:", tabData);

  fetch("http://localhost:5000/log-tab", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(tabData)
  })
  .then(response => {
    if (response.ok) {
      console.log("Tab data sent successfully");
    } else {
      console.error("Server returned error:", response.status);
    }
  })
  .catch(err => console.error("Failed to send tab data:", err));
}
