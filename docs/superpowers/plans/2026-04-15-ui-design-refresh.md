# UI Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark glassmorphic chat UI with an editorial/regulatory design, add citation chips + a right-side source drawer pulled from `response.pages[]`, and preserve the four meta pills.

**Architecture:** Pure static frontend (`ui/index.html`, `ui/app.js`, `ui/styles.css`). No build step, no framework, no backend changes. The `/wiki/ask` response already includes `citations[]` and `pages[]`, so the drawer needs no extra fetch. Markdown rendering via already-loaded `marked` + `DOMPurify`.

**Tech Stack:** Vanilla HTML/CSS/JS, `marked@12`, `DOMPurify@3`. Verification via Playwright against the running UI at http://localhost:8080 and API at http://127.0.0.1:8005.

**Spec reference:** `docs/superpowers/specs/2026-04-15-ui-design-refresh.md`

**Testing note:** The project has no JS test runner — setting one up for a 3-file static UI would be YAGNI. Verification uses Playwright (already installed via the `plugin:playwright` MCP) to evaluate DOM state after each change. Each task ends with one or more browser verifications and a commit.

**Preconditions:**
1. On branch `feat/ui-design-refresh` (already created).
2. API running at `http://127.0.0.1:8005` (`cd /Users/davidfoster/Dev/Chemmon_Wiki && . .venv/bin/activate && uvicorn wiki_api.app:app --reload --port 8005`).
3. UI served from `/Users/davidfoster/Dev/chemmon_wiki_deploy/ui/` at `http://localhost:8080` (`python3 -m http.server 8080` from that directory).

---

## Task 1: Prepare branch (inherit markdown rendering)

The spec relies on `marked` + `DOMPurify` which live on `fix/ui-markdown-rendering`. Merge that branch into this one so the redesign sits on top of it.

**Files:**
- Modify: `ui/index.html` (merge brings in the marked + DOMPurify script tags)
- Modify: `ui/app.js` (merge brings in the markdown-rendering branch in `addMessage`)

- [ ] **Step 1: Confirm current branch**

Run: `cd /Users/davidfoster/Dev/chemmon_wiki_deploy && git status`
Expected: `On branch feat/ui-design-refresh`, working tree clean.

- [ ] **Step 2: Merge the markdown-rendering branch**

Run: `git merge --no-ff fix/ui-markdown-rendering -m "Merge fix/ui-markdown-rendering into feat/ui-design-refresh"`
Expected: Merge succeeds with no conflicts (the markdown branch only touches `.gitignore` and `ui/` files; this branch has only added `docs/` and `.gitignore`).

If `.gitignore` conflicts, resolve by keeping all three lines:
```
.env
.playwright-mcp/
.superpowers/
```
Then `git add .gitignore && git commit` (merge commit message auto-filled).

- [ ] **Step 3: Verify marked + DOMPurify load**

Reload http://localhost:8080 in Playwright and evaluate:
```js
() => ({ marked: typeof window.marked, DOMPurify: typeof window.DOMPurify })
```
Expected: `{ marked: "object", DOMPurify: "function" }`.

- [ ] **Step 4: (commit already exists from the merge — nothing to do)**

---

## Task 2: CSS tokens, base styles, layout widths

Full rewrite of `ui/styles.css`. Swap the dark tokens for the editorial palette, remove radial gradients, change the layout column to 720px max, and set base typography stacks.

**Files:**
- Modify: `ui/styles.css` (rewrite — approximately 180 → 220 lines)

- [ ] **Step 1: Replace `ui/styles.css` with the new tokens + base block**

```css
:root {
  --bg: #fafaf7;
  --surface: #ffffff;
  --ink: #1c1917;
  --ink-muted: #57534e;
  --ink-soft: #78716c;
  --rule: #e7e5e0;
  --edge: #d6d3d0;
  --accent: #0f766e;
  --accent-soft: rgba(15, 118, 110, 0.06);
  --warn: #b45309;
  --warn-soft: rgba(180, 83, 9, 0.08);

  --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
  --sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--sans);
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

code, pre {
  font-family: var(--mono);
  font-size: 0.92em;
}

.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 40px 40px;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 22px;
}

@media (max-width: 800px) {
  .wrap { padding: 20px; gap: 18px; }
}
```

- [ ] **Step 2: Verify new palette rendered**

