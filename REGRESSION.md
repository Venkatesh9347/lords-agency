# LORDS AGENCY — Production Regression Record

Final pre-release audit. Everything below was measured, not assumed.

- **Baseline checkpoint:** `63689e38` (`chore(frontend): connect production enquiry worker`)
- **Branch:** `frontend-v3` (no upstream configured; nothing has ever been pushed)
- **Stack:** static HTML + CSS + vanilla JS. Zero dependencies, no build step, no CDN.
- **Enquiry path:** browser → Cloudflare Worker → Formspree → company inbox

---

## 1. Release gate

| Gate | Result |
|---|---|
| Clean Git state | PASS — 4 logical commits, tree clean |
| No secrets in frontend | PASS — 13-pattern scan clean |
| No external dependencies | PASS — 0 external requests |
| Responsive pass | PASS — 9 widths, 0 horizontal overflow |
| Accessibility pass | PASS — 1 h1, 0 heading skips, 0 broken anchors |
| Reduced-motion pass | PASS |
| Forced-colors pass | PASS |
| Print pass | PASS |
| SEO pass | PASS |
| Performance budget | PASS — 3 requests, 158.7 KB, CLS 0 |
| Worker tests | PASS — 57/57 |
| Worker endpoint unchanged | PASS |
| Enquiry end-to-end | PASS — HTTP 201, reference issued |
| Gmail delivery | **NOT VERIFIED** — see §9 |
| Byet cache behaviour | **LIMITATION** — see §10 |

---

## 2. Performance

| Metric | Budget | Measured |
|---|---|---|
| Requests | ≤ 6 | **3** (`/`, `css/styles.css`, `js/main.js`) |
| External requests | 0 | **0** |
| Transfer | < 400 KB | **158.7 KB** |
| CLS | 0 | **0** at 320/390/430/768/834/1024/1280/1440/1920 |
| DOM nodes | — | 756 |
| DOMContentLoaded | — | 97 ms |
| load | — | 99 ms |
| Console errors | 0 | **0** |
| Failed requests | 0 | **0** |

CLS is measured with a `PerformanceObserver` installed via `addInitScript` before any
page script runs, with real paint frames forced between samples. The earlier
figure of `0.3861` at 390 px was a genuine regression and is described in §11.

---

## 3. Responsive

Widths tested: **320, 390, 430, 768, 834, 1024, 1280, 1440, 1920**.

- Horizontal overflow: **0** at every width
- 21 service cards present at every width
- Menu toggle visible < 960 px; inline nav ≥ 960 px
- Nav toggle is a 44×44 px touch target at every mobile width
- Header CTA shortens to "Start" below 400 px via a hidden span, so it is never
  announced twice; the full "Start a Project" label returns at 430 px
- 320 px: brand, CTA and menu button all fully on screen with 15 px slack

---

## 4. Accessibility

- Single `<h1>`; **0** heading-level skips across all 65 headings
- Skip link is the first tab stop; `<main>` is focusable (`tabindex="-1"`)
- All 10 sampled tab stops render a 3 px focus outline
- Form: 12 controls, 11 labels, 8 required. The only unlabelled control is the
  honeypot, which is `aria-hidden="true"` and `tabindex="-1"` and so is
  deliberately outside the accessibility tree
- Filter results announced through `role="status" aria-live="polite"`
- Form error uses `role="alert"`; success uses `role="status"`
- `aria-invalid` set on the failing control, linked via `aria-describedby`,
  and focus moved to it
- 0 broken in-page anchors
- Contrast: verified differentially against the previous build — **no
  regression**. Note that 34 of 365 text nodes sit on gradient backgrounds
  which computed-style analysis cannot resolve; an absolute claim would need
  pixel sampling.

### Reduced motion (`prefers-reduced-motion: reduce`)

Every reveal lands visible, all 21 service cards render, h1/hero-point
animations off, marquee becomes a static centred wrapping list, magnetic
offset pinned to rest, mock clip-path removed, work section falls back to a
static stacked grid, progress bar hidden.

