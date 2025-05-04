chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log("Active tab: ", tabs[0]);
  });
  