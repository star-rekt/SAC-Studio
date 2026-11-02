# Releases — what's in the app

The desktop app updates itself from the mirror, **star-rekt/SAC-Studio** (`main`): its
built bundles (`dist/`, `dist-desktop/`, `plugin/dist/`) and source. Every push to the
mirror is a release. Newest first: the mirror commit the app gets, the source commit it was
built from (**star-rekt/SAC_Figma_Automation**), and what it brought.

## How a release is made
1. In `sac-email-studio`: everything committed, `npm run check` passes, then `npm run build:desktop`.
2. Sync to the mirror (`~/BC-Workspaces/SAC-Studio`): copy every file the source tracks that
   differs or is new, delete files the source deleted, and `rsync -a --delete` the three
   build folders. Never copied: `src/render/templates/flash2/` (broken), `dev/`, the
   mirror's own `.gitignore`, and the template lab. Photos in `public/photos/` are tracked
   by the mirror but ignored by the source: they stay.
3. Check: every source-tracked file matches the mirror, and no file is gone from one but not the other.
4. Commit and push the mirror (`git add -A . ':!dev'`, commit, `git push origin main`). The
   push is run by hand: the agent's auto mode blocks pushes to this public repo. Keep the
   command on one line: a wrapped line breaks it (`main` and `--oneline` ran as commands).
5. Then push the source branch. Order: mirror first, then source.
6. In the app: Check for Updates (or restart).

**Rollback:** in the mirror, `git revert <mirror sha>` and push; the app takes it on its next
update. The source commits stay as they are (revert them there if the change is to go for good).

## Log
| Date | Mirror | Source | What it brought |
|---|---|---|---|
| 2026-10-30 | `a4621a5` | `5216314` (`email-sections`) | Review with AI only suggests fixes, never applies them (Apply misplaced text on a Named Sale header). Reset on an email or its header resets the pair. |
| 2026-10-30 | `ce86f2a` | `45b4352` (`email-sections`) | **The new app:** Plan → Build / Fine-tune → Export replaces the old editor. Email sections for all four templates. Small formats share designs across templates. An email header is its email's top (Named Sale's 15 separate header designs removed). Review with AI, PNG zip export, design directions removed, the Bump code-line fix. See `studio-log.md`, `email-sections-log.md`. |
| 2026-10-29 | `cff7769` | `65acc96` (`named-sale`) | **Named Sale** template (Memorial Day board compiled whole), its fonts and graphics; Figma vendor-logo search for brand slots; Figma export of compiled frames. See `templates/named-sale.md`. |
| 2026-10-29 | `9aed37d` | `fb94336` (`figma-compile`) | Figma export carries opacity, blur and shadows; unstocked brands get a placeholder logo. |
| 2026-10-29 | `62133af` | `1db4280` | Export finds images whose paths have spaces (the Flash wordmark). |
| 2026-10-29 | `6b4746e` | `19096b8` | Figma plugin: a shaped clip's contents go in one group above its mask. |
| 2026-10-29 | `7f2dde7` | `63b644f` | Figma plugin: shaped clips (stepped windows) mask their photos. |
| 2026-10-29 | `6da46bc` | `ff864f8` | Figma export keeps the clipping structure for every template. |
| 2026-10-29 | `20ba711` | `381ec64` | Figma plugin: frames taller than 8192px (long Bump 2 emails). |
| 2026-10-29 | `998c0a1` | `9964703` | Figma export of Bump 2: window crops, charcoal logos, paragraphs as one text, tilted tags on one line. |
| 2026-10-28 | `2b81229` | `a2823fc` | Export the compiled templates' board images (default Bump 2 designs export without a Figma token). |
| 2026-10-28 | `7f3f7ec` | `5a91773` | Figma token prompt in the studio (asked once, Save or Skip). |
| 2026-10-28 | `bed80ea` | `figma-compile` up to `7bfa07d` | **Figma-compiled templates:** Bump and Bump 2 (heroes, socials, Bump 2's five emails), Flash; Bump 2 in the template picker; measured text contracts; Auto-place in Bump 2's shaped slots; Figma token support; AUTUMN20 removed. See `figma-compile-log.md`. |
| 2026-10-28 | `c2e4183` | — | Bump email marquee up 10px. |
| 2026-10-27 | `5e4584e`, `2fe1821`, `d74ceed` | — | App updates: clean content clone on first launch, blank-screen fix (matching JS bundle), Check for Updates fast-forward. |
| 2026-10-27 | `f984b92`, `31eccf7` | — | Template updates; Autumn and Bump 2 hidden from the picker; a guessed campaign type is a suggestion, not a lock. |
| 2026-10-27 | `bc20692` | — | The mirror carries build output; the app updates by git (content clone) instead of a new installer. |
| 2026-10-16 | `f8f1d4d` | — | Colourable, resizable, swappable backgrounds, tickets and marks; sessions stored in Documents/SAC_Studio. |
| 2026-10-13 | `e91dd72`, `bcd9b56` | — | The standalone SAC Studio repository; macOS package installs into Applications. See `release.md` (packaging). |

"—": released before this log; the source commit wasn't recorded.
