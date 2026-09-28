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

---

## 13. Cinematic eye-evolution intro - integration record

Added after the audit above. One-off opening sequence on first load, then the
page removes it entirely. Baseline for every figure below is the tree at the
start of this phase, not HEAD.

### 13.1 Files

| File | Change | Size |
|---|---|---|
| `index.html` | **+69 / −0 lines** (3 insertions, nothing rewritten) | 56,504 B |
| `css/cinematic-intro.css` | **added** | 7,936 B (~2.2 KB gzip) |
| `js/cinematic-intro.js` | **added** | 37,095 B (~10.4 KB gzip) |
| `css/styles.css` | **untouched**, SHA-256 `3C5CDAF5D1DEB75A` | - |
| `js/main.js` | **untouched**, SHA-256 `1ABA6E208828D763` | - |
| `favicon.svg`, `robots.txt`, `sitemap.xml`, `og-image.jpg` | **untouched** | - |

`index.html` is purely additive: one stylesheet link, one overlay block, one
script tag. No existing line was modified or removed.

### 13.2 Payload - no media assets at all

**Total cinematic image/video payload: 0 bytes.** The eye is drawn live with
Canvas 2D, so there is no frame ladder, no sprite sheet, no WebP set and no
video to download, decode or cache. This is better than the WebP-frame approach
the brief suggested: it costs no request, no decode, no cache entry, and the
composition is resolution-independent rather than fixed to a captured size.

| | Before | After |
|---|---|---|
| Requests | 3 | **5** (+2: one CSS, one JS) |
| External requests | 0 | **0** |
| Transfer | 158.7 KB | **233.0 KB** uncompressed on localhost |
| XHR / fetch during load | 0 | **0** (the intro issues no network call) |
| Console errors | 0 | **0** |
| Failed requests | 0 | **0** |
| DOM nodes | 756 | **789** while playing, back to 756 after teardown |
| DOMContentLoaded | 97 ms | 234 ms |
| CLS | 0 | **0** |

### 13.3 Sequence

9.0 s, 8 morphing eye stages (`eye-01` … `eye-final`), lock, **one** pulse,
camera push to full-frame, red energy + crows, LORDS AGENCY lockup, then the
hand-off. **No skip control of any kind** - the overlay contains 0
`button`/`a`/`input`/`tabindex` elements and the page text contains no skip
affordance. The only "Skip to content" string on the page is the pre-existing
production accessibility skip-link (`a.skip-link[href="#main"]`).

### 13.4 Hand-off - crimson into the production navy

The intro's last frames resolve to **`#0d1015`**, the top stop of the existing
`.hero` gradient, so the transition is continuous rather than a cut into a
different site. Measured centre-pixel of the terminal frames:

    8.70s rgb(183,25,49) -> 8.82s rgb(91,16,30) -> 8.90s rgb(19,15,20)
    -> 8.94s rgb(14,16,21) -> 8.98s rgb(13,16,21)  == #0d1015 exactly

An intermediate version capped that fill at 0.95, which left the frame centre
at Y=28 against the site's Y=16 - a faint flash at the moment of hand-off. Full
opacity removed it.

Three real CSS transitions do the crossfade (`css/cinematic-intro.css`):
overlay `opacity .9s ease`, lockup `opacity .35s ease`, page
`opacity .9s ease .35s`. The site is never replaced, re-parented or re-rendered.

### 13.5 Lifecycle, verified on a real load

| Step | Result |
|---|---|
| Overlay while playing | `position: fixed`, `inset: 0`, `z-index: 9999` (max elsewhere is 300) |
| Page while playing | `inert` on every top-level sibling of the overlay |
| Scroll while playing | suppressed and reset to 0 - no layout impact |
| On completion | `inert` released, `scrollTo` restored, overlay fades, then **removed from the DOM** |
| After teardown | `getElementById('cinematic-intro') === null`; no timer, listener, canvas or layer left |
| Failsafe | a hard timer guarantees the site returns even if a frame callback were ever lost |

