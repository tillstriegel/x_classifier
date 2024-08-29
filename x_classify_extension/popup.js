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
});