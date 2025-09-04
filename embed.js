(() => {
  // Detect the script URL to infer chat.html if not provided
  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const explicitUrl = currentScript?.getAttribute('data-fsb-url');
  let CHAT_URL = explicitUrl || (window.FreeSupportBot && window.FreeSupportBot.url);
  if (!CHAT_URL) {
    try {
      const src = new URL(currentScript.src);
      CHAT_URL = src.href.replace(/embed\.js(?:\?.*)?$/, 'chat.html');
    } catch (_) {}
  }
  if (!CHAT_URL) {
    console.error('[free-support-bot] Missing chat URL. Pass data-fsb-url on the script tag.');
    return;
  }

  const style = document.createElement('style');
  style.textContent = `
    #fsb-root{position:fixed;right:16px;bottom:16px;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto}
    #fsb-btn{all:unset;background:#1a73e8;color:#fff;padding:12px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.15);cursor:pointer}
    #fsb-panel{position:fixed;right:16px;bottom:76px;width:360px;height:520px;border:1px solid #e6e6e6;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18);display:none;background:#fff}
    #fsb-iframe{width:100%;height:100%;border:0}
    @media (max-width:420px){#fsb-panel{right:8px;left:8px;width:auto;height:70vh}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'fsb-root';
  root.innerHTML = `
    <button id="fsb-btn" aria-label="Open chat">Chat</button>
    <div id="fsb-panel" role="dialog" aria-label="Customer support">
      <iframe id="fsb-iframe" title="Customer support chat" src="${CHAT_URL}"></iframe>
    </div>`;
  document.body.appendChild(root);

  const btn = document.getElementById('fsb-btn');
  const panel = document.getElementById('fsb-panel');

  const toggle = () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Chat' : 'Close';
  };

  btn.addEventListener('click', toggle);
  window.addEventListener('message', (e) => {
    if (e.data === 'fsb.close') toggle();
  });
})();