// -- Aura Content Script --

(function () {
  if (document.getElementById('aura-root')) return;

  // -- Config --
  const NOVA_API_URL = 'https://aura-ai.temiloluwa1402.workers.dev';
  const NOVA_API_KEY = '';

  // -- State --
  let conversationHistory = [];
  let currentPageContent = '';
  let savedNotes = JSON.parse(localStorage.getItem('aura-notes') || '[]');

  // -- Feature definitions --
  const FEATURES = [
    {
      action: 'summarize',
      label: 'Summarize Page',
      icon: '✦',
      prompt: (content) =>
        `Summarize the following webpage content using bullet points for key takeaways. Maximum 200 words. Go straight into the bullet points, no intro sentence.\n\n${content}`,
    },
    {
      action: 'explain',
      label: 'Explain Code',
      icon: '⚡',
      prompt: (content) =>
        `Explain the code on this page in simple, clear terms. Go straight into the explanation, no intro sentence.\n\n${content}`,
    },
    {
      action: 'reply',
      label: 'Draft Reply',
      icon: '↩',
      prompt: (content) =>
        `Based on the following LinkedIn message or conversation, draft a professional, friendly reply. Go straight into the reply, no intro sentence.\n\n${content}`,
    },
    {
      action: 'post',
      label: 'Create Post',
      icon: '✐',
      prompt: (content) =>
        `Based on the following content, generate 2 compelling LinkedIn post ideas. Each should have a hook, key insight, and a call to action. Go straight into the ideas, no intro sentence.\n\n${content}`,
    },
  ];

  // -- Build DOM --
  const root = document.createElement('div');
  root.id = 'aura-root';

  root.innerHTML = `
    <div id="aura-panel">
      <div id="aura-panel-header">
        <span id="aura-panel-title">Aura</span>
        <button id="aura-panel-close">✕</button>
      </div>
      <div id="aura-panel-body">
        <div id="aura-result"></div>
      </div>
      <div id="aura-settings-hint"></div>
    </div>

    <div id="aura-menu">
      ${FEATURES.map(f => `
        <button class="aura-action-btn" data-action="${f.action}">
          <span class="aura-icon">${f.icon}</span>
          <span>${f.label}</span>
        </button>
      `).join('')}
      <button class="aura-action-btn" id="aura-notes-btn">
        <span class="aura-icon">📝</span>
        <span>My Notes</span>
      </button>
    </div>

    <button id="aura-fab" title="Aura AI">
      <span style="font-size: 24px; line-height: 1;">🔮</span>
    </button>
  `;

  document.body.appendChild(root);

  // -- Element refs --
  const fab        = root.querySelector('#aura-fab');
  const menu       = root.querySelector('#aura-menu');
  const panel      = root.querySelector('#aura-panel');
  const panelTitle = root.querySelector('#aura-panel-title');
  const result     = root.querySelector('#aura-result');
  const closeBtn   = root.querySelector('#aura-panel-close');

  let menuOpen = false;

  // -- Rotating quotes --
  const QUOTES = [
    "🔮 Think less. Know more.",
    "⚡ Your AI layer on every page.",
    "✦ Built by Valentine.",
    "🌍 The future browses differently.",
    "💡 Curiosity, accelerated.",
    "⚡ Less tabs. More answers.",
  ];
  const quoteEl = root.querySelector('#aura-settings-hint');
  if (quoteEl) quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // -- Draggable FAB --
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

  fab.addEventListener('click', (e) => {
    if (isDragging) { isDragging = false; e.stopImmediatePropagation(); return; }
    menuOpen = !menuOpen;
    fab.classList.toggle('open', menuOpen);
    menu.classList.toggle('visible', menuOpen);
    if (!menuOpen) closePanel();
  });

  // -- Close panel -- resets everything
  closeBtn.addEventListener('click', closePanel);

  function closePanel() {
    panel.classList.remove('visible');
    // Clear panel content and chat history
    result.innerHTML = '';
    const chatWrap = root.querySelector('#aura-chat-input-wrap');
    if (chatWrap) chatWrap.remove();
    conversationHistory = [];
    currentPageContent = '';
    // Refresh quote
    if (quoteEl) quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  // -- Get page content --
  function getPageContent() {
    const selectors = ['article', 'main', '.content', '#content', '.post-body', '.article-body', 'pre code', '.readme'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 200) return el.innerText.trim().slice(0, 4000);
    }
    return document.body.innerText.trim().slice(0, 4000);
  }

  // -- Call API --
  async function callNova(prompt) {
    if (!NOVA_API_URL) throw new Error('No API URL set.');

    const messages = [
      {
        role: 'system',
        content: `You are Aura, a helpful AI assistant embedded in a browser extension. The user is on: ${window.location.href}. Page context:\n\n${currentPageContent}`
      },
      ...conversationHistory,
      { role: 'user', content: prompt }
    ];

    const response = await fetch(NOVA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);

    const data = await response.json();
    const output = data.response || data.message || data.text || data.content || JSON.stringify(data);

    conversationHistory.push({ role: 'user', content: prompt });
    conversationHistory.push({ role: 'assistant', content: output });

    return output;
  }

  // -- Typing animation helper --
  function typeText(el, text, onDone) {
    const words = text.split(' ');
    let i = 0;
    let revealed = '';
    el.textContent = '';

    const interval = setInterval(() => {
      if (i >= words.length) {
        clearInterval(interval);
        el.innerHTML = formatOutput(text);
        if (onDone) onDone();
        return;
      }
      revealed += (i === 0 ? '' : ' ') + words[i];
      el.textContent = revealed;
      i += 3;
    }, 30);
  }

  // -- Render result with copy + save --
  function renderResult(output, featureLabel) {
    result.innerHTML = `
      <div id="aura-result-text"></div>
      <div class="aura-action-row" style="opacity:0; pointer-events:none;">
        <button id="aura-copy-btn">Copy</button>
        <button id="aura-save-btn">Save Note</button>
      </div>
    `;

    const textEl  = result.querySelector('#aura-result-text');
    const row     = result.querySelector('.aura-action-row');
    const copyBtn = result.querySelector('#aura-copy-btn');
    const saveBtn = result.querySelector('#aura-save-btn');

    typeText(textEl, output, () => {
      row.style.opacity = '1';
      row.style.pointerEvents = 'all';
      row.style.transition = 'opacity 0.4s ease';
      showChatInput();
    });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(output);
      copyBtn.textContent = 'Copied ✓';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });

    saveBtn.addEventListener('click', () => {
      const note = {
        id: Date.now(),
        feature: featureLabel,
        content: output,
        url: window.location.href,
        date: new Date().toLocaleDateString(),
      };
      savedNotes.unshift(note);
      localStorage.setItem('aura-notes', JSON.stringify(savedNotes));
      saveBtn.textContent = 'Saved ✓';
      setTimeout(() => { saveBtn.textContent = 'Save Note'; }, 2000);
    });
  }

  // -- Feature click --
  root.querySelectorAll('.aura-action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const feature = FEATURES.find(f => f.action === action);
      if (!feature) return;

      // Reset
      conversationHistory = [];
      const chatWrap = root.querySelector('#aura-chat-input-wrap');
      if (chatWrap) chatWrap.remove();

      panelTitle.textContent = feature.label;
      result.innerHTML = `<div class="aura-loading"><span></span><span></span><span></span></div>`;
      panel.classList.add('visible');

      menuOpen = false;
      fab.classList.remove('open');
      menu.classList.remove('visible');

      try {
        currentPageContent = getPageContent();
        const output = await callNova(feature.prompt(currentPageContent));
        renderResult(output, feature.label);
      } catch (err) {
        result.innerHTML = `<div class="aura-error">⚠ Something went wrong.<br/><small>${escapeHtml(err.message)}</small></div>`;
      }
    });
  });

  // -- Chat input --
  function showChatInput() {
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

    const input   = wrap.querySelector('#aura-chat-input');
    const sendBtn = wrap.querySelector('#aura-chat-send');

    const send = () => {
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      handleFollowUp(val);
    };

    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  }

  async function handleFollowUp(message) {
    const body = root.querySelector('#aura-panel-body');
    const chatWrap = root.querySelector('#aura-chat-input-wrap');

    const userBubble = document.createElement('div');
    userBubble.className = 'aura-chat-bubble aura-chat-user';
    userBubble.textContent = message;
    body.insertBefore(userBubble, chatWrap);

    const aiBubble = document.createElement('div');
    aiBubble.className = 'aura-chat-bubble aura-chat-ai';
    aiBubble.innerHTML = `<div class="aura-loading"><span></span><span></span><span></span></div>`;
    body.insertBefore(aiBubble, chatWrap);

    body.scrollTop = body.scrollHeight;

    try {
      const output = await callNova(message);
      typeText(aiBubble, output, () => { body.scrollTop = body.scrollHeight; });
    } catch (err) {
      aiBubble.innerHTML = `<span class="aura-error">⚠ ${escapeHtml(err.message)}</span>`;
    }
  }

  // -- Highlight & Ask --
  const highlightBtn = document.createElement('div');
  highlightBtn.id = 'aura-highlight-btn';
  highlightBtn.innerHTML = '🔮 Ask Aura';
  document.body.appendChild(highlightBtn);

  document.addEventListener('mouseup', (e) => {
    if (root.contains(e.target)) return;
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selectedText || selectedText.length < 5) { highlightBtn.style.display = 'none'; return; }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      highlightBtn.style.display = 'flex';
      highlightBtn.style.top = `${window.scrollY + rect.top - 44}px`;
      highlightBtn.style.left = `${window.scrollX + rect.left + rect.width / 2 - 60}px`;
      highlightBtn.dataset.text = selectedText;
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (e.target !== highlightBtn) highlightBtn.style.display = 'none';
  });

  highlightBtn.addEventListener('click', () => {
    const selected = highlightBtn.dataset.text;
    highlightBtn.style.display = 'none';

    // Reset
    conversationHistory = [];
    currentPageContent = selected;
    const chatWrap = root.querySelector('#aura-chat-input-wrap');
    if (chatWrap) chatWrap.remove();

    panelTitle.textContent = 'Ask Aura';
    result.innerHTML = `
      <div class="aura-highlight-quote">"${escapeHtml(selected.slice(0, 120))}${selected.length > 120 ? '...' : ''}"</div>
      <div class="aura-loading"><span></span><span></span><span></span></div>
    `;
    panel.classList.add('visible');

    callNova(`The user selected this text: "${selected}"\n\nExplain it clearly, give context, and share any key insight. Be concise and direct. No intro sentence.`)
      .then(output => {
        result.querySelector('.aura-loading')?.remove();
        const responseEl = document.createElement('div');
        responseEl.id = 'aura-result-text';
        result.appendChild(responseEl);
        typeText(responseEl, output, () => showChatInput());
      })
      .catch(err => {
        result.innerHTML = `<div class="aura-error">⚠ ${escapeHtml(err.message)}</div>`;
      });
  });

  // -- Notes Panel --
  root.querySelector('#aura-notes-btn').addEventListener('click', () => {
    savedNotes = JSON.parse(localStorage.getItem('aura-notes') || '[]');
    panelTitle.textContent = 'My Notes';
    menuOpen = false;
    fab.classList.remove('open');
    menu.classList.remove('visible');

    const chatWrap = root.querySelector('#aura-chat-input-wrap');
    if (chatWrap) chatWrap.remove();

    if (savedNotes.length === 0) {
      result.innerHTML = `<div style="color: var(--aura-muted); font-size: 13px; text-align:center; padding: 20px 0;">No saved notes yet.<br/>Hit Save Note after any response.</div>`;
    } else {
      result.innerHTML = savedNotes.map(note => `
        <div class="aura-note-card" data-id="${note.id}">
          <div class="aura-note-meta">
            <span class="aura-note-feature">${escapeHtml(note.feature)}</span>
            <span class="aura-note-date">${note.date}</span>
          </div>
          <div class="aura-note-content">${formatOutput(note.content.slice(0, 200))}${note.content.length > 200 ? '...' : ''}</div>
          <div class="aura-note-actions">
            <button class="aura-note-copy" data-id="${note.id}">Copy</button>
            <button class="aura-note-delete" data-id="${note.id}">Delete</button>
          </div>
        </div>
      `).join('');

      result.querySelectorAll('.aura-note-copy').forEach(btn => {
        btn.addEventListener('click', () => {
          const note = savedNotes.find(n => n.id == btn.dataset.id);
          if (note) navigator.clipboard.writeText(note.content);
          btn.textContent = 'Copied ✓';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
      });

      result.querySelectorAll('.aura-note-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          savedNotes = savedNotes.filter(n => n.id != btn.dataset.id);
          localStorage.setItem('aura-notes', JSON.stringify(savedNotes));
          btn.closest('.aura-note-card').remove();
          if (savedNotes.length === 0) {
            result.innerHTML = `<div style="color: var(--aura-muted); font-size: 13px; text-align:center; padding: 20px 0;">No saved notes yet.</div>`;
          }
        });
      });
    }

    panel.classList.add('visible');
  });

  // -- Helpers --
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatOutput(str) {
    return escapeHtml(str)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^[-•]\s(.+)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/^\d+\.\s(.+)/gm, '<li class="numbered">$1</li>')
      .replace(/^##\s(.+)/gm, '<h4>$1</h4>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  }

})();