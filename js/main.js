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
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
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
            a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { navObserver.observe(s); });
  }

  // ---- Reveal on scroll ----
  var revealTargets = document.querySelectorAll(".card, .work-card, .steps li, .stack-group, .about-card, .hero-card");
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

  // ---- Service filters ----
  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("#service-grid .card"));
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      var f = chip.getAttribute("data-filter");
      cards.forEach(function (card) {
        var show = f === "all" || card.getAttribute("data-category") === f;
        card.style.display = show ? "" : "none";
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
