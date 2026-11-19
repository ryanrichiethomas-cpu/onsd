# Ontario Speed Dating: cinematic preview

Sales preview built by AI Picked You Media. Not the live site (pages carry `noindex`).

## Deploy

Plain static files. Serve the repository root as is; no build step is needed.
`index.html` loads `css/`, `js/` and `assets/` with relative paths, so it works
from any host or sub folder.

## Going live with payments (Clover)

Edit one value in `js/config.js`:

```js
cloverCheckoutEndpoint: null   // preview mode: no charge, nothing sent
cloverCheckoutEndpoint: "https://your-server.example/checkout"   // live
```

In live mode the booking panel POSTs the order as JSON to that endpoint:

- event: `{ type: "event", eventId, gender, quantity, express, holders: [{name, email}], buyer: {name, email}, payMethod }`
- membership: `{ type: "membership", tier, consultation, name, email, payMethod }`

The endpoint is the owner's own server or serverless function. It holds the
Clover private credentials, looks up the price from its own list (never trust
a price from the browser), checks per side capacity, creates a Clover hosted
checkout session and replies `{ "checkoutUrl": "https://...clover.com/..." }`.
The browser then goes to Clover's secure page, where card, Google Pay and
Apple Pay are taken. No keys or secrets ever go in browser code.

`contactEndpoint` in the same file does the same for the contact form.

## Editing events

Event, venue and membership data live in `js/data.js`. After changing events
or venues, run `node tools/build.mjs` to re-render the cards in `index.html`.
Seats left per side (`remaining`) can be updated there; a side at 0 shows as
sold out in the booking panel. Sales close times are checked live in the
browser, so closed nights switch themselves off.

## Pieces

- `js/journey.js`: the scroll scrubbed film (3 frame sequences in `assets/film/`)
- `js/booking.js`: the booking panel (event and membership modes)
- `js/site.js`: Lenis smooth scrolling, nav, filters, contact form
- `js/vendor/lenis.min.js`: Lenis 1.1.20, vendored unmodified (MIT)
- `assets/fonts/`: Instrument Serif and Manrope, self hosted (OFL)
