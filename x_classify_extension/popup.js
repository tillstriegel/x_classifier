document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleClassification');
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');

  // Load saved API key
  chrome.storage.sync.get('apiKey', (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  toggleButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "toggleClassification"});
    });
  });

  saveApiKeyButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    chrome.storage.sync.set({ apiKey }, () => {
      alert('API key saved successfully!');
    });
  });

  const viewLogLink = document.getElementById('viewLog');
  viewLogLink.addEventListener('click', () => {
    chrome.tabs.create({url: chrome.runtime.getURL('log.html')});
  });

  const clearLogButton = document.getElementById('clearLog');
  clearLogButton.addEventListener('click', () => {
    chrome.storage.local.remove('classificationLog', () => {
      alert('Classification log cleared!');
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "clearLog"});
      });
    });
  });
});