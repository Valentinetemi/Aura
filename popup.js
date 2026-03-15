// ── Aura Popup Script ──
// Handles saving/loading Nova API config

const apiUrlInput = document.getElementById('api-url');
const apiKeyInput = document.getElementById('api-key');
const saveBtn     = document.getElementById('save-btn');
const saveStatus  = document.getElementById('save-status');

// Load saved config on open
chrome.storage.sync.get(['novaApiUrl', 'novaApiKey'], (data) => {
  if (data.novaApiUrl) apiUrlInput.value = data.novaApiUrl;
  if (data.novaApiKey) apiKeyInput.value = data.novaApiKey;
});

// Save config
saveBtn.addEventListener('click', () => {
  const url = apiUrlInput.value.trim();
  const key = apiKeyInput.value.trim();

  if (!url) {
    saveStatus.style.color = '#ff6b8a';
    saveStatus.textContent = 'Please enter your API URL.';
    return;
  }

  chrome.storage.sync.set({ novaApiUrl: url, novaApiKey: key }, () => {
    saveStatus.style.color = '#4fffb0';
    saveStatus.textContent = 'Saved ✓';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });
});
