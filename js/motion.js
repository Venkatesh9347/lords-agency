/* ============================================================
   LORDS AGENCY - motion layer (scroll reveal + hero drift)

   Vanilla JavaScript. No dependencies, no network, no build step.

   HOW THIS FILE IS SAFE BY CONSTRUCTION
   -------------------------------------
   The reveal system is fail-open. Content is never hidden by this script;
   it is hidden only by CSS that is gated behind a single activation class
   (`motion-active` on <html>) which is added *after* every target element
   has been successfully tagged. So:

     - JavaScript disabled      -> class never added -> content visible
     - CSS never deployed      -> class added, rules absent -> content visible
     - any error during init    -> class removed again    -> content visible
     - prefers-reduced-motion   -> early return            -> content visible
     - no IntersectionObserver  -> early return            -> content visible

   There is no code path in which this file can leave the page blank.

   LOAD ORDER
   ----------
   Load after main.js. This file only reads layout and writes CSS custom
   properties and classes; it does not depend on main.js and does not call
   into it.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- configuration ---------- */

  var ROOT_CLASS = 'motion-active';   // added to <html> only after tagging
  var REVEAL = 'motion-reveal';        // marks a target as revealable
  var VISIBLE = 'is-in';               // added when the target enters view
  var WORD = 'motion-word';           // wrapper span around one heading word

  var REVEAL_THRESHOLD = 0.12;
  var REVEAL_ROOT_MARGIN = '0px 0px -6% 0px';

  /* Stagger is expressed purely as a per-element index in --motion-i; the CSS
     decides the delay step. No millisecond value is computed here. */

  /* The approved target list. Every selector is present in the shipped
     markup; `.hero` descendants are excluded at collection time because the
     hero already owns its entrance animation. */
  var TARGET_SELECTORS = [
    '.section h2',
    '.cta-band-inner h2',
    '.contact-cta h2',
    '.section > .eyebrow',
    '.section-lede',
    '.value-statement > p:last-child',
    '.about-main p',
    '.svc-group-title',
    '.faq-group-title',
    '.fine-print',
    '.why-item',
    '.next-steps li',
    '.filter-bar',
    '.faq details',
    '.contact-info',
    '.project-form',
    '.cta-band-inner .btn',
    '.cta-band-inner .cta-lede',
    '.footer-grid > *',
    '.footer-base'
  ];

  /* Headings whose text is split into per-word spans. */
  var HEADING_SELECTOR = '.section h2, .cta-band-inner h2, .contact-cta h2';

  /* Decorative hero layer that carries the scroll drift. main.js animates
     this layer's *children* (.ita-glow, .ita-crows, .ita-geo) and the
     separate [data-depth-*] nodes, but never the .ita container itself, so
     writing a transform here composes cleanly instead of fighting. */
  var DRIFT_TARGET = '.hero-ita';
  var DRIFT_MAX_PX = 26;              // total travel across the hero's height
  var DRIFT_EPSILON = 0.05;           // skip sub-pixel writes

  /* ---------- bail out before anything is touched ---------- */

  /* 1. prefers-reduced-motion: the user has asked for no motion. Return
        without tagging, without observing, without adding ROOT_CLASS. */
  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches === true;
  } catch (e) { /* matchMedia unavailable: assume motion is fine */ }
  if (prefersReduced) return;

  /* 2. No IntersectionObserver: the reveal system cannot run. Return without
        tagging anything, so nothing can end up hidden. */
  if (typeof window.IntersectionObserver !== 'function') return;
  if (!document.documentElement) return;

  var root = document.documentElement;
  var observer = null;
  var pending = [];        // tagged but not yet revealed
  var sweepFrame = 0;
  var driftFrame = 0;
  var driftLast = -1;

  /* ============================================================
     SWEEP - the safety net for everything the observer cannot see
     ============================================================
     IntersectionObserver only ever fires when an element ENTERS the
     viewport. That misses three real cases, all of which would otherwise
     leave content permanently hidden behind the reveal CSS:

       1. Anchor navigation. Clicking "Contact" in the nav jumps straight to
          the footer. Every section between the hero and the footer is left
          above the viewport and will never re-enter it, so the observer
          never fires for them again.
       2. Fast scrolling / restored scroll positions, where a frame is skipped
          entirely and an element passes the trigger line unseen.
       3. A page loaded already scrolled (browser scroll restoration).

     The sweep reveals anything already at or above the trigger line, which
     covers all three. The observer is still the primary mechanism and is
     left exactly as specified; this only guarantees that "revealed" can never
     be missed. It stops doing any work once nothing is pending.
     ============================================================ */

  function reveal(el) {
    if (!el || el.classList.contains(VISIBLE)) return;
    el.classList.add(VISIBLE);
    if (observer) observer.unobserve(el);
  }

  function sweep() {
    sweepFrame = 0;
    if (!pending.length) return;

    var line = window.innerHeight * 0.94;   // matches the observer rootMargin
    var stillPending = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      if (!el.isConnected) continue;                       // detached
      if (el.getBoundingClientRect().top <= line) {
        reveal(el);                                       // at or above the line
      } else {
        stillPending.push(el);
      }
    }
    pending = stillPending;
  }

  function scheduleSweep() {
    if (sweepFrame || !pending.length) return;
    sweepFrame = window.requestAnimationFrame(sweep);
  }

  /* ============================================================
     WORD SPLITTING
     Replaces the text inside a heading with per-word spans.

     No innerHTML is used anywhere. Text nodes are rebuilt into document
     fragments; <br> elements are left exactly as they are; nested elements
     (for example the .h1-line wrappers) are recursed into rather than
     flattened, so existing styling and semantics survive.
     ============================================================ */

  function splitWords(el) {
    var children = [];
    var i;
    for (i = 0; i < el.childNodes.length; i++) children.push(el.childNodes[i]);

    for (i = 0; i < children.length; i++) {
      var child = children[i];

      if (child.nodeType === 3) {
        /* Text: split on whitespace, keeping the whitespace itself as bare
           text nodes so inter-word spacing is not lost. */
        var frag = document.createDocumentFragment();
        var parts = child.nodeValue.split(/(\s+)/);
        for (var j = 0; j < parts.length; j++) {
          var part = parts[j];
          if (part === '') continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
          } else {
            var span = document.createElement('span');
            span.className = WORD;
            span.textContent = part;
            frag.appendChild(span);
          }
        }
        el.replaceChild(frag, child);

      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') continue;   // preserve line breaks
        splitWords(child);                       // recurse, keep the element
      }
    }
  }

  /* Assign --motion-i on each word so CSS can stagger them. */
  function stampWords(scope) {
    var words = scope.getElementsByClassName ? scope.getElementsByClassName(WORD) : [];
    for (var i = 0; i < words.length; i++) {
      words[i].style.setProperty('--motion-i', String(i));
    }
  }

  /* ============================================================
     COLLECTION
     ============================================================ */

  function isInsideHero(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains('hero')) return true;
      node = node.parentNode;
    }
    return false;
  }

  function collectTargets() {
    var found = [];
    var seen = [];

    function push(el) {
      if (!el || el.nodeType !== 1) return;
      if (seen.indexOf(el) !== -1) return;      // de-duplicate
      if (isInsideHero(el)) return;             // hero owns its own entrance
      seen.push(el);
      found.push(el);
    }

    for (var s = 0; s < TARGET_SELECTORS.length; s++) {
      var nodes;
      try {
        nodes = document.querySelectorAll(TARGET_SELECTORS[s]);
      } catch (e) {
        continue;                               // an unsupported selector is skipped, not fatal
      }
      for (var i = 0; i < nodes.length; i++) push(nodes[i]);
    }
    return found;
  }

  /* Index of this element among earlier siblings that are also targets, so
     grouped items (why-items, next-steps, footer columns) stagger in order. */
  function siblingStaggerIndex(el, targets) {
    var parent = el.parentNode;
    if (!parent) return 0;
    var index = 0;
    for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
      if (c === el) return index;
      if (targets.indexOf(c) !== -1) index++;
    }
    return index;
  }

  /* ============================================================
     HERO SCROLL DRIFT
     A single transform write per frame, on one element, only while the hero
     is on screen. rAF is scheduled from a passive scroll listener, so it
     never runs synchronously inside scroll handling.
     ============================================================ */

  function driftTarget() {
    try { return document.querySelector(DRIFT_TARGET); } catch (e) { return null; }
  }

  function driftMaxScroll() {
    var hero = document.querySelector('.hero');
    if (hero && hero.offsetHeight) return hero.offsetHeight;
    return window.innerHeight || 0;
  }

  function applyDrift() {
    driftFrame = 0;
    var el = driftEl;
    if (!el || !el.isConnected) return;

    var span = driftMaxScroll();
    var y = span > 0 ? (window.pageYOffset / span) * DRIFT_MAX_PX : 0;
    if (y > DRIFT_MAX_PX) y = DRIFT_MAX_PX;
    if (y < 0) y = 0;

    /* The drift can only change while the hero is still being travelled
       through. Once it has clamped, the transform is final, so the
       compositor hint is released instead of being held for the rest of the
       session on a decorative layer that is by then off screen. */
    setDriftHint(y < DRIFT_MAX_PX);

    if (driftLast >= 0 && Math.abs(y - driftLast) < DRIFT_EPSILON) return;
    driftLast = y;
    el.style.setProperty('transform', 'translate3d(0,' + y.toFixed(2) + 'px,0)');
  }

  /* Idempotent, so it is safe to call on every frame. */
  function setDriftHint(on) {
    if (!driftEl || !driftEl.isConnected) return;
    if (driftHinted === on) return;
    driftHinted = on;
    if (on) driftEl.style.setProperty('will-change', 'transform');
    else driftEl.style.removeProperty('will-change');
  }

  function onScroll() {
    /* The observer is the primary reveal mechanism; the sweep only covers
       what the observer structurally cannot see. */
    scheduleSweep();

    if (driftFrame) return;          // already scheduled this frame
    driftFrame = window.requestAnimationFrame(applyDrift);
  }

  var driftEl = null;
  var driftHinted = false;

  function startDrift() {
    driftEl = driftTarget();
    if (!driftEl) return;
    applyDrift();                     /* applies the hint if drift is live */
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  function stopDrift() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (driftFrame) { window.cancelAnimationFrame(driftFrame); driftFrame = 0; }
    if (driftEl) {
      driftEl.style.removeProperty('transform');
      driftEl.style.removeProperty('will-change');
      driftEl = null;
    }
    driftHinted = false;
  }

  /* ============================================================
     INITIALISATION
     Everything that can fail is inside one try block. On any throw the
     activation class is removed again so the page can never be left with
     content that CSS is hiding but JavaScript will never reveal.
     ============================================================ */

  function init() {
    var targets = collectTargets();

    /* Headings are split BEFORE the observer is created, so the very first
       measurement already sees the final DOM. */
    var headings = document.querySelectorAll(HEADING_SELECTOR);
    for (var h = 0; h < headings.length; h++) {
      if (isInsideHero(headings[h])) continue;
      splitWords(headings[h]);
      stampWords(headings[h]);
    }

    /* Tag every target, and give each a stagger index. Only after this
       loop finishes does anything become activatable. */
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      el.classList.add(REVEAL);
      el.style.setProperty('--motion-i', String(siblingStaggerIndex(el, targets)));
    }

    /* One shared observer for the whole page. */
    observer = new window.IntersectionObserver(function (entries) {
      for (var n = 0; n < entries.length; n++) {
        var entry = entries[n];
        if (!entry.isIntersecting) continue;
        reveal(entry.target);              // add reveal class + unobserve
      }
    }, { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN });

    for (var j = 0; j < targets.length; j++) {
      observer.observe(targets[j]);
      pending.push(targets[j]);
    }

    /* Catch anything already at or above the fold before the first scroll. */
    sweep();

    /* All targets are tagged and observed. Only now may the CSS that hides
       them be allowed to take effect. */
    root.classList.add(ROOT_CLASS);

    startDrift();
  }

  try {
    init();
  } catch (err) {
    /* Fail open, always. */
    try { root.classList.remove(ROOT_CLASS); } catch (e2) { /* nothing left to do */ }
    try { if (observer) observer.disconnect(); } catch (e3) { /* noop */ }
    try { if (sweepFrame) window.cancelAnimationFrame(sweepFrame); sweepFrame = 0; } catch (e5) { /* noop */ }
    try { stopDrift(); } catch (e6) { /* noop */ }
    pending.length = 0;
    return;
  }
})();
