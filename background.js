// When any tab finishes loading, check if we should run My Bubble on it
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const hostname = new URL(tab.url).hostname;

    chrome.storage.sync.get("sites", (data) => {
      const sites = data.sites || [];

      if (sites.includes(hostname)) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"]
        });
      }
    });
  }
});

// 🆕 Handle sentiment analysis requests from content.js
// (content.js can't call HuggingFace directly due to CORS)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CHECK_SENTIMENT") {
    fetch(
  "https://router.huggingface.co/hf-inference/models/cardiffnlp/twitter-roberta-base-sentiment-latest",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${request.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: request.text }),
  }
)
  .then(res => res.json())
  .then(result => {
    console.log("🤖 HuggingFace:", request.text.substring(0, 50), "→", JSON.stringify(result));
    if (!result || !result[0]) return sendResponse({ negative: false });
    const scores = result[0];
    const negative = scores.find(s => s.label.toLowerCase() === "negative");

    // 🆕 Keyword boost — always flag clearly violent/war headlines
    const hardKeywords = ["killed", "murder", "airstrike", "bombing", "war", "attack", "invasion", "massacre", "genocide", "casualties", "missile", "shooting"];
    const text = request.text.toLowerCase();
    const hardMatch = hardKeywords.some(k => text.includes(k));

    sendResponse({ negative: !!(hardMatch || (negative && negative.score > 0.65)) });
  })
      .catch(err => {
        console.log("🫧 Background fetch failed:", err);
        sendResponse({ negative: false });
      });

    return true; // ← keeps message channel open for async response
  }
});