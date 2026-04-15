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

function addMessage(role, text, meta, resp) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "You" : "Wiki";

  const textEl = document.createElement("div");
  textEl.className = "text";
  if (role === "assistant" && window.marked && window.DOMPurify) {
    const html = window.marked.parse(text || "");
    const frag = window.DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
    textEl.appendChild(frag);
  } else {
    textEl.textContent = text;
  }

  msg.appendChild(roleEl);
  msg.appendChild(textEl);

  if (role === "assistant" && resp && Array.isArray(resp.citations) && resp.citations.length) {
    msg.appendChild(renderCitationChips(resp));
  }

  if (role === "assistant" && resp) {
    const neighbors = renderNeighborChips(resp);
    if (neighbors) msg.appendChild(neighbors);
  }

  if (meta) {
    msg.appendChild(renderMetaPills(meta));
  }

  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
  return msg;
}

function renderMetaPills(meta) {
  const metaEl = document.createElement("div");
  metaEl.className = "meta";
  for (const item of meta) {
    const pill = document.createElement("span");
    pill.className = `pill${item.bad ? " bad" : ""}`;
    pill.textContent = item.text;
    metaEl.appendChild(pill);
  }
  return metaEl;
}

function renderCitationChips(resp) {
  const wrap = document.createElement("div");
  wrap.className = "citations";
  for (const name of resp.citations) {
    wrap.appendChild(buildChip(resp, name, "citation-chip", `Open source: ${name}`));
  }
  return wrap;
}

function renderNeighborChips(resp) {
  const expansion = resp.trace && resp.trace.graph_expansion;
  if (!expansion || !expansion.enabled) return null;
  const neighbors = Array.isArray(expansion.neighbors_added) ? expansion.neighbors_added : [];
  const cited = new Set(resp.citations || []);
  const uncited = neighbors.filter((n) => !cited.has(n));
  if (!uncited.length) return null;

  const wrap = document.createElement("div");
  wrap.className = "neighbors";
  const label = document.createElement("span");
  label.className = "neighbors-label";
  label.textContent = "Also consulted";
  wrap.appendChild(label);
  for (const name of uncited) {
    wrap.appendChild(buildChip(resp, name, "citation-chip neighbor-chip", `Open consulted page: ${name}`));
  }
  return wrap;
}

function buildChip(resp, name, className, ariaLabel) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = className;
  chip.textContent = name;
  chip.setAttribute("aria-label", ariaLabel);
  chip.dataset.pageName = name;
  chip.addEventListener("click", () => {
    if (activeChip === chip) {
      closeDrawer();
    } else {
      openDrawer(chip, resp, name);
    }
  });
  return chip;
}

async function* parseSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx === -1) break;
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      let event = "message";
      let dataStr = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
      }
      if (!dataStr) continue;
      try {
        yield { event, data: JSON.parse(dataStr) };
      } catch (err) {
        console.warn("SSE parse error", err, dataStr);
      }
    }
  }
}

async function* consumeAskResponse(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream") && res.body) {
    yield* parseSSE(res.body);
    return;
  }
  // Backend ignored the stream flag — degrade to a single done event.
  const data = await res.json();
  yield { event: "done", data: { type: "done", response: data } };
}

async function* askWikiStream(question) {
  const payload = {
    question,
    max_pages: 6,
    use_graph_expansion: !!useGraphExpansion.checked,
    stream: true,
  };
  const fetchOpts = {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
    body: JSON.stringify(payload),
  };

  // Try the /api/* reverse-proxy path first (production docker-compose).
  // Any failure here silently falls through to the direct API base.
  try {
    const res = await fetch("/api/wiki/ask", fetchOpts);
    if (res.ok) {
      yield* consumeAskResponse(res);
      return;
    }
  } catch (_err) {
    // Network error — fall through.
  }

  const res = await fetch(`${_directApiBase()}/wiki/ask`, fetchOpts);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  yield* consumeAskResponse(res);
}

function summarizeMeta(resp) {
  const meta = [];
  if (resp.pages_used) meta.push({ text: `pages_used: ${resp.pages_used.length}` });
  const total = resp.trace && resp.trace.total ? resp.trace.total : null;
  if (total && typeof total.total_tracked_tokens === "number") {
    meta.push({ text: `tokens: ${total.total_tracked_tokens}` });
  }
  if (total && typeof total.request_wall_time_ms === "number") {
    const secs = total.request_wall_time_ms / 1000;
    meta.push({ text: `time: ${secs.toFixed(1)}s` });
  }
  if (total && typeof total.total_cost_usd === "number") {
    meta.push({ text: `cost: $${total.total_cost_usd.toFixed(4)}` });
  }
  if (resp.citations && resp.citations.length) {
    meta.push({ text: `citations: ${resp.citations.length}` });
  }
  const expansion = resp.trace && resp.trace.graph_expansion;
  if (expansion && expansion.enabled && expansion.neighbors_count) {
    meta.push({ text: `neighbors: ${expansion.neighbors_count}` });
  }
  return meta.length ? meta : null;
}

function addLoadingTurn() {
  const msg = document.createElement("div");
  msg.className = "msg assistant loading";
  msg.setAttribute("data-loading", "true");

  const roleEl = document.createElement("div");
  roleEl.className = "role";
  roleEl.textContent = "Wiki";

  const textEl = document.createElement("div");
  textEl.className = "text";
  for (let i = 0; i < 3; i++) {
    const d = document.createElement("span");
    d.textContent = "\u2022";
    textEl.appendChild(d);
  }

  msg.appendChild(roleEl);
  msg.appendChild(textEl);
  thread.appendChild(msg);
  thread.scrollTop = thread.scrollHeight;
  return msg;
}

