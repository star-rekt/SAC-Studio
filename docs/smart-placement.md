# Smart placement — adding it to a template

Smart placement frames a photo and places the lockup's copy around the people in it. It runs
on-device with no AI calls; Claude is asked only for photos where nothing at all is detected.
It's built as independent layers, so a template opts in with markup and imports nothing else.

| Layer | File | What it does |
|---|---|---|
| Analysis | `src/model/analysePhoto.ts` | Once per photo, cached: people's head / torso / arms / legs (MediaPipe Pose), gear, faces, a busyness grid, and the photo's `copySide`. |
| Composition | `src/model/autoFrame.ts` | Pure maths, no DOM: `composeCard` ranks copy options and crops by design rules; `cardOptions` and `safeBand` build the options. |
| Placement | `src/edit/autoPlace.tsx` | Reads the template's layout off the page, runs `composeCard`, applies the result. `CopyBlock` lives here. |
| Trigger and UI | `src/edit/Picture.tsx` | When to place (swap, upload, brief photo, Auto-place, version bump, follow), plus the panel controls. |

## Templates compiled from Figma get it for free
A template rendered inside `FigmaFrame` (`src/render/figma/FigmaFrame.tsx`) is already opted in. The
shell draws the frame's photo at Figma's crop as a `<Picture>` and wraps every child in
`<CopyBlock>`. Pass layers that never move (a marquee band) as `fixed`, and pass `centred` for a
centred lockup. The Flash hero desktop is the first one.

## Opting a hand-written template in

1. **Use `<Picture>` for the photo.** Templates already do. The photo's id must end in `/photo`.
2. **Wrap the copy in `<CopyBlock>`:** the ticket/card and everything on it, or a hero's text
   lines. Leave out the marquee, the brand strip and wordmarks.
   ```tsx
   import { CopyBlock } from '../../../edit/autoPlace';
   const { edits } = useEdits();
   …
   <CopyBlock id={`${asset.id}/copy`} edits={edits}>
     <div style={{ position: 'absolute', ...CARD, transform: 'rotate(-3deg)' }}>…</div>
   </CopyBlock>
   ```
   - A block where one element covers most of it (a ticket card) moves and scales as one unit.
   - Free-standing lines (a hero) are aligned left / centre / right with the align panel's
     AUTO mode.
   - Add `fixed` to keep the copy exactly where it was designed, so only the photo is framed.
3. **Tag fixed areas the copy must avoid that have no `data-id`** (a coloured band behind a
   marquee, say) with `data-keepout`:
   ```tsx
   <div data-keepout style={{ position: 'absolute', left: 0, top: 0, width: FRAME_W, height: 95, background: '#F14222' }} />
   ```
   Everything else with a `data-id` outside the copy block (marquee text, brand marks) is
   avoided automatically. The free band between top and bottom obstacles is where the card
   may go.
4. **Review it in the lab:** add the lockup to `LOCKUPS` in `dev/bump-preview/lab.tsx` and open
   `http://localhost:5181/lab.html`.

A template that does only step 1 still gets photo framing (people whole, heads clear, no
zooming past 1.35×) but no copy placement.

## When it runs
- A photo is swapped, uploaded or picked from the Figma gallery, or **Auto-place** is clicked.
- A photo chosen by the brief (not the template's own designed photo) is first shown.
- `PLACEMENT_VERSION` (`src/model/autoFrame.ts`) is bumped. Auto-placed photos are redone; hand
  crops never are.
- **Follow:** after auto-placement, a hand crop re-places the copy live until the copy itself is
  moved by hand.

**Off switch:** set `SMART_PLACEMENT = false` in `src/model/autoFrame.ts`.

## Where it's on
All seven sc26_0060 Bump lockups (email headers 1–3, socials 1×1 / 4×5 / 9×16, hero desktop), and
the Flash hero desktop (through `FigmaFrame`).
Bump 2 and the generic `Email` / `Compose` renderers have photo framing only
until their copy is wrapped.
