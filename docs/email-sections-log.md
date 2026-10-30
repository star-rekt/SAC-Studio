# Email sections — change log

An email built of its template's sections: Named Sale's 15 email designs cut into
their sections (banner, nav, hero, copy, product feeds, brand and category tiles,
category buttons, footer), which any Named Sale email can take, drop, reorder or
swap for the same kind of section from another design. Sections stay inside their
template. Branch `email-sections`, off `named-sale`.

## Before it (same branch, not part of the feature)
- `bc28755` Review flow wireframe (`review.html`), Image and Logo galleries, upload captions.
- `e46cc8e` Named Sale brand logos as brand slots, not library graphics.

## Steps
| Step | What | Files |
|---|---|---|
| 1 | Each Named Sale email design lists its sections: kind, title (its title bar's words), its band of the board (top, height) and the board blocks in it. Classified by block name from `roles.dictionary.json` (`sections`); the hero is the block `heroes.json` names; other blocks are tile rows (brand tiles when they hold logos, else categories) or a strip (the urgency bar). Bands run from one section's start to the next's, so a design's own sections stack back to the whole frame (checked on all 15). | `named-sale/designs.ts` (`sections`); lab: `codegen.mjs` (`sectionsOf`, `code/sections.json`), `integrate.mjs`, `roles.dictionary.json` |
| 2 | An email with `parts` (`SheetAsset.parts`) is drawn as those sections stacked: each its design drawn as one band (`FigmaBand`: only the band's blocks, from its top, at its height). A part keyed `''` is the email's own design's and keeps the email's edits; any other key gets ids of its own. With no `parts`, an email draws exactly as before. Checked: all 15 designs drawn as their own sections are pixel-identical to the whole design (0 pixels off), and export the same content layers. | `sheet/types.ts` (`parts`, `EmailPart`), `named-sale/NamedSale.tsx` (`NamedSaleEmail`, `ownParts`, `sectionOf`), `render/figma/FigmaLayers.tsx` (`FigmaBand`, `useBand`), generated frames (band-aware `Ground`); lab: `codegen.mjs` |
| 3 | Figma export: an email of sections comes in as one frame per section, named for it ("Product feed · Your Top Picks", "Brand tiles", "Footer"), its layers inside, the same layers the whole design exports. The name comes from `data-export-name`, which only these bands carry: every other export is unchanged. | `render/toLayers.ts` (`name`), `FigmaLayers.tsx` (`Band.name`), `NamedSale.tsx` (`SECTION_NAMES`, `sectionName`), generated frames; lab: `codegen.mjs` |
| 4 | Review window, email: a Sections list. Each section can be hidden (kept, with its edits) or dragged into order; clicking it scrolls the email to it and opens Style (the same kind of section from any of the 15 designs) and Remove. "+ Add section" takes any section, by kind, in above the category buttons and footer; "Reset to design" goes back to the design's own. Choosing another design (review or editor) resets the email to that design's sections. A change to the sections asks for the email to be confirmed again. | `review/Sections.tsx` (new), `review/Review.tsx` (wiring, signature, stage height), `review/review.css`, `App.tsx` (`chooseEmailDesign`), `sheet/types.ts` (`off`), `NamedSale.tsx` |
| 5 | The brief: a Named Sale email whose brief lists its sections ("Section N - Product Recs / Brand Tiles / Category Tiles", read by `model/sections.ts`) is built of them -- the design's own top (banner, nav, hero, copy) and bottom (category buttons, footer), the brief's sections between in its order, each the design's own section of the kind where it has one, else the first design's that does. Each carries the brief's header, drawn in the section's title layer (lab: `title`) in the board's type. More deals has no Named Sale section and is left out. A brief with no section list (the Memorial Day brief) keeps the design's own. A rebuild (more or fewer assets) keeps each email's sections. `npm run check` runs `check:sections`: bands contiguous and whole for all 15 designs (93 sections), and the brief mapping. | `named-sale/sections.ts` (new: `briefParts`, and `ownParts` / `sectionOf` / `SECTION_NAMES` moved here), `sheet/build.ts`, `sheet/types.ts` (`heading`), `FigmaLayers.tsx` (`FigmaText`, `Band.title/heading`), `NamedSale.tsx`, `App.tsx` + `review/Review.tsx` (rebuild keeps parts), `scripts/check-sections.ts`, `package.json`; lab: `codegen.mjs`, `integrate.mjs` (`title`) |
| 6 | Fewer options (review, 2026-10-30): the Sections list and "+ Add section" offer only Product feed, Brand tiles, Category tiles and Category buttons. The banner, nav, hero, copy and footer stay as the design has them. | `review/Sections.tsx` |
| 7 | Each look once (review, 2026-10-30): sections that draw the same (their blocks each from their own top, text by its type not its words, pictures by their boxes not which photo) share a `look` (lab), and the panel offers each look once as "Style N" of its kind -- 30 options down to 13: product feed 5, brand tiles 2 (designs 1 and 9 are one), category tiles 5 (7 and 13 are one), category buttons 1 (all five are one). A style the email's own design draws is taken from its own design, so its edits stay. | `named-sale/designs.ts` (`look`), `review/Sections.tsx`; lab: `codegen.mjs` (`lookOf`), `integrate.mjs` |
| 8 | Bump and Bump 2 get sections too, the same way: their own, unique per template. `render/emailSections.ts` lists every template's sections (Named Sale's from the lab; Bump's and Bump 2's read off their board layouts by frame name, grouped as a reader sees them, each with a look). Their bodies are drawn as blocks (`blocksOf`), so an email with `parts` draws just the sections it names (`BumpEmailSections`, `Bump2EmailSections`). The Sections list reads the registry for any template. Checked: all 3 Bump sends and 5 Bump 2 designs drawn as their own sections are pixel-identical (0 pixels off) and export the same layers. `check:sections` covers them. | `render/emailSections.ts` (new), `bump/EmailBody.tsx`, `bump2/EmailBody.tsx`, `render/One.tsx`, `studio/Sections.tsx`, `named-sale/sections.ts`, `NamedSale.tsx`, `scripts/check-sections.ts` |
| 9 | Flash gets sections, its own way: its email's middle is its brief's sections for the send, so those are its own (design `brief`), and it can add the kinds it draws -- product feed (its top picks), brand tiles, category tiles -- filled from the brief's brands and categories (design `added`). Nav, teaser bar, hero and footer stay; More deals stays (not an offered kind). Each section marks where it starts (`data-part`, zero height), so clicking one in the list scrolls to it exactly; a Style picker shows only when there's a choice. Checked: Flash emails drawn as their own sections are pixel-identical and export the same layers. | `render/emailSections.ts` (`FLASH_ADDED`), `flash/FlashEmailBody.tsx`, `render/One.tsx`, `studio/Sections.tsx`, `studio/Studio.tsx`, the section renderers (`data-part`), `scripts/check-sections.ts` |

## Rollback
Newest first. `git revert <sha>` each, in this order; or `git checkout named-sale` to drop the branch.
- Step 7: `git revert ec583ba`
- Step 6: `git revert ad06748`
- Step 5: `git revert bc8d57d`
- Step 4: `git revert 6407ea9`
- Step 3: `git revert dbeca40`
- Step 2: `git revert cfa05ff`
- Step 1: `git revert 2990c3f`
The lab is outside git: its files from before this feature are in
`template-lab/backups/before-email-sections/` (`codegen.mjs`, `integrate.mjs`,
`roles.dictionary.json`); copy them back and re-run codegen + integrate to regenerate
the template as it was.