Because the markup is removed, a replay on scroll, anchor navigation or resize
is structurally impossible - not merely suppressed.

### 13.6 Responsive - all 9 widths

Tested in same-origin iframes at the exact device box sizes (media queries
inside an iframe respond to the iframe, so this is a real viewport test).

| Width | Horizontal overflow | Cards | Nav | Intro completes | `inert` released |
|---|---|---|---|---|---|
| 320 | none | 21 | collapsed | yes | yes |
| 390 | none | 21 | collapsed | yes | yes |
| 430 | none | 21 | collapsed | yes | yes |
| 768 | none | 21 | collapsed | yes | yes |
| 834 | none | 21 | collapsed | yes | yes |
| 1024 | none | 21 | inline | yes | yes |
| 1280 | none | 21 | inline | yes | yes |
| 1440 | none | 21 | inline | yes | yes |
| 1920 | none | 21 | inline | yes | yes |

`documentElement.scrollWidth` is below `innerWidth` at every width. The one
element flagged as extending past the viewport at narrow widths is the
pre-existing off-screen `a.skip-link`, which is its normal hidden state and
predates this work.

Render resolution is DPR-capped at 2 with a hard ceiling of 4096×2304 backing
pixels, so an 8K or dense high-DPI display cannot allocate a canvas large
enough to pressure memory.

### 13.7 Reduced motion

`prefers-reduced-motion: reduce` skips the cinematic content entirely. Verified
by stubbing `matchMedia` before the deferred script boots: **the intro
completes in 0 ms**, no rAF loop is started, canvas and grain are
`display: none`, the lockup is `display: none`, and the site is immediately
interactive (CTA focusable, 21 cards, `inert` released). Well inside the 300 ms
budget. `forced-colors: active` and `print` also remove the overlay in CSS
alone, with no script involved.

### 13.8 Accessibility

| Check | Result |
|---|---|
| Decorative content | whole overlay `aria-hidden="true"`, canvas + grain hidden |
| `<h1>` count | 1 |
| Heading-level skips | 0 |
| `lang` | `en` |
| Focus rings / keyboard nav | unchanged - `:focus-visible` styles untouched, verified focusable after the intro |
| Accessibility trap | none - no focusable element inside the overlay, `inert` released on completion |
| Form | 12 inputs, labels and validation untouched |
| Focus rings removed? | **No** - `css/styles.css` was not modified at all |

### 13.9 Security

Clean across all 13 patterns over the 8 shipped files: no `eval`, no
`new Function`, no `innerHTML`/`outerHTML`, no `document.write`, no
`insertAdjacentHTML`, no inline `on*` handlers, no `javascript:` URLs, no
`data:` scripts, no `setTimeout("string")`, no `require`/`import`, no WebGL or
Three.js. Secret scan (API keys, private keys, bearer tokens, Stripe, AWS,
Google, Slack) clean. The only new external URL is the SVG XML namespace inside
the grain's inline `data:` URI - the same identifier `styles.css` already used,
and it is not fetched.

### 13.10 Enquiry system - untouched

`js/main.js` is **byte-identical** to its pre-integration hash. All 9 Worker
handlers present and unmodified: `submitViaApi`, `onApiSuccess`,
`onApiValidationError`, `onApiRateLimited`, `onApiNetworkError`,
`onApiUnexpected`, `buildPayload`, `buildBrief`, `validate`, plus
`fallbackCopy`/`showManualCopy`. `api-base-url` unchanged, honeypot intact,
Formspree refs intact, no API change, **no test POST made to production**.

### 13.11 Performance

240 renders sampled across the full 9.0 s at 1440×900, DPR 1:

| | ms |
|---|---|
| mean | 0.686 |
| p50 | 0.500 |
| p90 | 0.900 |
| p99 | 5.900 |
| max | 7.100 |

