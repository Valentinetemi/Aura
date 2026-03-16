// -- Aura Content Script --

(function () {
  if (document.getElementById('aura-root')) return; // prevent double-inject

  // -- Config (loaded from chrome.storage, set in popup) --
  // -- Config --
const NOVA_API_URL = 'https://aura-ai.temiloluwa1402.workers.dev';
const NOVA_API_KEY = '';

 // -- conversation history --
 let conversationHistory = []
 let currentPageContent = '';

  // -- Feature definitions --
  const FEATURES = [
    {
      action: 'summarize',
      label: 'Summarize Page',
      icon: '✦',
      prompt: (content) =>
        `Summarize the following webpage content clearly and concisely. Use bullet points for key takeaways. Go straight into the bullet points, no intro sentence.\n\n${content}`,
    },
    {
      action: 'explain',
      label: 'Explain Code',
      icon: '⚡',
      prompt: (content) =>
        `Explain the code on this page in simple, clear terms. Describe what it does, how it works, and any important patterns used..\n\n${content}`,
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

  // -- Build DOM --
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

  // -- Element refs --
  const fab       = root.querySelector('#aura-fab');
  const menu      = root.querySelector('#aura-menu');
  const panel     = root.querySelector('#aura-panel');
  const panelTitle = root.querySelector('#aura-panel-title');
  const result    = root.querySelector('#aura-result');
  const closeBtn  = root.querySelector('#aura-panel-close');

  let menuOpen = false;

  //  -- Draggable FAB --
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

  // -- Toggle menu --
  fab.addEventListener('click', () => {
    menuOpen = !menuOpen;
    fab.classList.toggle('open', menuOpen);
    menu.classList.toggle('visible', menuOpen);
    if (!menuOpen) closePanel();
  });

  // --Close panel --
  closeBtn.addEventListener('click', closePanel);

  function closePanel() {
    panel.classList.remove('visible');
  }

  // -- Get page content --
  function getPageContent() {
    // Try to get meaningful text — skipping nav/footer noise
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

  // -- Call Nova -- lol didn't later use nova but cloudfare

async function callNova(prompt, isFollowUp = false) {
  const apiUrl = NOVA_API_URL;
  const apiKey = NOVA_API_KEY;

  if (!apiUrl) {
    throw new Error('No API URL set. Click the Aura icon in the toolbar to configure.');
  }

  // Build messages array for chat
  const messages = [
    {
      role: 'system',
      content: `You are Aura, a helpful AI assistant embedded in a browser extension. The user is currently on: ${window.location.href}. Here is the page content for context:\n\n${currentPageContent}`
    },
    ...conversationHistory,
    { role: 'user', content: prompt }
  ];

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const output = data.response || data.message || data.text || data.content || JSON.stringify(data);

  // Save to history
  conversationHistory.push({ role: 'user', content: prompt });
  conversationHistory.push({ role: 'assistant', content: output });

  return output;
}


  // ─ Handle feature click ─
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
        conversationHistory = [];
        const prompt = feature.prompt(pageContent);
        const output = await callNova(prompt);

        result.innerHTML = `
        <div id="aura-result-text"></div>
        <button id="aura-copy-btn" style="opacity:0">Copy</button>
      `;
      
      const textEl = result.querySelector('#aura-result-text');
      const copyBtn = result.querySelector('#aura-copy-btn');
      
      // Typing animation
      const words = output.split(' ');
      let i = 0;
      let revealed = '';
      
      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval);
          textEl.innerHTML = formatOutput(output);
          copyBtn.style.opacity = '1';
          copyBtn.style.transition = 'opacity 0.4s ease';
          showChatInput(); // show chat after response loads
          return;
        }
        revealed += (i === 0 ? '' : ' ') + words[i];
        textEl.textContent = revealed;
        i += 3;
      }, 30);
      
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(output);
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy'; }, 2000);
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

  // ─ Chat input ─
function showChatInput() {
  // Remove existing chat input if any
  const existing = root.querySelector('#aura-chat-input-wrap');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'aura-chat-input-wrap';
  wrap.innerHTML = `
    <div id="aura-chat-box">
      <input id="aura-chat-input" type="text" placeholder="Ask a follow-up..." />
      <button id="aura-chat-send">↑</button>
    </div>
  `;

  root.querySelector('#aura-panel-body').appendChild(wrap);

  const input = wrap.querySelector('#aura-chat-input');
  const sendBtn = wrap.querySelector('#aura-chat-send');

  const send = () => {
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    handleFollowUp(val);
  };

  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
}

async function handleFollowUp(message) {
  // Append user bubble
  const body = root.querySelector('#aura-panel-body');
  const userBubble = document.createElement('div');
  userBubble.className = 'aura-chat-bubble aura-chat-user';
  userBubble.textContent = message;
  body.insertBefore(userBubble, root.querySelector('#aura-chat-input-wrap'));

  // Append AI bubble with loading
  const aiBubble = document.createElement('div');
  aiBubble.className = 'aura-chat-bubble aura-chat-ai';
  aiBubble.innerHTML = `<div class="aura-loading"><span></span><span></span><span></span></div>`;
  body.insertBefore(aiBubble, root.querySelector('#aura-chat-input-wrap'));

  // Scroll to bottom
  body.scrollTop = body.scrollHeight;

  try {
    const output = await callNova(message, true);

    // Stream into AI bubble
    const words = output.split(' ');
    let i = 0;
    let revealed = '';
    aiBubble.textContent = '';

    const interval = setInterval(() => {
      if (i >= words.length) {
        clearInterval(interval);
        aiBubble.innerHTML = formatOutput(output);
        body.scrollTop = body.scrollHeight;
        return;
      }
      revealed += (i === 0 ? '' : ' ') + words[i];
      aiBubble.textContent = revealed;
      i += 3;
    }, 30);

  } catch (err) {
    aiBubble.innerHTML = `<span class="aura-error">⚠ ${escapeHtml(err.message)}</span>`;
  }
}
  // ─ Helpers ─
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

  // ─ Rotating quotes ─
const QUOTES = [
  "🔮 Think less. Know more.",
  "⚡ Your AI layer on every page.",
  "✦ Built by Valentine.",
  "🌍 The future browses differently.",
  "💡 Curiosity, accelerated.",
  "⚡Less tabs. More answers.",
];

const quoteEl = root.querySelector('#aura-settings-hint');
if (quoteEl) {
  quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ─ Highlight & Ask ─
const highlightBtn = document.createElement('div');
highlightBtn.id = 'aura-highlight-btn';
highlightBtn.innerHTML = '🔮 Ask Aura';
document.body.appendChild(highlightBtn);

document.addEventListener('mouseup', (e) => {
  // Don't trigger inside aura panel
  if (root.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText || selectedText.length < 5) {
      highlightBtn.style.display = 'none';
      return;
    }

    // Position the button near the selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    highlightBtn.style.display = 'flex';
    highlightBtn.style.top = `${window.scrollY + rect.top - 44}px`;
    highlightBtn.style.left = `${window.scrollX + rect.left + rect.width / 2 - 60}px`;
    highlightBtn.dataset.text = selectedText;
  }, 10);
});

