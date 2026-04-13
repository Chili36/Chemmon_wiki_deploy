const thread = document.getElementById("thread");
const form = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const useGraphExpansion = document.getElementById("useGraphExpansion");

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

  const res = await fetch("/api/wiki/ask", {
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