Budget at 60 fps is 16.67 ms, so ~24x headroom at the mean. `rAF` runs only
between `playSequence()` and `introComplete()` and is cancelled on completion;
the canvas backing store is zeroed and the element detached in `dispose()`.

### 13.12 Visual verification

Recorded and inspected, not inferred from computed styles:

- `cinematic-eye-prototype/captures/production/intro-production-1440x900.webm`
  - 1440×900, VP9, 25 fps, **10.80 s**, complete sequence **including the
    hand-off**. Luminance arc 20 → 26 → 30 → 32 → 42 → **55** (climax 8.9 s) →
    34 (hand-off) → 19 → 46 (revealed site). No black gap.
- `sheet-p1024.png`, `sheet-p390.png` - contact sheets of the sequence at
  1024×768 and 390×844, both confirmed to land on `rgb(13,16,21)` at the
  terminal frame.

Confirmed by eye: eight distinct stages, continuous deformation, a large final
eye, a push that fills the frame, crows reading as depth, cinematic red energy,
crimson resolving into the navy hero, the LORDS AGENCY hero arriving intact
(nav, gold eyebrow, two-line headline, lede, both CTAs, points, delivery
diagram), and no completion screen, skip button, or flash of broken content.

### 13.13 Tooling limitation encountered

`requestAnimationFrame` is throttled to ~1.2 fps in this headless harness, so
the real time-driven sequence cannot be recorded faithfully in real time
(measured: 11-12 rAF callbacks in 9 s). The eye is therefore captured by
driving `render(t)` deterministically at a true 25 fps, and the hand-off by
computing the three layer opacities from the exact CSS `cubic-bezier(0.25,
0.1, 0.25, 1)`. Both use the real production drawing code, the real production
DOM and the real stylesheets; the instrumented copy is served by a throwaway
harness outside the repo, and `js/cinematic-intro.js` on disk carries no debug
API. This is a harness limitation, not a site defect - with a visible tab the
loop runs at 60 fps and completes naturally at 9.0 s.

---

## 14. Final cleanup pass - cinematic intro

Tree cleanup and full regression re-run. **No change was made to the animation,
the visual sequence, or the timeline.** Nothing in the shipped intro was
redesigned, re-timed or re-effected; this pass only removed development
artifacts and re-verified.

### 14.1 Production tree after cleanup

    .gitignore  favicon.svg  index.html  og-image.jpg
    REGRESSION.md  robots.txt  sitemap.xml
    css/  cinematic-intro.css  styles.css
    js/    cinematic-intro.js    main.js

Removed from the tree (archived outside the repo, nothing destroyed):

| Removed | Files | Size | Why |
|---|---|---|---|
| `cinematic-eye-prototype/` | 31 | 5.2 MB | 17 stills, 2 recordings, 6 PNG layers, contact sheets, dev server, prototype README. Superseded by `js/cinematic-intro.js`, which is a self-contained modified copy. |
| `cinematic-intro-prototype/` | 31 | 838 KB | Superseded 3.4 s prototype, incl. its own frame generator, capture server and recordings. |
| `assets/itachi/` | 2 | 275 KB | Generated character artwork. Referenced by **nothing** load-bearing. |
| `.playwright-mcp/` | 17 | 299 KB | Console logs and page snapshots. Already gitignored. |

Nothing referenced any of these. Verified before deleting: the production
`index.html` loads only `css/styles.css`, `css/cinematic-intro.css`,
`js/main.js`, `js/cinematic-intro.js` and `favicon.svg`; the intro CSS contains
exactly one `url()` - an inline `data:` SVG; the intro JS contains zero
`fetch`/`XHR`/`import`/`new Image`.

### 14.2 Character asset removed

`assets/itachi/itachi.webp` (278 KB) and its README are gone from the tree. It
had **zero** load-bearing references: the only three occurrences of the string
`itachi` in production are inside comment blocks (`index.html` L150, and
`styles.css` L398 / L545). No `src`, `href` or `url()` ever pointed at the
file, so it was never fetched. No replacement character asset was introduced.