Reload http://localhost:8080 in Playwright. Snapshot and confirm:
- Page background is warm off-white (not dark).
- No radial color glows.
- Column width appears narrower (≈720px centered).

Run via Playwright:
```js
() => getComputedStyle(document.body).backgroundColor
```
Expected: `rgb(250, 250, 247)`.

- [ ] **Step 3: Commit**

```bash
git add ui/styles.css
git commit -m "Swap CSS tokens and base layout to editorial palette"
```

---

## Task 3: Header restyle + subtitle copy

**Files:**
- Modify: `ui/styles.css` (append header styles)
- Modify: `ui/index.html` (subtitle copy)

- [ ] **Step 1: Append header styles to `ui/styles.css`**

```css
.header {
  padding: 0 0 18px 0;
  border-bottom: 1px solid var(--rule);
}

.title {
  font-family: var(--serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.subtitle {
  margin-top: 4px;
  font-family: var(--sans);
  font-size: 12px;
  color: var(--ink-soft);
}
```

- [ ] **Step 2: Replace subtitle copy in `ui/index.html`**

Replace this block in `ui/index.html:13-16`:

```html
<div class="subtitle">
  Calls <code>/api/wiki/ask</code> when proxied (Docker). For local dev without Docker, it falls back to
  <code>http://127.0.0.1:8005/wiki/ask</code> or <code>?api=http://host:8005</code>.
</div>
```

with:

```html
<div class="subtitle">A reference on EFSA chemical monitoring reporting &mdash; ask anything.</div>
```

- [ ] **Step 3: Verify header**

Reload and Playwright-evaluate:
```js
() => {
  const t = document.querySelector('.title');
  const s = document.querySelector('.subtitle');
  return {
    titleFont: getComputedStyle(t).fontFamily,
    titleSize: getComputedStyle(t).fontSize,
    subtitleText: s.textContent.trim(),
  };
}
```
Expected: `titleFont` starts with `"Iowan Old Style"`, `titleSize: "26px"`, subtitle begins with "A reference on EFSA".

- [ ] **Step 4: Commit**

```bash
git add ui/styles.css ui/index.html
git commit -m "Restyle header with serif title and regulatory subtitle"
```

---

## Task 4: Thread + message restyle

Strip the card chrome from messages. Use role labels + typography to distinguish turns.

**Files:**
- Modify: `ui/styles.css`

- [ ] **Step 1: Append thread/message styles to `ui/styles.css`**

```css
.thread {
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.msg {
  display: block;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  border-radius: 0;
}

.role {
  font-family: var(--sans);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.msg.user .role { color: var(--ink-soft); }
.msg.assistant .role { color: var(--accent); }

.text {
  font-family: var(--serif);
  color: var(--ink);
  white-space: normal;
}

.msg.user .text {
  font-size: 16px;
  line-height: 1.5;
}

.msg.assistant .text {
  font-size: 15px;
  line-height: 1.65;
}

/* Markdown-rendered children inherit serif but code stays mono */
.msg.assistant .text h1,
.msg.assistant .text h2,
.msg.assistant .text h3,
.msg.assistant .text p,
.msg.assistant .text ul,
.msg.assistant .text ol,
.msg.assistant .text li,
.msg.assistant .text blockquote {
  font-family: inherit;
  margin: 0.5em 0;
}

.msg.assistant .text h2 { font-size: 1.15em; font-weight: 600; }
.msg.assistant .text h3 { font-size: 1.05em; font-weight: 600; }
.msg.assistant .text ul,
.msg.assistant .text ol { padding-left: 20px; }
.msg.assistant .text code { font-family: var(--mono); font-size: 0.9em; background: var(--accent-soft); padding: 0.5px 4px; border-radius: 3px; }
.msg.assistant .text pre { background: #f5f1ea; border: 1px solid var(--rule); border-radius: 4px; padding: 10px; overflow-x: auto; }
.msg.assistant .text pre code { background: transparent; padding: 0; }
.msg.assistant .text a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
```

- [ ] **Step 2: Remove old `.msg.user` / `.msg.assistant` selectors that conflict**

The old styles.css had earlier blocks setting `.msg.user` background + border. Those have already been wiped in Task 2's rewrite — confirm by searching:

Run: `grep -n "msg.user\|msg.assistant" ui/styles.css`
Expected: Only the new rules from Step 1 appear (no `background: rgba(125, 211, 252, 0.10)` lines).

- [ ] **Step 3: Verify in browser**

