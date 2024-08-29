let isEnabled = true;

const classColors = {
  'News': '#1DA1F2',    // Twitter Blue
  'Opinion': '#FF8C00', // Dark Orange
  'Humor': '#FFD700',   // Gold
  'Spam': '#FF4500',    // Red-Orange
  'Other': '#808080'    // Gray
};

function classifyTweets() {
  if (!isEnabled) return;

  const tweets = document.querySelectorAll('article[data-testid="tweet"]:not(.classified):not(.classifying)');
  tweets.forEach(async (tweet) => {
    const tweetTextElement = tweet.querySelector('div[data-testid="tweetText"]');
    if (!tweetTextElement) return;

    // Mark the tweet as being classified to prevent duplicate processing
    tweet.classList.add('classifying');

    const tweetText = tweetTextElement.textContent;
    try {
      const { classification } = await chrome.runtime.sendMessage({ action: "classifyTweet", tweetText });
      
      const classificationElement = document.createElement('div');
      classificationElement.textContent = classification;
      classificationElement.style.position = 'absolute';
      classificationElement.style.top = '8px';
      classificationElement.style.right = '8px';
      classificationElement.style.padding = '2px 6px';
      classificationElement.style.borderRadius = '12px';
      classificationElement.style.fontSize = '12px';
      classificationElement.style.fontWeight = 'bold';
      classificationElement.style.color = '#FFFFFF';
      classificationElement.style.backgroundColor = classColors[classification] || classColors['Other'];
      classificationElement.style.zIndex = '1000';

      classificationElement.classList.add('tweet-classification');
      
      // Ensure the tweet container is positioned relatively
      tweet.style.position = 'relative';
      
      tweet.appendChild(classificationElement);
      tweet.classList.add('classified');
    } catch (error) {
      console.error('Failed to classify tweet:', error);
    } finally {
      // Remove the classifying class whether classification succeeded or failed
      tweet.classList.remove('classifying');
    }
  });
}

// Run classification when the page loads
classifyTweets();

// Use a debounce function to limit the frequency of classification calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create a debounced version of classifyTweets
const debouncedClassifyTweets = debounce(classifyTweets, 500);

// Listen for changes in the DOM (e.g., new tweets loaded)
const observer = new MutationObserver(debouncedClassifyTweets);
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleClassification") {
    isEnabled = !isEnabled;
    if (isEnabled) {
      classifyTweets();
    } else {
      // Remove all classification badges when disabled
      document.querySelectorAll('.tweet-classification').forEach(el => el.remove());
      document.querySelectorAll('.classified').forEach(el => el.classList.remove('classified'));
      document.querySelectorAll('.classifying').forEach(el => el.classList.remove('classifying'));
    }
  }
});