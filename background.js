// When any tab finishes loading, check if we should run My Bubble on it
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only run when the page has fully loaded
  if (changeInfo.status === "complete" && tab.url) {
    const hostname = new URL(tab.url).hostname;

    // Get the saved sites list
    chrome.storage.sync.get("sites", (data) => {
      const sites = data.sites || [];

      // If this site is in the list, inject our content script
      if (sites.includes(hostname)) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
        });
      }
    });
  }
});