Ask a question at http://localhost:8080 (e.g., "What is ChemMon?") and Playwright-evaluate:
```js
() => {
  const user = document.querySelector('.msg.user .text');
  const asst = document.querySelector('.msg.assistant .text');
  return {
    userFont: getComputedStyle(user).fontFamily,
    userBorder: getComputedStyle(document.querySelector('.msg.user')).border,
    asstFont: getComputedStyle(asst).fontFamily,
    roleColor: getComputedStyle(document.querySelector('.msg.assistant .role')).color,
  };
}
```
Expected: both fonts start with `"Iowan Old Style"`, border is `"0px none rgb(28, 25, 23)"` or similar (no border), role color is `rgb(15, 118, 110)`.

- [ ] **Step 4: Commit**

```bash
git add ui/styles.css
git commit -m "Restyle thread and messages as document-flow paragraphs"
```

---

## Task 5: Composer + meta pills restyle; citations pill shows count

Meta pills change behaviour slightly: the existing `citations` pill shows the comma-joined list; it needs to show just the count (the chips in Task 8 will replace the list).

**Files:**
- Modify: `ui/styles.css`
- Modify: `ui/app.js:103-104` (summarizeMeta)

- [ ] **Step 1: Append composer + pill styles to `ui/styles.css`**

```css
.composer {
  border: 1px solid var(--edge);
  background: var(--surface);
  border-radius: 6px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--ink);
  padding: 2px 2px 8px;
  resize: vertical;
  outline: none;
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.45;
}

.input::placeholder { color: var(--ink-soft); }

.input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--rule);
  padding-top: 10px;
}

.toggle {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: var(--ink-muted);
  font-size: 11px;
  user-select: none;
  font-family: var(--sans);
}

.toggle input[type="checkbox"] { accent-color: var(--accent); }

.send {
  border: none;
  background: var(--ink);
  color: var(--bg);
  border-radius: 4px;
  padding: 8px 16px;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.send:disabled { opacity: 0.4; cursor: not-allowed; }

.meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--rule);
}

.pill {
  border: 1px solid var(--rule);
  background: var(--surface);
  color: var(--ink-muted);
  padding: 2px 8px;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 10px;
}

.pill.bad {
  border-color: var(--warn);
  background: var(--warn-soft);
  color: var(--warn);
}
```

- [ ] **Step 2: Update composer placeholder in `ui/index.html`**

Replace `placeholder="Ask a ChemMon reporting question..."` on the `<textarea id="input">` with:

```html
placeholder="Ask about reporting flags, business rules, FoodEx2..."
```

- [ ] **Step 3: Change citations pill to count in `ui/app.js`**

In `ui/app.js`, replace:

```js
  if (resp.citations && resp.citations.length) {
    meta.push({ text: `citations: ${resp.citations.join(", ")}` });
  }
```

with:

```js
  if (resp.citations && resp.citations.length) {
    meta.push({ text: `citations: ${resp.citations.length}` });
  }
```

- [ ] **Step 4: Verify**

Ask a question and Playwright-evaluate:
```js
() => Array.from(document.querySelectorAll('.msg.assistant:last-of-type .pill')).map(p => p.textContent)
```
Expected: contains `"citations: 2"` (or whatever count), not the joined page-name string.

- [ ] **Step 5: Commit**

```bash
git add ui/styles.css ui/index.html ui/app.js
git commit -m "Restyle composer, pills, and reduce citations pill to count"
```

---

## Task 6: Empty state

Replace the synthetic "Ready." assistant turn with a dedicated empty-state block that hides on first message.

**Files:**
- Modify: `ui/index.html` (add empty-state markup inside `.thread`)
- Modify: `ui/app.js:129-133` (remove synthetic "Ready." message; hide empty state on first message)
- Modify: `ui/styles.css` (empty-state styling)

- [ ] **Step 1: Add empty-state markup to `ui/index.html`**

Replace `<section id="thread" class="thread" aria-live="polite"></section>` with:

```html
<section id="thread" class="thread" aria-live="polite">
  <div id="empty-state" class="empty-state">
    <div class="empty-title">Ask a question</div>
    <div class="empty-sub">Examples: reporting flags, business rules, FoodEx2 coding.</div>
  </div>
</section>
```

- [ ] **Step 2: Append empty-state styles to `ui/styles.css`**

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: var(--ink-soft);
}

