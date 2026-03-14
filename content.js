// List of words that suggest negative news
const negativeKeywords = [
  "dead", "death", "killed", "murder", "war", "attack", "crisis",
  "disaster", "crash", "shooting", "explosion", "flood", "earthquake",
  "tragedy", "victim", "terror", "violence", "threat", "collapse",
  "scandal", "corruption", "abuse", "arrest", "sentenced", "guilty"
];

// Check if a headline contains any negative keywords
function isNegative(text) {
  const lowerText = text.toLowerCase();
  return negativeKeywords.some(keyword => lowerText.includes(keyword));
}

// Try to find the parent article/card container of a headline
function findArticleContainer(element) {
  // Walk up the DOM tree to find a meaningful container
  let current = element.parentElement;
  let steps = 0;

  while (current && steps < 6) {
    const tag = current.tagName.toLowerCase();
    // Stop if we find an article, section, or a div that looks like a card
    if (
      tag === "article" ||
      tag === "section" ||
      current.classList.contains("card") ||
      current.classList.contains("container") ||
      current.classList.contains("story") ||
      current.classList.contains("item") ||
      current.classList.contains("post")
    ) {
      return current;
    }
    current = current.parentElement;
    steps++;
  }

  // If no container found, just return the original element
  return element;
}

// Apply the chosen filter to an element
function applyFilter(element, mode) {
  // Mark it so we don't process it twice
  if (element.dataset.bubbleProcessed) return;
  element.dataset.bubbleProcessed = "true";

  if (mode === "hide") {
    element.style.display = "none";
  } else if (mode === "blur") {
    element.style.filter = "blur(8px)";
    element.style.transition = "filter 0.3s";
    element.style.cursor = "pointer";
    element.title = "My Bubble: Negative content hidden. Click to reveal.";
    // Click to unblur
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

// Main function - scans the page for headlines and filters them
function scanHeadlines(mode) {
  const headlineSelectors = "h1, h2, h3, h4";
  const elements = document.querySelectorAll(headlineSelectors);

  elements.forEach(element => {
    const text = element.innerText || element.textContent;
    if (text && isNegative(text)) {
      // Try to find and filter the whole article card
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