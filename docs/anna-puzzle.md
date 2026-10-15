# Anna puzzle

## Pages

- `/anna.html`: white WIP screen. The hidden link is 24px from the bottom-right edge, with a 64 × 48px target. Hover reveals a faint arrow; keyboard focus reveals an outline.
- `/anna-boutique.html`: product gallery, size selection, cart, and simulated checkout. No real order or payment is created, and no card information is collected.

The files live in `public/` and Vite copies them into `dist/` for the existing GitHub Pages deployment.

## Completion emails

The checkout posts the solver's email, selected size, quantity, and a completion message to FormSubmit. The recipient is `paul.garnier.97@gmail.com`, configured in `public/anna-notification.js`. No email API secret is stored in the site.

Expected notification:

```text
Subject: Anna: someone solved the case
Someone solved the case with the email solver@example.com.
```

FormSubmit requires activation by the recipient. The first submitted form triggers an activation email. Open that email and confirm the form, then complete one clearly identified test from the deployed page and verify receipt. Activation may depend on the form/site, so confirm the production form after deployment even if a local test was activated.

Until activation and inbox receipt are checked, email delivery is unverified. The UI only claims that a submission was accepted by the service, never that it reached the inbox. Failed, invalid, or timed-out requests leave the email in place for retry. A timed-out request may still have reached the provider, so retrying can produce a duplicate notification.

Setup checked on 2026-10-14: the owner confirmed activation, and FormSubmit accepted a clearly labeled test for `https://donsetpg.github.io/anna-boutique.html` with `success: "true"`. Inbox receipt and the eventual deployed-page submission remain separate checks. The test subject was `TEST - Anna puzzle notification is connected`.

The email field explains that it is sent to Paul through FormSubmit to report the puzzle's completion. The site doesn't persist solver emails in local storage or send card information. Product photos load from the original Shopify CDN; the footer links to their source.

## Verification

```sh
node --test scripts/check-anna-notification.test.mjs
npm run build
npm run dev -- --host 127.0.0.1
```

Check the hidden link, gallery, required size, quantity controls, removal, empty cart, checkout email validation, dialog close/Escape, and mobile layout. Automated notification tests mock the service and never send emails.

Verified locally: hidden link and keyboard focus; desktop gallery and required size; cart quantity/total; mobile checkout and required email; retry after a mocked failure; success and cart clearing after mocked acceptance. Eight notification tests and the production build passed.

Provider references: [AJAX](https://formsubmit.co/ajax-documentation), [activation and troubleshooting](https://formsubmit.co/help).
