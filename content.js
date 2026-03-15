// ── Aura Content Script ──
// Injects the floating button UI into every page

(function () {
  if (document.getElementById('aura-root')) return; // prevent double-inject

  // ── Config (loaded from chrome.storage, set in popup) ──
  let NOVA_API_URL = '';
  let NOVA_API_KEY = '';

  chrome.storage.sync.get(['novaApiUrl', 'novaApiKey'], (data) => {
    NOVA_API_URL = data.novaApiUrl || '';
    NOVA_API_KEY = data.novaApiKey || '';
  });

  // ── Feature definitions ──
  const FEATURES = [
    {
      action: 'summarize',
      label: 'Summarize Page',
      icon: '✦',
      prompt: (content) =>
        `Summarize the following webpage content clearly and concisely. Use bullet points for key takeaways. Keep it under 150 words.\n\n${content}`,
    },
    {
      action: 'explain',
      label: 'Explain Code',
      icon: '⌥',
      prompt: (content) =>
        `Explain the code on this page in simple, clear terms. Describe what it does, how it works, and any important patterns used.\n\n${content}`,
    },
    {
      action: 'reply',
      label: 'Draft Reply',
      icon: '↩',
      prompt: (content) =>
        `Based on the following LinkedIn message or conversation, draft a professional, friendly reply. Keep it concise and natural.\n\n${content}`,
    },
    {
      action: 'post',
      label: 'Create Post',
      icon: '✐',
      prompt: (content) =>
        `Based on the following content, generate 2 compelling LinkedIn post ideas. Each should have a hook, key insight, and a call to action. Make them engaging and human.\n\n${content}`,
    },
  ];

  // ── Build DOM ──
  const root = document.createElement('div');
  root.id = 'aura-root';

  root.innerHTML = `
    <!-- Result Panel -->
    <div id="aura-panel">
      <div id="aura-panel-header">
        <span id="aura-panel-title">Aura</span>
        <button id="aura-panel-close">✕</button>
      </div>
      <div id="aura-panel-body">
        <div id="aura-result"></div>
      </div>
      <div id="aura-settings-hint">
        Powered by Nova · <a id="aura-config-link">Configure API</a>
      </div>
    </div>

    <!-- Feature Menu -->
    <div id="aura-menu">
      ${FEATURES.map(f => `
        <button class="aura-action-btn" data-action="${f.action}">
          <span class="aura-icon">${f.icon}</span>
          <span>${f.label}</span>
        </button>
      `).join('')}
    </div>

    <!-- FAB -->
    <button id="aura-fab" title="Aura AI">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L9 9H2L7.5 13.5L5.5 21L12 16.5L18.5 21L16.5 13.5L22 9H15L12 2Z" 
              fill="white" stroke="white" stroke-width="0.5" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  document.body.appendChild(root);

  // ── Element refs ──
  const fab       = root.querySelector('#aura-fab');
  const menu      = root.querySelector('#aura-menu');
  const panel     = root.querySelector('#aura-panel');
  const panelTitle = root.querySelector('#aura-panel-title');
  const result    = root.querySelector('#aura-result');
  const closeBtn  = root.querySelector('#aura-panel-close');

  let menuOpen = false;

  // ── Toggle menu ──
  fab.addEventListener('click', () => {
    menuOpen = !menuOpen;
    fab.classList.toggle('open', menuOpen);
    menu.classList.toggle('visible', menuOpen);
    if (!menuOpen) closePanel();
  });

  // ── Close panel ──
  closeBtn.addEventListener('click', closePanel);

  function closePanel() {
    panel.classList.remove('visible');
  }

  // ── Get page content ──
  function getPageContent() {
    // Try to get meaningful text — skip nav/footer noise
    const selectors = [
      'article', 'main', '.content', '#content',
      '.post-body', '.article-body', 'pre code', '.readme'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 200) {
        return el.innerText.trim().slice(0, 4000);
      }
    }

    // Fallback: all body text
    return document.body.innerText.trim().slice(0, 4000);
  }

  // ── Call Nova API ──
  async function callNova(prompt) {
    // Always read latest config from storage
    const config = await new Promise(resolve =>
      chrome.storage.sync.get(['novaApiUrl', 'novaApiKey'], resolve)
    );
    const apiUrl = config.novaApiUrl || NOVA_API_URL;
    const apiKey = config.novaApiKey || NOVA_API_KEY;

    if (!apiUrl) {
      throw new Error('No API URL set. Click the Aura icon in the toolbar to configure.');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        message: prompt,
        context: window.location.href,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 🔧 Adjust this based on your Nova API response shape
    return data.response || data.message || data.text || data.content || JSON.stringify(data);
  }

  // ── Handle feature click ──
  root.querySelectorAll('.aura-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const feature = FEATURES.find(f => f.action === action);
      if (!feature) return;

      // Show panel with loading state
      panelTitle.textContent = feature.label;
      result.innerHTML = `
        <div class="aura-loading">
          <span></span><span></span><span></span>
        </div>
      `;
      panel.classList.add('visible');

      // Close menu
      menuOpen = false;
      fab.classList.remove('open');
      menu.classList.remove('visible');

      // Get content & call API
      try {
        const pageContent = getPageContent();
        const prompt = feature.prompt(pageContent);
        const output = await callNova(prompt);

        result.innerHTML = `
          <div id="aura-result-text">${escapeHtml(output)}</div>
          <button id="aura-copy-btn">Copy</button>
        `;

        root.querySelector('#aura-copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(output);
          root.querySelector('#aura-copy-btn').textContent = 'Copied ✓';
          setTimeout(() => {
            const btn = root.querySelector('#aura-copy-btn');
            if (btn) btn.textContent = 'Copy';
          }, 2000);
        });

      } catch (err) {
        result.innerHTML = `
          <div class="aura-error">
            ⚠ Something went wrong.<br/>
            <small>${escapeHtml(err.message)}</small>
          </div>
        `;
      }
    });
  });

  // ── Helpers ──
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>');
  }

})();