function removeLoadingTurn(msg) {
  if (msg && msg.parentNode) msg.parentNode.removeChild(msg);
}

const drawerEl = document.getElementById("drawer");
const drawerTitle = document.getElementById("drawer-title");
const drawerSummary = document.getElementById("drawer-summary");
const drawerContent = document.getElementById("drawer-content");
const drawerRelated = document.getElementById("drawer-related");
const drawerPageEl = document.getElementById("drawer-page");
const drawerCloseBtn = document.getElementById("drawer-close");
const drawerSuggest = document.getElementById("drawer-suggest");

const SUGGEST_REPO = "Chili36/Chemmon_Wiki";

let activeChip = null;
let lastFocusBeforeDrawer = null;

function findPage(resp, pageName) {
  if (!resp || !Array.isArray(resp.pages)) return null;
  return resp.pages.find((p) => p.page_name === pageName) || null;
}

function openDrawer(chip, resp, pageName) {
  const page = findPage(resp, pageName);
  if (!page) return;

  if (activeChip && activeChip !== chip) activeChip.classList.remove("active");
  chip.classList.add("active");
  activeChip = chip;

  drawerPageEl.textContent = pageName;
  drawerTitle.textContent = page.title || pageName;
  drawerSummary.textContent = page.summary || "";

  while (drawerContent.firstChild) drawerContent.removeChild(drawerContent.firstChild);
  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(page.content || "");
    const frag = window.DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
    drawerContent.appendChild(frag);
  } else {
    drawerContent.textContent = page.content || "";
  }

  while (drawerRelated.firstChild) drawerRelated.removeChild(drawerRelated.firstChild);
  const related = Array.isArray(page.related) ? page.related : [];
  for (const rel of related) {
    const clean = String(rel).replace(/^\[\[|\]\]$/g, "");
    const span = document.createElement("span");
    span.className = "related-chip";
    span.textContent = clean;
    drawerRelated.appendChild(span);
  }
  drawerEl.querySelector(".drawer-related-wrap").style.display = related.length ? "block" : "none";

  const issueParams = new URLSearchParams({
    title: `Suggest change to ${pageName}`,
    body: `<!-- Describe the change you'd like to propose for ${pageName} -->\n`,
  });
  drawerSuggest.href = `https://github.com/${SUGGEST_REPO}/issues/new?${issueParams.toString()}`;

  lastFocusBeforeDrawer = chip;
  drawerEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  drawerCloseBtn.focus();
}

function closeDrawer() {
  if (drawerEl.getAttribute("aria-hidden") === "true") return;
  drawerEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  if (activeChip) {
    activeChip.classList.remove("active");
    activeChip = null;
  }
  if (lastFocusBeforeDrawer && document.contains(lastFocusBeforeDrawer)) {
    lastFocusBeforeDrawer.focus();
  }
  lastFocusBeforeDrawer = null;
}

drawerCloseBtn.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawerEl.getAttribute("aria-hidden") === "false") {
    e.preventDefault();
    closeDrawer();
  }
});

function renderMarkdownInto(el, text) {
  while (el.firstChild) el.removeChild(el.firstChild);
  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(text || "");
    const frag = window.DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
    el.appendChild(frag);
  } else {
    el.textContent = text || "";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";

  hideEmptyState();
  addMessage("user", q);

  sendBtn.disabled = true;
  const loadingMsg = addLoadingTurn();

  let assistantMsg = null;
  let answerEl = null;
  let answerText = "";

  function ensureAssistantMsg() {
    if (assistantMsg) return;
    removeLoadingTurn(loadingMsg);
    assistantMsg = document.createElement("div");
    assistantMsg.className = "msg assistant";
    const roleEl = document.createElement("div");
    roleEl.className = "role";
    roleEl.textContent = "Wiki";
    answerEl = document.createElement("div");
    answerEl.className = "text";
    assistantMsg.appendChild(roleEl);
    assistantMsg.appendChild(answerEl);
    thread.appendChild(assistantMsg);
    thread.scrollTop = thread.scrollHeight;
  }

  try {
    for await (const { event, data } of askWikiStream(q)) {
      if (event === "meta") {
        ensureAssistantMsg();
      } else if (event === "delta") {
        ensureAssistantMsg();
        answerText += data.text || "";
        renderMarkdownInto(answerEl, answerText);
        thread.scrollTop = thread.scrollHeight;
      } else if (event === "done") {
        ensureAssistantMsg();
        const resp = data.response;
        if (resp && typeof resp.answer === "string") {
          answerText = resp.answer;
          renderMarkdownInto(answerEl, answerText);
        }
        if (resp && Array.isArray(resp.citations) && resp.citations.length) {
          assistantMsg.appendChild(renderCitationChips(resp));
        }
        if (resp) {
          const neighborEl = renderNeighborChips(resp);
          if (neighborEl) assistantMsg.appendChild(neighborEl);
        }
        const meta = summarizeMeta(resp);
        if (meta) assistantMsg.appendChild(renderMetaPills(meta));
        thread.scrollTop = thread.scrollHeight;
      } else if (event === "error") {
        throw new Error(data.message || "Stream error");
      }
    }
  } catch (err) {
    removeLoadingTurn(loadingMsg);
    if (assistantMsg) {
      assistantMsg.appendChild(renderMetaPills([{ text: `error: ${err.message || err}`, bad: true }]));
    } else {
      addMessage("assistant", String(err), [{ text: "error", bad: true }]);
    }
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

const emptyState = document.getElementById("empty-state");

function hideEmptyState() {
  if (emptyState && !emptyState.classList.contains("hidden")) {
    emptyState.classList.add("hidden");
  }
}
