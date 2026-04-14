const thread = document.getElementById("thread");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const useGraphExpansion = document.getElementById("useGraphExpansion");

function _apiOverrideBase() {
  const params = new URLSearchParams(window.location.search);
  const raw = (params.get("api") || "").trim();
  if (!raw) return null;
  // Normalize to avoid accidental double-slashes on `${base}/wiki/ask`.
  return raw.replace(/\/+$/, "");
}

function _directApiBase() {
  return _apiOverrideBase() || "http://127.0.0.1:8005";
}

function addMessage(role, text, meta) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "You" : "Wiki";

  const textEl = document.createElement("div");
  textEl.className = "text";
  textEl.textContent = text;

  msg.appendChild(roleEl);
  msg.appendChild(textEl);

  if (meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "meta";
    for (const item of meta) {
      const pill = document.createElement("span");
      pill.className = `pill${item.bad ? " bad" : ""}`;
      pill.textContent = item.text;
      metaEl.appendChild(pill);
    }
    msg.appendChild(metaEl);
  }

  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
}

async function askWiki(question) {
  const payload = {
    question,
    max_pages: 6,
    use_graph_expansion: !!useGraphExpansion.checked,
  };

  // Production (docker-compose) runs behind nginx and exposes an /api/* proxy.
  // For local UI dev without Docker, users can run the API on 127.0.0.1:8005
  // and this will fall back automatically (or can be forced via `?api=...`).
  const primaryUrl = "/api/wiki/ask";
  try {
    const res = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return await res.json();

    // If /api/* is not wired up (common when serving the UI with a static
    // server), fall back to the direct API base.
    if (res.status !== 404) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
  } catch (err) {
    // Network error (no proxy). Fall back below.
  }

  const fallbackUrl = `${_directApiBase()}/wiki/ask`;
  const res = await fetch(fallbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return await res.json();
}

function summarizeMeta(resp) {
  const meta = [];
  if (resp.pages_used) meta.push({ text: `pages_used: ${resp.pages_used.length}` });
  const total = resp.trace && resp.trace.total ? resp.trace.total : null;
  if (total && typeof total.total_tracked_tokens === "number") {
    meta.push({ text: `tokens: ${total.total_tracked_tokens}` });
  }
  if (total && typeof total.total_cost_usd === "number") {
    meta.push({ text: `cost: $${total.total_cost_usd.toFixed(4)}` });
  }
  if (resp.citations && resp.citations.length) {
    meta.push({ text: `citations: ${resp.citations.join(", ")}` });
  }
  return meta.length ? meta : null;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";

  addMessage("user", q);

  sendBtn.disabled = true;
  try {
    const resp = await askWiki(q);
    addMessage("assistant", resp.answer || "(empty)", summarizeMeta(resp));
  } catch (err) {
    addMessage("assistant", String(err), [{ text: "error", bad: true }]);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

addMessage(
  "assistant",
  "Ready. Ask a question about ChemMon reporting. This UI calls /api/wiki/ask.",
  null
);
