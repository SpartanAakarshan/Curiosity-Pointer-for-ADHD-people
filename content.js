let tooltipHost = null;
let tooltipShadow = null;
let tooltipBox = null;

function buildTooltip() {
  const host = document.createElement('div');
  host.id = 'curiosity-pointer-host';
  host.style.cssText = 'position:fixed;z-index:2147483647;display:none;pointer-events:none;';

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .box {
      background: #0f0f1a;
      color: #e2e2e2;
      border: 1px solid #7c3aed;
      border-radius: 10px;
      padding: 14px 16px;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      pointer-events: auto;
    }
    .label {
      font-size: 10px;
      color: #7c3aed;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .close {
      float: right;
      background: none;
      border: none;
      color: #555;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 0 0 8px;
      margin-top: -2px;
    }
    .close:hover { color: #e2e2e2; }
    .loading { color: #666; font-style: italic; }
  `;

  const box = document.createElement('div');
  box.className = 'box';

  shadow.appendChild(style);
  shadow.appendChild(box);
  document.documentElement.appendChild(host);

  tooltipHost = host;
  tooltipShadow = shadow;
  tooltipBox = box;
}

function positionTooltip(x, y) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 14;
  let top = y + 14;
  if (left + 320 > vw) left = x - 320;
  if (top + 140 > vh) top = y - 140;
  tooltipHost.style.left = Math.max(8, left) + 'px';
  tooltipHost.style.top = Math.max(8, top) + 'px';
}

function renderContent(html) {
  tooltipBox.innerHTML = `
    <button class="close" id="cp-close">×</button>
    <div class="label">Curiosity Pointer</div>
    ${html}
  `;
  tooltipShadow.getElementById('cp-close').addEventListener('click', hide);
}

function show(x, y) {
  if (!tooltipHost) buildTooltip();
  positionTooltip(x, y);
  renderContent('<span class="loading">Asking Gemini…</span>');
  tooltipHost.style.display = 'block';
}

function update(text) {
  if (!tooltipHost) return;
  renderContent(`<div>${text}</div>`);
}

function hide() {
  if (tooltipHost) tooltipHost.style.display = 'none';
}

function attachHeader(el) {
  if (el.dataset.cpAttached) return;
  el.dataset.cpAttached = 'true';

  el.addEventListener('mouseenter', () => document.body.classList.add('curiosity-mode'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('curiosity-mode'));

  el.addEventListener('click', (e) => {
    if (!e.altKey) return;
    e.preventDefault();
    e.stopPropagation();

    const text = el.innerText.trim();
    if (!text) return;

    show(e.clientX, e.clientY);

    chrome.runtime.sendMessage({ action: 'explain', text }, (response) => {
      if (chrome.runtime.lastError) {
        update('Extension error. Try reloading page.');
        return;
      }
      if (response?.result) {
        update(response.result);
      } else {
        update('Error: ' + (response?.error ?? 'unknown'));
      }
    });
  });
}

const SELECTOR = 'h1, h2, h3, b, strong';

// Initial scan
document.querySelectorAll(SELECTOR).forEach(attachHeader);

// SPA support — catch elements added after load
const observer = new MutationObserver((mutations) => {
  for (const { addedNodes } of mutations) {
    for (const node of addedNodes) {
      if (node.nodeType !== 1) continue;
      if (/^(H[123]|B|STRONG)$/.test(node.tagName)) attachHeader(node);
      node.querySelectorAll?.(SELECTOR).forEach(attachHeader);
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });

// Alt+Click on any selected text → explain selection
document.addEventListener('click', (e) => {
  if (!e.altKey) return;
  const selection = window.getSelection()?.toString().trim();
  if (!selection || selection.length < 10) return;
  e.preventDefault();
  show(e.clientX, e.clientY);
  chrome.runtime.sendMessage({ action: 'explain', text: selection }, (response) => {
    if (chrome.runtime.lastError) { update('Extension error. Try reloading page.'); return; }
    if (response?.result) update(response.result);
    else update('Error: ' + (response?.error ?? 'unknown'));
  });
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
