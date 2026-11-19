/* Ontario Speed Dating: booking panel.
   Follows the real box office order: event, gender, quantity, ticket holders
   (or Go Express), age confirmation, order summary, payment.
   Membership mode: tier, consultation preference, name and email, payment.

   Payment integration point: window.ONSD_CONFIG.cloverCheckoutEndpoint
   (js/config.js). null = preview mode, nothing is sent and no charge is made.
   A URL = live mode, see submitLive() below. No keys or secrets live here. */
(function () {
  "use strict";

  var D = window.ONSD_DATA, F = window.ONSD_FMT, CFG = window.ONSD_CONFIG || {};
  var ONSD = (window.ONSD = window.ONSD || {});
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var KEY = "onsd-booking-v1";
  var LIVE = typeof CFG.cloverCheckoutEndpoint === "string" && /^https:\/\//.test(CFG.cloverCheckoutEndpoint);
  var UI_MAX_QTY = 10; /* only used when a listing states no capacity */

  var root = document.getElementById("booking");
  var panel = root.querySelector(".booking-panel");
  var titleEl = document.getElementById("booking-title");
  var stepEl = document.getElementById("booking-step");
  var form = document.getElementById("booking-form");
  var content = document.getElementById("booking-content");
  var errorsEl = document.getElementById("booking-errors");
  var backBtn = document.getElementById("booking-back");
  var nextBtn = document.getElementById("booking-next");
  var headerCta = document.getElementById("header-cta");
  var outside = ["site-header", "journey", "main"].map(function (id) { return document.getElementById(id); })
    .concat([document.querySelector(".chapters-static"), document.querySelector(".site-footer"), document.querySelector(".skip-link")]);

  var EVENT_STEPS = ["summary", "tickets", "holders", "age", "review", "pay", "done"];
  var MEMBER_STEPS = ["tier", "details", "review", "pay", "done"];
  var STEP_NAMES = {
    summary: "Your night", tickets: "Tickets", holders: "Ticket holders", age: "Age check",
    review: "Order summary", pay: "Payment", done: "Confirmation", tier: "Membership", details: "Your details"
  };

  var state = null;
  var opener = null;
  var isOpen = false;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function eventById(id) { for (var i = 0; i < D.events.length; i++) if (D.events[i].id === id) return D.events[i]; return null; }
  function tierById(id) { for (var i = 0; i < D.tiers.length; i++) if (D.tiers[i].id === id) return D.tiers[i]; return null; }
  function steps() { return state.mode === "membership" ? MEMBER_STEPS : EVENT_STEPS; }
  function stepName() { return steps()[state.step]; }
  function ev() { return eventById(state.eventId); }
  function venue() { return D.venues[ev().venue]; }
  function cap(side) {
    var e = ev();
    if (!e.capacity) return UI_MAX_QTY;
    var r = e.remaining ? e.remaining[side] : e.capacity[side];
    return Math.max(0, Math.min(r, e.capacity[side]));
  }
  function maxQty() { return state.gender ? cap(state.gender) : 0; }
  function total() {
    if (state.mode === "membership") return tierById(state.tier).price;
    return ev().price * state.qty;
  }

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    syncCta();
  }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || "null");
      if (!s || (s.mode === "event" && !eventById(s.eventId)) || (s.mode === "membership" && !tierById(s.tier))) return null;
      return s;
    } catch (e) { return null; }
  }
  function clear() {
    state = null;
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    syncCta();
  }
  function hasDraft() { return state && stepName() !== "done"; }
  function syncCta() {
    if (!headerCta) return;
    headerCta.textContent = hasDraft() ? "Resume booking" : "Find your night";
  }

  function freshEvent(id) {
    return { mode: "event", eventId: id, step: 0, gender: "", qty: 1, express: false,
             holders: [{ name: "", email: "" }], buyer: { name: "", email: "" },
             ageOk: false, idOk: false, crawlOk: false, payMethod: "card" };
  }
  function freshMember(tier) {
    return { mode: "membership", tier: tier || "bronze", step: 0, consult: "", buyer: { name: "", email: "" },
             ageOk: false, payMethod: "card" };
  }

  /* ---------- open / close ---------- */
  ONSD.openEvent = function (id, from) {
    if (!eventById(id)) return;
    if (!(state && state.mode === "event" && state.eventId === id && stepName() !== "done")) state = freshEvent(id);
    open(from);
  };
  ONSD.openMembership = function (tier, from) {
    if (state && state.mode === "membership" && stepName() !== "done") {
      if (tier && tierById(tier) && stepName() === "tier") state.tier = tier;
    } else {
      state = freshMember(tier);
    }
    open(from);
  };

  function open(from) {
    opener = from || document.activeElement;
    save();
    root.hidden = false;
    document.documentElement.classList.add("booking-open");
    outside.forEach(function (el) { if (el) el.inert = true; });
    if (ONSD.lenis) ONSD.lenis.stop();
    isOpen = true;
    render(true);
    requestAnimationFrame(function () { root.classList.add("is-open"); });
    fitViewport();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (state && stepName() === "done") clear();
    else if (state) { collect(); save(); }
    root.classList.remove("is-open");
    outside.forEach(function (el) { if (el) el.inert = false; });
    document.documentElement.classList.remove("booking-open");
    if (ONSD.lenis) ONSD.lenis.start();
    setTimeout(function () { if (!isOpen) root.hidden = true; }, 420);
    var back = opener && document.body.contains(opener) ? opener : headerCta;
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  /* ---------- rendering ---------- */
  function rows(list) {
    return '<dl class="bk-rows">' + list.map(function (r) {
      return '<div' + (r[2] ? ' class="' + r[2] + '"' : "") + "><dt>" + esc(r[0]) + "</dt><dd>" + r[1] + "</dd></div>";
    }).join("") + "</dl>";
  }

  function summaryCard() {
    var e = ev(), v = venue();
    return '<div class="bk-summary">' +
      '<img src="' + v.photo + '" width="' + v.w + '" height="' + v.h + '" alt="' + esc(v.alt) + '">' +
      '<div class="bk-summary-body"><p class="label">' + (e.format === "crawl" ? "Dating + Pub Crawl" : "Speed dating") + "</p>" +
      "<h3>" + esc(F.longDate(e.start)) + "</h3>" +
      rows([
        ["Time", esc(F.timeRange(e.start, e.end))],
        ["Venue", esc(v.name) + "<br>" + esc(v.address)],
        ["Ages", esc(F.ages(e))],
        ["Includes", esc(e.includes)],
        ["Price", esc(F.money(e.price)) + " per ticket, taxes included"]
      ]) + "</div></div>";
  }

  var R = {};

  R.summary = function () {
    var st = ONSD.eventState ? ONSD.eventState(ev()) : { open: true };
    var html = summaryCard();
    if (!st.open) {
      html += '<p class="bk-alert">' + esc(st.text) + " Tickets for this night are no longer for sale. Please pick another night.</p>";
    } else {
      html += '<p class="bk-note">Tickets close ' + esc(F.salesCloseLine(ev())) + ". Tickets are sold only on this site.</p>";
    }
    return html;
  };

  R.tickets = function () {
    var e = ev();
    var m = cap("male"), f = cap("female");
    var sideInfo = function (n) {
      if (!e.capacity) return "Capacity not stated on the listing";
      return n > 0 ? n + (n === 1 ? " seat" : " seats") + " for sale" : "Sold out";
    };
    var html = '<fieldset class="bk-section"><legend class="bk-legend">Choose gender</legend><div class="choice-grid">' +
      choice("gender", "male", "Male", sideInfo(m), state.gender === "male", m <= 0) +
      choice("gender", "female", "Female", sideInfo(f), state.gender === "female", f <= 0) +
      '</div><p class="field-error" id="err-gender"></p>';
    if (e.capacity && m <= 0) html += '<p class="bk-alert">Male tickets for this night are sold out.' + (f > 0 ? " Female tickets are still available." : "") + "</p>";
    if (e.capacity && f <= 0) html += '<p class="bk-alert">Female tickets for this night are sold out.' + (m > 0 ? " Male tickets are still available." : "") + "</p>";
    html += "</fieldset>";

    var max = maxQty();
    html += '<div class="bk-section"><h3 id="qty-label">Number of tickets</h3>' +
      '<div class="stepper" role="group" aria-labelledby="qty-label">' +
      '<button type="button" data-qty="-1" aria-label="One fewer ticket"' + (state.qty <= 1 || !state.gender ? " disabled" : "") + ">&minus;</button>" +
      '<input id="bk-qty" name="qty" type="number" inputmode="numeric" min="1" max="' + (max || 1) + '" value="' + state.qty + '" aria-label="Number of tickets" aria-describedby="qty-hint err-qty"' + (!state.gender ? " disabled" : "") + ">" +
      '<button type="button" data-qty="1" aria-label="One more ticket"' + (!state.gender || state.qty >= max ? " disabled" : "") + ">+</button>" +
      "</div>" +
      '<p class="field-hint" id="qty-hint" style="margin-top:10px">' +
      (!state.gender ? "Choose a gender first." :
        e.capacity ? "Up to " + max + " on the " + state.gender + " side for this night." : "This listing does not state a capacity.") +
      '</p><p class="field-error" id="err-qty"></p></div>';
    html += '<p class="bk-note">' + esc(F.money(e.price)) + " per ticket, taxes and the service fee included.</p>";
    return html;
  };

  function choice(name, value, title, sub, checked, disabled) {
    var id = "c-" + name + "-" + value;
    return '<div class="choice"><input type="radio" id="' + id + '" name="' + name + '" value="' + esc(value) + '"' +
      (checked ? " checked" : "") + (disabled ? " disabled" : "") + '>' +
      '<label for="' + id + '"><strong>' + esc(title) + "</strong>" + (sub ? "<span>" + esc(sub) + "</span>" : "") + "</label></div>";
  }

  function field(id, label, value, type, auto, extra) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + "</label>" +
      '<input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value) + '"' +
      (auto ? ' autocomplete="' + auto + '"' : "") + (type === "email" ? ' inputmode="email" autocapitalize="off" spellcheck="false"' : "") +
      ' maxlength="120" aria-describedby="' + id + '-err"' + (extra || "") + ">" +
      '<p class="field-error" id="' + id + '-err"></p></div>';
  }

  R.holders = function () {
    var html = '<div class="toggle-row"><div><label for="bk-express">Go Express</label>' +
      "<p>Skip ticket holder details now.</p></div>" +
      '<span class="switch"><input type="checkbox" role="switch" id="bk-express"' + (state.express ? " checked" : "") + '><span aria-hidden="true"></span></span></div>';
    if (state.express) {
      html += '<p class="bk-note">With Go Express, holder names show as "Not available". Send each holder\'s name and email, or mobile number and carrier, by email before event day, or give them to the host on site.</p>';
      html += '<div class="bk-section"><h3>Your details</h3><p class="field-hint" style="margin-bottom:14px">For your receipt and event updates.</p>' +
        field("bk-buyer-name", "Your name", state.buyer.name, "text", "name") +
        field("bk-buyer-email", "Your email", state.buyer.email, "email", "email") + "</div>";
    } else {
      html += '<div class="bk-section">';
      for (var i = 0; i < state.qty; i++) {
        var h = state.holders[i] || { name: "", email: "" };
        html += '<div class="holder"><h4>Ticket ' + (i + 1) + (state.qty > 1 ? " of " + state.qty : "") + "</h4>" +
          field("bk-h-name-" + i, "Ticket holder name", h.name, "text", i === 0 ? "name" : "off") +
          field("bk-h-email-" + i, "Ticket holder email", h.email, "email", i === 0 ? "email" : "off") + "</div>";
      }
      html += '<p class="field-hint">Match results are sent to each holder\'s email.</p></div>';
    }
    return html;
  };

  function ageRule(e) {
    if (!e.ages) {
      return "This listing does not state an age range. Each ticket holder is at least 19, the minimum age for every event, or turns 19 by Dec 31 at 11:59 PM this year.";
    }
    if (!e.ages.max) {
      return "Each ticket holder is " + e.ages.min + " or older, or turns " + e.ages.min + " by Dec 31 at 11:59 PM this year.";
    }
    return "Each ticket holder's age is within " + e.ages.min + " to " + e.ages.max + ", or they turn " + e.ages.min +
      " by Dec 31 at 11:59 PM this year, or they turn " + (e.ages.max + 1) + " by Dec 31.";
  }

  function check(id, text, checked) {
    return '<label class="check" for="' + id + '"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") +
      ' aria-describedby="' + id + '-err"><span>' + text + "</span></label>" +
      '<p class="field-error" id="' + id + '-err"></p>';
  }

  R.age = function () {
    var e = ev();
    var html = '<p class="bk-note" style="margin-top:0">' +
      (e.ages ? "This night is for ages " + esc(F.ages(e)) + "." : "The listing for this night does not state an age range.") +
      " Minimum age to take part is 19.</p>";
    html += '<div class="bk-section">' +
      check("bk-age", esc(ageRule(e)), state.ageOk) +
      check("bk-id", "I understand photo ID may be requested if age is disputed: a Canadian passport, an Ontario Photo Card or an Ontario Driver's Licence. Health cards are not accepted.", state.idOk);
    if (e.format === "crawl") {
      html += check("bk-crawl", "I understand a signed waiver is required, tickets do not include alcohol, and government photo ID and dress shoes are needed for the clubs.", state.crawlOk);
    }
    html += "</div>";
    return html;
  };

  function namesList() {
    if (state.mode === "membership") return esc(state.buyer.name);
    if (state.express) return 'Go Express: holder details to follow (shown as "Not available")';
    return '<ul class="bk-names">' + state.holders.slice(0, state.qty).map(function (h) { return "<li>" + esc(h.name) + "</li>"; }).join("") + "</ul>";
  }

  R.review = function () {
    if (state.mode === "membership") {
      var t = tierById(state.tier);
      return rows([
        ["Membership", esc(t.name) + ", 90 days"],
        ["Includes", esc(t.includes.join(", "))],
        ["Consultation", state.consult === "in-person" ? "In person, with one complimentary drink" : "Online, free"],
        ["Name", esc(state.buyer.name)],
        ["Email", esc(state.buyer.email)],
        ["Total", esc(F.money(t.price)), "bk-total"]
      ]) + '<p class="bk-note">Consultations last 1 hour. Breaks pause match notifications free of charge but do not extend the 90 days.</p>';
    }
    var e = ev(), v = venue();
    var html = rows([
      ["Night", esc(F.longDate(e.start)) + ", " + esc(F.timeRange(e.start, e.end))],
      ["Venue", esc(v.name) + ", " + esc(v.city)],
      ["Tickets", state.qty + " &times; " + (state.gender === "male" ? "Male" : "Female")],
      ["Per ticket", esc(F.money(e.price))],
      ["Holders", namesList()],
      ["Total", esc(F.money(total())), "bk-total"]
    ]);
    html += '<p class="bk-note">Taxes and the service fee are already included in the ticket price. Nothing is added on top.</p>';
    if (state.qty > 1) html += '<p class="bk-note">A multi buy discount applies to several tickets for one night in one order. Its amount is not published, so this preview shows the full price.</p>';
    return html;
  };

  R.pay = function () {
    var html = '<div class="bk-section"><p class="label" style="margin-bottom:8px">Total</p><p class="bk-pay-total" style="font-family:var(--serif);font-size:40px;line-height:1;color:var(--amber)">' +
      esc(F.money(total())) + "</p>" +
      (state.mode === "event" ? '<p class="bk-note" style="margin-top:8px">Taxes and the service fee included.</p>' : "") + "</div>";
    html += '<fieldset class="bk-section"><legend class="bk-legend">Pay with</legend><div class="pay-methods">' +
      choice("pay", "card", "Card", "Visa, Mastercard, Amex and more", state.payMethod === "card") +
      choice("pay", "googlepay", "Google Pay", "", state.payMethod === "googlepay") +
      choice("pay", "applepay", "Apple Pay", "", state.payMethod === "applepay") +
      choice("pay", "interac", "Interac E-transfer", "", state.payMethod === "interac") +
      "</div></fieldset>";
    if (LIVE) {
      html += '<p class="bk-note">You will finish payment on Clover\'s secure checkout page. Card details are shared only with Clover.</p>';
    } else if (state.payMethod === "card") {
      html += '<div class="card-fields">' +
        '<div class="field field--full"><label for="bk-cc-name">Name on card</label><input id="bk-cc-name" type="text" autocomplete="off" maxlength="80" aria-describedby="bk-cc-name-err"><p class="field-error" id="bk-cc-name-err"></p></div>' +
        '<div class="field field--full"><label for="bk-cc-number">Card number</label><input id="bk-cc-number" type="text" inputmode="numeric" autocomplete="off" maxlength="23" placeholder="1234 5678 9012 3456" aria-describedby="bk-cc-hint bk-cc-number-err"><p class="field-hint" id="bk-cc-hint">Preview: nothing typed here is sent or saved. Please do not use a real card.</p><p class="field-error" id="bk-cc-number-err"></p></div>' +
        '<div class="field"><label for="bk-cc-exp">Expiry (MM/YY)</label><input id="bk-cc-exp" type="text" inputmode="numeric" autocomplete="off" maxlength="5" placeholder="MM/YY" aria-describedby="bk-cc-exp-err"><p class="field-error" id="bk-cc-exp-err"></p></div>' +
        '<div class="field"><label for="bk-cc-cvc">Security code</label><input id="bk-cc-cvc" type="text" inputmode="numeric" autocomplete="off" maxlength="4" aria-describedby="bk-cc-cvc-err"><p class="field-error" id="bk-cc-cvc-err"></p></div>' +
        '<div class="field field--full"><label for="bk-cc-postal">Postal code</label><input id="bk-cc-postal" type="text" autocomplete="off" maxlength="10" autocapitalize="characters" aria-describedby="bk-cc-postal-err"><p class="field-error" id="bk-cc-postal-err"></p></div>' +
        "</div>";
    } else if (state.payMethod === "interac") {
      html += '<p class="bk-note">Interac E-transfer orders are added to the attendee list after a manual check, usually 1 to 48 hours.</p>';
    } else {
      html += '<p class="bk-note">' + (state.payMethod === "googlepay" ? "Google Pay" : "Apple Pay") + " opens on Clover's secure checkout on the live site.</p>";
    }
    html += '<p class="accepted">Accepted: Visa, Mastercard, American Express, Discover, JCB, UnionPay, Visa Debit, Mastercard Debit, Google Pay, Apple Pay, Interac E-transfer, and cash by appointment. PayPal is not accepted.</p>';
    if (!LIVE) html += '<p class="preview-print">Preview checkout. Live payments connect to the owner\'s Clover account.</p>';
    return html;
  };

  R.done = function () {
    var c = state.confirmation || {};
    var html = '<div class="bk-done-mark" aria-hidden="true"></div>' +
      '<p style="font-size:17px">No payment was taken. This was the preview checkout.</p>';
    if (state.mode === "membership") {
      html += rows([
        ["Membership", esc(c.title)],
        ["Consultation", esc(c.consult)],
        ["Name", esc(c.names && c.names[0])],
        ["Total", esc(c.total), "bk-total"]
      ]);
      html += '<p class="bk-note">The first step of every membership is a 1 hour consultation.</p>';
    } else {
      html += rows([
        ["Night", esc(c.title)],
        ["Venue", esc(c.venue)],
        ["Tickets", esc(c.tickets)],
        ["Names", c.express ? 'Go Express: holder details to follow' : '<ul class="bk-names">' + (c.names || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>"],
        ["Total", esc(c.total) + " <span style=\"font-family:var(--sans);font-size:13px;color:var(--paper-dim)\">taxes included</span>", "bk-total"]
      ]);
      html += '<p class="bk-note">Scores are sent 1 to 72 hours after the last round.</p>';
    }
    html += '<p class="bk-alert">On the live site, a receipt would come from Clover and a second one from Ontario Speed Dating.</p>';
    return html;
  };

  R.tier = function () {
    var html = '<fieldset class="bk-section"><legend class="bk-legend">Choose a membership</legend><div class="choice-grid choice-grid--stack">';
    D.tiers.forEach(function (t) {
      html += choice("tier", t.id, t.name + ", " + F.money(t.price) + " for 90 days", t.includes.join(", "), state.tier === t.id);
    });
    html += '</div><p class="field-error" id="err-tier"></p></fieldset>';
    html += '<p class="bk-note">Matches come only from paying members. The host is present on site, and the venue and time are agreed by both of you.</p>';
    return html;
  };

  R.details = function () {
    var html = '<fieldset class="bk-section"><legend class="bk-legend">Consultation</legend><div class="choice-grid choice-grid--stack">' +
      choice("consult", "online", "Online", "Free", state.consult === "online") +
      choice("consult", "in-person", "In person", "With one complimentary drink", state.consult === "in-person") +
      '</div><p class="field-hint" style="margin-top:8px">A consultation lasts 1 hour.</p><p class="field-error" id="err-consult"></p></fieldset>';
    html += '<div class="bk-section"><h3>Your details</h3>' +
      field("bk-buyer-name", "Your name", state.buyer.name, "text", "name") +
      field("bk-buyer-email", "Your email", state.buyer.email, "email", "email") +
      check("bk-age", "I am 19 or older, the minimum age to become a member.", state.ageOk) + "</div>";
    return html;
  };

  function render(focusTitle) {
    var name = stepName();
    var list = steps();
    var last = list.length - 1;
    var e = state.mode === "event" ? ev() : null;
    var closed = e && ONSD.eventState && !ONSD.eventState(e).open;

    stepEl.textContent = name === "done" ? "Preview complete" : "Step " + (state.step + 1) + " of " + last + " · " + STEP_NAMES[name];
    titleEl.textContent =
      name === "done" ? (state.mode === "membership" ? "Membership booked (preview)" : "Booking complete (preview)") :
      state.mode === "membership" ? (name === "tier" ? "Matchmaker membership" : STEP_NAMES[name]) :
      name === "summary" ? venue().name : STEP_NAMES[name];

    content.innerHTML = R[name]();
    errorsEl.textContent = "";

    backBtn.hidden = state.step === 0 || name === "done";
    nextBtn.disabled = false;
    if (name === "done") nextBtn.textContent = "Done";
    else if (name === "summary" && closed) nextBtn.textContent = "See other nights";
    else if (name === "pay") nextBtn.textContent = LIVE ? "Continue to secure checkout" : "Complete preview booking";
    else if (name === "review") nextBtn.textContent = "Continue to payment";
    else nextBtn.textContent = "Continue";

    form.scrollTop = 0;
    if (focusTitle) titleEl.focus({ preventScroll: true });
  }

  /* ---------- live state collection (so closing mid flow keeps everything) ---------- */
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : null; }
  function checked(id) { var el = document.getElementById(id); return el ? el.checked : null; }

  function collect() {
    if (!state) return;
    var name = stepName();
    var radio = function (n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ""; };
    if (name === "tickets") {
      var g = radio("gender"); if (g) state.gender = g;
      var q = parseInt(val("bk-qty"), 10); if (!isNaN(q)) state.qty = q;
    } else if (name === "holders") {
      if (state.express) {
        state.buyer.name = val("bk-buyer-name") || ""; state.buyer.email = val("bk-buyer-email") || "";
      } else {
        for (var i = 0; i < state.qty; i++) {
          state.holders[i] = { name: val("bk-h-name-" + i) || "", email: val("bk-h-email-" + i) || "" };
        }
      }
    } else if (name === "age") {
      state.ageOk = !!checked("bk-age"); state.idOk = !!checked("bk-id");
      if (checked("bk-crawl") !== null) state.crawlOk = !!checked("bk-crawl");
    } else if (name === "tier") {
      var t = radio("tier"); if (t) state.tier = t;
    } else if (name === "details") {
      var c = radio("consult"); if (c) state.consult = c;
      state.buyer.name = val("bk-buyer-name") || ""; state.buyer.email = val("bk-buyer-email") || "";
      state.ageOk = !!checked("bk-age");
    } else if (name === "pay") {
      var p = radio("pay"); if (p) state.payMethod = p;
      /* card fields are never collected into state or storage */
    }
  }

  /* ---------- validation ---------- */
  function setFieldError(id, msg) {
    var el = document.getElementById(id);
    var err = document.getElementById(id + "-err") || document.getElementById("err-" + id);
    if (el && el.tagName === "INPUT") el.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }
  function luhn(num) {
    var sum = 0, alt = false;
    for (var i = num.length - 1; i >= 0; i--) {
      var n = parseInt(num.charAt(i), 10);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  function validate() {
    var name = stepName();
    var bad = []; /* [elementId, message] */
    function need(cond, id, msg) { setFieldError(id, cond ? "" : msg); if (!cond) bad.push([id, msg]); }
    function nameOk(s) { return s && s.length >= 2 && /[A-Za-zÀ-ɏ]/.test(s); }

    if (name === "tickets") {
      var e = ev();
      var gOk = state.gender === "male" || state.gender === "female";
      var side = gOk ? cap(state.gender) : 0;
      setFieldError("gender", "");
      document.getElementById("err-gender").textContent = gOk ? "" : "Please choose Male or Female.";
      if (!gOk) bad.push(["c-gender-male", "Please choose Male or Female."]);
      else if (side <= 0) {
        document.getElementById("err-gender").textContent = (state.gender === "male" ? "Male" : "Female") + " tickets for this night are sold out.";
        bad.push(["c-gender-" + state.gender, "That side is sold out."]);
      }
      if (gOk && side > 0) {
        var q = state.qty;
        var qOk = Number.isInteger(q) && q >= 1 && q <= side;
        document.getElementById("err-qty").textContent = qOk ? "" :
          (e.capacity ? "Choose between 1 and " + side + " tickets. That is all the " + state.gender + " seats left for this night." : "Choose between 1 and " + side + " tickets.");
        if (!qOk) bad.push(["bk-qty", "Check the number of tickets."]);
      }
    } else if (name === "holders") {
      if (state.express) {
        need(nameOk(state.buyer.name), "bk-buyer-name", "Please enter your name.");
        need(EMAIL_RE.test(state.buyer.email), "bk-buyer-email", "Please enter a valid email address.");
      } else {
        for (var i = 0; i < state.qty; i++) {
          var h = state.holders[i];
          need(nameOk(h.name), "bk-h-name-" + i, "Please enter the name for ticket " + (i + 1) + ".");
          need(EMAIL_RE.test(h.email), "bk-h-email-" + i, "Please enter a valid email for ticket " + (i + 1) + ".");
        }
      }
    } else if (name === "age") {
      need(state.ageOk, "bk-age", "Please confirm the age rule for every ticket holder.");
      need(state.idOk, "bk-id", "Please confirm you understand photo ID may be requested.");
      if (ev().format === "crawl") need(state.crawlOk, "bk-crawl", "Please confirm the pub crawl requirements.");
    } else if (name === "tier") {
      var tOk = !!tierById(state.tier);
      document.getElementById("err-tier").textContent = tOk ? "" : "Please choose a membership.";
      if (!tOk) bad.push(["c-tier-bronze", "Please choose a membership."]);
    } else if (name === "details") {
      var cOk = state.consult === "online" || state.consult === "in-person";
      document.getElementById("err-consult").textContent = cOk ? "" : "Please choose online or in person.";
      if (!cOk) bad.push(["c-consult-online", "Please choose a consultation type."]);
      need(nameOk(state.buyer.name), "bk-buyer-name", "Please enter your name.");
      need(EMAIL_RE.test(state.buyer.email), "bk-buyer-email", "Please enter a valid email address.");
      need(state.ageOk, "bk-age", "Please confirm you are 19 or older.");
    } else if (name === "pay" && !LIVE && state.payMethod === "card") {
      var ccName = val("bk-cc-name"), num = (val("bk-cc-number") || "").replace(/[\s-]/g, ""),
          exp = val("bk-cc-exp") || "", cvc = val("bk-cc-cvc") || "", postal = (val("bk-cc-postal") || "").toUpperCase();
      need(nameOk(ccName), "bk-cc-name", "Please enter the name on the card.");
      need(/^\d{13,19}$/.test(num) && luhn(num), "bk-cc-number", "Please enter a valid card number.");
      var m = exp.match(/^(\d{2})\/(\d{2})$/), expOk = false;
      if (m) {
        var mm = parseInt(m[1], 10), yy = 2000 + parseInt(m[2], 10), now = new Date();
        expOk = mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1));
      }
      need(expOk, "bk-cc-exp", "Please enter a future expiry date as MM/YY.");
      need(/^\d{3,4}$/.test(cvc), "bk-cc-cvc", "Please enter the 3 or 4 digit security code.");
      need(/^[A-Z]\d[A-Z] ?\d[A-Z]\d$/.test(postal) || /^\d{5}(-\d{4})?$/.test(postal), "bk-cc-postal", "Please enter a valid postal code, like L8S 1C9.");
    }

    if (bad.length) {
      errorsEl.textContent = bad.length === 1 ? bad[0][1] : "Please fix " + bad.length + " items above.";
      var first = document.getElementById(bad[0][0]);
      if (first) { first.focus(); first.scrollIntoView({ block: "center" }); }
      return false;
    }
    errorsEl.textContent = "";
    return true;
  }

  /* ---------- navigation ---------- */
  function go(delta) {
    state.step = Math.max(0, Math.min(steps().length - 1, state.step + delta));
    save();
    render(true);
  }

  function confirmationData() {
    if (state.mode === "membership") {
      var t = tierById(state.tier);
      return { title: t.name + ", 90 days", consult: state.consult === "in-person" ? "In person, with one complimentary drink" : "Online, free",
               names: [state.buyer.name], total: F.money(t.price) };
    }
    var e = ev(), v = venue();
    return {
      title: F.longDate(e.start) + ", " + F.timeRange(e.start, e.end),
      venue: v.name + ", " + v.address,
      tickets: state.qty + " x " + (state.gender === "male" ? "Male" : "Female") + " at " + F.money(e.price),
      express: state.express,
      names: state.holders.slice(0, state.qty).map(function (h) { return h.name; }),
      total: F.money(total())
    };
  }

  /* The order sent to the owner's server in live mode. Prices are NOT trusted
     from the browser: the server must look them up from its own list. */
  function orderPayload() {
    if (state.mode === "membership") {
      return { type: "membership", tier: state.tier, consultation: state.consult,
               name: state.buyer.name, email: state.buyer.email, payMethod: state.payMethod };
    }
    return {
      type: "event", eventId: state.eventId, gender: state.gender, quantity: state.qty, express: state.express,
      holders: state.express ? [] : state.holders.slice(0, state.qty),
      buyer: state.express ? state.buyer : { name: state.holders[0].name, email: state.holders[0].email },
      payMethod: state.payMethod
    };
  }

  function submitLive() {
    nextBtn.disabled = true;
    nextBtn.textContent = "Connecting to Clover";
    fetch(CFG.cloverCheckoutEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload())
    }).then(function (r) {
      if (!r.ok) throw new Error("status " + r.status);
      return r.json();
    }).then(function (data) {
      var url = data && data.checkoutUrl;
      var okUrl = false;
      try { var u = new URL(url); okUrl = u.protocol === "https:" && /(^|\.)clover\.com$/.test(u.hostname); } catch (e) {}
      if (!okUrl) throw new Error("bad checkout url");
      save();
      window.location.assign(url);
    }).catch(function () {
      nextBtn.disabled = false;
      nextBtn.textContent = "Continue to secure checkout";
      errorsEl.textContent = "The secure checkout could not be reached. Nothing was charged. Please try again.";
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!state) return;
    collect();
    var name = stepName();
    if (name === "done") { close(); return; }
    if (name === "summary") {
      var st = ONSD.eventState ? ONSD.eventState(ev()) : { open: true };
      if (!st.open) {
        close();
        var events = document.getElementById("events");
        if (ONSD.scrollToEl) ONSD.scrollToEl(events, true);
        return;
      }
    }
    if (!validate()) { save(); return; }
    if (name === "pay") {
      if (LIVE) { submitLive(); return; }
      /* Preview: no charge, nothing sent. Card fields are discarded with the step. */
      state.confirmation = confirmationData();
      go(1);
      return;
    }
    go(1);
  });

  backBtn.addEventListener("click", function () { collect(); go(-1); });

  /* Live updates inside the panel */
  content.addEventListener("change", function (e) {
    var t = e.target;
    var name = stepName();
    if (t.name === "gender") {
      state.gender = t.value;
      var max = maxQty();
      if (state.qty > max) state.qty = Math.max(1, max);
      if (state.qty < 1) state.qty = 1;
      save(); render(false);
      var r = document.getElementById("c-gender-" + t.value); if (r) r.focus();
      return;
    }
    if (t.id === "bk-express") {
      collect();
      state.express = t.checked;
      save(); render(false);
      document.getElementById("bk-express").focus();
      return;
    }
    if (t.name === "pay") {
      state.payMethod = t.value;
      save(); render(false);
      var p = document.getElementById("c-pay-" + t.value); if (p) p.focus();
      return;
    }
    if (t.id === "bk-qty") {
      var q = parseInt(t.value, 10), mx = maxQty();
      if (isNaN(q) || q < 1) q = 1;
      if (q > mx) q = mx;
      state.qty = q; resizeHolders(); save(); render(false);
      document.getElementById("bk-qty").focus();
      return;
    }
    collect(); save();
  });
  content.addEventListener("input", function (e) {
    if (/^bk-cc-/.test(e.target.id)) {
      if (e.target.id === "bk-cc-number") {
        var d = e.target.value.replace(/\D/g, "").slice(0, 19);
        e.target.value = d.replace(/(\d{4})(?=\d)/g, "$1 ");
      } else if (e.target.id === "bk-cc-exp") {
        var x = e.target.value.replace(/\D/g, "").slice(0, 4);
        e.target.value = x.length > 2 ? x.slice(0, 2) + "/" + x.slice(2) : x;
      } else if (e.target.id === "bk-cc-cvc") {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      }
      return; /* never stored */
    }
    collect(); save();
  });
  content.addEventListener("click", function (e) {
    var b = e.target.closest("[data-qty]");
    if (!b) return;
    var mx = maxQty();
    state.qty = Math.max(1, Math.min(mx, state.qty + Number(b.dataset.qty)));
    resizeHolders(); save(); render(false);
    var again = content.querySelector('[data-qty="' + b.dataset.qty + '"]');
    (again && !again.disabled ? again : document.getElementById("bk-qty")).focus();
  });

  function resizeHolders() {
    while (state.holders.length < state.qty) state.holders.push({ name: "", email: "" });
  }

  /* ---------- dialog behaviour: close, Escape, focus trap ---------- */
  root.addEventListener("click", function (e) { if (e.target.closest("[data-booking-close]")) close(); });
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var f = Array.prototype.filter.call(
      panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && !el.hidden && el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === titleEl || !panel.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  });

  /* Phone keyboards: size the panel to the visual viewport and keep the focused field in view. */
  function fitViewport() {
    var vv = window.visualViewport;
    if (!vv) return;
    panel.style.setProperty("--vvh", vv.height + "px");
    panel.style.top = vv.offsetTop + "px";
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () { if (isOpen) fitViewport(); });
    window.visualViewport.addEventListener("scroll", function () { if (isOpen) fitViewport(); });
  }
  panel.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t.matches("input, textarea") && window.innerWidth < 700) {
      setTimeout(function () { t.scrollIntoView({ block: "center", behavior: "smooth" }); }, 280);
    }
  });

  /* ---------- triggers ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-book]");
    if (b) { e.preventDefault(); ONSD.openEvent(b.dataset.book, b); return; }
    var m = e.target.closest("[data-membership]");
    if (m) { e.preventDefault(); ONSD.openMembership(m.dataset.membership, m); return; }
  });
  if (headerCta) {
    headerCta.addEventListener("click", function (e) {
      if (hasDraft()) { e.preventDefault(); e.stopPropagation(); open(headerCta); }
    }, true);
  }

  /* Restore a draft from this browser session (survives reloads and closing the panel). */
  state = load();
  if (state && stepName() === "done") clear();
  syncCta();
})();
