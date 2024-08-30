let isEnabled = true;
let classificationLog = [];
let userTweetCounts = {};

const classColors = {
  'News': '#1DA1F2',    // Twitter Blue
  'Opinion': '#FF8C00', // Dark Orange
  'Humor': '#FFD700',   // Gold
  'Spam': '#FF4500',    // Red-Orange
  'Other': '#808080'    // Gray
};

async function classifyTweets() {
  if (!isEnabled) return;

  const tweets = document.querySelectorAll('article[data-testid="tweet"]:not(.classified):not(.classifying)');
  for (const tweet of tweets) {
    const tweetTextElement = tweet.querySelector('div[data-testid="tweetText"]');
    if (!tweetTextElement) continue;

    // Get tweet ID from the link in the tweet's timestamp
    const timestampLink = tweet.querySelector('a[href*="/status/"]');
    const tweetId = timestampLink ? timestampLink.href.split('/status/')[1] : null;
    if (!tweetId) continue;

    // Mark the tweet as being classified to prevent duplicate processing
    tweet.classList.add('classifying');

    const tweetText = tweetTextElement.textContent;
    try {
      // Check if classification already exists
      let classification;
      try {
        classification = await chrome.runtime.sendMessage({ action: "getClassification", tweetId });
        if (!classification) {
          classification = await chrome.runtime.sendMessage({ action: "classifyTweet", tweetText, tweetId });
        }
      } catch (error) {
        if (error.message.includes("Extension context invalidated")) {
          console.log("Extension context invalidated. Reloading page...");
          location.reload();
          return;
        }
        throw error;
      }

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

      // Extract author information
      const authorElement = tweet.querySelector('div[data-testid="User-Name"] a');
      const author = authorElement ? authorElement.getAttribute('href').slice(1) : 'Unknown';

      // Extract engagement numbers
      const engagementStats = tweet.querySelectorAll('button[type="button"], a');
      let replies = '0', retweets = '0', likes = '0', views = '0';

      engagementStats.forEach(stat => {
        const text = stat.textContent.trim();
        if (stat.getAttribute('data-testid')?.includes('reply')) {
          replies = text;
        } else if (stat.getAttribute('data-testid')?.includes('retweet')) {
          retweets = text;
        } else if (stat.getAttribute('data-testid')?.includes('like')) {
          likes = text;
        } else if (stat.getAttribute('aria-label')?.includes('View')) {
          views = text;
        }
      });

      // Check if the tweet is already logged
      const isAlreadyLogged = classificationLog.some(entry => entry.id === tweetId);

      if (!isAlreadyLogged) {
        // Update user tweet count only for new tweets
        if (!userTweetCounts[author]) {
          userTweetCounts[author] = 0;
        }
        userTweetCounts[author]++;

        // Add to classification log
        classificationLog.push({
          id: tweetId,
          author: author,
          text: tweetText,
          classification: classification,
          engagement: {
            replies: replies,
            retweets: retweets,
            likes: likes,
            views: views
          },
          timestamp: new Date().toISOString()
        });

        // Save the updated userTweetCounts and classificationLog to chrome.storage.local
        chrome.storage.local.set({ 
          userTweetCounts: userTweetCounts,
          classificationLog: classificationLog
        });
      }

      // Create or update badge (do this for all tweets, not just new ones)
      updateBadge(author, authorElement);

      // Blur 'Spam' tweets
      if (classification === 'Spam') {
        tweet.style.filter = 'blur(5px)';
        tweet.style.transition = 'filter 0.3s ease';
        
        // Add hover effect to unblur
        tweet.addEventListener('mouseenter', () => {
          tweet.style.filter = 'blur(0)';
        });
        tweet.addEventListener('mouseleave', () => {
          tweet.style.filter = 'blur(5px)';
        });
      }
    } catch (error) {
      console.error('Failed to classify tweet:', error);
    } finally {
      // Remove the classifying class whether classification succeeded or failed
      tweet.classList.remove('classifying');
    }
  }
}

// New function to create or update badge
function updateBadge(author, authorElement) {
  const badgeId = `tweet-count-${author.replace(/\s+/g, '-')}`;
  let badge = document.getElementById(badgeId);
  if (!badge) {
    badge = document.createElement('span');
    badge.id = badgeId;
    badge.style.backgroundColor = '#1DA1F2';
    badge.style.color = 'white';
    badge.style.borderRadius = '9999px';
    badge.style.padding = '2px 6px';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = 'bold';
    badge.style.marginLeft = '5px';
    if (authorElement) {
      authorElement.parentNode.insertBefore(badge, authorElement.nextSibling);
    }
  }
  badge.textContent = userTweetCounts[author] || 0;
}

// Load existing classification log and user tweet counts
chrome.storage.local.get(['classificationLog', 'userTweetCounts'], (result) => {
  if (result.classificationLog) {
    classificationLog = result.classificationLog;
  }
  if (result.userTweetCounts) {
    userTweetCounts = result.userTweetCounts;
    // Update badges for all authors in userTweetCounts
    Object.keys(userTweetCounts).forEach(author => {
      const authorElement = document.querySelector(`a[href="/${author}"]`);
      if (authorElement) {
        updateBadge(author, authorElement);
      }
    });
  }
});

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

// Add this function to update badges when the log is cleared
function clearUserTweetCounts() {
  userTweetCounts = {};
  chrome.storage.local.remove('userTweetCounts');
  document.querySelectorAll('[id^="tweet-count-"]').forEach(badge => badge.remove());
}

// Modify the listener to handle potential disconnections
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (chrome.runtime.id) {
    if (request.action === "toggleClassification") {
      isEnabled = !isEnabled;
      if (isEnabled) {
        classifyTweets();
      } else {
        // Remove all classification badges when disabled
        document.querySelectorAll('.tweet-classification').forEach(el => el.remove());
        document.querySelectorAll('.classified').forEach(el => {
          el.classList.remove('classified');
          el.style.filter = 'none';
          el.style.transition = 'none';
        });
        document.querySelectorAll('.classifying').forEach(el => el.classList.remove('classifying'));
      }
    } else if (request.action === "clearLog") {
      clearUserTweetCounts();
    }
  } else {
    console.log("Extension context invalidated. Reloading page...");
    location.reload();
  }
});

// Add an error listener to detect disconnections
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
  if (chrome.runtime.id) {
    // Extension is still valid, do nothing
  } else {
    console.log("Extension context invalidated. Reloading page...");
    location.reload();
  }
});