### 14.3 Shipped-code audit

`js/cinematic-intro.js` (950 lines) - 0 hits for: `console.*`, `debugger`,
`window.__*`, `globalThis`, `localhost`/`127.0.0.1`, port literals, `http(s)`
URL, `fetch`, `XMLHttpRequest`, `require`/`import`, `new Image`, `__drive`,
`toDataURL`/`screenshot`, prototype directory names, `process.env`, `eval`,
`new Function`, `innerHTML`, `document.write`, `setInterval`.

All required behaviour present: rAF start (L911), rAF cancel (L799), failsafe
timer (L947), canvas zeroing (L856), overlay DOM removal (L860), `inert` set
(L877) and released (L830), `aria-hidden` (L821), reduced-motion read (L119),
resize-listener removal (L847), completion latch (L797).

`css/cinematic-intro.css` (231 lines) - 0 debug/prototype selectors, no
completion-screen or skip rules, no global element selectors, no layout
properties transitioned. Every selector is reachable: 0 orphan IDs, and all 4
class hooks (`is-done`, `is-in`, `is-intro-done`, `is-intro-pending`) are set
by the script. The only `!important` uses are inside `@media print`, where
overriding the overlay is the point.

`index.html` - exactly 1 stylesheet link, 1 script tag, 1 overlay div, 6
intro elements. No `Sequence complete`, `Reload`, skip control, `__eye`,
`__drive`, `data-testid` or `console.log` anywhere. The 9 `<button>` elements
are all pre-existing production chrome (nav toggle, 5 work-filter chips, form
submit, copy-brief, email fallback).

### 14.4 Regression - full suite

| Check | Result |
|---|---|
| `<h1>` count | 1 |
| Heading-level skips | 0 across 77 headings |
| Service cards | 21 at every width |
| FAQ entries | 19 |
| Nav links / mobile toggle | 7 / present, toggles closed-open-closed after the intro |
| Hero CTAs | "Start a Project", "Explore Our Work" |
| Contact form | present, 12 inputs, 11 labels, honeypot present |
| `aria-live` | 1 region (`polite` - service filter status) |
| `api-base-url` | `https://lords-agency-enquiry.venkatesh99-info.workers.dev` |
| Privacy disclosure | present |
| Title / description | intact, 154 chars |
| Canonical / OG / Twitter / JSON-LD | 1 / 8 / 4 / 1 |
| Enquiry submitted | **none** - no POST made, production untouched |

### 14.5 Security

0 problems across 18 patterns over the 8 shipped files. Clean for: `eval`,
`new Function`, `innerHTML`/`outerHTML`, `insertAdjacentHTML`,
`document.write`, inline `on*` handlers, `javascript:` URLs, `data:` scripts,
`setTimeout("string")`, `Function("string")`, `require`/`import`, remote
scripts, remote stylesheets, remote images, remote `<source>`, remote `url()`,
`@import`, `@font-face`, `console.*`, plus a secrets scan (API keys, private
keys, bearer tokens, AWS, Stripe, Google, Slack, Cloudflare, generic passwords).

The only external URLs are pre-existing and public: the canonical domain, the
Worker endpoint, `schema.org`, two `wa.me` contact links, the sitemap
namespace, and the SVG XML namespace inside inline `data:` URIs.

### 14.6 Performance