.empty-title {
  font-family: var(--serif);
  font-size: 18px;
  color: var(--ink);
  margin-bottom: 4px;
}

.empty-sub {
  font-family: var(--sans);
  font-size: 13px;
}

.empty-state.hidden { display: none; }
```

- [ ] **Step 3: Remove synthetic "Ready." turn and wire empty-state hiding in `ui/app.js`**

Delete the existing trailing block:

```js
addMessage(
  "assistant",
  "Ready. Ask a question about ChemMon reporting. This UI calls /api/wiki/ask.",
  null
);
```

Replace it with:

```js
const emptyState = document.getElementById("empty-state");

function hideEmptyState() {
  if (emptyState && !emptyState.classList.contains("hidden")) {
    emptyState.classList.add("hidden");
  }
}
```

Then inside the existing `form.addEventListener("submit", ...)` callback, right after `input.value = "";`, add:

```js
  hideEmptyState();
```

- [ ] **Step 4: Verify**

Hard-reload http://localhost:8080. Playwright-evaluate before asking anything:
```js
() => {
  const es = document.getElementById('empty-state');
  return {
    visible: !es.classList.contains('hidden'),
    text: es.textContent.trim(),
    msgs: document.querySelectorAll('.msg').length,
  };
}
```
Expected: `{ visible: true, text contains "Ask a question", msgs: 0 }`.

Submit a question, then re-evaluate: `visible: false`, `msgs: 2` (user + assistant).

- [ ] **Step 5: Commit**

```bash
git add ui/index.html ui/styles.css ui/app.js
git commit -m "Replace synthetic greeting with empty-state block"
```

---

## Task 7: Loading placeholder turn (with reduced-motion)

Between submit and response, show a placeholder assistant turn with an animated three-dot wave.

**Files:**
- Modify: `ui/app.js`
- Modify: `ui/styles.css`

- [ ] **Step 1: Append loading-dot styles to `ui/styles.css`**

```css
.msg.assistant.loading .text {
  display: inline-flex;
  gap: 3px;
  font-size: 20px;
  line-height: 1;
  color: var(--ink-soft);
  padding-top: 2px;
}

.msg.assistant.loading .text span {
  display: inline-block;
  animation: dot-wave 1.2s ease-in-out infinite;
  opacity: 0.2;
}

.msg.assistant.loading .text span:nth-child(2) { animation-delay: 0.2s; }
.msg.assistant.loading .text span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-wave {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .msg.assistant.loading .text span {
    animation: none;
    opacity: 0.6;
  }
}
```

- [ ] **Step 2: Add helpers + wire them into submit in `ui/app.js`**

Add these helpers above the `form.addEventListener(...)` block:

```js
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
```

Then update the submit handler to use them. Replace the current submit body:

```js
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  input.value = "";

  hideEmptyState();
  addMessage("user", q);

  sendBtn.disabled = true;
  const loadingMsg = addLoadingTurn();
  try {
    const resp = await askWiki(q);
    removeLoadingTurn(loadingMsg);
    addMessage("assistant", resp.answer || "(empty)", summarizeMeta(resp));
  } catch (err) {
    removeLoadingTurn(loadingMsg);
    addMessage("assistant", String(err), [{ text: "error", bad: true }]);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});
```

- [ ] **Step 3: Verify loading turn appears then disappears**

Stop the running API (`kill $(pgrep -f "uvicorn wiki_api")`) so the call will fail slowly, then submit a question and Playwright-evaluate mid-request:
```js
() => ({
  loadingCount: document.querySelectorAll('.msg.assistant.loading').length,
  dotCount: document.querySelectorAll('.msg.assistant.loading .text span').length,
})
```
Expected during request: `{ loadingCount: 1, dotCount: 3 }`.

Restart the API. Submit again, wait for response, evaluate: `loadingCount: 0`.

- [ ] **Step 4: Commit**

```bash
git add ui/styles.css ui/app.js
git commit -m "Add loading placeholder turn with waving dot animation"
```

---

## Task 8: Citation chips (render only, no drawer yet)

Render chips from `response.citations[]` inside the assistant turn, between the answer and the meta pills. Click handler just logs for now — drawer wiring lands in Task 10.

**Files:**
- Modify: `ui/app.js`
- Modify: `ui/styles.css`

- [ ] **Step 1: Append chip styles to `ui/styles.css`**

```css
.citations {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.citation-chip {
  border: 1px solid var(--edge);
  background: var(--surface);
  color: var(--ink-muted);
  font-family: var(--mono);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.citation-chip:hover,
.citation-chip:focus-visible {
  background: var(--accent-soft);
}

.citation-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.citation-chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}
```

- [ ] **Step 2: Refactor message rendering to carry `resp` data in `ui/app.js`**

Replace the current `addMessage(role, text, meta)` definition with:

```js
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
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "citation-chip";
    chip.textContent = name;
    chip.setAttribute("aria-label", `Open source: ${name}`);
    chip.dataset.pageName = name;
    chip.addEventListener("click", () => {
      console.log("citation clicked:", name, resp.pages);
    });
    wrap.appendChild(chip);
  }
  return wrap;
}
```

- [ ] **Step 3: Update the submit handler to pass `resp` to `addMessage`**

In the submit handler (inside `try { ... }`), replace:

```js
    addMessage("assistant", resp.answer || "(empty)", summarizeMeta(resp));
