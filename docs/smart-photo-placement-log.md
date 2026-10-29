# Smart photo placement — change log

Branch: `smart-photo-placement` (off `studio-restored-oct12-phased`). One commit per step;
`git revert <sha>` undoes exactly that step. Newest last. Not shipped to the SAC-Studio
mirror until reviewed on the web dev servers.

## Step 1 — on-device photo analysis + cache (`327e56f`)
- **What:** each photo is analysed once in the studio (MediaPipe EfficientDet-Lite0 +
  BlazeFace, saliency fallback). No AI calls. Results are cached by src hash on the server.
  Uploaded photos are analysed in the background as soon as they're added. Nothing reads
  the analysis yet, so on-screen behaviour is unchanged.
- **Files:** `src/model/analysePhoto.ts` (new), `server/photoAnalysis.ts` (new),
  `server/index.ts` (`GET /api/photo-analysis`, `PUT /api/photo-analysis/:hash`),
  `src/App.tsx` (upload hook), `public/models/*.tflite` (new, 7.5 MB),
  `package.json` / `package-lock.json` (`@mediapipe/tasks-vision@1.1.1`, exact).
- **Runtime data:** `data/photo-analysis.json` (dev) or `~/Documents/SAC_Studio/photo-analysis.json`
  (desktop). Safe to delete at any time; photos are re-analysed on demand.
- **Revert:** `git revert 327e56f`, then `npm install` to drop the package.

## Step 2 — framing solver, copy-block placement, Bump lockups (`f0fd177`)
- **What:**
  - A photo swapped in from the library, or uploaded via "Replace with a file…", is framed
    automatically. So is any photo after the new **Auto-place (copy and crop)** button is clicked.
  - The copy block moves as one unit to the left, centre or right of the canvas, or stays where
    the design put it when that already works. The photo is zoomed (1–2×) and panned so its
    subject and faces stay clear of the block.
  - Centred lockups (block within 5% of the canvas centre, or `fixed`) never move their copy;
    only the photo is framed.
  - Any hand crop (drag, wheel, Zoom/Pan sliders) turns auto off for that photo.
  - "Reset this photograph" also puts an auto-moved copy block back.
  - Template default photos are left exactly as designed; only a swap triggers auto.
- **Files:** `src/model/autoFrame.ts` (new: solver, `SMART_PLACEMENT` flag),
  `src/edit/autoPlace.tsx` (new: `CopyBlock`, `autoPlace`), `src/edit/Picture.tsx` (auto-run,
  button, manual-wins, reset), `src/edit/store.ts` (`Pic.auto/autoFor/autoClean`),
  `src/render/templates/bump/{EmailHeader1,EmailHeader3,EmailHero,Social1x1,Social4x5,Social9x16}.tsx`
  (card wrapped in `<CopyBlock>`), `scripts/check-autoframe.ts` (new, in `npm run check`),
  `package.json`, `.gitignore` (`data/photo-analysis.json`).
- **Off-switch without a revert:** set `SMART_PLACEMENT = false` in `src/model/autoFrame.ts`.
- **Revert:** `git revert f0fd177`.

## Step 2a — fixes from the first test (SC26_0071 Bump Alpine20, hero-desktop) (`478629d`)
- **Bug: detectors never ran in dev.** Vite's dep optimizer only discovered
  `@mediapipe/tasks-vision` at the first dynamic import, re-optimized, and that import failed.
  Every photo silently fell back to saliency, which returned the same centred ~70% box for
  everything (so "humans not detected"). Fix: `optimizeDeps.exclude` in `vite.config.ts`, plus
  a console warning if the detectors ever fail to load.
- **Bug: subjects pushed out of frame.** Portrait photos in landscape boxes put the person
  taller than the box, so the 90%-visible test could never pass. Visibility is now measured
  against the most of the subject that can fit, a tall subject keeps its top in view, and
  losing the subject now weighs 4× more than overlapping the copy.
- **Heads:** the top of every detected person counts as a keep box when no face was found
  (helmets, goggles, turned heads), so a crop never cuts off a head.
- **Saliency fallback** now uses the busiest 10% of the image instead of 70% of all
  texture.