// Hide on click outside
document.addEventListener('mousedown', (e) => {
  if (e.target !== highlightBtn) {
    highlightBtn.style.display = 'none';
  }
});

highlightBtn.addEventListener('click', () => {
  const selected = highlightBtn.dataset.text;
  highlightBtn.style.display = 'none';

  // Open panel with selected text
  panelTitle.textContent = 'Ask Aura';
  result.innerHTML = `
    <div class="aura-highlight-quote">"${escapeHtml(selected.slice(0, 120))}${selected.length > 120 ? '...' : ''}"</div>
    <div class="aura-loading"><span></span><span></span><span></span></div>
  `;
  panel.classList.add('visible');

  // Reset history for fresh context
  conversationHistory = [];
  currentPageContent = selected;

  callNova(`The user selected this text on a webpage: "${selected}"\n\nExplain it clearly, give context, and share any key insight about it. Be concise and direct.`)
    .then(output => {
      const loadingEl = result.querySelector('.aura-loading');
      if (loadingEl) loadingEl.remove();

      const responseEl = document.createElement('div');
      responseEl.id = 'aura-result-text';
      result.appendChild(responseEl);

      const copyBtn = document.createElement('button');
      copyBtn.id = 'aura-copy-btn';
      copyBtn.style.opacity = '0';
      copyBtn.textContent = 'Copy';
      result.appendChild(copyBtn);

      // Typing animation
      const words = output.split(' ');
      let i = 0;
      let revealed = '';

      const interval = setInterval(() => {
        if (i >= words.length) {
          clearInterval(interval);
          responseEl.innerHTML = formatOutput(output);
          copyBtn.style.opacity = '1';
          copyBtn.style.transition = 'opacity 0.4s ease';
          showChatInput();
          return;
        }
        revealed += (i === 0 ? '' : ' ') + words[i];
        responseEl.textContent = revealed;
        i += 3;
      }, 30);

      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(output);
        copyBtn.textContent = 'Copied ✓';
        setTimeout(() => { if (copyBtn) copyBtn.textContent = 'Copy'; }, 2000);
      });
    })
    .catch(err => {
      result.innerHTML = `<div class="aura-error">⚠ ${escapeHtml(err.message)}</div>`;
    });
});

})();
