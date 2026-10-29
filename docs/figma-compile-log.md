# Figma compile — change log

Templates were transcribed from Figma by hand (CSS export, screenshots), and their positions drifted.
This replaces transcription with data: a compiler reads each frame's node JSON from the Figma
REST API, and a position check holds the render to it. Branch `figma-compile`, off `copy-fit`.

## Pieces
| Piece | File | What it does |
|---|---|---|
| Frame list | `src/data/figma/frames.json` | Which Figma frames to compile (slug, file, node). |
| Compiler | `scripts/figma-pull.ts` (`npm run figma:pull [slug]`) | Writes `src/data/figma/<slug>.json`: every layer's box relative to the frame, rotation, fill, image crop, and text style (font, size, line height, tracking, alignment, leading trim, per-character runs). Also writes a 1x render to `dev/bump-preview/figma/<slug>.png` (gitignored). Uses the `.env` FIGMA_TOKEN; geometry only is committed. |
| Layout helpers | `src/render/figma/layout.ts` | `layerOf`, `boxOf` (a layer's box), `anchorOf` (a text box that grows the way Figma aligns it), `typeOf` (Figma's type, scaled when fitted), `cropOf` (Picture focus/zoom for a Figma image crop). |
| Mapping | `FLASH_HERO_FIGMA` in `src/render/templates/flash/BoardHero.tsx` | Editable id → Figma layer id. |
| Position check | `dev/bump-preview/positions.html` (overlay + table, port 5181) and `scripts/check-positions.mjs` (`npm run check:positions`, headless) | Measures every mapped layer's box and fails past 4px. Needs `npm run preview:bump` and Chrome, so it isn't in `npm run check`. |

## Step 1 — pilot: Flash hero desktop (`248:711465`)
**Before** (hand-transcribed), five layers more than 2px off:
- Title row (bolts + FLASH SALE): 39–42px right. It was centred on x=1059; Figma right-aligns the
  whole column to x=1346.
- `70 % OFF`: 16px wide. `UP TO`: 2.6px.
- Photo crop guessed (focus 93.6/98.7, zoom 1.06); Figma's crop is focus 100/100, zoom 1.29.
- Dates line drawn, but hidden on the board.

**After** (rendered from `flash-hero.json`): everything within 3.4px, except one layer.
- `70 % OFF` is still 16px wide, and `UP TO` is pushed 16px left by it. In Figma the space after
  "70" has its own tracking (−26px instead of −5.6px), a hand tweak that one editable text run
  can't carry. The check notes it on the row.
- The ~3px left on the title is Chrome versus Figma laying out the same font. Typekit's Quiet Sans
  and the locally installed one differ by about 1% too.

