# Flash Sale (sc26_0021) — template log

The full-bleed photography Flash template, grounded in the SC26_0021 Flash Sale Apr 4 board
(Figma file `7r3YL4Zko0WfQs5vnSO9OT`, page `248:710921`; alias `sc26_0047`). Compiled frames: hero
desktop `248:711465`; email launch `248:711098`, ends tomorrow `248:711329`, ends today
`248:711246`; paid socials `248:711520` / `248:711588` / `248:711656`; the Email 1 body frames.
Formats: hero desktop, paid social 1x1 / 4x5 / 9x16, three emails (hero + body), and small formats
drawn by `BoardExtras.tsx`. `flash2` is a separate, broken experiment and is not part of Flash.

## What's in it
| Piece | File | What it does |
|---|---|---|
| Hero desktop | `src/render/templates/flash/BoardHero.tsx` | Hero on `FigmaFrame`; `FLASH_HERO_FIGMA` maps editable ids to Figma layers. Frame `flash-hero.json`. |
| Email hero | `flash/FlashEmail.tsx` | `FlashEmailCompiled` (launch and ends today, one spec-driven component) and `FlashEmailTomorrow`; brand strips from the board's slots. `flash-email-*.json`. |
| Email body | `flash/FlashEmailBody.tsx` | Top Categories rows, Top Picks grid and See More, deal banners; the rest through shared `SectionView`. `flash-body-*.json`. |
| Social | `flash/FlashSocial.tsx` | One component reading the ratio's frame: photo, copy column, wordmark, brand rail. `flash-social-*.json`. |
| Contracts | `flash/textContracts.ts` | `boardFit`: each run's size, room and character width come from its board layer. |
| Extras | `flash/BoardExtras.tsx` | Theme-derived small formats with no board frame. |
| Email designs | `src/templates/variants.ts` `EMAIL_VARIANTS.sc26_0021` | Flash · launch (1155, with brand strip), ends tomorrow (2087), ends today (1295). |
| Small formats | `variants.ts` `SHARED` | Own: Photo tile (cplp-tile), Link row (text-link), Photo (hero-mobile). |
| Sections | `src/render/emailSections.ts` (`FLASH_ADDED`) | Middle of the email is the brief's sections (design `brief`); can add product feed, brand tiles, category tiles (design `added`). |
| Spec | `src/templates/specs/sc26_0021.ts` | Vocabulary for formats with no compiled frame. |

## History
Newest first.
- 2026-10-30 `63a0eef`: design directions removed.
- 2026-10-30 `904a706`: email sections for Flash; each section marks its start (`data-part`).
- 2026-10-29 `fb94336`: export carries opacity, blur, shadows (E2's glow had been a solid box); unstocked brands get a placeholder logo, not their name as type.
- 2026-10-29 `1db4280`: export finds images with spaces in their path (the Flash wordmark `public/logos/SC/`, now tracked).
- 2026-10-28 `d1e1781`: every run's contract from its board layer; brush and buttons stay the board's size. `7e5be66`: brush stretches to its box (ENDS TOMORROW spilled).
- 2026-10-28 `4777ccc`: email body compiled from six body frames; Flash leaves the shared renderer.
- 2026-10-28 `dc6887c`, `cdefe74`, `e947f93`: E2 hero rows without a board shot borrow the body tile's photo; brand strips use the board's slots, other brands even cells.
- 2026-10-28 `4d041e1`: paid socials compiled. `c24cba4`: E3 (ends today) compiled, E1/E3 share one component. `9555acb`: E2 (ends tomorrow) compiled: thumbnails, paper, glow.
- 2026-10-28 `a3d06c8`, `b6678f2`: sideways copy placement on E1/E3 added, then rolled back (copy stays centred, auto-crop stays).
- 2026-10-28 `029fe65`, `cc2713a`: title bolts no longer squeezed away; code pill only for a real code.
- 2026-10-28 `88dae2a`, `4ff3065`: E1 hero compiled; `FigmaFrame` inherits smart placement.
- 2026-10-28 `cfcfc57`, `9338ef8`, `90e0f64`: hero qualifier is a code or category line only (CTA moves up without one); dates line dropped.
- 2026-10-28 `6990a49`: pilot: hero desktop placed from Figma node data (title row had been 39-42px off).
- 2026-10-28 `6a12d83`: text fields carry a fit contract.
- 2026-10-27 `abc912b`, `9e94632`: per-directory restructure; flash2 excluded from the TS build.

## Figma export
- Wordmark path with spaces: `1db4280`. E2 glow (72% opacity, 197px blur) and board images: `fb94336`, `a2823fc`.
- Known, still open (`docs/figma-compile-log.md` steps 37, 43): Flash's photo-band textures and blend modes are flat; shadows cast by a wrapper with no paint (the cards) are lost.
- Open on the board: Figma's offer text is "70 % OFF" with a tightened space; the template draws "70% OFF" (7px).

## Rollback
`git revert` newest first: `63a0eef`, `904a706`, `d1e1781`, `4777ccc`, `4d041e1`, `c24cba4`, `9555acb`, `88dae2a`, `6990a49`. Reverting a compile commit restores the hand-transcribed layout; the compiler stays. Shared studio commits (app, sections) are in `docs/studio-log.md` and `docs/email-sections-log.md`; what reached the app, when, in `docs/releases.md`; compile steps 1-19 and 42-43 in `docs/figma-compile-log.md`.