- **Analysis version 3:** stale cached analyses are recomputed automatically.
- **Bump hero-desktop** (`bump/Hero.tsx`): lockup wrapped in `<CopyBlock>`, so its photo
  now avoids the text.
- **Files:** `vite.config.ts`, `src/model/analysePhoto.ts`, `src/model/autoFrame.ts`,
  `src/render/templates/bump/Hero.tsx`.
- **Revert:** `git revert 478629d`.

## Step 2b — every person whole; copy aligned with the align panel's own logic (`6e3ca0e`)
- **Every person whole, all of them:** the analysis now keeps each detected person or piece of
  gear separately (`parts`). A frame is clean only when every one of them is fully in view
  (or as much as can fit, heads first) and none touches the copy. The empty gap between two
  people no longer counts as subject. Analysis version 4.
- **Copy alignment uses `alignGroup` AUTO** (the align panel's own left / centre / right):
  lines that share a row move together, and separate lines each align to the 5% margin or the
  centre line. A right-aligned stack is no longer slid across the canvas as one block.
  `align.ts` gains `alignShifts()`, which previews an alignment without applying it;
  `alignGroup()` behaves as before.
- **Ticket-card lockups** (one element covering ≥60% of the copy block, e.g. Bump email
  headers and socials) still move card and copy as one block, so text never leaves its card.
- **Reset this photograph** now restores copy *positions* only; text edits on those lines
  are kept.
- **Files:** `src/edit/align.ts`, `src/edit/autoPlace.tsx`, `src/edit/Picture.tsx`,
  `src/model/analysePhoto.ts`, `src/model/autoFrame.ts`, `scripts/check-autoframe.ts`.
- **Revert:** `git revert 6e3ca0e`.

## Step 2c — CODE line didn't move (`7648acb`)
- **Bug:** a moved `<Editable as="span">` (CODE label/value) was given a `transform`, which
  browsers ignore on inline elements. The move was saved but never drawn, so on hero-desktop
  CODE stayed behind while the rest of the copy moved. The align panel had the same problem
  for any span.
- **Fix:** inline spans move with `position: relative; left/top` instead, which works inline
  and keeps the spacing between CODE and its value.
- **Files:** `src/edit/Editable.tsx`.
- **Revert:** `git revert 7648acb`.

## Step 2d — busy frames: the card shrinks and moves to the best free space (`c40b0ab`)
- **What:** on ticket-card lockups (Bump email headers and socials), auto-placement now
  searches the card's **size (100% → 75% floor)** and **position (anywhere in the frame, 3%
  from the edges)** together with the photo's zoom and pan (`solveLayout`).
  - Hard rules: every person whole and untouched, heads kept, and no overlap with anything else
    in the frame: marquee text, the orange band behind it (`data-keepout`), brand strip,
    wordmarks.
  - Then: least shrink, least zoom, calmest patch of photo under the card (new 16×10 busyness
    grid in the analysis, version 5), closest to the design.
  - The card shrinks as one unit (`CopyBlock` translate + scale), so ticket, offer, CODE and
    CTA keep their proportions and gaps. If nothing fits, the card stays as designed and the
    panel says it needs a manual nudge.
- Hero-desktop (free copy) is unchanged: line-by-line left/centre/right.
- **Figma export:** `toLayers` now multiplies width, height, font size, line height, letter
  spacing, padding and corner radius by any ancestor `scale()`, so a shrunk card exports at
  its shrunk size. With no scaling, output is identical to before.
- **Reset this photograph** also resets the card's shrink.
- **Files:** `src/model/autoFrame.ts` (`solveLayout`), `src/model/analysePhoto.ts` (grid),
  `src/edit/autoPlace.tsx`, `src/edit/Picture.tsx`, `src/render/toLayers.ts`,
  `src/render/templates/bump/{EmailHeader3,EmailHero}.tsx` (`data-keepout` on the band),
  `scripts/check-autoframe.ts`.
- **Revert:** `git revert c40b0ab`.