```

with:

```js
    addMessage("assistant", resp.answer || "(empty)", summarizeMeta(resp), resp);
```

- [ ] **Step 4: Verify chips render**

Ask a question. Playwright-evaluate:
```js
() => {
  const chips = Array.from(document.querySelectorAll('.msg.assistant:last-of-type .citation-chip'));
  return {
    count: chips.length,
    names: chips.map(c => c.textContent),
    tag: chips[0]?.tagName,
  };
}
```
Expected: `count >= 1`, `tag: "BUTTON"`, names look like page filenames ending in `.md`.

- [ ] **Step 5: Commit**

```bash
git add ui/styles.css ui/app.js
git commit -m "Render citation chips below each assistant answer"
```

---

## Task 9: Drawer container + base CSS

Add the drawer DOM structure (empty / hidden) and desktop styles. No open behaviour yet.

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/styles.css`

- [ ] **Step 1: Add drawer markup inside `<main class="wrap">` in `ui/index.html`**

Add this as the **last child** of `<main class="wrap">`, after the `</form>`:

```html
<aside id="drawer" class="drawer" role="dialog" aria-labelledby="drawer-title" aria-hidden="true">
  <div class="drawer-head">
    <div>
      <div class="drawer-label">Source</div>
      <div id="drawer-page" class="drawer-page"></div>
    </div>
    <button id="drawer-close" class="drawer-close" type="button" aria-label="Close source drawer">&times; close</button>
  </div>
  <div class="drawer-body">
    <h2 id="drawer-title" class="drawer-title"></h2>
    <div id="drawer-summary" class="drawer-summary"></div>
    <div id="drawer-content" class="drawer-content"></div>
    <div class="drawer-related-wrap">
      <div class="drawer-related-label">Related</div>
      <div id="drawer-related" class="drawer-related"></div>
    </div>
  </div>
</aside>
```

- [ ] **Step 2: Update the outer layout to accommodate the drawer**

Replace the `.wrap` rule in `ui/styles.css` with:

```css
.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 40px 40px;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 22px;
  position: relative;
}

body.drawer-open .wrap { max-width: none; margin: 0; padding-right: 480px; }
body.drawer-open .wrap > .header,
body.drawer-open .wrap > .thread,
body.drawer-open .wrap > .composer { max-width: 720px; margin-left: auto; margin-right: auto; width: 100%; }

@media (max-width: 800px) {
  .wrap { padding: 20px; gap: 18px; }
  body.drawer-open .wrap { padding: 20px; }
}
```

- [ ] **Step 3: Append drawer styles to `ui/styles.css`**

