# UI Design Refresh — ChemMon Wiki Chat

Status: draft
Date: 2026-04-15
Scope: `ui/` only. No backend changes.

## Goals

1. Make the chat feel like a **regulatory reference document**, not a generic AI product. The subject matter is EFSA guidance; the UI should echo that.
2. Add **citation chips + a source drawer** so users can inspect the pages an answer is drawn from.
3. Serve two audiences simultaneously: internal ChemMon practitioners (dense, precise) and external visitors (approachable, legible).
4. Preserve every diagnostic that's currently useful — specifically the four meta pills: `pages_used`, `tokens`, `cost`, `citations`.

## In scope

- New visual system (editorial/regulatory direction): palette, typography, spacing, radii.
- Message layout: separate treatment for user turns vs assistant turns.
- Citation chips under each assistant answer, rendered from `response.citations[]`.
- Right-side **source drawer** that opens when a chip is clicked. Content comes from `response.pages[]` which already ships in the `/wiki/ask` payload (no extra API call).
- Composer restyle and empty-state treatment.
- Basic keyboard + screen-reader affordances on the new drawer.

## Out of scope (explicitly not doing)

- Streaming responses. Requires a backend SSE endpoint in `Chemmon_Wiki`; tracked separately.
- Chat-history sidebar, multi-turn threading, page browser.
- Dark-mode parity. The editorial mood is paper-based; a dark variant would be a separate design exercise.
- Authentication, telemetry, any data persistence beyond the current in-memory thread.
- Web-font loading. We use a system serif stack (see Typography).

## Visual system

### Palette

All colors below are targets. Exact hex values may adjust slightly during implementation if contrast requires.

| Token            | Value       | Use                                             |
| ---------------- | ----------- | ----------------------------------------------- |
| `--bg`           | `#fafaf7`   | Page background (warm off-white, not pure white)|
| `--surface`      | `#ffffff`   | Drawer, composer, inline cards                  |
| `--ink`          | `#1c1917`   | Primary text                                    |
| `--ink-muted`    | `#57534e`   | Secondary text                                  |
| `--ink-soft`     | `#78716c`   | Labels, metadata                                |
| `--rule`         | `#e7e5e0`   | Dividers                                        |
| `--edge`         | `#d6d3d0`   | Input borders, chip borders                     |
| `--accent`       | `#0f766e`   | Teal — interactive, assistant role              |
| `--accent-soft`  | `rgba(15,118,110,0.06)` | Chip fill (active), focus ring tint |
| `--warn`         | `#b45309`   | Error / bad-state chip border                   |

No radial gradients. No glassmorphism.

### Typography

System stacks only. No web-font loading.

- Serif (reading type): `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif`
- Sans (UI chrome): `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- Mono (page names, metrics): `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

Rules:

- Assistant answer body → serif, 15px, line-height 1.65.
- User question → serif, 16px, line-height 1.5 (slightly larger so turns feel like headings).
- Page title in drawer → serif, 19px, weight 600.
- All labels, buttons, meta pills, chips → sans or mono.
- Do **not** apply serif to code blocks or inline `<code>` — those keep mono.

### Spacing & radii

- Content column max-width: **720px** centered, 40px horizontal padding on desktop, 20px when viewport < 800px.
- Vertical rhythm between messages: 28px.
- Radii: **4–6px** everywhere (chips, composer, drawer). No pill-shaped buttons; meta pills keep 999px because that's what "pill" means and it visually separates them from the square citation chips.

## Layout

Single-page, no sidebar. Grid:

```
┌────────────────────────────────────────────┬────────── drawer ──────────┐
│ header (title + subtitle)                  │ (hidden unless open)       │
├────────────────────────────────────────────┤                            │
│ thread                                     │ source panel               │
│  ├─ user turn                              │  title / summary           │
│  └─ assistant turn                         │  full page content         │
│      ├─ answer (markdown)                  │  related links             │
│      ├─ citation chips                     │                            │
│      └─ meta pills (below dashed rule)     │                            │
├────────────────────────────────────────────┤                            │
│ composer                                   │                            │
└────────────────────────────────────────────┴────────────────────────────┘
```

Wide viewport (≥960px): drawer is a 440px column pushed in from the right. When open, main column shrinks (the 720px max-width only caps expansion; it shrinks below that freely). When closed, drawer not rendered.

Narrow viewport (<960px): drawer becomes a full-screen overlay above the thread with a close button. Background scroll locked while open.

## Components

### Header

- Title "ChemMon Wiki" in serif, 26px, weight 600.
- Subtitle in sans 12px muted: "A reference on EFSA chemical monitoring reporting — ask anything."
- 1px bottom rule (`--rule`).

### Thread

Messages are structural rather than card-shaped. A turn is a labeled block:

- **Role label**: sans, 10px, uppercase, tracked +0.1em, muted color (`--ink-soft` for "You", `--accent` for "Wiki").
- **Body**: serif paragraph styling for the message text.
- No enclosing card, no fill, no border. Separation comes from whitespace + the dashed rule above meta pills.

Markdown rendering uses the already-landed `marked` + `DOMPurify` (DOM-fragment mode).

### Citation chips

Rendered immediately below each assistant turn's answer, from `response.citations[]`:

