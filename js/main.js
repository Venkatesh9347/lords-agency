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

  // ---- Service filters ----
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("#service-grid .card"));
  var groups = Array.prototype.slice.call(document.querySelectorAll("#service-grid .svc-group"));
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) {
        c.classList.remove("is-active");
        c.removeAttribute("aria-pressed");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
      var f = chip.getAttribute("data-filter");
      cards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-category") === f;
        card.style.display = show ? "" : "none";
        if (show) {
          // Restart the subtle entrance so filtering feels alive (transform/opacity only).
          card.style.animation = "none";
          void card.offsetWidth;
          card.style.animation = "";
        }
      });
      // Hide empty group headings when filtering (keeps counts accurate).
      groups.forEach(function (group) {
        var visible = Array.prototype.filter.call(group.querySelectorAll(".card"), function (card) {
          return card.style.display !== "none";
        });
        group.style.display = visible.length ? "" : "none";
      });
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
    clearInvalidState();
  }

  function fieldValue(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value).trim() : "";
  }

  function buildBrief() {
    var lines = [
      "New project enquiry — LORDS AGENCY (pipeline: NEW)",
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

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearStatus();
      var result = validate();
      if (result === "spam") {
        if (successBox) successBox.hidden = false;
        return;
      }
      if (result) {
        showError(result.message);
        markInvalid(result.field);
        return;
      }
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
      if (successBox) successBox.hidden = false;
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
