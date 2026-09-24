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

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
  function clearStatus() {
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ""; }
    if (successBox) successBox.hidden = true;
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

  function validate() {
    var required = ["project_type", "current_stage", "timeline", "description", "name", "email", "phone", "country"];
    for (var i = 0; i < required.length; i++) {
      if (!fieldValue(required[i])) return "Please complete all required fields marked with *.";
    }
    var email = fieldValue("email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid business email.";
    if (fieldValue("description").length < 30) return "Please describe your project in a little more detail (at least 30 characters).";
    var website = fieldValue("website");
    if (website && !/^https?:\/\/.+\..+/.test(website)) return "Website should start with http:// or https:// — or leave it empty.";
    // Honeypot: if filled, silently pass as success without sending.
    var honey = form.querySelector('[name="company_website_confirm"]');
    if (honey && String(honey.value).trim() !== "") return "spam";
    return "";
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearStatus();
      var problem = validate();
      if (problem === "spam") {
        if (successBox) successBox.hidden = false;
        return;
      }
      if (problem) {
        showError(problem);
        return;
      }
      var brief = buildBrief();
      var subject = "Project enquiry — " + fieldValue("project_type") + " — " + fieldValue("name");
      var href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(brief);
      if (mailtoFallback) mailtoFallback.href = href;
      window.location.href = href;
      if (successBox) successBox.hidden = false;
    });
  }

  if (copyBtn && form) {
    copyBtn.addEventListener("click", function () {
      var brief = buildBrief();
      var done = function () {
        copyBtn.textContent = "Copied ✓";
        setTimeout(function () { copyBtn.textContent = "Copy brief"; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(brief).then(done, function () { fallbackCopy(brief); done(); });
      } else {
        fallbackCopy(brief);
        done();
      }
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) { /* noop */ }
    document.body.removeChild(ta);
  }
})();
