# Anna world and boutique

## Pages

- `/anna.html`: password screen followed by a playable browser voxel world. The password is `tesco` (case-sensitive; surrounding whitespace is ignored). Walk through 4 rooms and inspect their picture frames to open photo albums.
- `/anna-boutique.html`: product gallery, size selection, cart, and simulated checkout. No real order or payment is created, and no card information is collected.

The files live in `public/` and Vite copies them into `dist/` for the existing GitHub Pages deployment.

## World controls

Use WASD, ZQSD, or the arrow keys to move, click and drag (or touch and drag) to look, Space to jump, and E to inspect a nearby frame. Shift runs, V changes between first-person and third-person cameras, and M opens the room map. Escape pauses the game or closes an open album. The on-screen arrows and jump button support touch devices. A field guide explains the controls when the world first opens.

The world includes 4 roofless rooms along a central path. Its 126 images include 125 photos from `gamepic/`, grouped in source filename order, and the supplied “Messages per month” chart appended to the last album:

| Room | Images | Source filenames | Wall-frame cover |
| --- | ---: | --- | --- |
| The beginning | 32 | `IMG_7921.PNG` to `IMG_7952.PNG` | `IMG_7929.PNG` |
| Little adventures | 31 | `IMG_7953.PNG` to `IMG_7983.PNG` | `IMG_7964.PNG` |
| The everyday | 31 | `IMG_7984.PNG` to `IMG_8016.PNG` | `IMG_7996.PNG` |
| More of us | 32 | `IMG_8017.PNG` to `IMG_8047.PNG`, then the attached chart | `IMG_8036.PNG` |

The folder photos skip `IMG_7998.PNG` and `IMG_8000.PNG`. The groups are provisional, using the existing room names. Event dates and photo captions remain blank for the owner to fill in. The chart has the caption “Messages per month” and a blank date.

Open a frame to browse that room’s album with the Previous/Next buttons, Left/Right arrow keys, or photo thumbnails. Photos fit inside the album image area with their aspect ratio preserved.

The album’s full-size image link opens the original game asset for reading fine details. The attached chart was checked in the browser as image 32 of More of us, at its full 1224 × 790 resolution, with its caption and full-size link visible.

Opening an album saves its room discovery in this browser's local storage. The pause menu can return to the garden, lock the world, or restart with 0 discovered memories. The last room keeps its original `still-to-come` ID so existing discoveries survive its new display title.

The password is a front-end gate on a static site. Anyone who reads the published JavaScript can find it, and files published alongside the page remain publicly accessible. Add only photos you’re comfortable publishing with this version.

## Adding memories

Edit `ROOMS` in `public/anna-world/model.js` for each room’s `title`, `subtitle`, `date`, `description`, `color`, and `coverPhotoId`. Keep its coordinates and `id` unless you also want to change the map.

Edit `PHOTO_LIBRARY` in `public/anna-world/photo-library.js` for individual photographs. Each entry has a stable `id`, a `roomId`, full-size `src`, `thumbnail`, `width`, `height`, `sourceName`, `date`, and `caption`. Change `roomId` to move a photo to another room; the array order determines album order. `getRoomPhotos(roomId)` supplies each room’s `photos` array.

Put optimized full images in `public/anna-world/photos/` and smaller thumbnail copies in its `thumbs/` folder. Use relative paths such as `./photos/img-7929.webp` and `./photos/thumbs/img-7929.webp`. Set `width` and `height` to the full image’s actual dimensions. These paths resolve relative to `public/anna-world/` on the static deployment.

Choose a room’s wall-frame photo with `coverPhotoId`, using an ID from that room’s album. The model derives the room’s `image` from this cover, with the first photo as its fallback. Add relationship dates and captions when supplied; the import uses blank fields because screenshot timestamps alone don’t establish event dates. Update the import expectations in `scripts/check-anna-world.test.mjs` when adding photos, changing groups, or supplying dates/captions.

The library contains 126 full images and 126 thumbnails. The original folder import accounts for 125 of each, totaling 18,878,198 bytes (about 18 MiB), compared with 508,229,210 bytes for the supplied PNG files. Those full images have a maximum edge of 1600px; thumbnails have a maximum edge of 480px. Conversion preserves aspect ratio and trims contiguous near-black outer rows where present. The original files in the local `gamepic/` folder are unchanged.

The attached chart is stored as `photos/messages-per-month.webp`, with a thumbnail in `photos/thumbs/`. Its full image is a lossless WebP at the supplied 1224 × 790 dimensions; its thumbnail has a maximum edge of 480px. The import preserves the supplied chart and its labels without redrawing it or inferring relationship dates from its data.

Three.js 0.170.0 is bundled locally in `public/anna-world/vendor/` with its MIT license. Scenery, textures, and SVG illustrations are original local assets; the game needs no CDN connection.

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
node --test scripts/check-anna-world.test.mjs
node --test scripts/check-anna-notification.test.mjs
npm run build
npm run dev -- --host 127.0.0.1
```

Check the password with a wrong value and `tesco`, movement and drag to look, all 4 room doors, frame interactions and Escape, jumping, and touch controls. Check each album’s photo count, Previous/Next buttons, keyboard arrows, thumbnails, portrait and landscape photos, and loading on a narrow screen.

The world tests verify password handling, collision and boundary limits, and a reachable path from spawn to every frame. They also verify all 126 images appear exactly once across the 4 albums, every full image and thumbnail exists, image dimensions match their WebP data, each cover belongs to its room, the 125 folder photos retain filename order, the chart is appended to the last album, and unsupplied dates/captions stay blank.

For the boutique, check the gallery, required size, quantity controls, removal, empty cart, checkout email validation, dialog close/Escape, and mobile layout. Automated notification tests mock the service and never send emails.

Initial world verification on 2026-10-20, before the photo import: wrong and correct passwords, all 4 rooms and memory cards, wall collisions, hallway labels, first-person and third-person cameras, map discoveries, persisted progress, pause/resume, keyboard activation of buttons, and restarting were checked in the browser. The 390px layout has no horizontal overflow, and holding the on-screen arrow moves the character. The production build also unlocked and rendered without console errors. All 17 world and boutique notification tests passed; `npm run build` passed.

Photo import verification on 2026-10-20: all 21 world and boutique notification tests passed, including checks of all 250 WebP files and their album assignments. Browser checks confirmed the real wall photos, complete portrait and landscape framing, thumbnail selection, Previous/Next buttons, keyboard wraparound, selected-photo syncing to the main wall frame, and a 390px album layout without horizontal overflow. The production build passed and contains all 125 photos, 125 thumbnails, and album controls.

Boutique verification from the previous version: desktop gallery and required size; cart quantity/total; mobile checkout and required email; retry after a mocked failure; success and cart clearing after mocked acceptance. Eight notification tests and the production build passed at that time.

Provider references: [AJAX](https://formsubmit.co/ajax-documentation), [activation and troubleshooting](https://formsubmit.co/help).