- Square-corner chip, 3px radius, mono font, 11px.
- Default: `--edge` border, white fill, `--ink-muted` text.
- When its corresponding drawer is open: `--accent` border, `--accent-soft` fill, `--accent` text.
- Hover/focus: background shifts to `--accent-soft`; border and text colors unchanged. Focus ring: 2px `--accent` outline offset 2px.
- Keyboard: chips are buttons — `Enter` or `Space` activates.
- Clicking a chip opens the drawer to that page. Clicking the already-open page's chip closes the drawer.

### Meta pills (preserved)

Under the citation chips, separated by a **1px dashed `--rule`** with 10px top padding:

- 999px radius (intentional — these are diagnostic, not primary content).
- 10px mono, `--ink-muted`, white fill, `--rule` border.
- Same set, same data, same order as today: `pages_used`, `tokens`, `cost`, `citations`. `citations` now shows count, not the comma-joined list (the chips replace that).

### Composer

- Container: `--surface`, `--edge` border, 6px radius, 12px padding.
- Textarea: no visible border inside the container. Placeholder: "Ask about reporting flags, business rules, FoodEx2…"
- Footer row: Graph-expansion toggle (sans 11px, custom teal checkbox) on the left; Send button on the right.
- Send button: dark ink fill (`--ink`), off-white text, 4px radius, sans 12px weight 600. Disabled state: 40% opacity.
- On `Cmd/Ctrl+Enter`, submit.

### Source drawer

- Opens when a citation chip is clicked. Sourced from `response.pages[]` — find the entry whose `page_name` matches the chip.
- Content:
  - Top bar: "SOURCE" label + mono `page_name` on the left; `× close` on the right.
  - Serif `title`.
  - Sans `summary`.
  - `content` rendered as markdown via the existing pipeline.
  - Footer: "Related" with each item from `pages[i].related` as a square chip. These are inert for v1 (no navigation between drawer pages — YAGNI).
- Close: click `×`, press `Esc`, or click the currently-active citation chip again.
- Focus is moved to the drawer close button on open; returned to the chip on close.

## Interactions & states

### Empty state (no messages yet)

Currently the app injects a synthetic "Ready." assistant message. Replace with a quieter empty state:

- Centered in the thread area: serif 18px "Ask a question" above sans 13px muted "Examples: reporting flags, business rules, FoodEx2 coding."
- No fake assistant turn.

### Loading (question in flight)

- Send button disabled + shows "…" instead of "Send".
- Composer textarea stays editable but unsubmittable.
- Below the user turn just sent, render a placeholder assistant turn with the "Wiki" label and an animated three-dot indicator: three `•` characters in `--ink-soft`, each fading 0.2→1.0→0.2 opacity in a 1.2s loop, staggered by 0.2s so they wave. Replace the placeholder in place when the response arrives. `prefers-reduced-motion: reduce` → static "…" instead of animation.
- No streaming — the dots persist until the full response lands.

### Error

Reuse the existing error-pill pattern but with the new palette: `--warn` border, warm-red-tinted background, `--ink` text. Error message goes inside the assistant-turn body as before.

### Drawer open/close

- Open: 160ms slide-in on desktop; fade+scale on mobile overlay. `prefers-reduced-motion: reduce` disables animation.
- Close: mirror of open.

## Accessibility

- Chips are `<button>` elements with accessible names like "Open source: chemmon-overview.md".
- Drawer has `role="dialog"` and `aria-labelledby` pointing to the page title.
- Focus trap inside the drawer while open; `Esc` closes.
- Contrast: all text on `--bg` / `--surface` meets WCAG AA.
- `prefers-reduced-motion`: remove transitions, keep state changes instantaneous.

## Implementation approach

Three files change; no new dependencies beyond what's already loaded.

- `ui/styles.css` — rewritten. Current file is ~180 lines of dark-theme tokens; replace with the editorial system above.
- `ui/index.html` — small changes: new subtitle copy, add a drawer container element at the end of `<main>` (hidden by default), update the composer placeholder.
- `ui/app.js` — moderate changes:
  - Render citation chips from `resp.citations[]` inside the assistant message block.
  - Store the current `resp.pages[]` on the message element so the drawer can pull page data.
  - Add open/close drawer logic (focus management, Esc key, reduced-motion check, active-chip state).
  - Replace the "Ready." synthetic assistant turn with the new empty-state markup.
  - Add loading placeholder turn + swap-in on response.

No build step. `marked` and `DOMPurify` already load from CDN (landed in the previous PR).

## Acceptance criteria

A reviewer can open http://localhost:8080, ask a question, and see:

1. Answer rendered with editorial styling (serif body, 720px column, warm off-white background).
2. A row of square citation chips immediately below the answer, one per entry in `response.citations`.
3. All four meta pills under a dashed divider, showing live values.
4. Clicking a chip opens a right-side drawer with the page's title, summary, and full markdown content; Related chips render at the bottom but don't navigate.
5. Clicking the same chip again, `Esc`, or the close control dismisses the drawer.
6. Keyboard-only operation works: Tab into chip → Enter → drawer opens → focus inside → Esc → focus back on chip.
7. On a viewport <720px, the drawer takes over the screen instead of sitting beside the thread.
8. No visual regressions in the error path.
