const apiKeyInput = document.getElementById('api-key');
const saveBtn     = document.getElementById('save-btn');
const saveStatus  = document.getElementById('save-status');

chrome.storage.sync.get(['gemmaApiKey'], (data) => {
  if (data.gemmaApiKey) apiKeyInput.value = data.gemmaApiKey;
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    saveStatus.style.color = '#ff6b8a';
    saveStatus.textContent = 'AIzaSyALD2zPmVUff206mP3ShN3HqVTZaxO4Vug';
    return;
  }

  chrome.storage.sync.set({ gemmaApiKey: key }, () => {
    saveStatus.style.color = '#4fffb0';
    saveStatus.textContent = 'Saved ✓';
    setTimeout(() => { saveStatus.textContent = ''; }, 2500);
  });
});