### Forced colors (Windows High Contrast)

Body/background/foreground and all component borders take system colours,
grain and pointer glow removed, marquee text mapped to `CanvasText`, and
focus is **strengthened** to `3px solid Highlight` — never removed.

### Print

White background, black text at 11 pt, header/nav/toggle hidden, decorative
glow and grain removed, both illustrative diagrams removed, all 21 service
cards print at full opacity with `#999` borders and no shadows, the sticky
work showcase is released to static flow, `http` links gain their URL in
print, and all 16 sections plus the form remain.

---

## 5. Enquiry form

| Behaviour | Result |
|---|---|
| Empty submit | blocked client-side, `aria-invalid` set, **0 requests** |
| Invalid email | correct message, `aria-invalid`, focus moved, **0 requests** |
| Description under 30 chars | blocked, **0 requests** |
| Honeypot filled | silent success, **0 requests** (bot trapped, nothing sent) |
| Four rapid submits | exactly **1** request; button disabled, "Sending…", `aria-busy` |
| API unreachable | correct message, "Use email instead" offered, no false success, button restored |
| Network failure fallback | mailto path preserved with its length guard |

The API base URL, request fields and response handling (201 / 422 / 429 +
`Retry-After` / network failure / mailto) are unchanged.

---

## 6. Security scan

Clean across `index.html`, `js/main.js`, `css/styles.css`, `favicon.svg`,
`robots.txt`, `sitemap.xml`:

Resend keys, Formspree endpoints, `api_key`, `Authorization`, bearer tokens,
Google API keys, private keys, AWS keys, Stripe keys, generic password
assignments, Cloudflare tokens, long base64 secrets — **all clean**.

The only external URLs present are the public Worker base URL, the canonical
domain, `wa.me` contact links, the `schema.org` JSON-LD context, the sitemap
namespace and the SVG namespace inside a data URI. No `eval`, no
`new Function`, no `innerHTML`, no `document.write`, no inline `on*` handlers.

The Worker remains the security boundary: a request from a disallowed origin
is refused with `403` **before** the relay runs, so no mail is sent.

---

## 7. SEO

Title 49 chars, meta description 154 chars, canonical, complete Open Graph set
(title/description/image/url/type/image dimensions/alt), Twitter summary
card, theme colour corrected to the real page background `#0b0d10`, one
`h1`, one JSON-LD Organization block, `lang="en"`, viewport meta, `robots.txt`
allowing all with sitemap reference, and `sitemap.xml` with the canonical URL.

---

## 8. Worker

- `npm test` → **57 / 57 pass**, 0 fail
- `npm run typecheck` → clean
- `npm run allowlist:check` → allowlist matches the frontend select options
- `npm run smoke` → **90 passed, 0 failed**
- Production endpoint unchanged: `https://lords-agency-enquiry.venkatesh99-info.workers.dev`
- CORS: allowed origin → `204` with correct `Access-Control-Allow-Origin`;
  any other origin → `403` with no ACAO header
- `GET` → `405`; unknown path → `404`

---

## 9. End-to-end enquiry test

One synthetic submission, sent with the production origin so the Worker
accepts it:

```
POST https://lords-agency-enquiry.venkatesh99-info.workers.dev/api/enquiries
Origin: https://lordsagency.alc.onl

project_type   Custom Software Development
name           LORDS AGENCY TEST
email          pipeline.test@gmail.com
phone          +919999999999
company        LORDS AGENCY TEST
country        India
description    FINAL PRODUCTION PIPELINE TEST. (synthetic)
```

Response: **`201 Created`** in 594 ms

```json
{ "reference_code": "LORDS-DDS68MYM", "message": "Your enquiry has been accepted." }
```

The Worker only returns `201` when Formspree returns HTTP 200 **and** a JSON
body **and** `ok === true`, so browser → Worker → Formspree acceptance is
proven.

