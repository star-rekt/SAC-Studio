# Copy fit — change log

Branch: `copy-fit` (off `smart-photo-placement`). One commit per step; `git revert <sha>`
undoes exactly that step. Newest last.

## Step 1 — fields carry their text contract (`6a12d83`)
- `fitText` (`src/model/textContracts.ts`) and Flash's own `fitText`
  (`src/render/templates/flash/textContracts.ts`) now also return a `contract`: key, width
  budget, designed size, minimum size and glyph factor. `measuredContract()` does the same for
  `measureAndFit`. `fitAttr()` puts a contract on a plain element.
- `<Editable fit={…}>` writes it as `data-fit`, plus the template's own text as
  `data-default`.
- 60 call sites in 23 template files pass their contract to the element they size. This was
  migrated by a Sonnet agent and reviewed. Sizes are unchanged.
  - Bump's "EXTRA / 20% OFF" field is sized by the smaller of two fits, so it carries that one's
    contract.
- **Files:** `src/model/textContracts.ts`, `src/render/templates/flash/textContracts.ts`,
  `src/edit/Editable.tsx`, and 23 files under `src/render/`.
- **Revert:** `git revert 6a12d83`.

## Step 2 — copy-fit maths (`61fde25`)
- `src/model/copyFit.ts`: green / yellow / red per field.
  - **Contracted:** green at the designed size, yellow while shrinking ≤ 10%, red past that.
    Multi-line fields are judged by their worst line.
  - **Fixed single line:** red past its room, with 1% / 2 px slack.
  - **Fixed multi-line:** red past the template's own line count.
- `scripts/check-copyfit.ts` (in `npm run check`): exact boundaries agree with `fitText`.
- **Revert:** `git revert 61fde25`.

## Step 3 — Copy panel tab (`7ea35d6`)
- `src/edit/CopyFit.tsx`: a **Copy** tab in the editor panel.
  - Every asset's text fields, with editable text, `chars / ideal · max`, a status colour and a
    note. "Warnings only" filter. Clicking a field shows it on the canvas.
  - Measured on a hidden stage that renders every asset with a read-only edit API, mounted
    only while the tab is open.
- A **new** session opens on the Copy tab.
- **Checked headless on the Alpine20 session:** 31 assets measured. One real red: the launch
  hero's urgency "OCTOBER 24–26" would shrink to 80%.
- **Files:** `src/edit/CopyFit.tsx`, `src/App.tsx`, `src/styles.css`.
- **Revert:** `git revert 7ea35d6`.

## Step 4 — the Copy tab follows the active format tab (`30a05e6`)
- **Why:** listing every asset in the session (~300 fields) was too long to review.
- **What:** the Copy panel shows only the assets of the format tab that's open (e.g.
  email-hero: 5 assets, 25 fields; hero-desktop: 2 assets, 12 fields), and its total names the
  tab. The hidden measuring stage renders only those assets too, so it's faster.
- **Files:** `src/App.tsx`, `src/edit/CopyFit.tsx`.
- **Revert:** `git revert 30a05e6`.

## Step 5 — editing fixes (`071aebe`)
- **Trailing space was eaten:** the panel compared text to the template's after trimming, so
  "Shop Now " counted as unchanged and reset to "Shop Now". It now compares exactly.
- **Copy can't be removed from this tab:** an emptied box commits nothing (the asset keeps its
  last text) and puts that text back on blur. Rows are listed from the template's text, so a
  cleared field never disappears. Edited fields get a **Restore** link back to the design's
  text. Removing an element stays the Design tab's job.
- **Size didn't come back after trimming (Bump email headers 1–3 and socials):**
  "EXTRA / 20% OFF" is one field sized from two fits, but once edited, the whole two-line edit
  was fitted as the offer. The font stayed small even after trimming back. The fits now read
  the field's own two lines.
- **Known gap, not changed here:** Flash, Autumn and the board-extra templates size several
  fields from the brief's text (`asset.copy`), not the live edit, so editing those doesn't
  re-size them on the canvas.
- **Files:** `src/edit/CopyFit.tsx`, `src/styles.css`,
  `src/render/templates/bump/{EmailHeader1,EmailHeader3,EmailHero,Social1x1,Social4x5,Social9x16}.tsx`.
- **Revert:** `git revert 071aebe`.
