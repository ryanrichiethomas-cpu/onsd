// Renders the event cards and venue blocks from js/data.js into index.html,
// between the EVENTS and VENUES markers. Run after editing js/data.js:
//   node tools/build.mjs
// The deployed site is plain static files; this script is only a convenience.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, "js/data.js"), "utf8"), ctx);
const D = ctx.window.ONSD_DATA;
const F = ctx.window.ONSD_FMT;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function eventCard(ev) {
  const v = D.venues[ev.venue];
  const kind = ev.format === "crawl" ? "Dating + Pub Crawl" : "Speed dating";
  const tid = `ev-${ev.id}`;
  const crawlNote = ev.format === "crawl"
    ? `\n            <p class="event-note">Waiver required. Tickets do not include alcohol. Photo ID and dress shoes for the clubs.</p>`
    : "";
  return `        <li class="event-card" data-event-id="${ev.id}" data-city="${esc(v.city)}" data-format="${ev.format}">
          <article class="event" aria-labelledby="${tid}">
            <div class="event-media"><img src="${v.photo}" width="${v.w}" height="${v.h}" loading="lazy" alt="${esc(v.alt)}"></div>
            <div class="event-body">
              <p class="label event-kicker">${kind} <span aria-hidden="true">&middot;</span> ${esc(v.city)}</p>
              <h3 class="event-date" id="${tid}">${esc(F.longDate(ev.start))}</h3>
              <p class="event-time">${esc(F.timeRange(ev.start, ev.end))}</p>
              <p class="event-venue">${esc(v.name)}<span>, ${esc(v.city)}</span></p>
              <dl class="event-meta">
                <div><dt>Ages</dt><dd>${esc(F.ages(ev))}</dd></div>
                <div><dt>Includes</dt><dd>${esc(ev.includes)}</dd></div>
                <div><dt>Capacity</dt><dd>${esc(F.capacity(ev))}</dd></div>
                <div><dt>Tickets close</dt><dd class="event-close">${esc(F.salesCloseLine(ev))}</dd></div>
              </dl>${crawlNote}
              <div class="event-buy">
                <p class="event-price"><span class="event-amount">${F.money(ev.price)}</span> <span class="event-tax">taxes included</span></p>
                <button type="button" class="btn btn--amber event-book" data-book="${ev.id}">Book<span class="visually-hidden"> ${esc(F.longDate(ev.start))} at ${esc(v.name)}</span></button>
              </div>
              <p class="event-status" data-status hidden></p>
            </div>
          </article>
        </li>`;
}

const cityPhotos = {
  "Hamilton": { src: "assets/img/city/hamilton-skyline.jpg", w: 1200, h: 608,
    alt: "Downtown Hamilton skyline at dusk, towers lit against a blue evening sky." },
  "Burlington": { src: "assets/img/city/burlington-waterfront.png", w: 1200, h: 800,
    alt: "Aerial view of the Burlington waterfront at sunset, a curved pier over the lake with towers behind." }
};
const cityLines = {
  "Hamilton": "Three venues: Dough Box, King Billiards and Sports Bar, and The Ship.",
  "Stoney Creek": "One venue: Lotos Pizzeria.",
  "Burlington": "One venue: Skyway Diner."
};

function venueItem(v) {
  const notes = v.notes.map((n) => `<li>${esc(n)}</li>`).join("");
  return `            <li class="venue">
              <img src="${v.photo}" width="${v.w}" height="${v.h}" loading="lazy" alt="${esc(v.alt)}">
              <div class="venue-body">
                <h4>${esc(v.name)}</h4>
                <address>${esc(v.address)}</address>
                <ul class="venue-notes">${notes}</ul>
                <p class="venue-min"><span class="label">Runs with</span> at least ${esc(v.minimum)} registrations${v.site ? `<span class="venue-site"> &middot; ${esc(v.site)}</span>` : ""}</p>
              </div>
            </li>`;
}

function venues() {
  const cities = ["Hamilton", "Stoney Creek", "Burlington"];
  return cities.map((c) => {
    const list = Object.values(D.venues).filter((v) => v.city === c).map(venueItem).join("\n");
    const p = cityPhotos[c];
    const photo = p
      ? `\n          <figure class="city-photo"><img src="${p.src}" width="${p.w}" height="${p.h}" loading="lazy" alt="${esc(p.alt)}"><figcaption class="photo-note">${esc(c)}. City photo.</figcaption></figure>`
      : "";
    return `      <div class="city-block${p ? "" : " city-block--plain"}">
        <div class="city-head">
          <div class="city-title">
            <h3 class="city-name">${esc(c)}</h3>
            <p>${esc(cityLines[c])}</p>
          </div>${photo}
        </div>
        <ul class="venue-list">
${list}
        </ul>
      </div>`;
  }).join("\n");
}

let html = readFileSync(join(root, "index.html"), "utf8");
const put = (name, body) => {
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(html)) throw new Error(`marker ${name} missing`);
  html = html.replace(re, (m, a, b) => `${a}\n${body}\n${b}`);
};
put("EVENTS", D.events.map(eventCard).join("\n"));
put("VENUES", venues());
writeFileSync(join(root, "index.html"), html);
console.log(`Rendered ${D.events.length} events and ${Object.keys(D.venues).length} venues.`);
