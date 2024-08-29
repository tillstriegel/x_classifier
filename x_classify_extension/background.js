chrome.runtime.onInstalled.addListener(() => {
  console.log('X Classifier extension installed');
  // Initialize default settings
  chrome.storage.sync.set({ apiKey: '', isEnabled: true });
});

// Add message listener for communication with content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "classifyTweet") {
    classifyTweetWithGroq(request.tweetText, request.tweetId)
      .then(classification => sendResponse(classification))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  } else if (request.action === "getClassification") {
    getStoredClassification(request.tweetId)
      .then(classification => sendResponse(classification))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

async function classifyTweetWithGroq(tweetText, tweetId) {
  const apiKey = await chrome.storage.sync.get('apiKey').then(result => result.apiKey);
  if (!apiKey) {
    throw new Error('Groq API key not set');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a tweet classifier. Classify the given tweet into one of these categories: News, Opinion, Humor, Spam, or Other. Respond with only the category name.' },
        { role: 'user', content: tweetText }
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to classify tweet');
  }

  const data = await response.json();
  const classification = data.choices[0].message.content.trim();
  
  // Store the classification
  await storeClassification(tweetId, classification);
  
  return classification;
}

async function storeClassification(tweetId, classification) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [tweetId]: classification }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

async function getStoredClassification(tweetId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(tweetId, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[tweetId] || null);
      }
    });
  });
}