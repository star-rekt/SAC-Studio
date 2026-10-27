# Art direction rules

Every review is checked against these, and every fix has to obey them. They are
numbered and the numbers are quoted back, so a verdict can be read as a
checklist rather than an opinion.

**To add a rule, add a numbered heading here.** Nothing else changes — the
server reads this file on each request, so an edit takes effect on the next
review without a restart. The list is expected to grow as more is learned about
what these campaigns get wrong.

---

## 1. Nothing collides

No element may sit on top of another unless the design clearly intends it. A
lockup that overlaps a photograph's subject, a button that runs into a frame
edge, two blocks whose boxes intersect — all collisions.

Intended overlap is the exception and looks deliberate: a ticket sitting *on* a
photograph is the design; a ticket cutting a person's head in half is not.

**Two lines of the same lockup are not a collision.** Display type is set with
leading tighter than its point size, so the line BOXES of a stacked headline
overlap by a few percent while no letter touches another. A report that
`lead` overlaps `offer` by 5px is measuring the line box, not the ink. Ignore
an overlap smaller than a tenth of the type size between runs stacked inside
the same block.

**Check:** compare the boxes, then ask whether anything VISIBLE actually meets.
Report the two ids and where.
**Fix:** move the smaller of the two. Keep at least 24px clear at this scale.

## 2. Rule of thirds

The frame divides in three both ways. The main lockup and the photograph's
subject belong near those lines, not centred by default.

**Check:** take the centre of the main copy block. It should sit within about
8% of the frame width of a vertical third line, OR be deliberately centred with
the subject clearly to one side (see rule 3). A block straddling the middle and
reaching past both third lines is the failure to call out.

**Fix:** move it onto the nearer third line. Prefer moving over resizing.

## 3. Copy and subject must relate

This is the one that separates a composition from a collage. Find the
photograph's subject — a person, a face, the thing in focus — and place the
copy in relation to it.

- Subject on the **left** → copy to the **right**.
- Subject on the **right** → copy to the **left**.
- Subject **centred** or filling the frame → copy top or bottom, over the
  calmest band.
- Subject to one side and small → copy may be centred, as long as it does not
  reach the subject.

Copy must never crowd a face. Never within 40px of a head at this scale.

**This rule is about copy sitting ON a photograph.** Copy on a solid panel, a
coloured block or a scrim is already clear of the subject, whatever is beside
it — a layout with the type in a dark panel on the left and the photograph in a
window on the right passes, because nothing is competing for the same pixels.
Say so and move on.

**Check:** say where the subject is, and whether any copy that sits on the
photograph is opposite it.
**Fix:** move the copy to the opposite third. If the copy cannot move far
enough, reposition the photograph instead (rule 7) so the subject moves.

## 4. Nothing important is cropped

A person cut at the neck, the ankles or mid-face reads as a mistake. Type cut
by the frame edge reads as broken, not as a design that runs off.

**Check:** the frame edges. Call out any head, hand or foot clipped by the
frame, and any word cut mid-letter.

A band of type deliberately running off both edges — a repeating ticker — is a
device, not a crop. Say so rather than reporting it, unless it cuts mid-word in
a way that reads as an error.

**Fix:** reposition the photograph so the subject sits clear (rule 7), or move
the type inside the frame.

## 5. Contrast

Every line must hold against what is behind it.

**Check:** white type on pale sky, pale sand or light foliage fails. Dark type
on shadow fails. Type over busy texture fails even at even brightness, because
the texture breaks the letterforms.

**Fix:** recolour, where that solves it. White type on pale sky becomes ink;
type on a block whose fill is too close to it gets a different fill. Only from
the campaign palette — orange, cream, green, ink, white, charcoal — never an
invented colour, and never at the cost of the brand reading as itself.

A scrim or a gradient behind a logo row is still not an edit, so that case
stays in `cannotFix`. Moving type to escape a bad background is a last resort
and only when there is a genuinely calmer area in the same third.

## 6. Type and graphic size

Judge at the size the asset is actually seen. An email hero drawn at 1200px
wide is usually displayed around 600px, so everything halves.

**Check:**
- Nothing below 24px at 1200px wide, which is 12px as displayed.
- The offer should be the largest thing in the frame and should clearly
  out-rank the eyebrow, the qualifier and the button.
- A headline wrapping to a second line that strands one short word is a
  failure, not a wrap.

**Fix:** resize. Keep the offer the largest. Do not resize an element to the
point where it collides with another — check rule 1 afterwards.

## 7. The photograph is framed, not just placed

A photograph can be panned and zoomed within its box. This is the tool to reach
for when the copy cannot move: moving the subject is often easier than moving
everything else.

**Check:** is the subject where rule 2 and rule 3 want it, and is it whole
(rule 4)?

**Fix:** a `pic` operation. `x` and `y` are percentages of the image that sit at
the centre of the box, 50/50 being the middle — **lower `x` moves the visible
frame left, which moves the subject right**. `scale` from 1 to 3 zooms in.
Prefer a small pan over a zoom, because zooming loses the edges of the shot.

## 8. Protected copy

An offer, a price, a discount, a promo code, a legal line and a date range are
checked by someone other than the designer. **Never rewrite one.** Moving and
resizing them is fine.

Brand names and logo artwork are not editable text and cannot be retyped.
