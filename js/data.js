/*
  Ontario Speed Dating: event, venue and membership data.
  Every value here comes from the verified facts file (crawl of onsd.ca,
  2026-11-19). Times are Eastern (EST, UTC-5 in November and December).

  capacity: seats per side, or null when the listing does not state it.
  remaining: seats still for sale per side. At crawl time every dated page
    showed full capacity remaining. The live box office can update these
    numbers; the booking panel blocks a side when it reaches 0.
  ages.max: null means no upper limit (19+).
  salesClose: ISO time ticket sales stop, or null when not stated.

  After editing events or venues, run: node tools/build.mjs
  (re-renders the event and venue cards inside index.html).
*/
window.ONSD_DATA = {
  venues: {
    "dough-box": {
      name: "Dough Box",
      address: "1457 Main St. W., Hamilton, ON L8S 1C9",
      city: "Hamilton",
      minimum: "7 male and 7 female",
      notes: ["Minutes from McMaster University.", "Tickets here include free pizza slices and pop."],
      site: "doughbox.ca",
      photo: "assets/img/venues/venue-dough-box.jpg",
      w: 600, h: 313,
      alt: "Exterior of Dough Box, a wood fired pizza and pasta restaurant on Main Street West in Hamilton"
    },
    "king-billiards": {
      name: "King Billiards and Sports Bar",
      address: "840 King St. W., Hamilton, ON L8S 1K3",
      city: "Hamilton",
      minimum: "5 male and 5 female",
      notes: ["Dimmed lights.", "Bar drinks from $5.", "Pool $9 an hour, 1 to 5 PM, Monday to Thursday.", "City meter parking, bike share and bus access."],
      site: "",
      photo: "assets/img/venues/venue-king-billiards.jpg",
      w: 600, h: 313,
      alt: "Street view of the King Billiards and Sports Bar storefront on King Street West in Hamilton"
    },
    "the-ship": {
      name: "The Ship",
      address: "23 Augusta Street, Hamilton, ON L8N 1P6",
      city: "Hamilton",
      minimum: "1 male and 1 female",
      notes: ["Home of the Dating + Pub Crawl nights."],
      site: "theship.ca",
      photo: "assets/img/venues/venue-the-ship.jpg",
      w: 446, h: 313,
      alt: "The Ship in Hamilton, an ivy covered red brick pub with blue patio umbrellas out front"
    },
    "lotos": {
      name: "Lotos Pizzeria",
      address: "275 Barton St. E, Stoney Creek, ON L8E 2K4",
      city: "Stoney Creek",
      minimum: "7 male and 7 female",
      notes: ["Centre of Stoney Creek.", "Free on site and nearby parking.", "Tickets here include a $10 coupon you can use against the total bill, alcohol included."],
      site: "lotos.pvmt.com",
      photo: "assets/img/venues/venue-lotos.jpg",
      w: 334, h: 313,
      alt: "Exterior of Lotos Pizzeria at 275 Barton Street in Stoney Creek, a grey building with a red Lotos sign"
    },
    "skyway-diner": {
      name: "Skyway Diner",
      address: "645 Plains Rd. E., Burlington, ON L7T 4J5",
      city: "Burlington",
      minimum: "7 male and 7 female",
      notes: ["Two blocks from the QEW.", "Named after the nearby Skyway bridge."],
      site: "theskywaydiner.ca",
      photo: "assets/img/venues/venue-skyway-diner.jpg",
      w: 600, h: 313,
      alt: "The Skyway Diner sign in blue letters above the entrance in Burlington"
    }
  },

  events: [
    {
      id: "2026-11-21-the-ship", venue: "the-ship", format: "crawl",
      start: "2026-11-21T20:31:00-05:00", end: "2026-11-21T22:31:00-05:00",
      ages: null, price: 15, capacity: null, remaining: null,
      includes: "Pub crawl format.",
      salesClose: null
    },
    {
      id: "2026-11-23-lotos", venue: "lotos", format: "speed",
      start: "2026-11-23T19:01:00-05:00", end: "2026-11-23T21:01:00-05:00",
      ages: { min: 30, max: 50 }, price: 28,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "$10 off venue menu items.",
      salesClose: "2026-11-19T19:01:00-05:00"
    },
    {
      id: "2026-11-25-king-billiards", venue: "king-billiards", format: "speed",
      start: "2026-11-25T21:00:00-05:00", end: "2026-11-25T23:00:00-05:00",
      ages: { min: 19, max: 35, note: "students" }, price: 28,
      capacity: { male: 10, female: 10 }, remaining: { male: 10, female: 10 },
      includes: "Choice of alcohol or $10 off menu items.",
      salesClose: "2026-11-21T21:00:00-05:00"
    },
    {
      id: "2026-12-02-king-billiards", venue: "king-billiards", format: "speed",
      start: "2026-12-02T21:00:00-05:00", end: "2026-12-02T23:00:00-05:00",
      ages: { min: 30, max: 50 }, price: 28,
      capacity: { male: 10, female: 10 }, remaining: { male: 10, female: 10 },
      includes: "Choice of alcohol or $10 off menu items.",
      salesClose: "2026-11-28T21:00:00-05:00"
    },
    {
      id: "2026-12-05-the-ship", venue: "the-ship", format: "crawl",
      start: "2026-12-05T20:31:00-05:00", end: "2026-12-05T22:31:00-05:00",
      ages: { min: 19, max: null }, price: 15,
      capacity: { male: 9, female: 9 }, remaining: { male: 9, female: 9 },
      includes: "Dating + Pub Crawl. Speed dating is added free if enough people register.",
      salesClose: "2026-12-04T20:31:00-05:00"
    },
    {
      id: "2026-12-07-skyway-diner", venue: "skyway-diner", format: "speed",
      start: "2026-12-07T19:01:00-05:00", end: "2026-12-07T21:01:00-05:00",
      ages: { min: 30, max: 50 }, price: 28,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "Choice of pop or $10 off menu items.",
      salesClose: "2026-11-30T19:01:00-05:00"
    },
    {
      id: "2026-12-08-lotos", venue: "lotos", format: "speed",
      start: "2026-12-08T19:01:00-05:00", end: "2026-12-08T21:01:00-05:00",
      ages: { min: 50, max: 75, note: "seniors" }, price: 28,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "$10 off menu items.",
      salesClose: "2026-12-04T19:01:00-05:00"
    },
    {
      id: "2026-12-12-the-ship", venue: "the-ship", format: "crawl",
      start: "2026-12-12T20:31:00-05:00", end: "2026-12-12T22:31:00-05:00",
      ages: { min: 19, max: null }, price: 15,
      capacity: { male: 9, female: 9 }, remaining: { male: 9, female: 9 },
      includes: "Dating + Pub Crawl. Speed dating is added free if enough people register.",
      salesClose: "2026-12-11T20:31:00-05:00"
    },
    {
      id: "2026-12-16-king-billiards", venue: "king-billiards", format: "speed",
      start: "2026-12-16T21:00:00-05:00", end: "2026-12-16T23:00:00-05:00",
      ages: { min: 19, max: 35 }, price: 28,
      capacity: { male: 10, female: 10 }, remaining: { male: 10, female: 10 },
      includes: "Choice of alcohol or $10 off menu items.",
      salesClose: "2026-12-12T21:00:00-05:00"
    },
    {
      id: "2026-12-18-dough-box", venue: "dough-box", format: "speed",
      start: "2026-12-18T20:01:00-05:00", end: "2026-12-18T22:01:00-05:00",
      ages: { min: 19, max: 35 }, price: 26,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "Pop, plus free pizza slices (per the venue page).",
      salesClose: "2026-12-16T20:01:00-05:00"
    },
    {
      id: "2026-12-21-skyway-diner", venue: "skyway-diner", format: "speed",
      start: "2026-12-21T19:00:00-05:00", end: "2026-12-21T21:00:00-05:00",
      ages: { min: 19, max: 35 }, price: 28,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "Choice of pop or $10 off menu items.",
      salesClose: "2026-12-14T19:00:00-05:00"
    },
    {
      id: "2026-12-22-lotos", venue: "lotos", format: "speed",
      start: "2026-12-22T19:00:00-05:00", end: "2026-12-22T21:00:00-05:00",
      ages: { min: 19, max: 35 }, price: 28,
      capacity: { male: 15, female: 15 }, remaining: { male: 15, female: 15 },
      includes: "$10 off venue menu items.",
      salesClose: "2026-12-18T19:00:00-05:00"
    }
  ],

  tiers: [
    { id: "bronze", name: "Bronze", price: 110,
      includes: ["Daily match searching", "1 FREE event ticket", "1 blind date", "Complimentary drink per meeting"] },
    { id: "silver", name: "Silver", price: 200,
      includes: ["Daily match searching", "2 FREE event tickets", "1 blind date", "1 in person consultation", "Complimentary drink per meeting"] },
    { id: "gold", name: "Gold", price: 390,
      includes: ["Daily match searching", "3 FREE event tickets", "2 blind dates", "1 in person consultation", "Complimentary drink per meeting"] }
  ]
};

