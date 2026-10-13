# Template architecture

The studio has three template sources:

| id | board | Figma page |
|---|---|---|
| `sc26_0021` | Flash Sale Apr 4 | `7r3YL4Zko0WfQs5vnSO9OT`, `248:710921` |
| `sc26_0058` | Wk33 Bump / AUTUMN20 | `7r3YL4Zko0WfQs5vnSO9OT`, `211:695439` |
| `sc26_0060` | Wk35–36 Bump / CHILLY20 | `ioB3sP8LwBiTUPQN7jlF81`, `538:15528` |

Each file in `src/templates/specs/` owns the fallback visual vocabulary.
`src/templates/registry.ts` supplies canvas geometry. The actual linked-page
compositions live as editable React layers under `src/render/templates/`:

| Asset type | Renderer |
|---|---|
| Email | `BumpEmail`, `AutumnEmail`, `FlashEmail`, plus `Email` sections |
| Paid social | `BumpSocial`, `AutumnSocial`, `FlashSocial` |
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
