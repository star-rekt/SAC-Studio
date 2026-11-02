# Template lab — how a Figma board becomes a studio template

The template lab (`template-lab/`, next to `sac-email-studio/`) compiles Figma board frames into
template code in the studio's own schema: a component per frame that draws the board layer for layer
(`FigmaLayers`), with the parts a designer edits as slots. Named Sale
(`src/render/templates/named-sale/`) is entirely its output. This page is how to run it, what each
step reads and writes, and how to add a template. Taken from the code; anything not verified says so.

## What it is, and why it is outside git
- A dev tool, never part of the app. It imports the studio's real components and types (`@studio/`
  is the studio's `src/`) and adds nothing to the studio's `node_modules` (it borrows vite, React and
  TypeScript from there).
- It is listed in `.git/info/exclude` (`template-lab/`), so it is not tracked, not in commits and not
  in the desktop mirror. Its own `package.json` says the same. The lab holds a Figma token path, 42
  work folders, local fonts and Chrome profiles, none of which belong in the repo.
- Only its output is committed, after `integrate.mjs` copies it into the studio.
- Pre-change backups: `template-lab/backups/<change>/` (today `before-email-sections/`: `codegen.mjs`,
  `integrate.mjs`, `integrate.before-hero-link.mjs`, `roles.dictionary.json`). Older `codegen.before-*.mjs`
  copies sit in `logs/`. Copy a script there before changing it; git cannot restore it.
- Layout: `work/<project>/` per compiled frame, `out/` and `report/` for the studio check, `logs/`,
  `fonts/` (local faces, below), `harness/` (the render page).

## The pipeline
`<project>` is `<frame name>--<node id>` (`email-body-10--585-2747`), made by `new.mjs`. Run from `template-lab/`.

| Step | Command | Reads | Writes |
|---|---|---|---|
| 1 Pull | `node new.mjs <figma frame link> --single` | Figma API (`FIGMA_TOKEN` from env, `sac-email-studio/.env`, or `../.env`) | `work/<project>/source.json`, `public/{layouts,renders,figma-assets}/` |
| 2 Generate | `node codegen.mjs --project <p>` | `public/layouts/`, `roles.dictionary.json`, `heroes.json`, studio `public/logos`, `public/graphics` | `code/` (below) |
| 3 Typecheck | `node typecheck.mjs` | `work/*/code/*.ts(x)` | prints errors, exit 1 |
| 4 Fix loop | `node fix.mjs --project <p> --url http://localhost:4002/?project=<p> [--passes 6] [--target 98]` | the harness render, Figma's PNG | `code/nudges.ts`, `out/` |
| 5 Vectors | `node vectors.mjs --project <p> [--min 15]` | `out/results.json`, Figma SVG API | `public/figma-assets/vector-*.svg`, `code/vectors.json`; then codegen and fix run again |
| 6 Integrate | `node integrate.mjs --template named-sale <p>...` | `work/<p>/code`, `source.json`, `out/results.json` | the studio (below) |

`./run.sh` strings steps 1 to 5 together:
- `./run.sh` starts the lab page (paste one frame link at a time) via `serve.mjs`, which queues jobs
  as new, codegen, typecheck, fix, then vectors (and codegen plus fix again if it packaged any).
- `./run.sh new <link> [--passes 6] [--target 98] [--fresh]` does the same from the terminal;
  `--fresh` deletes `nudges.ts` first.
- `./run.sh studio [name] [--check]` scores the studio's own Flash and Bump templates against
  their boards (`capture.mjs`); `--check` exits 1 if any frame is under 98%.
- `./run.sh` never runs `integrate.mjs`: integration is a separate, deliberate step.

Ports (from `run.sh`): lab report page 4001, harness 4002; each moves up to the next free port if
taken. In `studio` mode the report is 4001 and the Flash and Bump check pages are the next free
ports after that. The harness is vite with `harness.config.mjs`; the check pages use `render.config.mjs`.

