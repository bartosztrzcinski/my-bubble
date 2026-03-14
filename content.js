// List of words that suggest negative news
const negativeKeywords = [
  // Violence & crime
  "killed", "murder", "shooting", "stabbing", "bombing", "gunfire",
  "terrorist", "terrorism", "hostage", "kidnap",
  // War & conflict  
  "war", "airstrike", "invasion", "missile", "troops", "combat", "attack", "attacks", "regime",
  // Disaster
  "earthquake", "tsunami", "hurricane", "wildfire", "flood",
  // Death (specific)
  "death toll", "dead", "fatal", "casualties",
  // Crisis
  "famine", "genocide", "massacre", "execution",
  // Crime
  "arrested", "convicted", "sentenced", "guilty verdict", "corruption",
];

// Check if a headline contains any negative keywords
function isNegative(text) {
  const lowerText = text.toLowerCase();
  return negativeKeywords.some(keyword => lowerText.includes(keyword));
}

// Try to find the parent article/card container of a headline
function findArticleContainer(element) {
  let current = element.parentElement;
  let steps = 0;

  while (current && steps < 15) {
    const tag = current.tagName.toLowerCase();
    const classes = current.className || "";
    const testId = current.dataset.testid || "";

    // ✅ BBC — specific testId matches, most specific first
if (testId === "westminster-card") return current;
if (testId === "westminster") return current;
if (testId === "dundee-card") return current;
if (testId === "dundee-article") return current;
// ⚠️ card-text-wrapper is last resort — only if nothing better found above

    // ✅ CNN — spotlight package (hero block with title + image)
if (classes.includes("container_spotlight-package") && !classes.includes("__")) return current;

// ✅ CNN — regular cards
if (
  classes.includes("container__item") ||
  classes.includes("card--media") ||
  classes.includes("container_vertical-strip__item")
) return current;

    // ✅ Generic fallback — but guard against huge containers
    const height = current.getBoundingClientRect().height;
    if (
      (tag === "article" ||
      classes.includes("card") ||
      classes.includes("story") ||
      classes.includes("article-item") ||
      classes.includes("post-item")) &&
      height < 600
    ) return current;

    // 🛑 Stop climbing if we hit a very large generic element
    if (height > 800) return element;

    current = current.parentElement;
    steps++;
  }

  // Last resort — try card-text-wrapper before giving up
let fallback = element.parentElement;
let fallbackSteps = 0;
while (fallback && fallbackSteps < 10) {
  if (fallback.dataset.testid === "card-text-wrapper") return fallback;
  fallback = fallback.parentElement;
  fallbackSteps++;
}
return element;
}

// Apply style based on mode (used for both main element and image sibling)
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

// Apply the chosen filter to an element
function applyFilter(element, mode) {
  if (element.dataset.bubbleProcessed) return;
  element.dataset.bubbleProcessed = "true";

  const testId = element.dataset.testid || "";
  
  // DEBUG — remove after testing
  console.log("🫧 Bubble targeting:", testId, element);

  // BBC westminster layout — image is a sibling of card-text-wrapper
  if (testId === "card-text-wrapper") {
    const parent = element.parentElement;
    if (parent) {
      const mediaWrapper = parent.querySelector('[data-testid="card-media-wrapper"]');
      console.log("🖼️ Westminster image found:", mediaWrapper);
      if (mediaWrapper && !mediaWrapper.dataset.bubbleProcessed) {
        mediaWrapper.dataset.bubbleProcessed = "true";
        applyStyleForMode(mediaWrapper, mode);
      }
    }
  }

  // BBC dundee layout — image is a child inside the card
  if (testId === "dundee-card" || testId === "dundee-article" || testId === "westminster-card") {
    const mediaWrapper = element.querySelector('[data-testid="card-image-wrapper"], [data-testid="card-media-wrapper"]');
    console.log("🖼️ Dundee image found:", mediaWrapper);
    if (mediaWrapper && !mediaWrapper.dataset.bubbleProcessed) {
      mediaWrapper.dataset.bubbleProcessed = "true";
      applyStyleForMode(mediaWrapper, mode);
    }
  }

  applyStyleForMode(element, mode);
}

// Main function - scans the page for headlines and filters them
function scanHeadlines(mode) {
  const headlineSelectors = "h1, h2, h3, h4, .container__headline-text, .container__title_url-text";
  const elements = document.querySelectorAll(headlineSelectors);

  elements.forEach(element => {
    const text = element.innerText || element.textContent;
    if (text && isNegative(text)) {
      const container = findArticleContainer(element);
      applyFilter(container, mode);
    }
  });
}

// Get the saved filter mode and run the scan
chrome.storage.sync.get(["filterMode", "sites"], (data) => {
  const mode = data.filterMode || "warn";
  const sites = data.sites || [];
  const currentSite = window.location.hostname;

  if (sites.includes(currentSite)) {
    scanHeadlines(mode);
  }
});