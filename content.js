// =========================================
// AI SENTIMENT ANALYSIS via HuggingFace
// =========================================

async function isNegativeAI(text, apiKey) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "CHECK_SENTIMENT", text: text, apiKey: apiKey },
      (response) => {
        resolve(response ? response.negative : false);
      }
    );
  });
}

// =========================================
// KEYWORD FALLBACK (used if no API key)
// =========================================

const negativeKeywords = [
  // Death & casualties
  "killed", "killing", "kills", "dead", "death", "deaths", "died", "fatal", "fatalities", "casualties", "murder", "murdered", "body was found",

  // Violence & weapons
  "shooting", "shot", "stabbing", "stabbed", "bombing", "bombed", "explosion", "gunfire", "gunman", "armed attack",

  // War & conflict
  "war", "airstrike", "airstrikes", "invasion", "invaded", "missile", "missiles", "troops", "combat", "battlefield", "siege", "offensive", "shelling",

  // Terrorism
  "terrorist", "terrorism", "terror attack", "hostage", "kidnapped", "kidnapping",

  // Disasters
  "earthquake", "tsunami", "hurricane", "wildfire", "flood", "flooding", "disaster", "catastrophe",

  // Atrocities
  "genocide", "massacre", "execution", "executed", "ethnic cleansing", "war crimes",

  // Serious crime
  "rape", "raped", "convicted", "sentenced", "arrested for", "guilty of",
];

function isNegativeKeyword(text) {
  const lowerText = text.toLowerCase();
  return negativeKeywords.some(keyword => lowerText.includes(keyword));
}

// =========================================
// CONTAINER DETECTION
// =========================================

function findArticleContainer(element) {
  let current = element.parentElement;
  let steps = 0;

  while (current && steps < 15) {
    const tag = current.tagName.toLowerCase();
    const classes = current.className || "";
    const testId = current.dataset.testid || "";

    // ✅ BBC
    if (testId === "westminster-card") return current;
    if (testId === "westminster") return current;
    if (testId === "dundee-card") return current;
    if (testId === "dundee-article") return current;

    // ✅ CNN — spotlight package (hero block)
    if (classes.includes("container_spotlight-package") && !classes.includes("__")) return current;

    // ✅ CNN — regular cards
    if (
      classes.includes("container__item") ||
      classes.includes("card--media") ||
      classes.includes("container_vertical-strip__item")
    ) return current;

    // ✅ Generic fallback
    const height = current.getBoundingClientRect().height;
    if (
      (tag === "article" ||
      classes.includes("card") ||
      classes.includes("story") ||
      classes.includes("article-item") ||
      classes.includes("post-item")) &&
      height < 600
    ) return current;

    if (height > 800) return element;

    current = current.parentElement;
    steps++;
  }

  // Last resort — card-text-wrapper
  let fallback = element.parentElement;
  let fallbackSteps = 0;
  while (fallback && fallbackSteps < 10) {
    if (fallback.dataset.testid === "card-text-wrapper") return fallback;
    fallback = fallback.parentElement;
    fallbackSteps++;
  }

  return element;
}

// =========================================
// APPLY FILTER
// =========================================

function applyStyleForMode(element, mode) {
  if (mode === "hide") {
    element.style.display = "none";
  } else if (mode === "blur") {
    element.style.filter = "blur(8px)";
    element.style.transition = "filter 0.3s";
    element.style.cursor = "pointer";
    element.title = "My Bubble: Negative content hidden. Click to reveal.";
    element.addEventListener("click", () => {
      element.style.filter = "none";
      element.dataset.bubbleProcessed = "revealed";
    });
  } else if (mode === "warn") {
    element.style.border = "2px solid orange";
    element.style.backgroundColor = "#fff8e1";
    element.style.borderRadius = "4px";
    element.style.padding = "4px";
  }
}

function applyFilter(element, mode) {
  if (element.dataset.bubbleProcessed) return;
  element.dataset.bubbleProcessed = "true";

  const testId = element.dataset.testid || "";

  // BBC westminster — blur sibling image
  if (testId === "card-text-wrapper") {
    const parent = element.parentElement;
    if (parent) {
      const mediaWrapper = parent.querySelector('[data-testid="card-media-wrapper"]');
      if (mediaWrapper && !mediaWrapper.dataset.bubbleProcessed) {
        mediaWrapper.dataset.bubbleProcessed = "true";
        applyStyleForMode(mediaWrapper, mode);
      }
    }
  }

  // BBC dundee — blur child image
  if (testId === "dundee-card" || testId === "dundee-article" || testId === "westminster-card") {
    const mediaWrapper = element.querySelector('[data-testid="card-image-wrapper"], [data-testid="card-media-wrapper"]');
    if (mediaWrapper && !mediaWrapper.dataset.bubbleProcessed) {
      mediaWrapper.dataset.bubbleProcessed = "true";
      applyStyleForMode(mediaWrapper, mode);
    }
  }

  applyStyleForMode(element, mode);
}

// =========================================
// MAIN SCAN
// =========================================

async function scanHeadlines(mode, apiKey) {
  const headlineSelectors = "h1, h2, h3, h4, .container__headline-text, .container__title_url-text";
  const elements = document.querySelectorAll(headlineSelectors);

  for (const element of elements) {
    const text = element.innerText || element.textContent;
    if (!text || !text.trim()) continue;
    console.log("🫧 Checking headline:", text.trim().substring(0, 50));

    let negative = false;

    if (apiKey) {
      // 🤖 Use AI
      negative = await isNegativeAI(text, apiKey);
    } else {
      // 📋 Fall back to keywords
      negative = isNegativeKeyword(text);
    }

    if (negative) {
      const container = findArticleContainer(element);
      applyFilter(container, mode);
    }
  }
}

// =========================================
// ENTRY POINT
// =========================================

chrome.storage.sync.get(["filterMode", "sites", "hfApiKey"], (data) => {
  console.log("🫧 Loaded settings:", data.filterMode, data.hfApiKey ? "API key found" : "NO API KEY", data.sites);
  const mode = data.filterMode || "warn";
  const sites = data.sites || [];
  const apiKey = data.hfApiKey || null;
  const currentSite = window.location.hostname;

  if (sites.includes(currentSite)) {
    scanHeadlines(mode, apiKey);
  }
});