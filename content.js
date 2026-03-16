// ── Aura Content Script ──

(function () {
  if (document.getElementById('aura-root')) return; // prevent double-inject

  // ── Config (loaded from chrome.storage, set in popup) ──
  // ── Config ──
const NOVA_API_URL = 'https://aura-ai.temiloluwa1402.workers.dev';
const NOVA_API_KEY = '';


  // ── Feature definitions ──
  const FEATURES = [
    {
      action: 'summarize',
      label: 'Summarize Page',
      icon: '✦',
      prompt: (content) =>
        `Summarize the following webpage content clearly and concisely. Use bullet points for key takeaways. Maximum 400 words. Go straight into the bullet points, no intro sentence.\n\n${content}`,
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
      <div id="aura-settings-hint" id="aura-quote"></div>
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
  <span style="font-size: 24px; line-height: 1;">🔮</span>
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

  // ── Draggable FAB ──
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

fab.addEventListener('mousedown', (e) => {
  isDragging = false;
  dragOffsetX = e.clientX - root.getBoundingClientRect().right;
  dragOffsetY = e.clientY - root.getBoundingClientRect().bottom;

  const onMouseMove = (e) => {
    isDragging = true;
    const x = window.innerWidth - e.clientX + dragOffsetX;
    const y = window.innerHeight - e.clientY + dragOffsetY;
    root.style.right = `${Math.max(10, x)}px`;
    root.style.bottom = `${Math.max(10, y)}px`;
  };

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});

// Prevent click firing after drag
fab.addEventListener('click', (e) => {
  if (isDragging) {
    isDragging = false;
    e.stopImmediatePropagation();
  }
});

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
    const apiUrl = NOVA_API_URL;
    const apiKey = NOVA_API_KEY;

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
          <div id="aura-result-text">${formatOutput(output)}</div>
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
      .replace(/"/g, '&quot;');
  }
  
  function formatOutput(str) {
    return escapeHtml(str)
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points starting with - or •
      .replace(/^[-•]\s(.+)/gm, '<li>$1</li>')
      // Wrap consecutive <li> in <ul>
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // Numbered lists
      .replace(/^\d+\.\s(.+)/gm, '<li class="numbered">$1</li>')
      // Headers ##
      .replace(/^##\s(.+)/gm, '<h4>$1</h4>')
      // Line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }

  // ── Rotating quotes ──
const QUOTES = [
  "🔮 Think less. Know more.",
  "⚡ Your AI layer on every page.",
  "✦ Built by Valentine.",
  "🌍 The future browses differently.",
  "💡 Curiosity, accelerated.",
  " ⚡Less tabs. More answers.",
];

const quoteEl = root.querySelector('#aura-settings-hint');
if (quoteEl) {
  quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}


})();