**Gmail delivery is NOT verified.** Confirming the message actually arrived in
the company inbox requires access to that mailbox, which this audit does not
have. Please check for reference `LORDS-DDS68MYM` before release.

Note: a submission cannot be driven from a `localhost` preview, because the
Worker correctly rejects any origin other than the production domain. A true
in-browser end-to-end run is only possible once this build is deployed to
`lordsagency.alc.onl`.

---

## 10. Byet / ALC hosting cache — unresolved limitation

Investigated rather than assumed. Findings:

1. Non-JavaScript clients receive an AES bot-challenge page (846–863 bytes)
   that sets a `__test` cookie and reloads. Real browsers pass through
   normally. The `Cache-Control: no-cache` on that response belongs to the
   **challenge**, not to the site.
2. Clients that pass the challenge receive the real `index.html` with:

   ```
   Cache-Control: max-age=2592000, public, proxy-revalidate
   ```

   That is a **30-day fresh cache on HTML**, and unlike the CSS/JS responses it
   does **not** include `must-revalidate`.
3. The header is emitted by `openresty` at the host. There is no repository
   lever: no DNS or nameserver control, `.htaccess` is not read by nginx, and
   the free plan exposes no cache configuration.
4. Asset cache-busting (`?v=`) does not help, because a visitor holding stale
   HTML is also holding the asset URLs that stale HTML references.
5. A service worker could override it, but that trades a 30-day staleness
   window for permanent cache-busting discipline and real risk of serving
   stale content. That is a disproportionate workaround and was deliberately
   **not** shipped.

**Conclusion: this cannot be fixed from the repository. It needs a host-side
change** — `no-cache` (or `max-age=0, must-revalidate`) for `*.html`, with long
`max-age` retained for CSS/JS/images only if those filenames are versioned.

**Release risk:** the currently deployed build predates the Worker integration,
so returning visitors may continue to see the old page for up to 30 days after
a release. Verify with a hard refresh, and consider announcing the change
through channels other than the homepage.

---

## 11. Defects found and fixed during this audit

| Defect | Severity | Fix |
|---|---|---|
| Mobile menu invisible — entrance keyframes on an element toggling from `display: none` stayed pending at 0% (opacity 0) | **High** | Transition-driven, non-load-bearing animation; `visibility` instead of `display` keeps the closed panel inert and out of the tab order |
| CLS 0.3861 at 390 px — collapsed panel gated behind `.js`, so the header jumped height when the class landed | **High** | Collapsed panel is now the default; `<noscript>` restores the inline list |
| Nav toggle appeared only after `.js`, shifting brand and CTA | Medium | Toggle laid out from first paint; hidden ≥ 960 px and by `<noscript>` on mobile |
| 320 px: menu button clipped by `overflow-x: clip`, partly unreachable | Medium | Header scale + short CTA label below 400 px |
| Closed menu links stayed tabbable for 220 ms while invisible | Medium | `visibility` no longer transitioned; hide is instant |
| `theme-color` was leftover navy `#0a1628` on a near-black site | Low | Corrected to `#0b0d10` |
| `.mock-window` was a dead selector in `print` and `prefers-contrast` (real class is `.mock`) | Low | Corrected; the illustrative mock is now intentionally hidden in print and contrast-bordered under `prefers-contrast` |

---

## 12. Not changed, deliberately

- **Enquiry architecture, API contract, Worker, Formspree, KV, CORS,
  rate limiting** — untouched. The Worker is the security boundary.
- **System font stack.** A self-hosted display face was considered and
  rejected: a multi-file FOUT on a 3-request site for marginal gain, and the
  brief permits keeping the stack.
- **Work showcase scroll interaction.** Preserved; a second parallax layer
  would fight the horizontal scroll.
- **No fabricated content.** No invented clients, testimonials, metrics,
  awards or results. Illustrative visuals keep their "illustrative" labels.
- **Service worker for cache control.** Rejected as disproportionate risk.