### 1. Pull
`new.mjs` takes any Figma link: a frame, or a page or section (every top-level frame; `--single`
refuses more than one). It calls the studio's own `scripts/figma-pull.ts` in FULL mode
(`FIGMA_PULL_FULL=1`, output redirected by `FIGMA_PULL_OUT/PNG/ASSETS`), which also records what the
studio's own templates do not need: every fill in order, vector outlines, clipping, text case,
blends and shadows. The frame name's last path part names the project (a bare number or variant
marker takes the part before it: `hero-desktop/2` becomes `hero-desktop-2`). The last line it prints
is the project name.

### 2. Generate (`codegen.mjs`)
Writes `work/<p>/code/`: `<Component>.tsx`, `layout.json`, `nudges.ts` (kept if present), `roles.json`,
`marks.json`, `sections.json` (emails only), `INTEGRATE.md`, plus the marks' SVGs to `public/graphics/`.
`roles.json` records every decision with its reason; set `"edited": true` in it to keep hand-edited
roles on regenerate. Roles come from the dictionary first, then rules:

| Role | How it is assigned |
|---|---|
| `text` | Default: board copy, editable, keeps the board's words. |
| `cta` | A button's label, or any generic call ("Shop Now", "Shop All", "See More"). A button naming a place ("Shop Men's") stays `text`. |
| `code` | Text reading "CODE xyz". |
| `urgency` | "N days only", "ends today", "last chance", "final hours", "limited", or a layer named eyebrow, urgency or marquee. |
| `title` | Text naming the sale, taken from the board's page name (`SC26_0027 Memorial Day Sale` gives "Memorial Day"). |
| `lead`, `amount`, `offer` | "UP TO"/"EXTRA", the number set on its own, and "60% OFF". |
| `photo` | A visible image-filled layer with no children, not a texture, not tiled, over about 2% of the frame (measured against frame width squared for tall emails); also the frame's own photo fill (`(frame)`), and dictionary `photo` layers. |
| `backdrop` | A photo fill on a frame that holds other layers: a slot under them, drawn bare behind. |
| `brand` | A logo (see below), one slot per logo, `brand/N`. |
| `graphic` | The brush arrow (the library's `bump2-arrow`), or one-colour vector art large enough to matter, cut from its outline as a mark. |
| `pill` | A filled rounded box round one label: its shape becomes a mark, its contents stay live over it. |
| `vector` | Art listed in `code/vectors.json`, drawn from Figma's packaged SVG. |
| `remove` | A picture listed in `removeImages`, or a transparent PNG cut-out half the frame or more that sits over copy. Taken out of the draw. |

Marks (`graphic` and `pill`) are written as `named-sale-<name>-<hash>` ids with their SVG and shape
(`path`, `fill`, `width`, `height`). Note that the `named-sale-` prefix is written into `codegen.mjs`
(`mark()`), `integrate.mjs` (cleanup, below) and `harness.config.mjs` (the `/graphics` route), so a
second template needs those generalised first (see "A new template").

Logo rules: `isBrand` is true when a layer's name (with `brandName` stripped) is a file in the
studio's `public/logos/brand-*.svg`, or the dictionary says `brand`, or it is copy-free art whose
name matches `logoName` or starts with a stocked brand's name ("Osprey_Stacked"). A logo drawn dark
(`lightLogo` false: some fill is not near-white) is left as the board draws it, because the
library's logos are white and would vanish on a light tile. A brand the library does not stock gets a
stocked placeholder to swap from: the board's own where it is stocked, else the next of
`placeholderLogos`.

Sections (`sectionsOf`, email frames only; null if the frame has no entry in `heroes.json`, fewer than
3 top-level blocks, or any block narrower than 90% of the frame). Top-level blocks are sorted by
`y` and classified by name through `sections` in the dictionary (first match wins), then:

| Kind | From |
|---|---|
| `hero` | the block `heroes.json[project]` names |
| `banner`, `nav`, `copy`, `buttons`, `footer` | dictionary `sections` |
| `header` | a title bar; opens a section. Its first visible text layer is `title` and its words the `label` |
| `feed` | the product listings; makes the open section `products` |
| `cta` | the button closing a section |
| `brands` / `categories` | any other block: brand tiles if it holds logos, else category tiles when inside a section |
| `strip` | any other block outside a section (an urgency bar, labelled "Urgency bar" if it holds urgency text) |

A section runs from its first block's top to the next section's top (the last to the frame's bottom),
so a design's sections stack back to the whole frame. Each carries `top`, `height`, `blocks` and a
`look`: a hash of its blocks drawn from each block's own top, text by type, size, colour and
alignment (not words), pictures by box (not which photo). Equal looks are offered once as "Style N".

The generated component reads the active `FigmaBand` (see Using the output) so it can draw just one
section's blocks.

### 4. Fix loop and accuracy
`fix.mjs` opens headless Chrome (`SAC_CHROME_PATH`, default Google Chrome), loads the harness page
for the project, and scores the render against Figma's PNG (`lib.mjs`). Accuracy is 100 minus the
differing share of pixels (pixelmatch, threshold 0.1, anti-aliasing ignored), taken after halving both
images by 2x2 averaging so paper grain and photo noise do not count but an offset or wrong colour
does. Figma's own export leaves the top frame's fill transparent, so it is composited over the
frame's bare background first. Each pass ranks leaf layers by differing pixels and tries a fixed
ladder on the worst 8 (`--top`): position `dy`, `dx`; for text also `ls` (letter spacing), `fs` (size
factor), `lh` (line height). A step is kept only if it improves that layer's own region by more than
0.05%. Kept nudges go to `code/nudges.ts`. It is deterministic, stops at `--target` (default 98) or
`--passes` (default 6) or when nothing helps, never swaps a layer for an image of itself, and
exits 1 if a frame is under target. Results: `out/results.json` and `out/<slug>/{ours,figma,heat}.png`.
Missing fonts are listed; add local ones with `node fonts.mjs <dir|file>...` (copies into `fonts/`
and rewrites `fonts/fonts.json`, faces named as Figma names them).

### 5. Vectors
`vectors.mjs` reads the last `out/results.json`. A layer still `--min` (15) % off that is no slot and
holds no text is packaged as the largest text-free, slot-free, unturned, image-free group round it
that covers at most a sixth of the frame. Figma's SVG of it is saved as `vector-<id>.svg` and listed
in `vectors.json` (kept across runs); codegen then draws it as a `vector` role. Prints `packaged N`
or `none`. The studio's Figma export hands an SVG to the plugin as editable paths.

### 6. Integrate (`integrate.mjs`)
`node integrate.mjs --template <name> <project>...` (template: lowercase letters, digits, hyphens).
Before writing anything it deletes `src/render/templates/<template>/frames/` and
`public/figma-assets/<template>/`. Then, per project, it writes:
- `frames/<project>/<Component>.tsx`, `layout.json`, `nudges.ts`, with `@studio/` imports made relative.
- Images the layout still draws (not under a `remove` layer) plus packaged SVGs into
  `public/figma-assets/<template>/`, each shrunk with `sips` from the lab's original: at most 1800px
  long side, JPEGs re-encoded at quality 72. Asset paths in `layout.json` and the code are rewritten.
- Marks: each mark's SVG into `public/graphics/`, its shape into `src/data/mark-shapes.json` (what
  makes it recolourable and a vector on export; the template's old entries are removed first), and the
  list of `[id, name]` into `<template>/marks.json`. Old `public/graphics/<template>-*.svg` no
  longer produced are deleted. `src/model/media.ts` reads `marks.json` for the library.
- `designs.ts` (data: id, format, node, size, name, component, `phase`, `ends`, and an email's
  `sections`) and `components.ts` (id to component). Designs sort by format then board order and are
  numbered `design-N` per format. The format comes from the frame name and must be `hero-desktop`,
  `email-body` or `paid-social-*`. The name is what the design says first (its urgency, else its
  headline). Phase is read from its words: flash, bump (a code or "extra"), refresh ("new brands"),
  else main.
- The template's own files (`NamedSale.tsx`, `sections.ts`) are not touched.
- An email header is not a design of its own any more: it is its email's hero section, drawn under
  the email's ids. No hero projects are integrated.

## The data files
`roles.dictionary.json` (matched whole and case-blind, as regular expressions):

| Key | Controls |
|---|---|
| `layers` | Role by layer name: `photo` (Product Image), `brand` (Brand Logo), `fixed` (textures; Logo, Footer, Nav Links, Spacer: drawn as the board has them, no slot). |
| `textIn` | Role for text inside a named parent: nav links stay `text`; button labels are `cta`; Product Listing N lines are `text`. |
| `brandName` | Stripped from a logo layer's name to get the brand ("Salomon / White" gives salomon). |
| `logoName` | Names that are a brand's logo in a colour or variant, stocked or not. |
| `sections` | Block name to section kind (banner, nav, copy, header, feed, cta, buttons, footer). |
| `removeImages` | Image hashes to take out (the "3 DAYS ONLY" sticker, whose words are baked into the picture). |
| `placeholderLogos` | Stocked logos given to brands the library lacks. |
| `note`, `*Why` | Documentation; ignored by the code. |

The `*Why` keys are the reasons recorded in `roles.json`.

`heroes.json` maps each Named Sale email project to the Figma node id of its hero block. It is read
only by `codegen.mjs` (`sectionsOf`) to mark which top-level block is the `hero` section (a send's
email header is that section, drawn by the studio; heroes are no longer compiled on their own).

## Re-running integration for Named Sale
The 22 projects are the folders in `src/render/templates/named-sale/frames/` (15 `email-body*`, 4
`hero-desktop*`, 3 `paid-social-*`). `work/` holds extra stale folders (old `hero--538-*` and
`frame-*` projects); do not integrate those. Keep the list in a file:

```sh
cd template-lab
ls ../sac-email-studio/src/render/templates/named-sale/frames > projects.txt   # before it is emptied
while read p; do node codegen.mjs --project "$p"; done < projects.txt          # only if the dictionary or codegen changed
node typecheck.mjs
xargs node integrate.mjs --template named-sale < projects.txt
```

Gotchas:
- The shell is zsh. `for p in $P` does not word-split a variable, so it runs once with the whole
  list. Use a file and `while read p; do ...; done < projects.txt`, or `xargs ... < projects.txt`.
- Make `projects.txt` before integrating. `integrate.mjs` removes `frames/` and `figma-assets/<template>/`
  first, so a failed run leaves them empty until re-run (git restores them). Mid-run, `designs.ts`
  still lists the old frames.
- Keep `projects.txt` outside git (it is in the lab, which is excluded).
- Codegen alone keeps `nudges.ts`, so the fix loop need not repeat.

## Adding a new template
1. Compile each frame with `./run.sh` (or `new.mjs`, `codegen.mjs`, `fix.mjs`); check `out/` reports.
2. Before codegen, generalise the `named-sale-` prefix. It appears in `codegen.mjs` `mark()`, the
   `/graphics` route in `harness.config.mjs`, and `integrate.mjs` removes old marks by `<template>-`.
   Take the prefix from a variable and add the new one to the dictionary or `--template`. There is no
   option for this yet.
3. Add `roles.dictionary.json` entries for new layer names (data, not code), and `heroes.json` entries
   for emails.
4. `xargs node integrate.mjs --template <name> < projects.txt`.
5. Write the template's own files, modelled on `named-sale/`: a router (`NamedSale.tsx`) and, for
   sections, `sections.ts`.
6. Register it in the studio. Named Sale's wiring points:

| Where | What |
|---|---|
| `src/templates/specs/<id>.ts` and `src/templates/spec.ts` | the spec (id, name, type, `groundedIn`, `figma`, `why`, formats) and its entry in the registry |
| `src/templates/labels.ts` | the picker label |
| `src/templates/variants.ts` | email designs and `heroHeight` in `EMAIL_VARIANTS`, small-format variants (`hero-desktop`, `cplp-tile`...) from `designs.ts` |
| `src/render/One.tsx` | routing: email bodies, `email-hero`, other formats (`outlook.id === 'named_sale'`) |
| `src/render/emailSections.ts` | the `SECTIONS` registry entry, so the Sections list works; `src/studio/Studio.tsx` `FAMILIES` groups related templates |
| `src/sheet/build.ts` | design choice per send (`namedDesign`) and `parts` from the brief (`briefParts`) |
| `src/model/media.ts` | reads `<template>/marks.json` into the library |
| `src/model/brief.ts`, `src/model/namedSale.ts` | brief type detection and phases (Named Sale only; a new campaign type needs its own) |
| `scripts/check-sections.ts`, `scripts/check-three-boards.tsx` | checks that name Named Sale's designs |

Not yet checked for a template that isn't occasion-named; read `named_sale` in each file.

## Using the output
- `FigmaLayers` draws a frame from its layout and renders the slots. `FigmaBand` (a React context,
  `useBand()`) restricts a generated component to one section's blocks, from its top, at its height.
- `NamedSale.tsx` draws an email with `parts` as stacked bands, one per section, each under its own
  key; with no `parts` it draws the whole design. A send's header (`email-hero`) is the hero section
  of the email, drawn under the email's ids so the two share edits.
- `scripts/figma-pull.ts` is also the studio's own compiler (`npm run figma:pull`) for Flash and
  Bump; the lab only adds the FULL mode.
- History: `docs/templates/named-sale.md`, `docs/email-sections-log.md`, `docs/figma-compile-log.md`.

## Verifying
From `sac-email-studio/`:
- `npm run typecheck`
- `npm run check`, which runs typecheck, `check:templates`, `check:boards`, `check:export`,
  `check:graphics`, `check:autoframe`, `check:copyfit`, `check:sections` and a build. `check:sections`
  tests that every email's sections are contiguous, start at 0, end at the frame height and hold one
  hero, and that a brief's section list maps correctly.
- Lab side: `node typecheck.mjs` for the generated code, and the fix loop's accuracy per frame
  (98% or more is the target; list any under it).
- Pixel checks done by hand, not scripted in the repo: each email design drawn as its own sections
  must be pixel-identical to the whole design (0 pixels off) and export the same layers. Check the
  same for the header (hero section) against the email's top, and that edits in one show in the
  other. After integrating, look at a few frames in the app and at the Figma export.

## Rules
- Never build, mirror or edit `src/render/templates/flash2`. It is broken.
- No per-template fixes in code. A fix is a generic rule in `codegen.mjs`, or data in
  `roles.dictionary.json`.
- The lab stays out of the mirror and out of git commits. Never `git add` anything under `template-lab/`.
- Ship via the mirror first, then the source git (see `docs/releases.md`).
- Per-image work stays on-device; the lab makes no AI calls.

## Files
| File | Purpose |
|---|---|
| `run.sh` | Starts the lab page, runs one frame, or runs the studio check |
| `new.mjs` | Pull a Figma frame (FULL mode) into `work/<project>/` |
| `codegen.mjs` | Roles, marks, sections and the component from a compiled frame |
| `fix.mjs` | The nudge loop and accuracy score |
| `vectors.mjs` | Packages unmatched fixed art as Figma SVG |
| `integrate.mjs` | Copies a project's output into the studio |
| `lib.mjs` | Headless Chrome, the scoring, shared helpers |
| `capture.mjs` | Scores the studio's Flash and Bump templates against their boards |
| `serve.mjs` | The lab page and report server; queues runs |
| `fonts.mjs` | Registers local font files for the harness |
| `typecheck.mjs` | Typechecks `work/*/code` against the studio |
| `harness.config.mjs`, `harness/` | Vite page rendering generated code at `?project=` |
| `render.config.mjs` | Vite pages for the studio-check (Flash, Bump) |
| `roles.dictionary.json` | Layer-name data for roles, logos, sections, removals |
| `heroes.json` | Hero block node per Named Sale email |
| `backups/` | Pre-change copies of lab scripts and data |