| Metric | Result |
|---|---|
| CLS | **0** (320 and 1440 measured with a buffered `layout-shift` observer) |
| Network requests | **5** - document, 2 CSS, 2 JS (budget was ≤6) |
| Inline `data:` decodes | 2 (the grain SVG; not network traffic) |
| Real external requests | **0** |
| Failed requests / console errors | **0** / **0** |
| XHR or fetch during load | **0** |
| Transfer | 232 KB uncompressed on localhost |
| DOM nodes | 789 while playing, 756 after teardown |
| DOMContentLoaded / load | 134 ms / 135 ms |
| rAF after completion | **0 frames in 1500 ms** after the hand-off |
| Canvas disposed | yes - backing store zeroed, element removed |
| Reduced motion | completes in 0 ms, **no rAF started** |
| Render cost | mean 0.686 ms, p90 0.900 ms, max 7.100 ms vs 16.67 ms budget |

### 14.7 Responsive - 9 widths

Every width: no horizontal overflow (`scrollWidth < innerWidth`), 21 cards,
19 FAQ entries, 1 `h1`, overlay removed, `inert` released, no hero
copy/visual overlap.

| Width | Locked eye | Push fill | Crows in view | Terminal centre |
|---|---|---|---|---|
| 320 | 68.4% | 99.4% | yes | `rgb(13,16,21)` |
| 390 | 77.7% | 99.2% | yes | `rgb(13,16,21)` |
| 430 | 69.8% | 99.8% | yes | `rgb(13,16,21)` |
| 768 | 78.9% | 99.6% | yes | `rgb(13,16,21)` |
| 834 | 78.8% | 99.6% | yes | `rgb(13,16,21)` |
| 1024 | 80.0% | 99.9% | yes | `rgb(13,16,21)` |
| 1280 | 79.0% | 99.8% | yes | `rgb(13,16,21)` |
| 1440 | 79.2% | 99.8% | yes | `rgb(13,16,21)` |
| 1920 | 79.1% | 99.8% | yes | `rgb(13,16,21)` |

Eye disc centroid measured at **49.8-50.0%** horizontally and **49.9-50.0%**
vertically at every width, so the disc is genuinely centred (the wider
bounding box in the table above includes the asymmetric crows).

### 14.8 Visual regression

Measured against the approved 1440x900 baseline recording
(VP9, 25 fps, 10.80 s, 1560 KB) - no re-recording, no redesign.

Frame-by-frame luminance across the hand-off (frames 216-269):

    9.00s 47.4 -> 9.12s 21.2 -> 9.24s 11.7 -> 9.48s 9.1
         -> 9.72s 4.2 (trough) -> 9.96s 19.4 -> 10.32s 34.0 -> 10.68s 36.0

- Largest single-frame jump anywhere in the hand-off: **9.4** luminance levels.
  A hard cut would read 30+; there is none.
- The trough bottoms at **4.2**, not 0 - no black flash. The clip minimum of 0
  is the intended black lead-in before the sequence starts.
- Inspected visually: crimson peak -> dissipation -> site emerging -> settled
  hero, with 8 distinct stages, continuous morphing, a large final eye, a
  frame-filling push, crows reading as depth, and the LORDS AGENCY hero intact
  (nav, gold eyebrow, two-line headline, lede, both CTAs, points, delivery
  diagram). No skip button, no completion screen, no debug text, no flash.

### 14.9 Unrelated pre-existing dirt - deliberately NOT touched

The working tree also carries an earlier, uncommitted **hero atmosphere layer**
feature. It is a self-contained trio and is **not** part of the cinematic intro:

| File | Lines | Content |
|---|---|---|
| `index.html` | +42 (hunk at L149) | the `.hero-ita` markup block |
| `css/styles.css` | +470 | 87 lines of `.hero-ita` / `.ita-*` rules |
| `js/main.js` | +55 / -3 | `itaGlow` / `itaCrows` / `itaGeo` drivers |

It is left exactly as found, not overwritten and not reverted. Note the
coupling: committing `index.html` necessarily carries the `.hero-ita` markup,
while its CSS and JS drivers in `styles.css` and `main.js` would remain
uncommitted. The markup is `aria-hidden`, contains no text, and is unstyled
without its CSS, so it is inert if shipped alone - but the split should be a
deliberate decision, not an accident.
