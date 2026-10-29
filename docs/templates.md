# Template architecture

The studio has these template sources (AUTUMN20, `sc26_0058`, was removed; its campaigns reopen on `sc26_0060`):

| id | board | Figma page |
|---|---|---|
| `sc26_0021` | Flash Sale Apr 4 | `7r3YL4Zko0WfQs5vnSO9OT`, `248:710921` |
| `sc26_0060` | Wk35–36 Bump / CHILLY20 | `ioB3sP8LwBiTUPQN7jlF81`, `538:15528` |

Each file in `src/templates/specs/` owns the fallback visual vocabulary.
`src/templates/registry.ts` supplies canvas geometry. The actual linked-page
compositions live as editable React layers under `src/render/templates/`:

| Asset type | Renderer |
|---|---|
| Email | `BumpEmail`, `FlashEmail`, plus `Email` sections |
| Paid social | `BumpSocial`, `FlashSocial` |
| Desktop hero | `BoardHero` (three board-specific layouts) |
| GT, CB, PDP/PLP badging | `SiteCommerce` |
| Bump CPLP tile | `BumpTile` |
| Off-page/mobile formats, affiliate link | `BoardExtras`, using only that campaign's theme |

`One.tsx` is the route used by both the editor and export. A missing format
may borrow a canvas size, never another board's imagery or composition. The
affiliate text link has no measured frame, so it gets a small copy-only canvas.

Reference boards never decide quantity. The brief supplies explicit hero/GT/CB
counts, email sends, categories and social concepts; the Deliverables panel
can override them. A brief with no deliverable request creates no assets.
Saved pre-v5 campaigns are re-derived on open so board examples do not remain
as accidental duplicate deliverables. Existing designer edits survive.

Images, logos, product shots and decorative marks are registered in
`src/model/media.ts`. A renderer uses `Picture` or `Media` for each replaceable
layer and an id ending in `/photo`, `/product/N`, `/brand/N`, `/wordmark` or
`/mark`. Those ids drive the Library's compatible choices and keep edits stable
across saves and exports.

## Every graphic component is a real, editable vector

A mark, wordmark, button, badge or pill is never a flattened PNG, and never a
color-plus-`borderRadius` drawn straight onto an `<Editable>`/`<Ground>`'s own
`style`. Either reads in the app as "this is editable" (hover outline, a panel
that opens) while actually offering nothing a designer can swap or recolour
as a shape — the gap the ticket card, the CTA pills and the category rows
each had before being fixed this way:

- The shape is a real `.svg` under `public/graphics/`, registered in
  `src/data/mark-shapes.json` (`{fill, height, path, width}`) and added to the
  `MARKS` array in `src/model/media.ts` so it's browsable/droppable from the
  Library's Graphics grid, not just reachable via a hardcoded `<Media src=...>`.
- The renderer places it with `<Media src="/graphics/<id>.svg">`
  (`position:'absolute', inset:0` inside a sized wrapper), with the text as a
  separate, relatively-positioned `<Editable>` layered on top — not a single
  element carrying both the copy and the background.
- `mark-shapes.json`'s `path` is the shape's real outline, measured or pulled
  from Figma — not guessed. A simple rounded-rect CTA can be computed
  directly from its measured corner radius and box size (see `pill.svg`,
  `pill-tile.svg`, `pill-soft.svg` for the formula); anything with real
  curvature (a brush stroke, a torn edge, a ticket's punched corner) needs
  the actual vector pulled off Figma, e.g. via `download_assets` against the
  specific node, not the whole page.
- A rounded-rect's corner-radius-to-height ratio decides reuse vs. a new
  shape: within ~5 points of an existing shape's ratio, reuse it (the mask
  stretches to fit the box, so a close match reads as the same shape);
  meaningfully different, make a new one rather than visibly distort an
  existing mask.

`npm run check:graphics` (part of `npm run check`) enforces this automatically
over every template: every `mark`/`wordmark` library item must be a `.svg`,
and no template source may set `background` and `borderRadius` together on
the same `<Editable>`/`<Ground>`. A handful of known rasters still pending a
real Figma vector pull are named in that script's `PENDING_VECTOR` allowlist
rather than silently exempted — remove an id there the moment its real
outline is extracted, not before.

To add a template:

1. Add its measured board to `src/data/references.json`.
2. Add one complete spec file and register it in `src/templates/spec.ts`.
3. Add board-authored React renderers for the formats present on its linked
   Figma page; route them in `src/render/One.tsx`. Reuse `Picture`, `Media` and
   `Editable`, not a flattened whole-frame image.
4. Register exact source photographs/marks in `src/model/media.ts`.
5. Run `npm run check`, then compare browser previews against Figma screenshots.

Local Mason tasks use `qwen3-coder:latest`, but generated files must pass the
same checks and be reviewed against their stored dissection.