## Fix — "Unexpected end of JSON input" when uploading a photo (`21a9aa8`)
- **Bug:** a very large photo (an original camera file whose base64 tops the server's 64 MB
  request limit) made the server drop the connection mid-upload (`EPIPE` in the dev log), so
  the studio got an empty reply. The campaign save that carries the same image failed the same
  way. This predates smart placement, but uploads are its main path in.
- **Fix:**
  - **Studio** (`src/edit/Media.tsx`, `asDataUrl`): JPEG/PNG/WebP uploads larger than
    3200 px on the long edge or 4 MB are downscaled to 3200 px before storing. They're saved
    as JPEG 0.9, or PNG only when the image has transparency. SVGs and small files are
    untouched.
  - **Server** (`server/index.ts`, `body()`): an oversized request now returns a JSON error
    ("That upload is too large…") instead of a dropped connection.
- **Revert:** `git revert 21a9aa8`.

## Step 2e — more aggressive card placement on email headers (`52f5653`)
- **Why:** on real headers the card was technically clear of the detector's person boxes, but
  those boxes hug the body. Cards covered what people held (the swimmer's float and beach ball)
  and sat right against heads. They also barely shrank (90% at most).
- **What:**
  - Each person counts with a quarter of their width extra either side and 8% above/below
    (`reach`), so held objects are covered.
  - Faces and heads get 30% breathing room (`halo`).
  - A card closer than 8% of the frame width to anyone is penalised, enough that shrinking up
    to ~20% is preferred to sitting tight.
  - The shrink floor drops from 75% to **60%**.
  - Hero-desktop framing (`solveFrame`) uses the same padding.
- **Checked:** replayed read-only on five real headers (beach, surf, bike, skier). All clean,
  with cards at 60–100%, clear of people and what they hold, in 5–56 ms.
- **Files:** `src/model/autoFrame.ts`, `src/edit/autoPlace.tsx` (`MIN_CARD`),
  `scripts/check-autoframe.ts`.
- **Revert:** `git revert 52f5653`.

## Step 2f — Claude second look when the detectors find nothing (`6eb98a1`)
- **What:** a photo where MediaPipe finds no person, gear or face (landscapes, far-off
  swimmers) is sent once to Claude through the existing connector (`POST /ai/photo`) as a
  512 px JPEG. Claude returns boxes for people/gear (`p`), heads (`h`) and the main subject
  (`s`), which replace the saliency guess (`via: 'claude'`).
  - Cached with the rest of the analysis, so each such photo costs one short call
    (~100–150 tokens out), ever.
  - If Claude isn't available or finds nothing, the saliency fallback stands as before.
  - Analysis version 6, so earlier saliency-only results get their second look on next use.
- **Checked:** of the built-in photos only `landscape-01` has no detections. Its second look
  returned the subject in 5–7 s, and the copy side flipped from right to left.
- **Files:** `server/prompts.ts` (`LOCATE`), `server/index.ts` (`/ai/photo`),
  `src/model/analysePhoto.ts`.
- **Revert:** `git revert 6eb98a1`.

## Step 4 — Figma image gallery in the photo panel (`d29fc18`)
- **What:** a photo slot's panel gains a **Figma gallery** section, reading
  `SAC-IMAGE-GALLERY` (file `ZbmNd04wAFBvGUpE7AQsKD`, page `0:1`).
  - Every node with an image fill is a photo. Its layer name gives searchable tags, and words
    that name a pursuit (ski, swim, hike, …) become filter chips.
  - **Thumbnails only** (~240 px) load up front, rendered by Figma in batches and cached. The
    **full image** (~3200 px) downloads only when picked, is cached, and goes into the slot
    as a data URL, like an upload, so smart placement, saving and the Figma export all work.
  - The listing is rebuilt only when the Figma file's version changes (checked at most once a
    minute). Local uploads are unchanged.
- **Token:** `FIGMA_TOKEN` in `sac-email-studio/.env` (gitignored; the SAC-Studio mirror is a
  public repo, so the token must never ship in the app). A per-user token field comes before
  shipping. Without a token the panel says what to add.
- **Cache:** `data/figma-gallery/` (gitignored). Safe to delete; it refills on demand.
- **Files:** `server/figmaGallery.ts` (new), `server/index.ts` (`/api/figma-gallery`,
  `/thumb/:node`, `/full/:node`), `src/edit/FigmaGallery.tsx` (new), `src/edit/Picture.tsx`,
  `src/styles.css`, `.gitignore`.
