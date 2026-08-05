// Smart PDF Workspace — embeddable ask-your-docs widget.
// Dependency-free. Rendered in a shadow DOM so it never collides with host styles.

const API_URL = process.env.WIDGET_API_URL || 'https://smart-pdf-backend-vyh7.onrender.com';

interface WidgetConfig {
  title: string;
  color: string;
  position: 'left' | 'right';
  documents: { id: string; title: string }[];
}

interface AskResult {
  answer: string;
  sources: { chunkText: string; similarity: number; documentTitle?: string | null }[];
}

function getCompanyId(): string | null {
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.dataset.companyId) return script.dataset.companyId;
  const all = Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-company-id]'));
  return all[0]?.dataset.companyId || null;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  if (className) node.className = className;
  return node;
}

function textNode(tag: keyof HTMLElementTagNameMap, text: string, className?: string): HTMLElement {
  const node = el(tag, { textContent: text }, className);
  return node;
}

function init(): void {
  const companyId = getCompanyId();
  if (!companyId) {
    console.warn('[SmartPDFWidget] Missing data-company-id attribute.');
    return;
  }

  fetch(`${API_URL}/widget/${companyId}/config`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<WidgetConfig>;
    })
    .then((config) => {
      if (config.documents.length === 0) {
        console.warn('[SmartPDFWidget] No published documents for this company.');
        return;
      }
      render(config, companyId);
    })
    .catch((err) => {
      console.warn('[SmartPDFWidget] Could not load widget config:', err.message);
    });
}

