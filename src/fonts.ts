/** The brand faces, and an honest answer about which of them actually arrived.
 *
 *  typography.json names the families the way Figma does -- 'Quiet Sans',
 *  'Sofia Pro'. The Adobe kit serves them under different CSS names, so the
 *  mapping lives here rather than being sprinkled through the renderer.
 *
 *  The kit carries sofia-pro-variable across 100-900, and quiet-sans at 400
 *  and 700 only. The type scale asks for ExtraBold (800) on Display/XL and
 *  Display/L -- the ticket type -- so until those weights are added to the kit
 *  every display line renders a weight light. That is a real difference from
 *  the reference boards and the studio says so instead of hiding it. */

const KIT: Record<string, string> = {
  'Quiet Sans': 'quiet-sans',
  'Sofia Pro': 'sofia-pro-variable',
};

/** The CSS stack for a family named the way the type scale names it. */
export const stack = (family: string) => {
  const kit = KIT[family];
  return (kit ? `"${kit}", ` : '') + `"${family}", sans-serif`;
};

export type FontReport = {
  ok: boolean;
  kitLoaded: boolean;
  missing: { family: string; weight: number; usedInstead: number }[];
};

/** Which weights the kit actually DECLARES, per family.
 *
 *  Not document.fonts.check() -- that answers 'has this face loaded', and a
 *  face only loads when something on the page uses it, so it reported Quiet
 *  Sans 400 as absent and 800 as present, which is the opposite of the truth.
 *  Iterating document.fonts gives the declared @font-face rules instead, with
 *  a variable font arriving as a range: sofia-pro-variable is "100 900". */
function declared(): Map<string, { lo: number; hi: number }[]> {
  const out = new Map<string, { lo: number; hi: number }[]>();
  if (typeof document === 'undefined' || !document.fonts) return out;
  for (const f of document.fonts as unknown as Iterable<FontFace>) {
    if (f.style !== 'normal') continue;
    const parts = String(f.weight).trim().split(/\s+/).map(Number).filter(Number.isFinite);
    if (!parts.length) continue;
    const span = { lo: parts[0], hi: parts[parts.length - 1] };
    const list = out.get(f.family) ?? [];
    list.push(span);
    out.set(f.family, list);
  }
  return out;
}

/** What the kit served, asked of the browser rather than assumed. */
export function fontCheck(wanted: { family: string; weight: number }[]): FontReport {
  const have = declared();
  const kitLoaded = [...Object.values(KIT)].some(k => have.has(k));
  if (!kitLoaded) return { ok: false, kitLoaded: false, missing: [] };

  const seen = new Set<string>();
  const missing: FontReport['missing'] = [];
  for (const w of wanted) {
    const kit = KIT[w.family];
    const spans = kit && have.get(kit);
    if (!spans) continue;
    if (spans.some(s => w.weight >= s.lo && w.weight <= s.hi)) continue;
    const key = kit + '/' + w.weight;
    if (seen.has(key)) continue;
    seen.add(key);
    // What the browser will reach for instead: the nearest declared edge.
    const edges = spans.flatMap(s => [s.lo, s.hi]);
    const usedInstead = edges.sort((a, b) =>
      Math.abs(a - w.weight) - Math.abs(b - w.weight))[0];
    missing.push({ family: w.family, weight: w.weight, usedInstead });
  }
  return { ok: !missing.length, kitLoaded: true, missing };
}
