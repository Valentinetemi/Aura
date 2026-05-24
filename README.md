
```markdown
# 🔮 Aura — Your AI Layer on Every Webpage

> *Every Time She Got Confused Online, She Called Me. I Got Tired of Answering. So I Built This.*

---

My cousin has a learning disability.

Not the kind people notice immediately. She holds a conversation fine. She laughs at the right moments. She is sharp in ways that matter.

But put her in front of a dense webpage — a medical article, a GitHub README, a LinkedIn thread — and something shifts. The words blur. The structure overwhelms. She closes the tab and calls me.

For two years, I was her human filter for the internet.

I got tired of being the workaround. So I built Aura.

---

## What Aura Is

**Aura is a Chrome extension that puts Gemma 4 directly on every webpage.**

No tab switching. No copy-pasting into ChatGPT. No context lost.

Click the floating orb. A panel slides in. AI appears exactly where you already are.

---

## ✨ Features

| Feature | What it does |
|---|---|
| ✦ **Summarize Page** | Converts any article, blog, or doc into clear key takeaways instantly |
| ⚡ **Explain Code** | Explains code in human language — not just *what* it does but *why* |
| ↩ **Draft Reply** | Reads the conversation tone and drafts a reply that actually fits |
| ✐ **Create Post** | Turns any article into compelling LinkedIn post ideas |
| 🔮 **Highlight & Ask** | Select any text on the page and ask Aura anything about it |
| 📝 **My Notes** | Save any response and access it later across sessions |

---

## 🎬 Demo

[

![Aura Demo](https://img.youtube.com/vi/EXh2Mg0vuyI/0.jpg)

](https://www.youtube.com/watch?v=EXh2Mg0vuyI)

---

## 🧠 Why Gemma 4 31B

Aura runs on **Gemma 4 31B Dense** via the Google Generative Language API.

Three Gemma 4 variants exist. I picked 31B deliberately.

| Model | Why I didn't pick it |
|---|---|
| 2B / 4B | Too shallow for reasoning across complex, unpredictable content types |
| 26B MoE | Efficient but inconsistent — routes tokens through specialized subnetworks |
| **31B Dense** | ✅ Full parameter activation. Consistent quality. Every tab. Every content type. |

Dense models activate all parameters for every token. Gemma 4 31B does not guess which expert to wake up. It brings everything it knows to every interaction — whether that is a GitHub README, a medical article, or a LinkedIn thread.

For a tool where the content changes every tab and the user cannot afford an inconsistent experience, that consistency is not optional.

---

## 🛠 Tech Stack

- **JavaScript, HTML, CSS** — no framework, no backend
- **Gemma 4 31B** via Google Generative Language API
- **Chrome Extensions Manifest V3**
- **localStorage** for notes persistence
- **chrome.storage.sync** for API key management

---

## ⚙️ How It Works

```javascript
const GEMMA_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent';

async function callNova(prompt) {
  const systemTurn = {
    role: 'user',
    parts: [{ text: `You are Aura, a helpful AI assistant in a browser extension. 
    Page context:\n\n${currentPageContent}\n\n
    Respond concisely. Never introduce yourself. Output only the final answer.` }]
  };

  const systemAck = {
    role: 'model',
    parts: [{ text: 'Understood.' }]
  };

  const response = await fetch(`${GEMMA_API_URL}?key=${GEMMA_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [systemTurn, systemAck, ...history, ...messages],
      generationConfig: { temperature: 0.7 },
      thinkingConfig: { thinkingBudget: 0 }
    }),
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}
```

**Key implementation details:**

- **System turn pattern** — Gemma 4 has no native system role. A user+model turn pair simulates it before the conversation starts
- **`thinkingBudget: 0`** — suppresses Gemma 4's reasoning trace so only the final answer reaches the user
- **Page extraction** — priority selector chain targeting `article`, `main`, `.content` before falling back to `document.body.innerText`, capped at 4000 characters
- **Conversation memory** — full turn history injected into every request for follow-up chat support

---

## 🚀 Installation

1. Clone this repo
```bash
git clone https://github.com/Valentinetemi/Aura.git
```
2. Open Chrome → go to `chrome://extensions`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select the project folder
5. Click the Aura icon in your toolbar → paste your Gemini API key → Save
6. Visit any webpage → click the 🔮 orb

---

## 👥 Who This Is For

- People with **dyslexia** who need content restructured instantly
- People with **ADHD** who lose the thread switching tabs
- **Non-native English speakers** navigating professional content
- **Elderly users** overwhelmed by dense web pages
- Anyone the internet was not designed for

---

## 🔭 What Is Next

Multimodal support — sending page screenshots alongside text so Gemma 4 can reason about charts, diagrams, and images, not just words.

My cousin once sent me a screenshot of a medical form she could not understand. I read it to her over the phone.

Aura will eventually do that too.

---

## 🔗 Links

- 🎬 **Demo:** https://www.youtube.com/watch?v=EXh2Mg0vuyI

---

> *"Code is poetry. Ship the poem."*

Built by [Valentine Temi](https://github.com/Valentinetemi) 🔮

```