```css
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 440px;
  height: 100vh;
  background: var(--surface);
  border-left: 1px solid var(--rule);
  padding: 0;
  overflow-y: auto;
  transform: translateX(100%);
  transition: transform 160ms ease;
  z-index: 10;
}

.drawer[aria-hidden="false"] {
  transform: translateX(0);
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 20px 28px 14px;
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.drawer-label {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.drawer-page {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink);
  margin-top: 2px;
}

.drawer-close {
  font-family: var(--sans);
  font-size: 13px;
  color: var(--ink-soft);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.drawer-close:hover,
.drawer-close:focus-visible { color: var(--ink); }
.drawer-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.drawer-body { padding: 16px 28px 40px; }

.drawer-title {
  font-family: var(--serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px;
}

.drawer-summary {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--ink-soft);
  margin-bottom: 16px;
}

.drawer-content {
  font-family: var(--serif);
  font-size: 13px;
  color: var(--ink);
  line-height: 1.65;
}
.drawer-content h1, .drawer-content h2, .drawer-content h3 { font-family: inherit; }
.drawer-content h2 { font-size: 1.15em; font-weight: 600; margin-top: 1.2em; }
.drawer-content h3 { font-size: 1.05em; font-weight: 600; margin-top: 1em; }
.drawer-content code { font-family: var(--mono); font-size: 0.9em; background: var(--accent-soft); padding: 0.5px 4px; border-radius: 3px; }
.drawer-content pre { background: #f5f1ea; border: 1px solid var(--rule); border-radius: 4px; padding: 10px; overflow-x: auto; }
.drawer-content pre code { background: transparent; padding: 0; }
.drawer-content a { color: var(--accent); text-decoration: underline; }
.drawer-content ul, .drawer-content ol { padding-left: 20px; }

.drawer-related-wrap { margin-top: 24px; }
.drawer-related-label {
  font-family: var(--sans);
  font-size: 10px;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
}

.drawer-related {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.drawer-related .related-chip {
  border: 1px solid var(--edge);
  color: var(--ink-muted);
  padding: 2px 6px;
  font-family: var(--mono);
  font-size: 10px;
  border-radius: 3px;
  background: var(--bg);
}
```

- [ ] **Step 4: Verify drawer exists but is hidden**

Reload. Playwright-evaluate:
```js
() => {
  const d = document.getElementById('drawer');
  return {
    exists: !!d,
    hidden: d.getAttribute('aria-hidden'),
    transform: getComputedStyle(d).transform,
  };
}
```
Expected: `exists: true`, `hidden: "true"`, `transform` is a translateX matrix pushing it off-screen.

- [ ] **Step 5: Commit**

```bash
git add ui/index.html ui/styles.css
git commit -m "Add source drawer container and desktop styling"
```

---

## Task 10: Drawer open/close + content rendering + keyboard

Wire citation chips to open the drawer, populate it from `resp.pages[]`, and handle close (click chip again, × button, Esc key).

**Files:**
- Modify: `ui/app.js`

- [ ] **Step 1: Add drawer state + helpers above `form.addEventListener(...)` in `ui/app.js`**

```js
const drawerEl = document.getElementById("drawer");
const drawerTitle = document.getElementById("drawer-title");
const drawerSummary = document.getElementById("drawer-summary");
const drawerContent = document.getElementById("drawer-content");
const drawerRelated = document.getElementById("drawer-related");
const drawerPageEl = document.getElementById("drawer-page");
const drawerCloseBtn = document.getElementById("drawer-close");

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
```

- [ ] **Step 2: Replace the chip click handler inside `renderCitationChips`**

Find this block inside `renderCitationChips(resp)`:

```js
    chip.addEventListener("click", () => {
      console.log("citation clicked:", name, resp.pages);
    });
```

Replace with:

```js
    chip.addEventListener("click", () => {
      if (activeChip === chip) {
        closeDrawer();
      } else {
        openDrawer(chip, resp, name);
      }
    });
```

- [ ] **Step 3: Verify open / close / toggle**

Ask a question, then Playwright:

1. Click a citation chip. Evaluate:
```js
() => ({
  hidden: document.getElementById('drawer').getAttribute('aria-hidden'),
  title: document.getElementById('drawer-title').textContent,
  activeChip: document.querySelector('.citation-chip.active')?.textContent,
  hasRelated: document.querySelectorAll('.related-chip').length,
})
```
Expected: `hidden: "false"`, `title` is the page's real title, `activeChip` matches the clicked chip text, `hasRelated >= 0`.

2. Press `Escape`. Evaluate again: `hidden: "true"`, `activeChip: undefined`.

3. Click the same chip twice: first opens, second closes.

- [ ] **Step 4: Commit**

```bash
git add ui/app.js
git commit -m "Wire citation chips to open source drawer with page content"
```

---

## Task 11: Responsive mobile overlay + reduced-motion

Drawer becomes a full-screen overlay on viewports under 960px, and all drawer/loading transitions are disabled under `prefers-reduced-motion`.

**Files:**
- Modify: `ui/styles.css`

- [ ] **Step 1: Append responsive + reduced-motion rules to `ui/styles.css`**