Behaviour that stays in code (Figma can't say it):
- Fitted runs shrink from Figma's size.
- The column grows left from its shared right edge.
- The urgency line stays centred on its brush, and the CTA on its button.
- Dates (when a brief has them) use Figma's dates type, right-aligned under the qualifier.

Verified with:
- `npm run check` (exit 0);
- `npm run check:positions`;
- render of the plain, dates + code and topic variants.

**Rollback:** `git revert <step 1 sha>`. That puts the hand-transcribed `Flash` back; the compiler
and check stay harmless.

sha: 6990a49

## Step 2 — Flash hero: no dates line
The board hides its dates layer, so the hero no longer draws one (it used to whenever a brief had
dates). Removed from the template and from `FLASH_HERO_FIGMA`. Rollback: `git revert <sha>`.

sha: 90e0f64

## Step 3 — Flash hero: qualifier whenever it has text; CTA moves up without one
- The qualifier was drawn only when the brief had a code, so "No code needed" never showed. It now
  shows whenever the brief gives it text.
- With no qualifier, the CTA (button and label) moves up to keep the board's own 99px gap under the
  offer (CTA top 636 instead of 712). The gap is measured from the offer's fitted height. With a
  qualifier, the CTA stays exactly on Figma (position check unchanged).
Rollback: `git revert <sha>`.

sha: 9338ef8

## Step 4 — Flash hero: qualifier is a code or a category line only
Step 3 showed the brief's "No code needed" fallback, which isn't wanted. The qualifier now shows
only a code ("Code ALPINE20") or a category line. Any "no code" text is hidden, and the CTA moves
up (636) instead. Checked: code → 712, category → 712, "No code needed" / "on 3+ eligible items ·
no code" / empty → hidden, 636. Rollback: `git revert <sha>`.

sha: cfcfc57

## Step 5 — `FigmaFrame`: compiled templates inherit smart placement
- New `src/render/figma/FigmaFrame.tsx`, the shell for any template compiled from Figma. It draws
  the ground, puts the photo at Figma's crop, and wraps the copy in `CopyBlock`, so photo framing,
  copy placement and follow-the-crop come with no per-template wiring.
- The Flash hero now renders through it.
- Right-anchored rows use a box from the frame's left edge to the column edge. A `right:` offset
  would measure from the copy block's zero-width box instead.
- The lab (`/lab.html`) has a "flash hero" column. On 6 gallery photos the copy column flips left
  or right around the people.
- Position check unchanged; `npm run check` passes.

Rollback: `git revert <sha>`.

sha: 4ff3065

## Step 6 — Flash Email 1 (launch) hero, compiled (`248:711098`)
**Before** (hand-transcribed), against Figma:
- photo pinned to the left edge (focus 0/50); Figma crops 6.9% in, so the riders ghosted;
- brush 20px too wide (its text was measured before the web font arrived);
- `70% OFF` 21.7px off;
- title bolts 4.6px off.

**After** (`FlashEmailLaunch` in `src/render/templates/flash/FlashEmail.tsx`, on `FigmaFrame`):
- photo at Figma's crop;
- brush, urgency, title row and CTA all within 2px;
- the `UP TO` + `70% OFF` row 7px off. Figma's text is "70 % OFF" with a tightened space; the
  template draws "70% OFF". This is the same open question as the desktop hero.

Also:
- `FigmaFrame` now takes `id`, `size`, `zone` and the photo's id directly, plus `frameHeight` and
  `after` for a sheet taller than its frame (the brand strip under the email hero). The Flash hero
  is updated to match.
- Only the launch send moved. The ends-tomorrow and ends-today sends still use the old code until
  their frames are compiled.
- The position page renders the email from a small stand-in session. The CLI now waits for every
  target before reading results.

Rollback: `git revert <sha>`.

sha: 88dae2a

## Step 7 — Flash emails: no code pill without a real code
The code pill read `doc.brief.code` directly, so a brief that said "no code needed" but still
carried a code string showed a pill. It now uses the hero desktop's rule (`noCode ? none : code`),
on all three sends. Checked: code → shown; noCode flag → removed; no code → removed, for launch,
tomorrow and today. Rollback: `git revert <sha>`.

sha: cc2713a

## Step 8 — Flash emails: bolts no longer squeezed away by a long title
With a title longer than the board's ("GEAR CLEAR-OUT FLASH SALE"), the title row ran out of room
and flex shrank both bolts to 0px. The email `Bolt` is now `flex: none`, as the desktop hero's
already was; this covers all three sends. Checked in the live session: the bolts are back,
flanking the title. Rollback: `git revert <sha>`.

sha: 029fe65

## Step 9 — Sideways placement for E1 (launch) and E3 (ends today); centred copy prefers centre
- `CopyBlock` gained `sideways`: copy designed centred may still be aligned left, centre or right
  around the photo, along x only (no vertical move). `FigmaFrame` turns it on, so E1 (launch)
  has it.
- E3 ("ends today") isn't compiled yet; its copy is wrapped in `CopyBlock sideways` directly.
  E2 ("ends tomorrow") is left unwrapped and doesn't move.
- The today/tomorrow brush was centred with `left: 50%`, which inside a zero-size CopyBlock is 50%
  of 0, so it sat half off the left edge. It now uses `left: 600`.
- Centre first: copy designed centred picked left/right whenever that covered even slightly less
  (the stack runs nearly the full frame height). It now stays centred unless centre would cover a
  head or a torso; legs, gear and arms are acceptable.
- `PLACEMENT_VERSION` 2 → 4, so auto-placed photos are redone. Hand crops never are.
- Lab result over 12 gallery photos: E1 5 centre / 4 right / 3 left; E3 9 centre / 3 right.
- `npm run check` passes.

Rollback: `git revert <sha>`.

sha: b6678f2

## Step 10 — Roll back sideways copy movement on the email headers
Step 9's sideways movement didn't look right on the email headers, so it is reverted (`git revert`
of b6678f2): `CopyBlock`'s `sideways`, the centre-first rule and `FigmaFrame`'s sideways default
are gone. Email copy stays centred where it was designed. Auto-crop stays:
- E1 (launch) renders `FigmaFrame centred`;
- E3/E5 (ends today) wrap their copy in `CopyBlock fixed`;
- so the photo is still framed to keep people clear of the copy, and the copy itself never moves.

Kept from step 9: the brush `left: 600` fix (needed inside the CopyBlock) and the lab columns.
`PLACEMENT_VERSION` → 5, so auto-placed photos re-frame. Copy moves that steps 3–4 already saved
into a session stay until the photo panel's reset is used.

Rollback: `git revert <sha>`.

sha: a3d06c8

## Step 11 — Flash E2 (ends tomorrow) compiled (`248:711329`)
**Before**, against Figma:
- category rows ~100px low; labels 176px left, because there were no thumbnail tiles;
- title row 25–29px off; offer 75px; brush/urgency 20–36px;
- photo card 49px off (Figma's card starts above the top edge).

**After** (`FlashEmailTomorrow`):
- photo card, all six rows (pill, label), brush and CTA within 1px;
- urgency and title row within 3px;
- offer row 7px (the "70 % OFF" gap again).

What the build includes now:
- Paper texture (tiled, 50%) under the card, and the slate glow (72%, blurred) behind the type.
- Category rows with the board's drop shadow and a thumbnail tile. The board's thumbnail is
  matched by category kind (men's, women's, footwear, camp, climb, packs); an unmatched category
  gets an empty tile to fill from the library.
- A code pill (none on the board) takes the first row's slot and the rows move down. Copy stays
  centred; auto-crop frames the photo card.

Compiler:
- records opacity, layer blur, drop shadow and every image fill;
- downloads the frame's image fills to `public/figma-assets/<slug>/` (2.2MB for E2), each sized to
  twice its drawn size;
- skips layers listed in `frames.json`'s `skip` (one fully hidden under the card saves 8MB).

`FigmaFrame`:
- `photo.layer` puts the photo in a layer's box, corners and crop;
- `ground` draws under the photo.

Not done: the brand strip still uses the old space-around layout, not Figma's logo positions.

Rollback: `git revert <sha>`.

sha: 9555acb

## Step 12 — Flash E3 (ends today) compiled (`248:711246`); one compiled component for E1 and E3
**Before**, against Figma: brush 12.7px off, title row ~5px, `UP TO` 10px, offer 34px. The photo
used a hand-tuned crop (1.61×, focus 44/24).

**After**: photo at Figma's exact crop; brush, urgency, title row and CTA within 3px; offer row
7.8px (the "70 % OFF" gap).

How it's built:
- E1 and E3 share one structure, so `FlashEmailLaunch` became `FlashEmailCompiled`, driven by a
  `HeroSpec` (layout, layer map, row groups, photo, brand strip and code-pill positions). E3
  passes `TODAY`.
- The brief's "CTA at 800px or higher" note still moves E3's CTA to 820 and its code pill to 650.
- Every brush is centred on its own Figma centre (E3's is x=604, not 600), with the board's small
  text offset kept. E1, E2 and E3 brushes are all exact now.
- The compiler keeps only image fills from the top opaque one upward and takes the crop from it.
  E3's frame had a hidden copy of the launch photo under its own (4MB saved).
- The old hand-written today/tomorrow layout (Brush, SaleType, Cta, `trim`) can no longer run, so
  it's removed.

Verified:
- `npm run check` passes;
- position check: every layer within 4px except the four offer rows;
- live session: E1–E5 render with the right design and height.

Rollback: `git revert <sha>`.

sha: c24cba4

## Step 13 — Flash paid socials 1x1 / 4x5 / 9x16 compiled (`248:711520`, `248:711588`, `248:711656`)
**Before** (hand-transcribed), against Figma: 36 layers more than 4px off.
- The title was shrunk by its own formula (690 / (len×0.66+2) gives 80px for "FLASH SALE" against
  the board's 104.94), which put the title row up to 114px off.
- Brand logos were 20–50px off (space-around instead of the board's positions).
- Urgency text was 22px too wide.
- The 9x16 used the desktop hero's photo; its board has its own.

**After** (`FlashSocial`, one component reading the ratio's compiled frame):
- wordmark, brush, rail, all four logos and "& MORE" exact;
- urgency and title row within 3.4px;
- only the offer row is off (10–16px, the "75 % OFF" gap).

Behaviour:
- The column ends on the board's right edge (1x1, 4x5) or is centred (9x16).
- Urgency shrinks to its brush; title and offer shrink to fit (offer gets 10% more room than the
  board's, as on the desktop hero).
- A code line (none on the board) sits under the offer; on 9x16 the brand row moves down under it.
- No dates line, as the board has none (the same call as the desktop hero).
- Photo at each frame's own Figma crop (9x16 uses its own photo now).
- Rail texture (screen, 22%) as on the board.

Smart placement:
- 1x1 and 4x5 copy may move left, centre or right like the desktop hero (`FigmaFrame` default);
  the wordmark and rail are fixed obstacles.
- 9x16 is centred, so its copy stays.

Compiler: image fills are now stored once in `public/figma-assets/<ref>` and shared across
frames. Large photos are saved as JPEG. All seven frames come to 5.9MB.

Rollback: `git revert <sha>`.

sha: 4d041e1

## Step 14 — Flash email brand strips compiled
- Each email's strip uses its board's own band and logo slots: E1 from its own frame under the
  hero (`248:711123`, new in `frames.json`); E2 and E3 from inside their frames.
- The brief's brands fill the board's four slots left to right, each contained in its slot's box.
- The band gets the board's screen texture (22%).
- `BrandBand` takes a `Band` (layout, band rect, slots) instead of the old hard-coded launch
  positions and the space-around fallback E2 used.
- Position check: every band and logo slot exact on E1, E2 and E3. The check page gained `origin`,
  for a frame that sits partway down the sheet.

Rollback: `git revert <sha>`.

sha: e947f93

## Step 15 — Email brand strip: even cells for brands that aren't the board's
The board's slots are shaped for its own logos. On E2, Merrell's is 296×33, so a square logo
(Mountain Hardwear, TNF) in it shrank to a speck. A slot holding the board's own brand (matched by
name) keeps the exact Figma box. Any other brand gets an even cell centred on the slot: the
strip's tallest logo height, and 85% of the distance to the nearest neighbouring slot. The position
check's stand-in sessions now use each board's own brands, so it compares like with like.

Live session (Mountain Hardwear, OR, TNF, Helly Hansen): cells 216–260 × 77–85 instead of 33px
tall.

Rollback: `git revert <sha>`.

sha: cdefe74

## Step 16 — E2 hero thumbnails: no empty tiles
A category with no board shot (Skis, Snowboards) left its hero row's thumbnail empty. It now shows
the photo the body's own category tile uses for it: the pursuit photo `photoFor(pursuit, n)`, the
same index on the same list. It's still a library swap. Live session: all six E2 rows have a
thumbnail.

Rollback: `git revert <sha>`.

sha: dc6887c

## Step 17 — Flash email body compiled (Email 1 body frames)
**Before:** Flash bodies came from the shared section renderer (`EmailBody`). Headings were about
half the board's size, deal banners had small white text and no pill, Top Picks ended in a large
button, and category rows were sized off-board.

**After:** `src/render/templates/flash/FlashEmailBody.tsx`, Flash only. Bump keeps its own body,
and Autumn and the rest keep the shared one. It is built from six new compiled frames:
- `flash-body-categories` (heading and rows);
- `flash-body-heading`;
- `flash-body-picks` (grid) and `flash-body-picks-cta` ("See More");
- `flash-body-deal-left` and `flash-body-deal-right`.

The brief still decides which sections a send has and what they say:
- **Categories:** rows at the board's spacing for however many categories there are (up to six);
  the block ends 72px under the last row.
- **Top Picks:** 1–4 products, two per row, faded as on the board.
- **Deals:** banners alternate left/right copy; a deal with no percent shows its name and CTA.
- **Anything the board doesn't design** (body copy and CTA, brand tiles, terms) still comes from
  the shared `SectionView`.
- Metadata, nav, teaser bar and footer are shared, now exported from `Email.tsx`.
- Ids are unchanged (`s<n>/head`, `t<n>/name|icon|pic|upto|pct|cta`, `product/<n>/photo`, `cta`),
  so existing edits still land.

Removed from `Email.tsx`: the two Flash-only branches (`productRecs`, `categoryTiles`), `FlashPill`
and `categoryImage` (moved into the Flash body).

Layout and tools:
- `cropWithin` turns a cropped image layer nested in a clipping frame into one crop for that box.
- Headings fit using the board's own character width (the role's generic 0.55 shrank "Flash Sale
  Top Picks").
- The compiler deletes stored images no layout uses.
- The position check gained `frame`, which measures a section from its `[data-frame]` block.

Position check: every body layer within 3px, except the deal percent ("75%  OFF" has two spaces on
the board), which sits in the same spacing question as the hero offers.

Verified:
- `npm run check` passes, including the three-boards render of Bump and Autumn;
- live session: E1 and E3 bodies match the board's look.

Rollback: `git revert <sha>`.

sha: 4777ccc

## Step 18 — One text-contract rule for every Flash run: the board's own
**Problem:** the compiled emails had no contract on urgency, offer or CTA. The brush and buttons
grew with the text instead, so the Copy tab measured the grown box: same design, different ideal
(E2 11, E4 13). Contracts elsewhere used hand-picked budgets (`brush.w − 60`, `fw × 0.75`,
`offer × 1.1`, `760`, `820`…).

**Rule** (`boardFit` in `flash/textContracts.ts`): a run's contract comes from its compiled Figma
layer.
- Design size: the board's font size.
- Room: the board text's own width.
- Character width: the board text's own width divided by its characters.

So the board's copy is exactly the ideal count; longer copy contracts (yellow up to 10%, red past
it). `room` is widened only where the board text doesn't fill its slot: category labels run to
their arrow, a deal name to the banner's middle, and headings take the sheet less margins.

Applied to every single-line run:
- Emails E1/E2/E3: urgency, title, offer, CTA, and E2's category labels. The brush no longer
  grows; it stays at the board's size.
- Body: headings, category labels, Top Picks CTA, deal name, percent and CTA.
- Socials: urgency, title, offer.
- Desktop hero: urgency, title, offer, qualifier, CTA. Flash's `hero.qualifier` now contracts
  instead of vanishing past 42 characters.

Live session, urgency ideal per design: launch 11, tomorrow 13 (E2 and E4 alike), today 10. Board
copy still renders at exactly the board size (position check unchanged: only the offer spacing
rows).

Rollback: `git revert <sha>`.

sha: d1e1781

## Step 19 — Brush stroke fills its box (E2/E4 "ENDS TOMORROW" spilled)
The tomorrow board's brush box is 520×66, sized for its own 13-character "ENDS TOMORROW". Our
`brush-stroke.svg` (437×79) had no `preserveAspectRatio`, so as a CSS mask it kept its own
proportions and painted only ~70% of that long box. The text ran off both ends while measuring
green. It now has `preserveAspectRatio="none"` and stretches to its box as in Figma. Boxes that
already have its proportions (E1, E3, hero, socials) look the same. Copy past the board's count
contracts (step 18), so the brush never needs to grow.

Rollback: `git revert <sha>`.

sha: 7e5be66

## Step 20 — Bump position check on its own server; Bump hero desktop compiled (`569:15`)
**New server:** `npm run positions:bump`, localhost:5182 (`vite.bump-positions.config.ts`,
`dev/bump-positions/`); headless with `npm run check:positions:bump`. The check itself moved into
`dev/bump-preview/positionsCheck.tsx`, shared by both pages. `positions.html` on 5181 behaves as
before (same 17 rows).

**Frame:** `bump/Hero.tsx` was transcribed from SC26_0058 Wk33 Bump's hero desktop (`569:15`, the
page linked: full-bleed photo, copy on the right), so that's the frame compiled (`bump-hero`).
The SC26_0060 board's own hero (`569:10`) is a different design: photo collage, copy top left.

**Before**, against Figma:
- urgency 25px narrow;
- EXTRA box 171px off (a lockup-wide box with the text right-aligned in it);
- 20% OFF 14px short (its font was capped to stop the lines overlapping, which trimmed boxes no
  longer need);
- CTA 11px off;
- photo crop off (runners ghosted).

**After** (`BumpHero` on `FigmaFrame`):
- every layer within 3.3px; the photo at Figma's crop;
- the code line at its board box (top 639, right 1351).

Behaviour:
- `boardFit` (now also in the shared `model/textContracts.ts`) on urgency, EXTRA, offer, code line
  and CTA: the board's copy is the ideal count, longer copy contracts to 60% of the board size.
- Rows end on their own board right edge and grow left.
- The lockup's soft glow (150px drop shadow) is kept.
- **The board's dark gradient over the photo is removed** (user: it fought other photos).
- Smart placement as before (lab: places on gallery photos).

Rollback: `git revert <sha>`.

sha: c930fe5

## Step 21 — Bump paid socials compiled (`569:16`, `569:17`, `569:18`)
**Before** (hand-transcribed, with one session's nudges baked in), 20 layers more than 4px off:
- card (ticket) 25–33px off;
- wordmark 57–91px;
- EXTRA / 20% OFF up to 116px;
- CTA up to 95px;
- logos up to 252px.

Also, all three ratios used the 1x1's tilt and card. Each board has its own: −4.03° / −2.99° /
−3.39°, and 935 / 951 / 951px wide.

**After:** one `bump/Social.tsx` (`BumpSocial`, by ratio); `Social1x1/4x5/9x16.tsx` are now thin
wrappers, so imports are unchanged. Every mapped layer is within 3.3px on every ratio (ticket,
wordmark and logos exact).

Compiler and layout:
- **Rotation:** `figma-pull` records each layer's whole page rotation (`turn`). `ownBox` recovers a
  rotated layer's own size from its upright box; `placeIn` puts a layer inside its rotated parent
  in the parent's own px. The wordmark sits at −90° on the card, −94° on the page.
- **Ticket shapes:** the old shape (1520×674) was letterboxed in the flatter social cards. There
  are now three exact tickets (`ticket-tag-1x1/4x5/9x16.svg`), each the board's own rounded
  rectangle minus its punched hole, un-rotated into the card. They're registered in
  `mark-shapes.json` and the library (graphics check passes).
- **`boardFit`** sizes a two-line board run by its longest line. EXTRA / 20% OFF is one field
  sized by the longer line.
- **Brand slots:** the rule moved into `layout.ts` (`brandSlot`), shared with the Flash email
  strips. The board's brand in its slot keeps its exact box; any other brand gets an even cell. The
  Patagonia slot is the whole instance, since the library logo carries its tagline.

Behaviour kept:
- the code | CTA row ends at the board CTA's right edge and grows left;
- "CODE" plus the bold word, or the qualifier;
- up to four brands, the fourth in the board's "& More" place;
- design-direction clip shapes (`FigmaFrame` `sheetStyle`);
- card shadows.

Placement lab, same six photos as before: 22 of 24 tiles get the same result; 1x1 on Climb1 drops
from clean (card 0.9) to legs/gear (0.7), and the hero on one photo from clean to legs/gear,
because the card now sits at its true board position.

Rollback: `git revert <sha>`.

sha: 03c8f42

## Step 22 — Bump email heroes compiled (sends 1–3: `538:21930`, `538:22079`, `538:22190`)
**Before**, against Figma, 21 layers more than 4px off:
- ticket 18–26px off;
- offer up to 72px;
- CTA up to 97px;
- logos up to 261px;
- send 3 had no ticket mark layer at all.

Each send's card shadow was also mixed up: send 1 carried send 2's numbers, and send 2 had none.

**After:** one `bump/EmailSend.tsx` (`BumpEmailSend`, by send); `EmailHeader1`, `EmailHero` and
`EmailHeader3` are thin wrappers. Every mapped layer is within 3.4px on every send (ticket and
logos exact). The code line's right edge is within 3–6px on the emails and 0–3px on the socials;
it was 15–20px before.

Shared work:
- `bump/Ticket.tsx`: `TicketCard` and `brandMarks`, used by the socials and the emails. The CODE
  | CTA row now gives the divider the board line's width (the "|" glyph's ~12px pushed CODE left)
  and allows for CSS's trailing letter spacing.
- `scripts/figma-tickets.ts`: the ticket marks drawn from the board, now six (three email
  sends). It reproduces the social ones byte for byte.
- The compiler records every drop shadow (`shadows`). `shadowFilter` builds the CSS filter, and
  cards take both board shadows from there.
- The position check holds a fixed-width Figma text box (the email offers, 630px boxes round
  ~590px text) only to its aligned edge, top and foot, and notes that.

Kept as tuned: the marquee (top 4, 95px orange band on sends 2 and 3, editable text). The board's
band is a 110px picture of its text. **Removed:** the dark gradient over each send's photo (as on
the hero; the board's frames have none).

Known: on send 2 the board's photo is drawn at 98.6% of a cover fit, dropped 16px. Picture
centres a photo that's shorter than its frame, so ours sits 8px higher.

Placement lab, same photos: 17 of 18 email tiles are unchanged. E2 on Climb1 goes from clean
(card 0.8) to legs/gear (0.7).

Rollback: `git revert <sha>`.

sha: dd528d5

## Step 23 — Bump email bodies compiled (`585:23`, `583:4`, `585:25`); unused files removed; contracts everywhere
**Before**, against the board, 96 layers more than 4px off across the three bodies:
- the nav was drawn *under* the hero instead of above it;
- headings were 198px with no offer line, where the board has 183/198/140px with "EXTRA 20% OFF"
  over "Your Top Picks";
- products sat 100–150px off;
- brand tiles 250–850px off;
- send 3 showed four brand tiles where its board has a second "Bestsellers" product grid and See
  More;
- send 2's default fifth brand was Smartwool where its board has Columbia.

**After:** one `bump/EmailBody.tsx` (`BumpEmailBody`, by send); `EmailBody1/2/3.tsx` are thin
wrappers with unchanged names and exports, so every target file is still there. Every mapped
layer is within 4px on every send (`localhost:5182` clean). How it's built:
- Sections are found by the board's own structure (section frames in order, layer names inside),
  so one reader serves all three sends.
- The board's order: nav, hero, body copy + Shop Now, heading, products, See More, second heading,
  then brand tiles or a second product grid, then the footer.
- Headings and tiles get the board's textures (`figma/Fill.tsx`).
- The brand section grows by the board's row step for more than three rows, or shrinks for fewer.
  It used to cut off a fourth row; 9 brands now give 5 rows, 3 give 2.
- With no brief brands, each send's own board brands are used.
- The price keeps the board's size, in Quiet Sans: the board's Tiempos Headline isn't in the type
  kit.

Compiler and check:
- frames can skip sections whose images they don't need (metadata, the body's copy of the hero);
- overlay textures are capped at 1200px;
- a fixed-height board text box (NONE) is held by its vertical alignment.

**Text contracts:**
- `boardFit` treats a fixed-width board box as room at the font's usual character width, not a
  width read off the box. The 475px product labels aren't held to "Brand Name"'s 10 characters.
- `boardFit` gives a hair of room so the board's own copy lands on the board's size (`fitText`
  rounds down, and 25 came out as 24.999…).
- New contracts: the Bump body footer lines; the CPLP tile category (its old inline formula,
  now a two-line contract); the Flash hero and social topic-variant lead line.

On the 5182 page, 195 editable runs: every one has a contract except the marquee (it loops, with
no box) and the body paragraphs (held to the board's line count). On 5181, the remaining fixed
labels ("UP TO"/"EXTRA", "& MORE") and the email's metadata and nav still get the Copy tab's
single-line overflow check.

**Removed** (unused):
- `bump/index.jsx` (it re-exported files that no longer exist);
- `bump2/BumpEmail.tsx` (an old full-email draft nothing rendered);
- `bump/EmailBodyContent.tsx` and `bump/EmailBodyHeader.tsx` (replaced by `EmailBody.tsx`).

Rollback: `git revert <sha>`.

sha: 8df9a9c

## Step 24 — Everything selectable again; the Bump marquee drawn as the board's
**Selection.** In the compiled templates, layout-only boxes (text anchors, the ticket's CODE | CTA
row, the Bump hero's glow layer, the Flash brush wrappers) were stacked over real layers and took
their clicks:
- On the Bump email headers and socials, the CODE | CTA row spans the card from its top, so the
  offer and the ticket couldn't be selected (user report).
- On the Bump hero, the glow layer covered the whole frame.

Fixes:
- Layout boxes now pass clicks through (`anchorOf`, the ticket and card wrappers, the glow, the
  brush wrappers, `FigmaFrame`'s frame, the body sections).
- Every editable piece declares itself clickable inline: `Editable`, `Ground`, `Movable`, `Media`,
  `Picture`. This doesn't depend on a stylesheet, since the check pages don't load the studio's.
- Text trimmed to cap height still hit-tests its full line, so EXTRA on the hero swallowed clicks
  on the badge above it. `typeOf` now clips trimmed runs a little past their box (room for accents
  and descenders), so clicks stay with each run.

Verified with a click-point sweep: all 296 editable layers on the Bump page and all 379 on the Flash
page can be clicked; before, 40+ couldn't.

**Marquee** (user: the marquee, its "|" divider and the text style didn't match the board). The
board's marquee is a picture; measured off it:
- Sofia Pro (565px for "ENDS TOMORROW" against 569 for Sofia Pro and 592 for Quiet Sans), capitals
  45px tall and centred on its 110px strip;
- the divider is a solid 6px cap-height bar, with 45px before it and 38px after.

Ours was Quiet Sans 800, 95px band, text top-aligned, and a thin "|" glyph with 24px gaps. It is
now drawn at the board's strip (send 1: no band, 4px down; sends 2 and 3: orange band 110px),
measured within 1px of the board's capitals on every send. Divider ids are unchanged.

Rollback: `git revert <sha>`.

sha: 0074423

## Step 25 — AUTUMN20 template (`sc26_0058`) removed
It had been switched off (`exposed: false`), but its code was still wired up. User: remove it.

Removed:
- `src/render/templates/autumn/` (`AutumnEmail.tsx`, `AutumnSocial.tsx`);
- the `sc26_0058` spec and its variants (`templates/variants.ts`);
- its email-hero and email-body sizes in `templates/registry.ts`;
- its branches in `One.tsx`, `BoardHero.tsx` and both `BoardExtras.tsx`;
- the Autumn-only hero helpers in `BoardHero.tsx` (it is now just the router);
- its four library assets (`autumn-social-photo`, `autumn-email-photo`, `autumn-hero-photo`,
  `autumn-ticket`) and their files in `public/reference/`;
- its mentions in `check-graphics` and `check-three-boards`;
- its doc rows.

Kept: the SC26_0058 board's measurements in `references.json`. That file is a corpus of 16 boards
the brief parser and layout model read, not the template.

Campaigns on it: `migrateSheet` rebuilds a session on a removed template on its replacement
(`sc26_0058` → `sc26_0060`, built from the same board family), keeping its name, brief and edits,
instead of failing to open. "Test 3" (the one such session) checked read-only: it reopens on
Bump with 40 assets and both text edits. Its file is rewritten only when it is next opened.

Rollback: `git revert <sha>`.

sha: 2f75666

## Step 26 — Bump 2 hero desktop compiled (launch `569:10`, ends today `582:2`)
Bump 2 is its own design: the cream-and-collage board on page `538:15528`. It is not the Bump
template (`sc26_0060`), whose ticket design comes from the SC26_0058 page.

**Before:**
- Bump 2's launch hero borrowed the other Bump's hero, a different design: every layer 550–970px
  off and no collage.
- The hand-written ends-today hero was 17–54px off.

**After:** one `bump2/Hero.tsx` (`Bump2Hero`) for both phases, from the two frames: cream paper
ground (texture via `Fill`), eyebrow, "EXTRA 20% OFF", the code line, the Shop Now button and the
four-photo collage at the board's crops. Every mapped layer is within 0.7px. Behaviour:
- `boardFit` contracts on every run;
- the code line is "CODE" plus the bold word, or the qualifier;
- the button grows with its label.

Ids are kept (`urgency`, `offer`, `code/*`, `cta`, `cta/mark`, `image-1`–`4`).
`bump2/HeroEndsToday.tsx` is removed.

Also: the four pill marks (`pill`, `pill-soft`, `pill-tile`, `pill-wide`) now stretch to their box
(`preserveAspectRatio="none"`), as the template docs intend. In a box of different proportions
they had shrunk to fit. Bump 2's 323×96 button against `pill-soft`'s 300×100 showed it.

Known: the board's top-right collage photo is turned ~8° inside its frame. Picture pans and zooms
but doesn't rotate, so ours is upright; a swapped-in photo shouldn't inherit that tilt anyway.

Rollback: `git revert <sha>`.

sha: c48d296

## Step 27 — Bump 2 paid socials compiled (`569:7`, `569:8`, `569:9`)
**Before** (hand-written), 15 layers off or missing:
- the photo 17px off on 1x1 and not on the page at all on 4x5 and 9x16;
- the button 29px off;
- the eyebrow 26px off;
- 9x16's wordmark and brand row absent.

All three ratios also used one window shape, scaled.

**After:** one `bump2/Social.tsx` (`Bump2Social`, by ratio); `BumpSocial1x1/4x5/9x16.tsx` are thin
wrappers. Every mapped layer is within 1.3px on every ratio.
- **Photo:** in each ratio's own stepped window, clipped to the board's outline. The green
  outline is a library mark drawn from the board's own stroke (`bump2-window-1x1/4x5/9x16`).
- **Rotation:** the board's photo is turned in its window and is now drawn at its board angle;
  a swapped photo starts upright.
- **Copy:** stays in the window's cut-out (`centred`). EXTRA and 20% OFF are two fields on the
  board's two lines. Photo id is now `photo` on every ratio (9x16 used `hero-photo`).
- **9x16 brand row:** fills the board's slots from the brief's brands, plus "& More".

Shared work:
- **Compiler:** reads vector geometry (`&geometry=paths`); a vector that holds a photo or carries
  a stroke records its outline (`path`) and stroke (`stroke`: colour, weight, align, outline).
- **`cropOf`:** reads rotation from the full image transform (scale k, turn φ, centre via the
  inverse map) and returns `rotate`. `Picture` gains `initialRotate`, applied to the board's own
  photo only. `FigmaFrame` and the Bump 2 hero collage pass it (the hero's tilted photo is now
  right too). Unrotated crops come out as before (checks unchanged).
- **`scripts/figma-tickets.ts` → `scripts/figma-marks.ts`:** it also draws Bump 2's window
  outlines.
- **`fitText`:** text that fits is set at the design size exactly. It used to round down even
  then, so a 38.93px board size drew at 38.
- **`typeOf`:** a tracked-out run (positive letter spacing) takes CSS's trailing space back off
  its box, so right-aligned tracked text ends on its edge. The position check allows for that
  space in the box.

Rollback: `git revert <sha>`.

sha: b8642b9

## Step 28: Bump 2 emails, the board's five designs compiled (`583:3`, `585:11`, `585:12`, `585:13`, `585:14`)
**Before:** four hand-written bodies (`bump2/EmailBody.tsx`, `EmailBody3/4/5.tsx`, about 3,400 lines).
Two of them came from no board frame (`node: '-'`), and the board's fifth design was missing.

**After:** one `bump2/EmailBody.tsx` (`Bump2EmailBody`, by design) draws all five, each from its own
compiled frame (`bump2-body-1..5.json`), with the board's sections in the board's order:
- **Inbox lines:** sender, subject, preview; subject and preview come from the brief when it has them.
- **Nav, green headings, product grids, See More, brand tiles, footer:** Bump's, now exported from
  `bump/EmailBody.tsx` (`Nav` and `Footer` pulled out of `BumpEmailBody`; `reader().all`;
  `Button` takes its mark).
- **The design's hero:** found by name and kind.
  - Paper ground.
  - Photo, in a stepped window clipped to its outline or framed with its border.
  - Design 4's paper cut-out.
  - Green outline: a library mark from the board stroke, or design 5's line pattern.
  - Eyebrow(s), EXTRA / 20% OFF, code line, Shop Now ×2.
  - Brand row from the brief.
  - Body copy with the code word in the board's green bold run.
- **Category banners:** board photo (swappable), its shade, tilted offer tag, name, brush arrow mark.

Every layer is in its board place: all 233 mapped layers are within 4px except 9.
- **Inbox subject/preview (6):** set in Inter, which the studio doesn't load; the fallback face is narrower.
- **"WOMEN'S APPAREL" (3):** 4.4px wide (the curly apostrophe's glyph).

Designs: `design-1..5` (`EMAIL_VARIANTS.sc26_bump2`), heights the frames'.
- **A new sheet's pick (from the send's angle):**
  - final hours / last chance → 5;
  - ends today → 1;
  - ends tomorrow → 4;
  - ends soon → 3;
  - else → 2.
- **Earlier saved choices map across:** `variant-1/2/3/4` → `design-1/2/4/5`.

Compiler:
- **Run colour:** a run's colour is kept (`runs[].style.fill`).
- **Strokes on any layer:** text and frames as well as vectors. A text stroke is drawn by `typeOf`
  (design 3's ENDS SOON tab is its eyebrow's outside stroke).
- **Shade:** gradients over a layer's image become a CSS `shade` (also drawn by `Fill`).
- **Blend:** a layer's blend mode.
- **Custom effects:** a layer with a Figma custom effect is saved as Figma's own render (`render`); the
  SVG export drops the effect.

`scripts/figma-marks.ts`: draws the four hero windows and `bump2-arrow`.

Rollback: `git revert <sha>`.

sha: 673629e

## Step 29: Bump 2 in the studio's template picker; inbox lines in Quiet Sans
- **Bump 2 in the picker.** It was hidden (`exposed: false`). A Bump brief now offers two templates,
  "Bump — orange ticket" (`sc26_0060`, renamed from "Bump — cream and collage") and
  "Bump 2 — cream and collage" (`sc26_bump2`). The picker no longer locks for a Bump brief; it starts
  on the first. A Flash brief still locks to Flash. New campaign: when the brief's type rules out the
  current pick, the picker switches to the first match. Before, it only switched when there was
  exactly one match.
- **Email hero.** A Bump 2 send's "email-hero" asset, where a brief asks for one, is the chosen
  design's own hero (`Bump2EmailHero`). It shares its edits with the hero inside the body: both are
  keyed as the email-hero asset, as Bump's are. The board column shows the hero's height
  (`heroHeight` on each design).
- **Inbox lines.** The subject and preview lines are set in Quiet Sans at the board's size; the board
  uses Inter, which the studio doesn't carry.

Rollback: `git revert <sha>`.

sha: f5013fe

## Step 30: photos with any id open the photo panel
The Design panel showed photo controls only for ids ending `/photo` or `/ground`, or holding `/pic`
or `/el/`. Bump 2's hero collage (`…/image-1..4`) and its category banners (`…/category/n/image`)
could be selected but not swapped or cropped. The panel now also asks the page: any layer drawn
by `<Picture>` (`.pic` that isn't `.media`) gets the photo controls.

Rollback: `git revert <sha>`.

sha: aa9b55c

## Step 31: contracts measure real widths; a campaign name no longer replaces the offer
- **Measured contracts.** `boardFit` (the shared board contract, used by Bump and Bump 2) now
  measures the new text against the board's own line in the same face and scales the board's width
  by that ratio. It used to count characters: "CODE SPOOKY20" has the board's 13 characters but is
  far wider than "CODE CHILLY20" (O, K, P against I, L), so it never contracted and ran out of the
  window on the socials and email heroes. The ratio holds before the brand face loads (both are
  measured in its fallback). Board copy is unchanged: the same text gives a ratio of 1, so it still
  lands on the board size and the position checks hold. The floor drops from 60% to 40% of the
  board size, so long copy contracts instead of spilling. The contract's character width is the
  one that gives that size, so the copy panel agrees.
- **Offer line.** Claude's parsed `headline` replaced `offer` unconditionally. "Spooky Good Deals"
  (the brief's lockup name) became the line under EXTRA and overflowed it. It now replaces the offer
  only when it states a figure ("Save an Extra 20%"); otherwise the offer stays the amount (20% OFF).
- **Saved campaigns.** The sheet is now v9: saved v8 campaigns rebuild their derived copy once on
  open, with edits and design choices kept, so existing campaigns pick up the corrected offer.

Rollback: `git revert <sha>`.

sha: 210c2cd

## Step 32: Bump 2 email heroes take the send's urgency and the board's paragraph
Two choices made in review.
- **Eyebrow.** The hero's eyebrow is the send's urgency, a short word as the slot is drawn for.
  - An ends-today send reads ENDS TODAY, or the brief's own LAST CHANCE / FINAL HOURS.
  - An ends-tomorrow send reads ENDS TOMORROW.
  - Any other send reads the campaign's duration (4 DAYS ONLY); with no duration, the board's word.
  - The brief's marquee line ("EXTRA 20% OFF" on a brand send) no longer lands in design 3's small
    tab, where it shrank to 24px.
  - On design 5, whose second eyebrow already says ENDS TODAY, the first keeps the board's LAST CHANCE
    rather than repeat it.
- **Paragraph.** The paragraph under the brand row is the design's own board copy with the brief's
  code. The brief's text is used only where the brief writes that send's body copy (Claude's read of
  it, or the send's own stated copy), never the offer line that stood in for it.

The build records both on each send's copy (`urgency`, `bodyStated`). The sheet is now v10, so
saved campaigns re-derive once, with edits and design choices kept.

Rollback: `git revert <sha>`.

sha: 9134cec

## Step 33: Auto-place inside Bump 2's shaped photo slots
Smart placement framed every photo against the whole sheet, with the photo's box taken as all
visible. Bump 2's slots broke that three ways.
- **The clip outline.** A stepped window shows only its outline; a face placed under the copy
  cut-out was scored as clean.
- **The outline mark.** The window's outline mark covers the whole photo box and counted as an
  obstacle, so every crop scored as covering a face (tier 4).
- **The free band.** It was read off the whole sheet, so on a category banner deep in a
  7,000px email it cut through the banner.

`<Picture slot>` is a photo framed within itself (`autoPlace.tsx`, `slotLimits`):
- **Hidden area.** What its clip outline hides is off limits (`shapeCells` in `autoFrame.ts` turns
  the outline into rects; a face must sit in what can be seen).
- **Overlays.** Whatever covers most of the slot (its outline mark) isn't an obstacle.
- **Band.** The free band is the slot itself.

**Where it applies.** Only Bump 2 sets `slot`: the hero collage tiles, the social windows, email
designs 1-3's windows and the category banners. Design 4 (a framed photo under a paper cut-out)
and design 5 (no photo) are left as they were, by request. Every other template places as before.

**Measured on the live Spooky campaign (Auto-place run with a stand-in editor; nothing saved).**

| Slot | Before | After |
|---|---|---|
| E1 design-2 window | tier 4 | tier 1 |
| E2 design-3 window | tier 4 | tier 0 |
| First category banner | tier 2 | tier 0 |
| Hero collage | tier 0 | unchanged |

On the 1x1 social window, no crop up to the zoom cap shows the photo's faces. They sit where the
copy cut-out is, as on the board. Placement now shows more of them (about 80% hidden against 100%
for the board's crop), and scores that honestly as tier 4.

`PLACEMENT_VERSION` is now 6, so photos already auto-placed are placed again. `check:autoframe`
adds a notched window: head and torso must land outside the hidden quarter.

Rollback: `git revert <sha>`.

sha: f669c7c

## Step 34: Figma Token menu in the desktop app
- **The menu item.** SAC Studio menu → Figma Token… opens a small window (`desktop/token.html`,
  `token.js`, `token-preload.cjs`) to save, replace or remove a Figma personal access token. It is
  written as `FIGMA_TOKEN=…` (owner-only) to a `.env` in the app's settings folder, outside the
  content clone that updates replace and never in any repo. It takes effect at once (the server
  runs in the app's own process). Figma is asked whose token it is, so a wrong one is flagged. The
  window never reads the token back: it shows only whether one is saved and its last four
  characters.
- **Without a token.** The studio runs as before on the default library and local uploads; only
  the Figma gallery is off, and it says where to add one.
- **Reading the token.** `server/figmaGallery.ts` reads the app's `.env` (`SAC_STUDIO_ENV`) first,
  then the development `.env` files as before.
- **Shipping.** This is a shell change (`desktop/**` is packed into the installer), so it reaches
  designers with a new installer, not a content update. Content-only installs keep working; their
  gallery message just doesn't point at a menu they don't have.

Rollback: `git revert <sha>`.

sha: 7bfa07d

## Step 35: the Figma token prompt in the studio itself (no reinstall)
The Figma Token menu (step 34) lives in the desktop shell, which only a new installer replaces. The
prompt now lives in the studio, which content updates replace, so every installed app gets it.
- **On start.** When no token is saved and nobody has skipped it, the studio asks once: a "Figma
  token (optional)" dialog with Save, or Skip (remembered). The Figma gallery's no-token message
  has an "Add Figma token" button that opens it again. An open gallery retries once a token is
  saved.
- **The server.** `GET/PUT/DELETE /api/figma-token` (`server/figmaGallery.ts`). Saving writes
  `FIGMA_TOKEN=…` (owner-only, other lines kept) to the app's settings-folder `.env`: the shell
  names it in `SAC_STUDIO_ENV`; under an older shell it is `<app data>/SAC Studio/.env`, the
  same folder. In development it is `sac-email-studio/.env`. The token is used at once, checked
  with Figma, and never sent back to the page, only whether one is saved and its last four
  characters. The server's existing origin check refuses other sites (403).
- **Without a token.** The studio runs as before on the default library and local uploads.
- **Fix.** `src/model/textContracts.ts` imports `../fonts.ts` with its extension (`tsconfig`:
  `allowImportingTsExtensions`). The dev AI server runs that file in Node, which needs it; since
  step 31 a restart of `npm run dev`'s server failed on it. The desktop bundle was unaffected.

Rollback: `git revert <sha>`.

sha: 5a91773