/* Shared formatting helpers (used by the page, the booking panel and tools/build.mjs). */
window.ONSD_FMT = (function () {
  var TZ = "America/Toronto";
  function parts(iso, opts) {
    return new Intl.DateTimeFormat("en-CA", Object.assign({ timeZone: TZ }, opts)).format(new Date(iso));
  }
  function time(iso) {
    // "8:31 PM"
    return parts(iso, { hour: "numeric", minute: "2-digit", hour12: true })
      .replace(/ | /g, " ").replace(/a\.m\./i, "AM").replace(/p\.m\./i, "PM");
  }
  function timeRange(a, b) {
    var ta = time(a), tb = time(b);
    var sa = ta.slice(-2), sb = tb.slice(-2);
    return (sa === sb ? ta.slice(0, -3) : ta) + " to " + tb;
  }
  function weekday(iso, len) { return parts(iso, { weekday: len || "long" }); }
  function monthDay(iso, len) { return parts(iso, { month: len || "long", day: "numeric" }); }
  function longDate(iso) { return weekday(iso) + ", " + monthDay(iso); }
  function shortDate(iso) { return weekday(iso, "short") + " " + monthDay(iso, "short"); }
  function ages(ev) {
    if (!ev.ages) return "Not stated on the listing (minimum age 19)";
    var a = ev.ages.max ? ev.ages.min + " to " + ev.ages.max : ev.ages.min + "+";
    return ev.ages.note ? a + ", " + ev.ages.note : a;
  }
  function capacity(ev) {
    if (!ev.capacity) return "Not stated on the listing";
    var c = ev.capacity;
    return (c.male + c.female) + " seats: " + c.male + " male, " + c.female + " female";
  }
  function money(n) {
    var s = Number(n).toFixed(2);
    return "$" + (s.slice(-3) === ".00" ? s.slice(0, -3) : s);
  }
  function salesCloseLine(ev) {
    if (!ev.salesClose) return "Not stated on the listing";
    return shortDate(ev.salesClose) + ", " + time(ev.salesClose);
  }
  return { time: time, timeRange: timeRange, longDate: longDate, shortDate: shortDate, weekday: weekday,
           monthDay: monthDay, ages: ages, capacity: capacity, money: money, salesCloseLine: salesCloseLine };
})();
