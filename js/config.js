/*
  Ontario Speed Dating: site configuration.

  This is the ONE file to edit when the site goes live.

  cloverCheckoutEndpoint
    null  = preview (demo) mode. The payment step runs locally, nothing is
            sent anywhere and no charge is made or shown as made.
    "https://..." = live mode. The booking panel POSTs the order (event id,
            gender, quantity, holder names and emails, or the membership tier)
            as JSON to this URL. That endpoint belongs to the owner's own
            server or serverless function, which holds the Clover private
            credentials, recalculates the price from its own price list, creates
            a Clover hosted checkout session and replies { "checkoutUrl": "..." }.
            The browser is then sent to Clover's secure page to pay.

  No API keys, tokens or secrets of any kind belong in this file or in any
  other browser code. Card numbers are entered on Clover's page in live mode.

  contactEndpoint
    null  = preview mode for the contact form (messages are not sent).
    "https://..." = the form POSTs { name, email, message } as JSON here.
*/
window.ONSD_CONFIG = {
  cloverCheckoutEndpoint: null,
  contactEndpoint: null
};
