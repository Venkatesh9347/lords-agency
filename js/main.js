/* LORDS AGENCY — vanilla JS. No dependencies. */
(function () {
  "use strict";

  // Single place to change the receiving inbox for the static v1 form.
  var CONTACT_EMAIL = "venkatesh99.info@gmail.com";

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  var emailLink = document.getElementById("contact-email-link");
  if (emailLink) emailLink.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Project enquiry — LORDS AGENCY");

  var mailtoFallback = document.getElementById("mailto-fallback");
  if (mailtoFallback) mailtoFallback.href = "mailto:" + CONTACT_EMAIL;

  // ---- Mobile nav ----
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  function closeMenu(returnFocus) {
    if (!toggle || !nav) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    if (returnFocus) toggle.focus();
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) closeMenu(true);
    });
  }

  // ---- Header compact on scroll ----
  var header = document.getElementById("site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 24);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Page progress bar (1–2px gold, transform-only, rAF-throttled) ----
  // Decorative: hidden via CSS under prefers-reduced-motion.
  var progressBar = document.getElementById("progress-bar");
  var progressQueued = false;
  function updateProgress() {
    progressQueued = false;
    if (!progressBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.transform = "scaleX(" + ratio.toFixed(4) + ")";
  }
  if (progressBar) {
    window.addEventListener("scroll", function () {
      if (!progressQueued) {
        progressQueued = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  // ---- Active nav highlight ----
  var links = Array.prototype.slice.call(document.querySelectorAll(".site-nav a"));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (a) {
            var active = a.getAttribute("href") === "#" + entry.target.id;
            a.classList.toggle("is-active", active);
            if (active) { a.setAttribute("aria-current", "true"); }
            else { a.removeAttribute("aria-current"); }
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  // ---- Reveal on scroll (JS-gated so no-JS pages stay fully visible) ----
  // Stagger via --d custom property: subtle per-index delay within each grid.
  document.documentElement.classList.add("js");
  var revealTargets = document.querySelectorAll(".card, .work-card, .steps li, .timeline li, .stack-group, .matrix-group, .about-card, .hero-card, .sys-window, .flow-card, .value-card, .case, .mock");
  var staggerGroups = document.querySelectorAll(".cards, .flow-grid, .work-grid, .timeline, .matrix, .value-cards");
  staggerGroups.forEach(function (group) {
    // Direct reveal children get a subtle stagger index (capped at 6 steps).
    // group.children is used (no :scope selector) for maximum compatibility —
    // if anything here throws, reveals must still work, so keep it simple.
    var direct = Array.prototype.filter.call(group.children, function (child) {
      return child.classList && (child.classList.contains("card") || child.classList.contains("work-card") || child.classList.contains("flow-card") || child.classList.contains("matrix-group") || child.classList.contains("value-card") || child.tagName === "LI");
    });
    direct.forEach(function (el, i) {
      el.style.setProperty("--d", String(Math.min(i, 5) * 70) + "ms");
    });
  });
  revealTargets.forEach(function (el) { el.classList.add("reveal"); });
  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  // ---- Process connector progressive reveal (decorative only) ----
  var timeline = document.querySelector(".process .timeline");
  if (timeline && "IntersectionObserver" in window) {
    var timelineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          timeline.classList.add("is-visible");
          timelineObserver.disconnect();
        }
      });
    }, { threshold: 0.2 });
    timelineObserver.observe(timeline);
  } else if (timeline) {
    timeline.classList.add("is-visible");
  }

  // ---- Process current-stage activation (decorative gold highlight) ----
  // Scroll progress through the timeline maps to stages 0–5, mirroring the
  // progressive connector: every stage gets its moment, exactly one active.
  // Text stays put; no layout effects.
  var stageItems = Array.prototype.slice.call(document.querySelectorAll(".process .timeline li"));
  var stageList = document.querySelector(".process .timeline");
  var stageQueued = false;
  function updateCurrentStage() {
    stageQueued = false;
    if (!stageItems.length || !stageList) return;
    var r = stageList.getBoundingClientRect();
    var span = r.height + window.innerHeight;
    var progress = span > 0 ? Math.min(1, Math.max(0, (window.innerHeight - r.top) / span)) : 0;
    var idx = Math.min(stageItems.length - 1, Math.floor(progress * stageItems.length));
    stageItems.forEach(function (li, i) { li.classList.toggle("is-current", i === idx); });
  }
  if (stageItems.length) {
    window.addEventListener("scroll", function () {
      if (!stageQueued) {
        stageQueued = true;
        window.requestAnimationFrame(updateCurrentStage);
      }
    }, { passive: true });
    window.addEventListener("resize", updateCurrentStage);
    updateCurrentStage();
  }

  // ---- Selected Work: scroll-driven horizontal showcase (desktop only) ----
  // Vertical stack is the default (mobile / no-JS / reduced-motion).
  // Only engages with .js + min-width:1024px + no reduced motion.
  var workScroll = document.querySelector(".work-scroll");
  var workTrack = document.querySelector(".work-track");
  var workReduced = false;
  var workDesktop = false;
  try {
    workReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workDesktop = window.matchMedia("(min-width: 1024px)").matches;
  } catch (err) { workReduced = true; }
  function workEnabled() {
    return !!(workScroll && workTrack && document.documentElement.classList.contains("js") && workDesktop && !workReduced);
  }
  var workQueued = false;
  function updateWorkTrack() {
    workQueued = false;
    if (!workEnabled()) {
      if (workTrack) workTrack.style.transform = "";
      return;
    }
    var rect = workScroll.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    var maxX = Math.max(0, workTrack.scrollWidth - workTrack.clientWidth);
    workTrack.style.transform = "translate3d(" + (-progress * maxX).toFixed(1) + "px,0,0)";
  }
  if (workScroll && workTrack) {
    window.addEventListener("scroll", function () {
      if (!workQueued) {
        workQueued = true;
        window.requestAnimationFrame(updateWorkTrack);
      }
    }, { passive: true });
    window.addEventListener("resize", function () {
      try { workDesktop = window.matchMedia("(min-width: 1024px)").matches; } catch (err) {}
      updateWorkTrack();
    });
    updateWorkTrack();
    if (workPanels && workPanels.length) syncPanelInert(true);
  }
  // Active panel emphasis (works in both horizontal and stacked layouts).
  // In the horizontal showcase the off-screen panels stay in the accessibility
  // tree, so a keyboard user could tab into a panel they cannot see. Marking
  // them `inert` removes them from tab order and from the a11y tree until they
  // become the active panel. In the stacked/mobile layout nothing is inert.
  var workPanels = Array.prototype.slice.call(document.querySelectorAll(".work-panel"));
  var supportsInert = typeof HTMLElement !== "undefined" && "inert" in HTMLElement.prototype;
  var workInertState = null;
  function syncPanelInert(force) {
    if (!supportsInert || !workPanels || !workPanels.length) return;
    var guarded = workEnabled();
    // Only guard when the showcase has actually picked a panel. After an
    // anchor jump into #work no panel sits in the activation band, and making
    // every panel inert would make the visible content unreachable.
    var hasActive = workPanels.some(function (panel) { return panel.classList.contains("is-active"); });
    if (!force && guarded === workInertState) return;
    workInertState = guarded;
    workPanels.forEach(function (panel) {
      if (guarded && hasActive && !panel.classList.contains("is-active")) { panel.setAttribute("inert", ""); }
      else { panel.removeAttribute("inert"); }
    });
  }
  if (workPanels.length && "IntersectionObserver" in window) {
    var panelObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          workPanels.forEach(function (p) { p.classList.remove("is-active"); });
          entry.target.classList.add("is-active");
          syncPanelInert(true);
        }
      });
    }, { rootMargin: "-30% 0px -30% 0px", threshold: 0 });
    workPanels.forEach(function (p) { panelObserver.observe(p); });
    syncPanelInert(true);
  }

  // ---- Subtle desktop-only pointer glow (CSS variables, no tracking) ----
  // Disabled on touch, on reduced-motion, and without fine hover support.
  try {
    var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (finePointer && !reducedMotion) {
      var glowQueued = false;
      var glowX = 0;
      var glowY = 0;
      var applyGlow = function () {
        glowQueued = false;
        document.body.style.setProperty("--mx", glowX + "px");
        document.body.style.setProperty("--my", glowY + "px");
        if (!document.body.classList.contains("has-pointer")) {
          document.body.classList.add("has-pointer");
        }
      };
      document.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        glowX = e.clientX;
        glowY = e.clientY;
        if (!glowQueued) {
          glowQueued = true;
          window.requestAnimationFrame(applyGlow);
        }
      }, { passive: true });
    }
  } catch (err) { /* glow is decorative — never break the page */ }

  // ---- Hero pointer depth (desktop only, interpolated, tiny offsets) ----
  // Layers: grid background 1–2px, glow 3–5px, system visual 4–8px, CTAs 2–3px.
  // Disabled on touch, coarse pointers, and reduced motion. Cursor untouched.
  try {
    var depthFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var depthCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hero = document.querySelector(".hero");
    var depthBg = document.querySelector(".hero-grid-bg");
    var depthGlow = document.querySelector(".hero-glow");
    var depthVisual = document.querySelector("[data-depth-visual]");
    var depthCta = document.querySelector("[data-depth-cta]");
    if (hero && depthFine && !depthCalm && (depthBg || depthGlow || depthVisual || depthCta)) {
      var tX = 0, tY = 0, cX = 0, cY = 0, depthRunning = false;
      var DEPTH = [
        { el: depthBg, fx: 2, fy: 2, mode: "bg" },
        { el: depthGlow, fx: 5, fy: 4, mode: "offset" },
        { el: depthVisual, fx: 7, fy: 6, mode: "move" },
        { el: depthCta, fx: 2.5, fy: 2, mode: "move" }
      ];
      var depthTick = function () {
        cX += (tX - cX) * 0.08;
        cY += (tY - cY) * 0.08;
        if (Math.abs(tX - cX) < 0.01 && Math.abs(tY - cY) < 0.01) {
          cX = tX; cY = tY;
        }
        DEPTH.forEach(function (layer) {
          if (!layer.el) return;
          var x = (cX * layer.fx).toFixed(2);
          var y = (cY * layer.fy).toFixed(2);
          if (layer.mode === "bg") {
            // Background grid drifts via background-position (keeps its transform animation intact).
            layer.el.style.backgroundPosition = x + "px " + y + "px, " + x + "px " + y + "px";
          } else if (layer.mode === "offset") {
            // Glow has an infinite transform animation, so offset via the
            // independent `translate` property (composes, never conflicts).
            layer.el.style.translate = x + "px " + y + "px";
          } else {
            layer.el.style.transform = "translate3d(" + x + "px," + y + "px,0)";
          }
        });
        if (cX !== tX || cY !== tY || tX !== 0 || tY !== 0) {
          window.requestAnimationFrame(depthTick);
        } else {
          depthRunning = false;
          DEPTH.forEach(function (layer) {
            if (!layer.el) return;
            if (layer.mode === "bg") { layer.el.style.backgroundPosition = ""; }
            else if (layer.mode === "offset") { layer.el.style.translate = ""; }
            else { layer.el.style.transform = ""; }
          });
        }
      };
      var depthKick = function () {
        if (!depthRunning) {
          depthRunning = true;
          window.requestAnimationFrame(depthTick);
        }
      };
      hero.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        var r = hero.getBoundingClientRect();
        tX = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
        tY = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
        depthKick();
      }, { passive: true });
      hero.addEventListener("pointerleave", function () {
        tX = 0; tY = 0;
        depthKick();
      }, { passive: true });
    }
  } catch (err) { /* depth is decorative — never break the page */ }

  // ---- Magnetic CTA (fine pointer only) ----
  // The offset is ATTRACTIVE: it is proportional to the signed distance from
  // the button's centre, so the button always moves toward the cursor and the
  // cursor can never end up outside the hit target (no hover flicker, click
  // target preserved). Written to --mag-x/--mag-y and applied by CSS through
  // the independent `translate` property, so it composes with - rather than
  // fights - the button's hover transform.
  // Never engages for touch/coarse pointers or reduced motion, and keyboard
  // focus cannot leave the button offset because only pointermove sets it.
  try {
    var magFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var magCalm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var magnetic = Array.prototype.slice.call(document.querySelectorAll(".cta-magnetic"));
    if (magFine && !magCalm && magnetic.length) {
      var MAG_MAX = 8; // px of travel
      magnetic.forEach(function (el) {
        var magQueued = false;
        var magX = 0;
        var magY = 0;
        var magApply = function () {
          magQueued = false;
          el.style.setProperty("--mag-x", magX.toFixed(2) + "px");
          el.style.setProperty("--mag-y", magY.toFixed(2) + "px");
        };
        var magKick = function () {
          if (!magQueued) { magQueued = true; window.requestAnimationFrame(magApply); }
        };
        var magReset = function () { magX = 0; magY = 0; magKick(); };
        el.addEventListener("pointermove", function (e) {
          if (e.pointerType && e.pointerType !== "mouse") return;
          var r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          magX = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * MAG_MAX;
          magY = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * MAG_MAX;
          magKick();
        }, { passive: true });
        el.addEventListener("pointerleave", magReset, { passive: true });
        el.addEventListener("pointercancel", magReset, { passive: true });
        el.addEventListener("blur", magReset);
      });
      // Scrolling moves the button out from under a stationary cursor; reset so
      // it never rests offset after the page moves.
      window.addEventListener("scroll", function () {
        magnetic.forEach(function (el) {
          el.style.setProperty("--mag-x", "0px");
          el.style.setProperty("--mag-y", "0px");
        });
      }, { passive: true });
    }
  } catch (err) { /* magnetic is decorative — never break the page */ }

  // ---- Service filters ----
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("#service-grid .card"));
  var groups = Array.prototype.slice.call(document.querySelectorAll("#service-grid .svc-group"));
  var filterStatus = document.getElementById("service-filter-status");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.classList.remove("is-active");
        c.removeAttribute("aria-pressed");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
      var f = chip.getAttribute("data-filter");
      // Stagger the re-entry by visible order so filtering reads as a
      // deliberate transition rather than a single snap. --d is capped so a
      // 21-card group never feels sluggish.
      var visibleIndex = 0;
      cards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-category") === f;
        card.style.display = show ? "" : "none";
        if (show) {
          card.style.setProperty("--d", String(Math.min(visibleIndex, 6) * 45) + "ms");
          // Restart the subtle entrance so filtering feels alive (transform/opacity only).
          card.style.animation = "none";
          void card.offsetWidth;
          card.style.animation = "";
          visibleIndex++;
        } else {
          card.style.removeProperty("--d");
        }
      });
      // Hide empty group headings when filtering (keeps counts accurate).
      groups.forEach(function (group) {
        var visible = Array.prototype.filter.call(group.querySelectorAll(".card"), function (card) {
          return card.style.display !== "none";
        });
        group.style.display = visible.length ? "" : "none";
      });

      // Announce the result for screen readers (the visual change is silent).
      if (filterStatus) {
        var shown = cards.filter(function (card) { return card.style.display !== "none"; }).length;
        var label = (chip.textContent || "").replace(/\s+/g, " ").trim();
        filterStatus.textContent = "Showing " + shown + " of " + cards.length + " services" +
          (f === "all" ? "." : " in " + label + ".");
      }
    });
  });

  // ---- Project enquiry form (static v1: compose email draft) ----
  var form = document.getElementById("project-form");
  var errorBox = document.getElementById("form-error");
  var successBox = document.getElementById("form-success");
  var desc = document.getElementById("f-desc");
  var descCount = document.getElementById("desc-count");
  var copyBtn = document.getElementById("copy-brief");

  if (desc && descCount) {
    var updateCount = function () { descCount.textContent = String(desc.value.length); };
    desc.addEventListener("input", updateCount);
    updateCount();
  }

  // ---- API configuration (Phase 2A: mailto-first becomes API-first) ----
  // Base URL resolution, highest priority first:
  //   1. window.LORDS_API_BASE_URL (deploy-time runtime injection)
  //   2. <meta name="api-base-url" content="..."> (deploy-time file config)
  //   3. "" (same origin — frontend and API on one host)
  // No secrets here: the base URL is public configuration, not a credential.
  function apiBaseUrl() {
    try {
      if (typeof window.LORDS_API_BASE_URL === "string" && window.LORDS_API_BASE_URL.trim() !== "") {
        return window.LORDS_API_BASE_URL.replace(/\/+$/, "");
      }
    } catch (err) { /* read-only probe — never break the page */ }
    var meta = document.querySelector('meta[name="api-base-url"]');
    var content = meta ? (meta.getAttribute("content") || "").trim() : "";
    return content.replace(/\/+$/, "");
  }
  function apiEnquiriesUrl() {
    return apiBaseUrl() + "/api/enquiries";
  }

  // Submission state: guards against duplicate POSTs (the public API has
  // no idempotency key) across clicks, Enter key, and programmatic submits.
  var sendBtn = document.getElementById("send-enquiry");
  var emailFallbackBtn = document.getElementById("email-fallback-btn");
  var mailtoSuccess = document.getElementById("mailto-success");
  var apiSuccess = document.getElementById("api-success");
  var apiSuccessMessage = document.getElementById("api-success-message");
  var apiReference = document.getElementById("api-reference");
  var isSubmitting = false;
  var sendLabel = sendBtn ? sendBtn.textContent : "Send project enquiry";
  var API_TIMEOUT_MS = 20000;

  function setSubmitting(on) {
    isSubmitting = on;
    if (sendBtn) {
      sendBtn.disabled = on;
      sendBtn.textContent = on ? "Sending…" : sendLabel;
    }
    if (copyBtn) copyBtn.disabled = on;
    if (form) {
      if (on) { form.setAttribute("aria-busy", "true"); }
      else { form.removeAttribute("aria-busy"); }
    }
  }
  function hideEmailFallback() {
    if (emailFallbackBtn) emailFallbackBtn.hidden = true;
  }
  function showEmailFallback() {
    if (emailFallbackBtn) emailFallbackBtn.hidden = false;
  }
  function showMailtoSuccess() {
    if (apiSuccess) apiSuccess.hidden = true;
    if (mailtoSuccess) mailtoSuccess.hidden = false;
    if (successBox) successBox.hidden = false;
  }
  function showApiSuccess(message, reference) {
    if (mailtoSuccess) mailtoSuccess.hidden = true;
    if (apiSuccessMessage) {
      apiSuccessMessage.textContent = message || "Your project enquiry has been received.";
    }
    if (apiReference) {
      apiReference.textContent = reference || "";
      var refLine = apiReference.parentNode;
      if (refLine && refLine.classList && refLine.classList.contains("reference-line")) {
        refLine.hidden = !reference;
      }
    }
    if (apiSuccess) apiSuccess.hidden = false;
    if (successBox) successBox.hidden = false;
  }

  // Conservative maximum length for the generated mailto: URI.
  // Reasoning: the brief is URL-encoded into the URI (non-ASCII input such as
  // emoji expands ~9x via encodeURIComponent), while mailto: handling varies
  // across browsers, operating systems and email clients — some silently drop
  // oversized URIs. Historical client limits cluster around ~2000 characters,
  // so 2000 is used as a conservative cap. Typical briefs are a few hundred
  // characters and pass comfortably; only very long descriptions trip the guard.
  var MAX_MAILTO_URI_LENGTH = 2000;

  // Map of validated field names to control IDs (for focus + ARIA state).
  var FIELD_IDS = {
    project_type: "f-type",
    current_stage: "f-stage",
    timeline: "f-timeline",
    description: "f-desc",
    name: "f-name",
    email: "f-email",
    phone: "f-phone",
    country: "f-country",
    website: "f-website"
  };

  function controlFor(name) {
    var id = FIELD_IDS[name];
    return id ? document.getElementById(id) : null;
  }

  function clearInvalidState() {
    Object.keys(FIELD_IDS).forEach(function (name) {
      var control = controlFor(name);
      if (control) {
        control.removeAttribute("aria-invalid");
        control.removeAttribute("aria-describedby");
      }
    });
  }

  function markInvalid(name) {
    var control = controlFor(name);
    if (!control) return;
    control.setAttribute("aria-invalid", "true");
    // The shared error summary carries role="alert"; link the control to it.
    if (errorBox && errorBox.id) control.setAttribute("aria-describedby", errorBox.id);
    control.focus();
  }

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  function clearStatus() {
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ""; }
    if (successBox) successBox.hidden = true;
    hideEmailFallback();
    clearInvalidState();
  }

  function fieldValue(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value).trim() : "";
  }

  // Exact contract payload. Empty optionals are omitted (the API also
  // treats "" as null via ConvertEmptyStringsToNull); the honeypot field
  // is always sent with its exact name. Never sends status, reference,
  // assignee, recipients, or audit identity — the server owns those.
  function buildPayload() {
    var payload = {
      project_type: fieldValue("project_type"),
      current_stage: fieldValue("current_stage"),
      timeline: fieldValue("timeline"),
      description: fieldValue("description"),
      name: fieldValue("name"),
      email: fieldValue("email"),
      phone: fieldValue("phone"),
      country: fieldValue("country")
    };
    ["budget", "company", "website"].forEach(function (name) {
      var value = fieldValue(name);
      if (value !== "") payload[name] = value;
    });
    var honey = form.querySelector('[name="company_website_confirm"]');
    payload.company_website_confirm = honey ? String(honey.value) : "";
    return payload;
  }

  function buildBrief() {
    var lines = [
      "New project enquiry — LORDS AGENCY",
      "",
      "Project type: " + fieldValue("project_type"),
      "Current stage: " + fieldValue("current_stage"),
      "Timeline: " + fieldValue("timeline"),
      "Budget: " + (fieldValue("budget") || "Prefer not to say yet"),
      "",
      "Description:",
      fieldValue("description"),
      "",
      "Name: " + fieldValue("name"),
      "Company: " + (fieldValue("company") || "—"),
      "Business email: " + fieldValue("email"),
      "Phone / WhatsApp: " + fieldValue("phone"),
      "Country: " + fieldValue("country"),
      "Website: " + (fieldValue("website") || "—")
    ];
    return lines.join("\n");
  }

  // Returns null when valid, the string "spam" for honeypot fills, or
  // { message, field } identifying the first invalid field otherwise.
  // Validation rules are unchanged; only the shape of the result is richer
  // so the form can focus the field and expose accessible invalid state.
  function validate() {
    var required = ["project_type", "current_stage", "timeline", "description", "name", "email", "phone", "country"];
    for (var i = 0; i < required.length; i++) {
      if (!fieldValue(required[i])) return { message: "Please complete all required fields marked with *.", field: required[i] };
    }
    var email = fieldValue("email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "Please enter a valid business email.", field: "email" };
    if (fieldValue("description").length < 30) return { message: "Please describe your project in a little more detail (at least 30 characters).", field: "description" };
    var website = fieldValue("website");
    if (website && !/^https?:\/\/.+\..+/.test(website)) return { message: "Website should start with http:// or https:// — or leave it empty.", field: "website" };
    // Honeypot: if filled, silently pass as success without sending.
    var honey = form.querySelector('[name="company_website_confirm"]');
    if (honey && String(honey.value).trim() !== "") return "spam";
    return null;
  }

  // Deliberate mailto fallback (Phase 1 behavior, kept intact).
  // Only invoked when the user explicitly chooses email after an API
  // failure — never automatically. Preserves the length guard, the
  // "Email draft prepared — not sent." wording, and no truncation.
  function submitViaMailto() {
    var brief = buildBrief();
    var subject = "Project enquiry — " + fieldValue("project_type") + " — " + fieldValue("name");
    var href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(brief);
    // Oversized-URI guard: never navigate to a mailto: URI above the
    // conservative limit — it may fail silently. The brief stays in the
    // form (nothing is truncated or lost); the user can still use Copy
    // brief or the manual email fallback below.
    if (href.length > MAX_MAILTO_URI_LENGTH) {
      if (mailtoFallback) mailtoFallback.href = "mailto:" + CONTACT_EMAIL;
      showError("Your project brief is too long to open as an email draft on this device (" + href.length + " characters; the safe limit is " + MAX_MAILTO_URI_LENGTH + "). Please shorten the description, or use Copy brief and paste it into your own email to " + CONTACT_EMAIL + ".");
      markInvalid("description");
      return;
    }
    if (mailtoFallback) mailtoFallback.href = href;
    window.location.href = href;
    // NOTE: mailto: provides no delivery/open confirmation, so the message
    // below deliberately says "draft prepared" — never "sent" or "submitted".
    showMailtoSuccess();
  }

  function finishSubmitting() {
    setSubmitting(false);
  }

  function onApiSuccess(data) {
    finishSubmitting();
    var message = (data && typeof data.message === "string" && data.message)
      ? data.message
      : "Your project enquiry has been received.";
    var reference = (data && typeof data.reference_code === "string")
      ? data.reference_code
      : "";
    showApiSuccess(message, reference);
  }

  function onApiValidationError(data) {
    finishSubmitting();
    var errors = (data && data.errors && typeof data.errors === "object") ? data.errors : {};
    // Map the first backend field error (in form order) onto the
    // existing invalid-state + focus behavior.
    var names = Object.keys(FIELD_IDS);
    for (var i = 0; i < names.length; i++) {
      var fieldErrors = errors[names[i]];
      if (fieldErrors && fieldErrors.length) {
        showError(String(fieldErrors[0]));
        markInvalid(names[i]);
        return;
      }
    }
    var fallback = (data && typeof data.message === "string" && data.message)
      ? data.message
      : "Please check the highlighted fields and try again.";
    showError(fallback);
  }

  function onApiRateLimited(response) {
    finishSubmitting();
    var message = "Too many enquiries submitted. Please try again shortly.";
    try {
      var retryAfter = response && response.headers ? response.headers.get("Retry-After") : null;
      var seconds = retryAfter !== null ? parseInt(String(retryAfter), 10) : NaN;
      if (!isNaN(seconds) && seconds > 0 && seconds <= 3600) {
        message += " You can try again in " + seconds + " second" + (seconds === 1 ? "" : "s") + ".";
      }
    } catch (err) { /* header probe — keep the default message */ }
    showError(message);
  }

  function onApiNetworkError() {
    finishSubmitting();
    showError("Could not reach the enquiry service. Check your connection and try again — or continue by email.");
    showEmailFallback();
  }

  function onApiUnexpected() {
    finishSubmitting();
    // Never expose server internals: generic message + deliberate fallback.
    showError("Something went wrong while sending your enquiry. Please try again — or continue by email.");
    showEmailFallback();
  }

  function submitViaApi() {
    setSubmitting(true);
    hideEmailFallback();
    var controller = null;
    var timer = null;
    if (typeof AbortController !== "undefined") {
      controller = new AbortController();
      timer = setTimeout(function () { controller.abort(); }, API_TIMEOUT_MS);
    }
    fetch(apiEnquiriesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(buildPayload()),
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (timer) clearTimeout(timer);
      if (response.status === 201) {
        response.json().then(onApiSuccess, onApiUnexpected);
        return;
      }
      if (response.status === 422) {
        response.json().then(onApiValidationError, onApiUnexpected);
        return;
      }
      if (response.status === 429) {
        onApiRateLimited(response);
        return;
      }
      onApiUnexpected();
    }, function () {
      if (timer) clearTimeout(timer);
      onApiNetworkError();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Double-submit guard: the public API has no idempotency key, so a
      // second submit while a request is in flight is dropped entirely.
      if (isSubmitting) return;
      clearStatus();
      hideEmailFallback();
      var result = validate();
      if (result === "spam") {
        showMailtoSuccess();
        return;
      }
      if (result) {
        showError(result.message);
        markInvalid(result.field);
        return;
      }
      submitViaApi();
    });

    // Clear a control's invalid state as soon as the user starts correcting it.
    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("aria-invalid") === "true") {
        t.removeAttribute("aria-invalid");
        t.removeAttribute("aria-describedby");
      }
    });
  }

  // Deliberate email fallback: shown only after an API failure, invoked
  // only by explicit user choice. Revalidates (the user may have edited
  // the form since the failure) and never fires automatically.
  if (emailFallbackBtn && form) {
    emailFallbackBtn.addEventListener("click", function () {
      if (isSubmitting) return;
      clearStatus();
      hideEmailFallback();
      var result = validate();
      if (result === "spam") {
        showMailtoSuccess();
        return;
      }
      if (result) {
        showError(result.message);
        markInvalid(result.field);
        return;
      }
      submitViaMailto();
    });
  }

  if (copyBtn && form) {
    copyBtn.addEventListener("click", function () {
      clearStatus();
      var brief = buildBrief();
      var onOk = function () {
        copyBtn.textContent = "Copied ✓";
        setTimeout(function () { copyBtn.textContent = "Copy brief"; }, 2000);
      };
      // Only report success when copying is positively confirmed.
      var onFail = function () {
        if (successBox) successBox.hidden = true;
        copyBtn.textContent = "Copy failed";
        setTimeout(function () { copyBtn.textContent = "Copy brief"; }, 2000);
        showManualCopy(brief);
        showError("Automatic copy did not work in this browser. Your brief is shown below — please select and copy it manually.");
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(brief).then(onOk, function () {
          if (fallbackCopy(brief)) { onOk(); } else { onFail(); }
        });
      } else if (fallbackCopy(brief)) {
        onOk();
      } else {
        onFail();
      }
    });
  }

  // execCommand-based fallback. Returns true only when the browser reports success.
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // Last resort: render the brief in a readonly field so it stays available
  // for manual selection/copying. Created once and reused on later failures.
  function showManualCopy(text) {
    var existing = document.getElementById("brief-manual-copy");
    if (!existing) {
      var wrap = document.createElement("div");
      wrap.className = "field";
      var label = document.createElement("label");
      label.setAttribute("for", "brief-manual-copy");
      label.textContent = "Your project brief (select and copy manually)";
      existing = document.createElement("textarea");
      existing.id = "brief-manual-copy";
      existing.rows = 8;
      existing.readOnly = true;
      wrap.appendChild(label);
      wrap.appendChild(existing);
      var actions = form.querySelector(".form-actions");
      if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(wrap, actions.nextSibling);
      } else {
        form.appendChild(wrap);
      }
    }
    existing.value = text;
    existing.hidden = false;
    existing.focus();
    existing.select();
  }
})();