function render(config: WidgetConfig, companyId: string): void {
  const host = el('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [buildStyles(config)];
  document.body.appendChild(host);

  const isRight = config.position !== 'left';
  const messages: { role: 'user' | 'assistant'; text: string }[] = [];
  let open = false;

  const launcher = el('button', { type: 'button' }, 'spw-launcher');
  launcher.textContent = config.title;

  const panel = el('div', {}, `spw-panel ${isRight ? 'spw-right' : 'spw-left'}`);
  panel.style.display = 'none';

  // Header
  const header = el('div', {}, 'spw-header');
  const headerTitle = textNode('span', config.title, 'spw-header-title');
  const closeBtn = el('button', { type: 'button' }, 'spw-close');
  closeBtn.textContent = '×';
  header.append(headerTitle, closeBtn);

  // Messages
  const scroll = el('div', {}, 'spw-scroll');
  const empty = textNode('p', `Ask anything about our published documents.`, 'spw-empty');
  scroll.appendChild(empty);

  // Input row
  const inputRow = el('div', {}, 'spw-input-row');
  const input = el('input', { type: 'text', placeholder: 'Ask a question…', autocomplete: 'off' }, 'spw-input');
  const sendBtn = el('button', { type: 'button' }, 'spw-send');
  sendBtn.textContent = '➤';

  inputRow.append(input, sendBtn);
  panel.append(header, scroll, inputRow);
  shadow.append(launcher, panel);

  const typing = () => {
    const row = el('div', {}, 'spw-msg spw-assistant');
    const bubble = el('div', {}, 'spw-bubble spw-typing');
    for (let i = 0; i < 3; i++) {
      bubble.appendChild(el('span', {}, `spw-dot spw-dot-${i}`));
    }
    row.appendChild(bubble);
    scroll.appendChild(row);
    scroll.scrollTop = scroll.scrollHeight;
    return row;
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => {
    if (scroll.contains(empty)) empty.remove();
    const row = el('div', {}, `spw-msg spw-${role}`);
    const bubble = textNode('span', text, 'spw-bubble');
    row.appendChild(bubble);
    scroll.appendChild(row);
    scroll.scrollTop = scroll.scrollHeight;
    return row;
  };

  const typeOut = (row: HTMLElement, text: string, onDone: () => void) => {
    const bubble = row.querySelector('.spw-bubble') as HTMLElement | null;
    if (!bubble) {
      onDone();
      return;
    }
    const words = text.split(' ');
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      bubble.textContent = words.slice(0, i).join(' ');
      scroll.scrollTop = scroll.scrollHeight;
      if (i >= words.length) {
        clearInterval(timer);
        onDone();
      }
    }, 18);
    return timer;
  };

  const ask = async () => {
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    messages.push({ role: 'user', text: question });
    addMessage('user', question);
    const typingEl = typing();

    try {
      const res = await fetch(`${API_URL}/widget/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, question }),
      });
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          message = data.message || message;
        } catch {}
        throw new Error(message);
      }
      const data = (await res.json()) as AskResult;
      typingEl.remove();
      const row = addMessage('assistant', '');
      typeOut(row, data.answer, () => {
        if (data.sources.length > 0) {
          const sourcesBtn = el('button', { type: 'button' }, 'spw-sources-toggle');
          sourcesBtn.textContent = `Show ${data.sources.length} source${data.sources.length > 1 ? 's' : ''}`;
          const sourcesList = el('ul', {}, 'spw-sources');
          sourcesList.style.display = 'none';
          data.sources.forEach((s) => {
            const li = el('li', {}, 'spw-source');
            const docLabel = s.documentTitle ? ` · ${s.documentTitle}` : '';
            li.textContent = `${s.chunkText.slice(0, 160)}${s.chunkText.length > 160 ? '…' : ''} (${Math.round(s.similarity * 100)}%${docLabel})`;
            sourcesList.appendChild(li);
          });
          sourcesBtn.addEventListener('click', () => {
            const hidden = sourcesList.style.display === 'none';
            sourcesList.style.display = hidden ? 'block' : 'none';
            sourcesBtn.textContent = hidden ? 'Hide sources' : `Show ${data.sources.length} source${data.sources.length > 1 ? 's' : ''}`;
          });
          row.appendChild(sourcesBtn);
          row.appendChild(sourcesList);
        }
        scroll.scrollTop = scroll.scrollHeight;
      });
    } catch (err) {
      typingEl.remove();
      addMessage('assistant', `Sorry, something went wrong: ${(err as Error).message}`);
    }
  };

  launcher.addEventListener('click', () => {
    open = !open;
    panel.style.display = open ? 'flex' : 'none';
    launcher.style.display = open ? 'none' : 'block';
    if (open) input.focus();
  });
  closeBtn.addEventListener('click', () => {
    open = false;
    panel.style.display = 'none';
    launcher.style.display = 'block';
  });
  sendBtn.addEventListener('click', ask);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ask();
  });
}

function buildStyles(config: WidgetConfig): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  const accent = config.color;
  const side = config.position !== 'left' ? 'right' : 'left';
  sheet.replaceSync(`
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .spw-launcher {
      position: fixed;
      ${side}: 24px;
      bottom: 24px;
      z-index: 2147483000;
      background: ${accent};
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 14px 22px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 6px 24px rgba(0,0,0,0.25);
      transition: transform 0.15s ease;
      display: flex; align-items: center; gap: 8px;
    }
    .spw-launcher:hover { transform: scale(1.05); }

    .spw-panel {
      position: fixed;
      ${side}: 24px;
      bottom: 24px;
      z-index: 2147483001;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: min(560px, calc(100vh - 48px));
      border-radius: 16px;
      background: #fff;
      color: #111;
      box-shadow: 0 12px 48px rgba(0,0,0,0.3);
      overflow: hidden;
      flex-direction: column;
    }

    .spw-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      background: ${accent};
      color: #fff;
      font-weight: 600;
      font-size: 15px;
    }
    .spw-header-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .spw-close { background: none; border: none; color: #fff; font-size: 22px; cursor: pointer; line-height: 1; padding: 0 4px; }

    .spw-scroll { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .spw-empty { color: #888; font-size: 13px; text-align: center; margin-top: 24px; }

    .spw-msg { display: flex; }
    .spw-user { justify-content: flex-end; }
    .spw-assistant { justify-content: flex-start; }
    .spw-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .spw-user .spw-bubble { background: ${accent}; color: #fff; border-bottom-right-radius: 4px; }
    .spw-assistant .spw-bubble { background: #f1f3f6; color: #111; border-bottom-left-radius: 4px; }
    .spw-typing { display: flex; align-items: center; gap: 5px; }
    .spw-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #9ca3af;
      animation: spw-bounce 1.2s infinite ease-in-out;
    }
    .spw-dot-1 { animation-delay: 0ms; }
    .spw-dot-2 { animation-delay: 160ms; }
    .spw-dot-3 { animation-delay: 320ms; }
    @keyframes spw-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }

    .spw-sources-toggle {
      background: none; border: none; color: ${accent};
      font-size: 12px; cursor: pointer; margin-top: 6px; padding: 0;
      text-decoration: underline;
    }
    .spw-sources { margin-top: 6px; padding-left: 16px; list-style: disc; }
    .spw-source { color: #666; font-size: 12px; margin-top: 4px; }

    .spw-input-row {
      display: flex; gap: 8px; padding: 12px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }
    .spw-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
    }
    .spw-input:focus { border-color: ${accent}; }
    .spw-send {
      width: 40px; height: 40px;
      border: none; border-radius: 999px;
      background: ${accent}; color: #fff;
      font-size: 16px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
  `);
  return sheet;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
