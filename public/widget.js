(() => {
  const script = document.currentScript;
  const api = script?.getAttribute("data-api") || new URL(script?.src || location.href).origin;
  const tenant = script?.getAttribute("data-tenant");
  const publicKey = script?.getAttribute("data-key");
  if (!tenant || document.getElementById("omni-widget-root")) return;

  const storageKey = `omni_widget_${tenant}`;
  const historyKey = `${storageKey}_history`;
  const visitorId = localStorage.getItem(storageKey) || `web-${crypto.randomUUID()}`;
  localStorage.setItem(storageKey, visitorId);

  const root = document.createElement("div");
  root.id = "omni-widget-root";
  root.innerHTML = `
    <button aria-label="Open chat" class="omni-toggle">
      <span class="omni-toggle-label">Chat</span>
      <span class="omni-badge" hidden>1</span>
    </button>
    <section class="omni-panel" hidden>
      <header>
        <div>
          <strong class="omni-title">Support</strong>
          <small class="omni-subtitle">Usually replies in under a minute</small>
        </div>
        <button aria-label="Close chat" type="button">×</button>
      </header>
      <main aria-live="polite"></main>
      <div class="omni-typing" hidden>Assistant is typing…</div>
      <form>
        <input aria-label="Message" maxlength="10000" placeholder="Write a message…" required>
        <button type="submit">Send</button>
      </form>
      <p class="omni-error" hidden></p>
    </section>`;

  const style = document.createElement("style");
  style.textContent = `
#omni-widget-root{--omni-brand:#2563eb;font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
.omni-toggle{position:fixed;right:20px;bottom:20px;z-index:2147483647;border:0;border-radius:999px;padding:14px 18px;background:var(--omni-brand);color:#fff;font-weight:700;cursor:pointer;box-shadow:0 10px 30px #0f172a40;display:flex;align-items:center;gap:8px}
.omni-badge{min-width:18px;height:18px;border-radius:999px;background:#ef4444;color:#fff;font-size:11px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
.omni-panel{position:fixed;right:20px;bottom:76px;z-index:2147483647;width:min(380px,calc(100vw - 24px));height:min(540px,calc(100vh - 110px));background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 18px 50px #0f172a33;overflow:hidden;display:flex;flex-direction:column}
.omni-panel header{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#0f172a,var(--omni-brand));color:#fff}
.omni-panel header strong{display:block;font-size:15px}
.omni-panel header small{display:block;opacity:.85;font-size:11px;font-weight:500}
.omni-panel header button{border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer}
.omni-panel main{flex:1;padding:14px;overflow:auto;background:#f8fafc}
.omni-panel p{margin:0 0 10px;padding:10px 12px;border-radius:12px;background:#fff;border:1px solid #e2e8f0;max-width:88%;box-shadow:0 1px 2px #0f172a0d;white-space:pre-wrap}
.omni-panel p.me{margin-left:auto;background:var(--omni-brand);border-color:transparent;color:#fff}
.omni-typing{padding:0 14px 8px;color:#64748b;font-size:12px}
.omni-panel form{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff}
.omni-panel input{min-width:0;flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px}
.omni-panel form button{border:0;border-radius:10px;padding:10px 14px;background:var(--omni-brand);color:#fff;font-weight:700;cursor:pointer}
.omni-panel form button:disabled{opacity:.6;cursor:wait}
.omni-error{margin:0;padding:0 12px 10px;color:#b91c1c;font-size:12px}
@media (max-width:480px){.omni-panel{right:8px;left:8px;width:auto;bottom:70px}}`;
  document.head.append(style);
  document.body.append(root);

  const toggle = root.querySelector(".omni-toggle");
  const badge = root.querySelector(".omni-badge");
  const panel = root.querySelector(".omni-panel");
  const close = root.querySelector("header button");
  const titleEl = root.querySelector(".omni-title");
  const subtitleEl = root.querySelector(".omni-subtitle");
  const log = root.querySelector("main");
  const typing = root.querySelector(".omni-typing");
  const form = root.querySelector("form");
  const input = root.querySelector("input");
  const sendBtn = root.querySelector("form button");
  const errorEl = root.querySelector(".omni-error");

  const persist = () => {
    const messages = [...log.querySelectorAll("p")].map((node) => ({
      text: node.textContent || "",
      me: node.classList.contains("me"),
    }));
    localStorage.setItem(historyKey, JSON.stringify(messages.slice(-40)));
  };

  const add = (text, mine = false) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    if (mine) paragraph.className = "me";
    log.append(paragraph);
    log.scrollTop = log.scrollHeight;
    persist();
    return paragraph;
  };

  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
    if (Array.isArray(saved) && saved.length) {
      for (const item of saved) add(String(item.text || ""), Boolean(item.me));
    }
  } catch {
    /* ignore corrupt history */
  }

  void fetch(`${api}/api/widget/config?tenant=${encodeURIComponent(tenant)}`)
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const settings = data?.tenant?.settings || {};
      if (settings.brandColor) root.style.setProperty("--omni-brand", settings.brandColor);
      const company = data?.tenant?.name || "Support";
      titleEl.textContent = company;
      subtitleEl.textContent =
        navigator.language.startsWith("tr") ? "Genelde bir dakika içinde yanıt" : "Usually replies in under a minute";
      const welcome = navigator.language.startsWith("tr") ? settings.welcomeTr : settings.welcomeEn;
      if (welcome && !log.querySelector("p")) add(welcome);
    })
    .catch(() => undefined);

  const openPanel = () => {
    panel.hidden = false;
    badge.hidden = true;
    input.focus();
  };

  toggle.onclick = () => {
    if (panel.hidden) openPanel();
    else panel.hidden = true;
  };
  close.onclick = () => {
    panel.hidden = true;
  };

  form.onsubmit = async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    errorEl.hidden = true;
    add(text, true);
    typing.hidden = false;
    sendBtn.disabled = true;
    try {
      const response = await fetch(`${api}/api/widget/message`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          tenantSlug: tenant,
          publicKey,
          text,
          visitorId,
          locale: navigator.language.startsWith("tr") ? "tr" : "en",
        }),
      });
      const data = await response.json();
      const reply = data.reply || data.error?.message;
      if (!response.ok || !reply) throw new Error(data.error?.message || "Delivery failed");
      add(reply);
      if (panel.hidden) badge.hidden = false;
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "We could not send that message. Please try again.";
      errorEl.textContent = message;
      errorEl.hidden = false;
      add(message);
    } finally {
      typing.hidden = true;
      sendBtn.disabled = false;
    }
  };
})();
