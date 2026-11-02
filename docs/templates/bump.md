# Bump (sc26_0060) — template log

The orange-ticket Bump template. Its spec is grounded in the SC26_0060 Wk35-36 Bump board (Figma
file `ioB3sP8LwBiTUPQN7jlF81`, page `538:15528`, 146 measured assets). Its compiled frames come
from the SC26_0058 Wk33 Bump page that board links to: hero desktop `569:15`, paid socials
`569:16`-`569:18`, email heroes `538:21930` / `538:22079` / `538:22190`, email bodies `585:23` /
`583:4` / `585:25`. Formats: hero desktop, paid social 1x1 / 4x5 / 9x16, three email sends (hero +
body), and the small formats from the spec (`cb`, text banners, badging mocks, CPLP tile, hero
mobile). "Bump 2" (`sc26_bump2`) is a separate template on the same page; see `bump2.md`.

## What's in it
| Piece | File | What it does |
|---|---|---|
| Hero desktop | `src/render/templates/bump/Hero.tsx` | `BumpHero` on `FigmaFrame`: full-bleed photo, right-hand lockup (urgency brush, EXTRA, 20% OFF, code line, CTA). Frame `bump-hero.json`. |
| Social | `bump/Social.tsx` (+ `Social1x1/4x5/9x16.tsx`, thin wrappers) | `BumpSocial` by ratio: photo, tilted orange ticket, brand row; `bump-social-*.json`. |
| Ticket | `bump/Ticket.tsx` | `TicketCard` and `brandMarks`: tilted ticket (offer, CODE / CTA row, vertical wordmark on socials), shared by socials and email heroes. |
| Email hero | `bump/EmailSend.tsx` (+ `EmailHeader1.tsx`, `EmailHero.tsx`, `EmailHeader3.tsx`) | `BumpEmailSend` by send: photo, looping marquee, ticket, brand row; `bump-email-1..3.json`. |
| Email body | `bump/EmailBody.tsx` (+ `EmailBody1/2/3.tsx`) | `BumpEmailBody` by send: nav, hero, copy, Top Picks grid, See More, brand tiles, footer; also `BumpEmailSections`. `bump-body-1..3.json`. |
| CPLP tile | `bump/BumpTile.tsx` | Orange halftone category tile. |
| Layouts | `src/data/figma/bump-*.json` | Compiled board layouts (hero, 3 socials, 3 emails, 3 bodies). |
| Email designs | `src/templates/variants.ts` `EMAIL_VARIANTS.sc26_0060` | Send 1 · 3 days only (826), Send 2 · ends tomorrow (1125), Send 3 · last chance (929). |
| Small formats | `variants.ts` `SHARED` | Own: Halftone tile (cplp-tile), Banner bar (text-link), Cream (hero-mobile). `cb`: Launch / Ends-today banner. |
| Sections | `src/render/emailSections.ts` (`BUMP_LAYOUTS`, `bumpBlocks`) | Each send's sections read off its body layout; hero height from the design. |
| Spec | `src/templates/specs/sc26_0060.ts` | Vocabulary for formats with no compiled frame ("Bump — orange ticket", alias CHILLY20). |

## History
Newest first.
- 2026-10-30 `63a0eef`: design directions removed (every asset drew direction A); Bump socials lose the `direction` prop.
- 2026-10-30 `37b9f6a`: small formats share designs across templates; Bump's halftone tile, banner bar and cream hero-mobile stay its defaults.
- 2026-10-30 `38cd339`: email sections for Bump (and Bump 2); all three sends drawn as sections are pixel-identical.
- 2026-10-30 `eaef133`: the code line (CODE + the code word) no longer vanishes when smart placement moves the copy left: a trimmed run's clip is up and down only (its side edges had cut the moved runs off). Homepage hero and email header, SC26_0071 Bump Alpine20.
- 2026-10-29 `fb94336`: Figma export carries opacity, blur, shadows (step 43; Bump cards' wrapper shadows still lost).
- 2026-10-28 `cbcd8e3`, `0074423`: marquee moved up 10px; then redrawn to the board (Sofia Pro, 110px strip, 6px divider); layout boxes pass clicks (40+ layers had been unclickable).
- 2026-10-28 `2f75666`: AUTUMN20 (`sc26_0058`) removed; its campaigns reopen on Bump.
- 2026-10-28 `8df9a9c`: email bodies compiled from Figma (three sends); brand tiles grow with the brief; contracts on every run.
- 2026-10-28 `dd528d5`: email heroes compiled; shared ticket lockup; all board shadows.
- 2026-10-28 `03c8f42`: paid socials compiled (per-ratio tilt, exact tickets, rotation in the compiler).
- 2026-10-28 `c930fe5`: hero desktop compiled from `569:15`; the board's dark gradient over the photo removed on purpose (it fought other photos); Bump position check on port 5182.
- 2026-10-28 `6a12d83`, `071aebe`: text fields carry a fit contract; typed spaces kept, copy never removed.
- 2026-10-28 `f0fd177`, `478629d`, `c40b0ab`: smart placement on Bump lockups (framing solver, CopyBlock, ticket cards shrink and move into free space); see `docs/smart-photo-placement-log.md`.
- 2026-10-27 `abc912b`, `9e94632`: templates restructured per directory (`bump/`); flash2 excluded from the TS build.
- 2026-10-06 to 10-13 (before the compile): hand-transcribed Bump. `6484a37` (social design its board carries), `2d17a8f` (bars, badging, strip declared from its board), `e589cb5` (brief decides how many).

## Figma export
- Compiled boards export from their layers; `figma-assets/` images are bundled (`a2823fc`).
- Clips, masks, opacity, blur and shadows follow the shared export fixes (`ff864f8`, `63b644f`, `19096b8`, `fb94336`).
- Known, still open (`docs/figma-compile-log.md`, steps 37 and 43): Bump's paper tiles and bands come out flat (no textures or blend modes); a shadow cast by a wrapper with no paint of its own (the tilted cards) is lost.

## Rollback
Revert newest first, one at a time: `git revert 63a0eef`, `37b9f6a`, `38cd339`, `0074423`, `8df9a9c`, `dd528d5`, `03c8f42`, `c930fe5`. Reverting a compile commit puts the hand-transcribed layout back, but the compiler and shared pieces stay. Shared studio commits (app, sections) are in `docs/studio-log.md` and `docs/email-sections-log.md`; what reached the app, when, in `docs/releases.md`; compile and export fixes in `docs/figma-compile-log.md` (steps 20-24).
