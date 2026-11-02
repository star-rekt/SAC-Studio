# Bump 2 (sc26_bump2) — template log

The cream-and-collage Bump. A second board-authored pass over the same SC26_0060 Wk35-36 Bump
board (Figma file `ioB3sP8LwBiTUPQN7jlF81`, page `538:15528`), offered as its own template beside
Bump in the picker. Frames: hero desktop launch `569:10` and ends today `582:2`; paid socials
`569:7`-`569:9`; five email designs `583:3`, `585:11`-`585:14`. Formats: hero desktop, paid social
1x1 / 4x5 / 9x16, five email designs (each self-contained: inbox lines, hero, body, footer), and
the spec's small formats (which fall back to Bump's vocabulary).

## What's in it
| Piece | File | What it does |
|---|---|---|
| Hero desktop | `src/render/templates/bump2/Hero.tsx` | `Bump2Hero`, both phases: cream paper, eyebrow, EXTRA 20% OFF, code line, Shop Now button, four-photo collage. `bump2-hero.json`, `bump2-hero-ends.json`. |
| Social | `bump2/Social.tsx` (+ `BumpSocial1x1/4x5/9x16.tsx`) | `Bump2Social` by ratio: photo in a stepped window with green outline, copy in the cut-out. `bump2-social-*.json`. |
| Email | `bump2/EmailBody.tsx` | `Bump2EmailBody` by design, plus `Bump2EmailHero` (the design's own hero) and `Bump2EmailSections`. Nav, headings, grids, See More, brand tiles and footer are Bump's, exported from `bump/EmailBody.tsx`. `bump2-body-1..5.json`. |
| Marks | `scripts/figma-marks.ts` | Draws the four hero windows, the social windows (`bump2-window-*`) and `bump2-arrow`. |
| Email designs | `src/templates/variants.ts` `EMAIL_VARIANTS.sc26_bump2` | Design 1 ends today, photo window (7229); 2 4 days only, top picks (7185); 3 ends soon, top brands (5899); 4 ends tomorrow, framed photo (6733); 5 last chance, bestsellers (6381). Old `variant-1..4` ids map to `design-1..4` (`RENAMED`). |
| Small formats | `variants.ts` `SHARED` | Own: Photo tile (cplp-tile), Banner bar (text-link), Photo (hero-mobile). |
| Sections | `src/render/emailSections.ts` (`BUMP2_LAYOUTS`, `bump2Blocks`) | Each design's sections read off its body layout by frame name. |
| Spec | `src/templates/specs/sc26_bump2.ts` | "Bump 2 — cream and collage"; formats it doesn't override use sc26_0060's vocabulary. |

## History
Newest first.
- 2026-10-30 `63a0eef`: design directions removed (no change to any asset).
- 2026-10-30 `37b9f6a`: small formats can take another template's design; Bump 2 keeps photo tile, banner bar, photo hero-mobile.
- 2026-10-30 `38cd339`: email sections for Bump 2; all five designs as sections are pixel-identical.
- 2026-10-29 `381ec64`: Figma plugin takes frames up to 32768px (design 4 is 8428px with many brands).
- 2026-10-29 `9964703`: Figma export of Bump 2: window crops (`clip-path`), charcoal logos, paragraph runs as one text, tilted tags on one line; hero desktop reads EXTRA 20% OFF.
- 2026-10-28 `f669c7c`: auto-place frames photos within their shaped slot (designs 4-5 left as they were, by request).
- 2026-10-28 `9134cec`: email hero eyebrow is the send's urgency; the board's own paragraph unless the brief writes body copy; sheet v10.
- 2026-10-28 `210c2cd`: contracts measure real widths (floor 40%); a campaign name no longer replaces the offer; sheet v9.
- 2026-10-28 `aa9b55c`: photo panel for every `Picture` (collage and banners were unswappable).
- 2026-10-28 `f5013fe`: Bump 2 offered in the picker (was `exposed: false`); Bump renamed "Bump — orange ticket"; email-hero is the chosen design's hero; inbox lines in Quiet Sans.
- 2026-10-28 `673629e`: five email designs compiled into one body (replaces ~3,400 lines of hand-written bodies); strokes, gradients, blends in the compiler.
- 2026-10-28 `b8642b9`: paid socials compiled; rotated photos; vector geometry; exact sizes in `fitText`.
- 2026-10-28 `c48d296`: hero desktop compiled from its own board (it had borrowed Bump's hero); pill marks stretch to their box; `HeroEndsToday.tsx` removed.
- 2026-10-28 `6a12d83`, `8df9a9c`: text contracts; unused files removed (`bump2/BumpEmail.tsx`).
- 2026-10-27 `abc912b`: Bump 2 added in the per-directory restructure.

## Figma export
- Window crops, logo colour, paragraph runs, tilted tags, hero offer: `9964703` (step 37). Frames above 8192px: `381ec64`.
- Clip structure, masks, opacity and blur: `ff864f8`, `63b644f`, `19096b8`, `fb94336`; board images bundled: `a2823fc`.
- Known: the paper textures and blend modes still come out flat. The top-right hero collage photo is tilted ~8° on the board and upright here (Picture doesn't rotate).

## Rollback
`git revert` newest first: `63a0eef`, `37b9f6a`, `38cd339`, `9964703`, `9134cec`, `673629e`, `b8642b9`, `c48d296`, `f5013fe`. Reverting `f5013fe` hides Bump 2 from the picker again only in part (the picker change is bundled with the hero and rename). Shared studio commits (app, sections) are in `docs/studio-log.md` and `docs/email-sections-log.md`; what reached the app, when, in `docs/releases.md`; compile and export steps 26-33, 37-38 in `docs/figma-compile-log.md`.
