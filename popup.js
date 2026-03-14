// Show a temporary status message
function showStatus(message, color = "green") {
  const status = document.getElementById("status");
  status.textContent = message;
  status.style.color = color;
  setTimeout(() => {
    status.textContent = "";
  }, 2000);
}

// Render the list of saved sites in the popup
function renderSites(sites) {
  const sitesDiv = document.getElementById("sites");
  sitesDiv.innerHTML = "";

  if (sites.length === 0) {
    sitesDiv.innerHTML = '<p style="font-size:12px;color:#aaa;">No sites added yet.</p>';
    return;
  }

  sites.forEach((site, index) => {
    const item = document.createElement("div");
    item.className = "site-item";

    const name = document.createElement("span");
    name.textContent = site;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove this site";

    // Remove site when ✕ is clicked
    removeBtn.addEventListener("click", () => {
      chrome.storage.sync.get("sites", (data) => {
        const updatedSites = (data.sites || []).filter((_, i) => i !== index);
        chrome.storage.sync.set({ sites: updatedSites }, () => {
          renderSites(updatedSites);
          showStatus("Site removed.");
        });
      });
    });

    item.appendChild(name);
    item.appendChild(removeBtn);
    sitesDiv.appendChild(item);
  });
}

// When popup loads, restore saved settings
document.addEventListener("DOMContentLoaded", () => {
  // Load saved filter mode
  chrome.storage.sync.get("filterMode", (data) => {
    if (data.filterMode) {
      document.getElementById("filterMode").value = data.filterMode;
    }
  });

  // 🆕 Load saved API key and show it masked in the input
  chrome.storage.sync.get("hfApiKey", (data) => {
    if (data.hfApiKey) {
      document.getElementById("apiKey").value = data.hfApiKey;
    }
  });

  // Load and display saved sites
  chrome.storage.sync.get("sites", (data) => {
    renderSites(data.sites || []);
  });

  // Save filter mode AND API key when Save button is clicked
  document.getElementById("saveBtn").addEventListener("click", () => {
    const mode = document.getElementById("filterMode").value;
    const apiKey = document.getElementById("apiKey").value.trim();

    // Validate API key format
    if (apiKey && !apiKey.startsWith("hf_")) {
      showStatus("⚠️ API key should start with hf_", "orange");
      return;
    }

    chrome.storage.sync.set({ filterMode: mode, hfApiKey: apiKey }, () => {
      showStatus("✅ Saved!");
    });
  });

  // Add current site when + Add Current Site is clicked
  document.getElementById("addSiteBtn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const hostname = url.hostname;

      chrome.storage.sync.get("sites", (data) => {
        const sites = data.sites || [];

        if (sites.includes(hostname)) {
          showStatus("Already in your list!", "orange");
          return;
        }

        sites.push(hostname);
        chrome.storage.sync.set({ sites }, () => {
          renderSites(sites);
          showStatus("✅ Site added!");
        });
      });
    });
  });
});