- **Not yet:** brief → auto-matching of gallery photos (they aren't in the media library list),
  and the desktop app's per-user token field.
- **Revert:** `git revert d29fc18`.

## Step 4a — gallery token location and tags (`95c5c97`)
- **Token:** also read from the workspace-root `.env` (one level above `sac-email-studio/`).
  Either file may hold `FIGMA_TOKEN=…` or a bare `figd_…` line. Both are gitignored.
- **Tags:** layer names like `Climb1` / `Hike5` run the pursuit into the number, so tags are
  now split on anything that isn't a letter. They're worked out on every read, so the fix
  applies to the cached listing without re-fetching.
- **Checked against the real file:** 100 photos. Chips: camp 13 · hike 12 · climb 3 · swim 1
  (the other ~70 are photographer filenames with no pursuit word). Listing 0.7 s cached
  (2 min 41 s on the very first load). Thumbnail 164×246 (~60 KB). Full image 2131×3195,
  ~7 s on first pick, instant after.
- **Files:** `server/figmaGallery.ts`.
- **Revert:** `git revert 95c5c97`.

## v2 Step 1 — body-part analysis (`83de911`)
- **What:** MediaPipe **Pose** (lite, on-device, `public/models/pose_landmarker_lite.task`
  5.8 MB) gives each person **regions**: `head`, `torso`, `arms` (hands padded for what they
  hold), `legs`. Non-person detections become `gear`.
  - People the pose model misses are split from their detector box.
  - Claude's boxes and the saliency box become `subject`.
  - Also added: `people` (whole bodies) and a deterministic **`copySide`** (opposite the
    people, or the calmer half when they're centred), so every format of a photo shares one
    intent.
  - Analysis version 7.
- **Clean-ups:** ghost duplicate poses are dropped (a torso inside a person already found).
  "Person" detections under 0.5 confidence are ignored (bushes and rocks). A detected face
  only counts on a found body.
- **Checked:** the hiker (1 person: head, torso, arms with hands, legs), a swimmer with a board
  (board as gear) and `hike-01` (no false heads in the bushes) render correct regions.
- **Files:** `src/model/analysePhoto.ts`, `public/models/pose_landmarker_lite.task`.
- **Revert:** `git revert 83de911`.

## v2 Step 2 — `composeCard`: composition by design rules (`cf20275`)
- **What:** a new pure solver in `src/model/autoFrame.ts`, not yet wired in.
  - **`cardOptions`:** deliberate card slots (as designed, mirror, bottom-left/right,
    middle-left/right) at 100/90/80/70%, inside the free band and off every obstacle. Slots on
    the photo's `copySide` outrank the other side.
  - **`safeBand`:** the free band between the marquee/band and the brand strip, inside 5%
    margins.
  - **`composeCard`:** searches the photo crop from the **plain cover fit** (below the template's
    own zoom when it has one) up to **1.35×**, and ranks strictly, in order:
    1. overlap tier: nothing → legs/gear → arms → torso → head;
    2. card size;
    3. slot (designed, then the copy side);
    4. least zoom;
    5. composition: subject on the far third, headroom, size.
  - **Hard rules:** heads whole, in frame and clear of the marquee and brand strip. Torso, arms
    and subject at least 85% in view. Head, torso and arms get breathing room and count on any
    contact.
  - **Tough call:** if the best still touches arms or worse, the card goes to a bottom corner
    at the plain cover fit with the least weighted overlap.
  - **Fixed-crop mode:** with the designer's crop fixed, only the copy is placed (for live
    follow).
- **Checked:** the Alpine20 hiker in all three Bump email frames is clean (no part of him
  touched). E2 bottom-left 80% at zoom 1.00; E3 bottom-left 90% at 1.10; E4 bottom-left 90% at
  1.30. 6–11 ms each. Fixed crop returns unchanged.
- **Files:** `src/model/autoFrame.ts`, `scripts/check-autoframe.ts`.
- **Revert:** `git revert cf20275`.

## v2 Steps 3 + 4 — wired in; the copy follows a hand crop (`b66bbd5`)
- **Wiring:** `autoPlace` now runs every case through `composeCard`:
  - **no copy block:** crop only;
  - **ticket card:** `cardOptions` slots at 100–70%, moved and scaled as one through
    `CopyBlock`;
  - **free hero copy:** your align panel's AUTO left / centre / right, with the photo's
    `copySide` first.

  The free band comes from the page (marquee, `data-keepout` band, brand strip). Photos can
  zoom **out** to the plain cover fit (`pic.scale` below 1 when the template starts zoomed in),
  and the wheel can too. The `solveLayout` and old `solveFrame` solvers and their tests are
  removed; the hiker/E-frame cases replace them.
- **Follow (step 4):** after auto-placement, cropping by hand (drag, wheel, sliders) re-places
  the copy around your crop, once per animation frame; the photo itself never moves. Moving
  the copy yourself turns follow off (detected by a fingerprint of the copy's position edits,
  `autoSig`). The panel has a **"Copy follows the photo"** toggle; Auto-place re-arms it.
- **Panel:** "Tough call…" when no clean spot existed; "touches legs or gear" when that was
  the cleanest option.
- **Store:** `Pic.autoTough`, `Pic.follow`, `Pic.autoSig`.
- **Files:** `src/edit/autoPlace.tsx`, `src/edit/Picture.tsx`, `src/edit/store.ts`,
  `src/model/autoFrame.ts`, `scripts/check-autoframe.ts`.
- **Revert:** `git revert b66bbd5`.

## v2 Step 5 — placement lab (`f2ecbe0`)
- **What:** `http://localhost:5181/lab.html`, a dev-only page on the Bump preview server.
  - Shows every Bump lockup (E1 header 1, E2 email hero, E3 header 3, socials 1x1/4x5/9x16,
    hero desktop) × Figma-gallery photos, each tile auto-placed exactly as in the studio.
  - Each tile has its own throwaway edit state; no session is read or written.
  - `?n=20` picks more photos; `?ids=428:29,3:2` picks exact gallery nodes.
  - Captions show clean / legs-gear / TOUGH, card % and photo scale. `window.__placementReport`
    carries the same for headless runs.
  - The preview server now proxies `/api` and `/ai` to the studio's server and excludes
    MediaPipe from the dep optimizer. The server accepts the dev preview origin
    (`localhost:5181`, dev only).
- **First run (8 photos × 7 lockups = 56 tiles, 23 s):** 22 clean, 17 legs/gear only,
  17 tough calls (tight close-ups such as a full-frame backpack or a portrait, and the tall
  9:16 socials). The Alpine20 hiker (`428:29`) is clean in 6 of 7 formats, legs-only in 9:16,
  zoom 1.0–1.3, and tells one story (subject right, copy bottom-left).
- **Files:** `dev/bump-preview/lab.html`, `dev/bump-preview/lab.tsx` (new),
  `vite.bump-preview.config.ts`, `server/index.ts`.
- **Revert:** `git revert f2ecbe0`.

## v2 Step 6 — runs on more photos automatically; template guide (`614ddfd`)
- **Why:** in the Alpine20 session, E1, the socials and hero-desktop never got v2 placement.
  They'd been placed by the old solver (a placed photo never re-ran), had no edit at all (a
  brief photo), or were cropped by hand before follow existed.
- **What:**
  - `PLACEMENT_VERSION` (now 2) is stored on each auto-placement (`Pic.autoV`). Photos placed by
    an older version re-place automatically; hand crops never do.
  - A photo the **brief** chose (not the template's own designed photo) is auto-placed the first
    time it's shown. Resetting such a photo places it again.
- **Docs:** `docs/smart-placement.md`: the four layers, how a template opts in (`<Picture>`,
  `<CopyBlock>`, `data-keepout`, lab), when it runs, and which templates are covered.
- **Files:** `src/model/autoFrame.ts`, `src/edit/{autoPlace.tsx,Picture.tsx,store.ts}`,
  `docs/smart-placement.md`.
- **Revert:** `git revert 614ddfd`.
