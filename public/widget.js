(() => {
  const script = document.currentScript;
  const api = script?.getAttribute("data-api") || new URL(script?.src || location.href).origin;
  const tenant = script?.getAttribute("data-tenant");
  const publicKey = script?.getAttribute("data-key");
  if (!tenant || document.getElementById("omni-widget-root")) return;

  const storageKey = `omni_widget_${tenant}`;
  const visitorId = localStorage.getItem(storageKey) || `web-${crypto.randomUUID()}`;
  localStorage.setItem(storageKey, visitorId);

  const root = document.createElement("div");
  root.id = "omni-widget-root";
  root.innerHTML = `<button aria-label="Open chat" class="omni-toggle">Chat</button><section class="omni-panel" hidden><header>How can we help?<button aria-label="Close chat">×</button></header><main aria-live="polite"></main><form><input aria-label="Message" maxlength="10000" placeholder="Write a message…" required><button>Send</button></form></section>`;
  const style = document.createElement("style");
  style.textContent = `#omni-widget-root{--omni-brand:#2563eb;font:14px system-ui,sans-serif}.omni-toggle{position:fixed;right:20px;bottom:20px;z-index:2147483647;border:0;border-radius:999px;padding:14px 18px;background:var(--omni-brand);color:#fff;font-weight:700;cursor:pointer}.omni-panel{position:fixed;right:20px;bottom:76px;z-index:2147483647;width:min(360px,calc(100vw - 32px));height:440px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 16px 48px #0f172a33;overflow:hidden;display:flex;flex-direction:column}.omni-panel header{display:flex;justify-content:space-between;padding:14px;background:#0f172a;color:#fff;font-weight:700}.omni-panel header button{border:0;background:transparent;color:#fff;font-size:22px}.omni-panel main{flex:1;padding:12px;overflow:auto}.omni-panel p{margin:0 0 8px;padding:9px;border-radius:10px;background:#f1f5f9;max-width:85%}.omni-panel p.me{margin-left:auto;background:var(--omni-brand);color:#fff}.omni-panel form{display:flex;gap:6px;padding:10px;border-top:1px solid #e2e8f0}.omni-panel input{min-width:0;flex:1;padding:9px;border:1px solid #cbd5e1;border-radius:8px}.omni-panel form button{border:0;border-radius:8px;padding:9px 12px;background:var(--omni-brand);color:#fff}`;
  document.head.append(style);
  document.body.append(root);

  const toggle = root.querySelector(".omni-toggle");
  const panel = root.querySelector(".omni-panel");
  const close = root.querySelector("header button");
  const log = root.querySelector("main");
  const form = root.querySelector("form");
  const input = root.querySelector("input");
  const add = (text, mine = false) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    if (mine) paragraph.className = "me";
    log.append(paragraph);
    log.scrollTop = log.scrollHeight;
  };

  void fetch(`${api}/api/widget/config?tenant=${encodeURIComponent(tenant)}`)
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      const settings = data?.tenant?.settings || {};
      if (settings.brandColor) root.style.setProperty("--omni-brand", settings.brandColor);
      const welcome = navigator.language.startsWith("tr") ? settings.welcomeTr : settings.welcomeEn;
      if (welcome) add(welcome);
    })
    .catch(() => undefined);

  toggle.onclick = () => { panel.hidden = !panel.hidden; if (!panel.hidden) input.focus(); };
  close.onclick = () => { panel.hidden = true; };
  form.onsubmit = async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    add(text, true);
    try {
      const response = await fetch(`${api}/api/widget/message`, {
        method: "POST",
        // A CORS-safelisted content type avoids a preflight that cannot carry
        // the tenant key. The server still parses the JSON request body.
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ tenantSlug: tenant, publicKey, text, visitorId, locale: navigator.language.startsWith("tr") ? "tr" : "en" }),
      });
      const data = await response.json();
      add(data.reply || data.error?.message || "Thanks — we received your message.");
    } catch {
      add("We could not send that message. Please try again.");
    }
  };
})();
