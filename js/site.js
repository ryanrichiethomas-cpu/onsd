/* Ontario Speed Dating: page behaviour (smooth scroll, nav, filters, contact form). */
(function () {
  "use strict";

  var doc = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var D = window.ONSD_DATA, F = window.ONSD_FMT, CFG = window.ONSD_CONFIG || {};
  var ONSD = (window.ONSD = window.ONSD || {});

  /* ---------- Smooth scrolling: genuine Lenis, off for reduced motion ---------- */
  var lenis = null;
  if (!reduce.matches && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ lerp: 0.075, wheelMultiplier: 0.85, smoothWheel: true });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  ONSD.lenis = lenis;

  function headerOffset() {
    var h = document.getElementById("site-header");
    return h ? h.offsetHeight : 0;
  }

  ONSD.scrollToY = function (y, opts) {
    opts = opts || {};
    if (lenis) lenis.scrollTo(y, { duration: opts.duration || 1.6, immediate: !!opts.immediate });
    else window.scrollTo({ top: y, behavior: reduce.matches || opts.immediate ? "auto" : "smooth" });
  };

  ONSD.scrollToEl = function (el, focus) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - headerOffset() + 1;
    ONSD.scrollToY(y);
    if (focus) {
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    }
  };

  /* In page links: smooth scroll and move focus to the target for keyboard users. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (a.dataset.prefill) prefillContact(a.dataset.prefill);
    var target = id === "top" ? document.body : document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    if (id === "top") { ONSD.scrollToY(0); return; }
    if (id === "main") {
      /* Skip link: jump straight past the film, no scrub. */
      var y = target.getBoundingClientRect().top + window.scrollY - headerOffset() + 1;
      ONSD.scrollToY(y, { immediate: true });
      target.focus({ preventScroll: true });
      return;
    }
    ONSD.scrollToEl(target, true);
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });

  /* ---------- Header: transparent over the film, solid after ---------- */
  var header = document.getElementById("site-header");
  var journey = document.getElementById("journey");
  function updateHeader() {
    var r = journey.getBoundingClientRect();
    header.classList.toggle("is-solid", r.bottom <= header.offsetHeight + 2);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
  updateHeader();

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("primary-nav");
  function closeMenu() {
    if (!toggle) return;
    toggle.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }
  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    if (open) { var first = nav.querySelector("a"); if (first) first.focus(); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { closeMenu(); toggle.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".site-header")) closeMenu();
  });

  /* ---------- Event sales status (computed from the real sales close times) ---------- */
  ONSD.eventState = function (ev) {
    var now = Date.now();
    if (new Date(ev.start).getTime() <= now) return { open: false, reason: "past", text: "This night has passed." };
    if (ev.salesClose && new Date(ev.salesClose).getTime() <= now) {
      return { open: false, reason: "closed", text: "Ticket sales closed " + F.salesCloseLine(ev) + "." };
    }
    if (ev.remaining && ev.remaining.male <= 0 && ev.remaining.female <= 0) {
      return { open: false, reason: "full", text: "This night is full on both sides." };
    }
    return { open: true };
  };

  D.events.forEach(function (ev) {
    var card = document.querySelector('[data-event-id="' + ev.id + '"]');
    if (!card) return;
    var st = ONSD.eventState(ev);
    if (!st.open) {
      card.classList.add("is-closed");
      var s = card.querySelector("[data-status]");
      s.textContent = st.text;
      s.hidden = false;
      var b = card.querySelector(".event-book");
      b.firstChild.textContent = st.reason === "past" ? "Details" : "Closed";
    }
  });

  /* ---------- Event filters ---------- */
  var filters = Array.prototype.slice.call(document.querySelectorAll(".filter"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".event-card"));
  var status = document.getElementById("filter-status");
  function applyFilter(f) {
    var shown = 0;
    filters.forEach(function (b) {
      var on = b.dataset.filter === f;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    cards.forEach(function (c) {
      var ok = f === "all" || c.dataset.city === f || (f === "crawl" && c.dataset.format === "crawl");
      c.hidden = !ok;
      if (ok) shown++;
    });
    status.textContent = "Showing " + shown + (shown === 1 ? " night" : " nights") + ".";
    if (lenis) lenis.resize();
  }
  filters.forEach(function (b) { b.addEventListener("click", function () { applyFilter(b.dataset.filter); }); });
  document.querySelectorAll("[data-filter-jump]").forEach(function (b) {
    b.addEventListener("click", function () {
      applyFilter(b.dataset.filterJump);
      ONSD.scrollToEl(document.getElementById("events"), false);
      var on = document.querySelector('.filter[data-filter="' + b.dataset.filterJump + '"]');
      if (on) on.focus({ preventScroll: true });
    });
  });

  /* ---------- Contact form (validated; preview mode does not send) ---------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  ONSD.EMAIL_RE = EMAIL_RE;

  function prefillContact(kind) {
    var msg = document.getElementById("c-message");
    if (kind === "floater" && msg && !msg.value.trim()) {
      msg.value = "I would like a Floater ticket.\nMy age: \nMy weekly availability (at least 4 hours): \nVenue or area limits: ";
    }
  }

  var form = document.getElementById("contact-form");
  var cStatus = document.getElementById("contact-status");
  function setErr(input, msg) {
    var err = document.getElementById(input.id + "-err");
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }
  function validateContact() {
    var bad = [];
    var n = form.elements.name, em = form.elements.email, m = form.elements.message;
    var nv = n.value.trim(), ev = em.value.trim(), mv = m.value.trim();
    setErr(n, nv.length < 2 ? "Please enter your name." : ""); if (nv.length < 2) bad.push(n);
    var emOk = EMAIL_RE.test(ev);
    setErr(em, emOk ? "" : "Please enter a valid email address, like name@example.com."); if (!emOk) bad.push(em);
    setErr(m, mv.length < 10 ? "Please write a message of at least 10 characters." : ""); if (mv.length < 10) bad.push(m);
    return bad;
  }
  ["name", "email", "message"].forEach(function (k) {
    form.elements[k].addEventListener("blur", function () {
      if (form.elements[k].getAttribute("aria-invalid") === "true") validateContact();
    });
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    cStatus.textContent = "";
    var bad = validateContact();
    if (bad.length) { bad[0].focus(); return; }
    var payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim()
    };
    if (!CFG.contactEndpoint) {
      cStatus.textContent = "Preview mode: this form is not connected yet, so your message was not sent. On the live site it goes straight to Ontario Speed Dating.";
      return;
    }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    fetch(CFG.contactEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error("bad status");
      form.reset();
      cStatus.textContent = "Thank you. Your message was sent. Replies take 2 to 48 hours.";
    }).catch(function () {
      cStatus.textContent = "Sorry, the message could not be sent. Please try again in a moment.";
    }).then(function () { btn.disabled = false; });
  });
})();