```css
@media (max-width: 960px) {
  body.drawer-open .wrap { padding-right: 40px; }
  body.drawer-open .wrap > .header,
  body.drawer-open .wrap > .thread,
  body.drawer-open .wrap > .composer { max-width: 720px; }

  .drawer {
    width: 100%;
    border-left: none;
  }

  body.drawer-open { overflow: hidden; }
}

@media (max-width: 800px) {
  body.drawer-open .wrap { padding: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .drawer { transition: none; }
}
```

- [ ] **Step 2: Verify narrow-viewport behaviour**

Use Playwright to resize the browser to 720x900, then open the drawer:
```js
() => {
  const d = document.getElementById('drawer');
  const r = d.getBoundingClientRect();
  return { width: Math.round(r.width), viewport: window.innerWidth };
}
```
Expected: `width` equals `viewport` (full-screen takeover).

Restore to 1280x800, open the drawer, evaluate again. Expected: `width: 440`.

- [ ] **Step 3: Commit**

```bash
git add ui/styles.css
git commit -m "Make drawer full-screen on narrow viewports; honor reduced motion"
```

---

## Task 12: Acceptance-criteria verification pass

Walk through each acceptance criterion from the spec in a browser. Fix anything that breaks.

**Files:** None (verification only — any fixes get their own commits)

- [ ] **Step 1: Full happy-path walk**

With API running at 8005, UI served at 8080, open http://localhost:8080 and verify each criterion from the spec:

1. **Editorial styling applied.** Snapshot: warm bg, serif body text, 720px column.
2. **Citation chips present.** Ask a real question; chips row sits between answer and meta pills.
3. **All four meta pills shown under dashed divider:** `pages_used`, `tokens`, `cost`, `citations`.
4. **Chip opens drawer** with title, summary, markdown-rendered content, related chips (related chips inert).
5. **Dismissal works** via re-click, close button, and Esc.
6. **Keyboard-only path:** Tab → focus visible on chip → Enter → drawer opens → focus on close button → Esc → focus back on chip.
7. **Mobile:** at 720x900, drawer is full-screen.
8. **Error path:** stop API, ask a question; see the error as a red-bordered pill, no UI regression.

- [ ] **Step 2: Note any issues, fix them in separate commits**

For each failure, write a small commit: `fix: <specific issue>`.

- [ ] **Step 3: Push the branch**

Once all criteria pass:
```bash
git push -u origin feat/ui-design-refresh
```

- [ ] **Step 4: Open a PR**

```bash
gh pr create --title "UI design refresh: editorial look with citation drawer" --body "$(cat <<'EOF'
## Summary
- Replaces the dark glassmorphic chat with an editorial/regulatory visual system (warm off-white, serif reading type, teal accent).
- Adds citation chips under each assistant answer, sourced from `response.citations[]`.
- Adds a right-side source drawer that renders full page content from `response.pages[]` — no extra API calls.
- Preserves the four meta pills (`pages_used`, `tokens`, `cost`, `citations`) under a dashed divider.
- Spec: `docs/superpowers/specs/2026-04-15-ui-design-refresh.md`.

## Test plan
- [ ] Ask a question; verify editorial styling, chips, pills.
- [ ] Click each chip; verify drawer content + related chips.
- [ ] Close via ×, Esc, and re-click; verify focus returns to the chip.
- [ ] Resize to narrow viewport; verify drawer overlays full-screen.
- [ ] Stop the API; verify the error pill shows and the UI doesn't regress.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** Each acceptance criterion has a task. Visual system → Tasks 2-5. Citation chips → Task 8. Drawer (desktop + mobile + keyboard) → Tasks 9-11. Meta pills preserved + count change → Task 5. Empty state → Task 6. Loading → Task 7. Error path verified in Task 12.
- **Types and names consistent:** `addMessage(role, text, meta, resp)` signature used consistently from Task 8 onward. `renderCitationChips(resp)` same between Tasks 8 and 10. `openDrawer(chip, resp, pageName)` and `closeDrawer()` used consistently. Ids match between HTML (Task 9) and JS (Task 10): `drawer`, `drawer-title`, `drawer-summary`, `drawer-content`, `drawer-related`, `drawer-page`, `drawer-close`, `empty-state`.
- **No placeholders:** All steps contain literal file paths, literal code, and literal verification commands.
- **Known trade-offs:** Drawer related chips are inert (no navigation between drawer pages) — intentional YAGNI per spec. Body class `drawer-open` is used instead of JS-driven layout math, so CSS owns the responsive logic.
