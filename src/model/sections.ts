/** An email, as the brief actually describes it: a stack of named sections.
 *
 *  This is the thing the Figma plugin could never do. The brief says E1 is a
 *  hero, then six lifestyle category tiles with their own percentages, then
 *  four brand tiles, then terms. The library holds an email as ONE published
 *  frame 1200x4190, so the plugin could place the right layout with the right
 *  numbers and never the right sections -- you cannot set a section that does
 *  not exist as a thing. Composed from parts, it is ordinary work.
 */

export type Item = { name: string; percent: string };

export type Section =
  | { kind: 'hero'; title: string; design: string; copy: string; cta: string; offer?: string }
  | { kind: 'categoryTiles'; title: string; header: string; items: Item[]; cta: string }
  | { kind: 'brandTiles'; title: string; header: string; items: Item[]; count: number;
      showPercent: boolean; cta: string }
  | { kind: 'productRecs'; title: string; header: string; cta: string; count?: number }
  | { kind: 'moreDeals'; title: string; header: string;
      items: { name: string; percent: string; cta: string }[] }
  | { kind: 'terms'; title: string }
  | { kind: 'unknown'; title: string; body: string };

export type Send = {
  id: string; date: string; label: string; tb: string; sections: Section[];
  /** Resolved content on a built sheet; template renderers still own layout. */
  assetCopy?: { eyebrow?: string; marquee?: string; lead?: string; offer?: string;
    markdown?: string; qualifier?: string; body?: string; cta?: string;
    subject?: string; preview?: string };
};

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** 'Men's Apparel up to 65% off' -> the name and the number, kept apart so the
 *  renderer can set them differently, which is how the boards set them. */
function item(raw: string): Item {
  const t = clean(raw);
  const m = t.match(/^(.*?)\s*up\s+to\s+(\d{1,2})\s*%\s*off\s*$/i);
  return m ? { name: clean(m[1]), percent: m[2] } : { name: t, percent: '' };
}

const items = (line: string) => line.split('|').map(item).filter(x => x.name.length > 1);

/** The one field under a label, within this section only. */
const said = (block: string, label: string) => {
  const m = block.match(new RegExp('^[ \\t]*' + label + '\\s*[:\\-]\\s*([^\\n]+)', 'im'));
  return m ? clean(m[1]) : '';
};

function sectionOf(title: string, block: string): Section {
  const t = title.toLowerCase();
  const cta = said(block, 'CTA');
  const header = said(block, 'Header').replace(/\s*\(.*$/, '');

  if (/hero/.test(t))
    return { kind: 'hero', title, cta, design: said(block, 'Design'), copy: said(block, 'Copy') };

  if (/terms|t&c/.test(t)) return { kind: 'terms', title };

  if (/product\s+recs/.test(t)) return { kind: 'productRecs', title, header, cta };

  if (/brand\s+tiles/.test(t)) {
    const n = title.match(/(\d+)\s+simple\s+brand/i);
    return { kind: 'brandTiles', title, header, cta,
      items: items(said(block, 'Included Brands')),
      count: n ? Number(n[1]) : 4,
      // '(With %)' and '(No %)' are the brief's own notation and they decide
      // whether the tile carries a number at all.
      showPercent: /\(\s*with\s*%\s*\)/i.test(title) };
  }

  if (/tiles|categor/.test(t))
    return { kind: 'categoryTiles', title, header, cta,
      items: items(said(block, 'Included Categories') || said(block, 'Included Items')) };

  return { kind: 'unknown', title, body: clean(block).slice(0, 300) };
}

/** The one send a brief implies when it asks for email without numbering any.
 *
 *  A brief that lists Email under its channels and never writes E1 wants an
 *  email; it just has not said how many. Returning none left the email formats
 *  with no send to attach to, and an email asset with no send fell through the
 *  email renderer into the generic one -- which drew the offer as a 1200x1510
 *  orange slab with no photograph on it. One send is the honest reading, and
 *  the panel says the brief named none. */
export const impliedSend = (label: string): Send =>
  ({ id: 'E1', date: '', label: label || 'Email', tb: '', sections: [] });

/** Every send in the brief, with its sections in order. */
export function readSends(text: string): Send[] {
  const t = text.replace(/\r/g, '');
  // Where each send starts. The same shape the plugin settled on, which
  // survives a paste that lost its line breaks.
  const heads: { id: string; date: string; label: string; at: number }[] = [];
  const re = /\b(E\d{1,2})\s*[:\-–—]\s*(\d{1,2}\/\d{1,2})?\s*[:\-–—]?\s*([^\n]{2,60})/gi;
  for (let m = re.exec(t); m; m = re.exec(t)) {
    const label = clean(m[3]).replace(/\s*[:\-–—]\s*$/, '');
    heads.push({ id: m[1].toUpperCase(), date: m[2] || '',
                 label: label.includes(':') ? clean(label.slice(label.lastIndexOf(':') + 1)) : label,
                 at: m.index });
  }
  // A brief that spells "Email 1" out instead of writing the internal "E1"
  // shorthand (the real Wrike export does this) matched nothing above and
  // fell back to one implied send with no sections at all -- every field a
  // Hero block carries was silently dropped, not just unparsed.
  if (!heads.length) {
    const spelled = /\bEmail\s+(\d{1,2})\b\s*[:\-–—]?\s*(\d{1,2}\/\d{1,2})?\s*[:\-–—]?\s*([^\n]{2,60})/gi;
    for (let m = spelled.exec(t); m; m = spelled.exec(t)) {
      const label = clean(m[3]).replace(/\s*[:\-–—]\s*$/, '');
      heads.push({ id: `E${m[1]}`, date: m[2] || '',
                   label: label.includes(':') ? clean(label.slice(label.lastIndexOf(':') + 1)) : label,
                   at: m.index });
    }
  }

  return heads.map((h, i) => {
    const whole = t.slice(h.at, i + 1 < heads.length ? heads[i + 1].at : undefined);
    const stop = whole.slice(1).search(/^[ \t]*(?:Email Secondaries|Lifecycle|Affiliates|Paid Social)\s*:/im);
    const block = stop >= 0 ? whole.slice(0, stop + 1) : whole;
    const parts = [...block.matchAll(/^[ \t]*Section\s*\d+\s*[-–—:]\s*([^\n]+)/gim)];
    const numbered = parts.map((p, k) => {
      const from = p.index! + p[0].length;
      const to = k + 1 < parts.length ? parts[k + 1].index! : block.length;
      return sectionOf(clean(p[1]), block.slice(from, to));
    });
    // Many campaign briefs use a compact component checklist instead of
    // "Section 1 / Section 2". Read those lines as the same component model
    // so five emails do not turn into five bare hero images.
    const lines = block.split('\n').map(line => line.replace(/^[\s·•*\-]+/, '').trim());
    const teaser = lines.find(line => /^TB\s*:/i.test(line))?.replace(/^TB\s*:\s*/i, '')
      || said(block, 'TB');
    const tb = teaser.match(/["“]([^"”]+)["”]/)?.[1] || teaser;
    const inferred: Section[] = [];
    const heroAt = lines.findIndex(line => /^Hero\s*:/i.test(line));
    if (heroAt >= 0) {
      // A compact-checklist "Hero:" is a label on its own line, with the
      // actual content as the bullets under it -- the sale name, the offer,
      // who gets logo'd, the CTA. Read each bullet as its own field instead
      // of folding the whole block into one string, which left every field
      // downstream guessing at a blob that was mostly someone else's line.
      let design = '', cta = '', offer = '';
      for (let i = heroAt + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (/^(?:Category\s+Tiles|Category\s+Drop[- ]?Down\s+Banners?|TB|Top\s+Sale\s+Picks|Messaging|Secondary\s*\d*|Section\s*\d+|Paid\s+Social|Badging)\s*:?/i.test(line)) break;
        if (/^CTA\s*:/i.test(line)) { cta = clean(line.replace(/^CTA\s*:\s*/i, '')); continue; }
        if (/^Brand\s+Logos?\s*:/i.test(line)) continue;
        // The offer/percent line and the sale-name line are the two that
        // remain; the name is whichever one is not itself a bare percent
        // phrase, and only the first such line is kept as the title source.
        if (/^\s*(?:up\s*to|extra)?\s*\d+\s*%/i.test(line)) { if (!offer) offer = line; continue; }
        if (!design) design = line;
      }
      inferred.push({ kind: 'hero', title: 'Hero', design: design || lines[heroAt].replace(/^Hero\s*:\s*/i, ''),
        copy: '', cta, offer });
    }
    // The rest of the checklist is read out in the order the brief itself
    // wrote the lines, not a fixed code order -- a brief that lists its
    // product grid before its category tiles gets sections in that order.
    const after: { at: number; section: Section }[] = [];
    // The real Wrike export writes every one of these as a bare label line
    // with its content as sub-bullets below, the same shape as "Hero:" --
    // not the single-line "Label: a, b, c" shorthand a hand-typed test brief
    // used. Support both: use the label's own line if it already has content
    // after the colon, else collect the bullets under it.
    const LABEL_RE = /^(?:Hero|CTA|TB|Category\s+Tiles|Category\s+Drop[- ]?Down\s+Banners?|Top\s+Sale\s+Picks|Secondary\s*\d*|Section\s*\d+|Paid\s+Social|Badging|Messaging)\s*:?\s*$/i;
    const bulletsAfter = (from: number) => {
      const out: string[] = [];
      for (let i = from + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) { if (out.length) break; else continue; }
        if (LABEL_RE.test(line)) break;
        out.push(line.replace(/^o\s+/i, '').trim());
      }
      return out;
    };
    // A label whose own line has no inline content ("Top Sale Picks" with no
    // colon, or "Secondary 1:" with nothing after it) states its CTA on a
    // later, otherwise-unlabelled "CTA:" line instead of inline.
    const nearbyCta = (from: number) => {
      for (let i = from + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        if (/^CTA\s*:/i.test(line)) return clean(line.replace(/^CTA\s*:\s*/i, ''));
        if (LABEL_RE.test(line) && !/^CTA\s*:?\s*$/i.test(line)) break;
      }
      return '';
    };
    // "Category Tiles:" is the Bump brief's own name for this line; a real
    // Flash brief wrote the same thing as "Category Drop Down Banners:" --
    // same shape (a list of category names), different label.
    const tilesAt = lines.findIndex(line => /^(?:Category\s+Tiles|Category\s+Drop[- ]?Down\s+Banners?)\s*:/i.test(line));
    if (tilesAt >= 0) {
      const inline = lines[tilesAt].replace(/^(?:Category\s+Tiles|Category\s+Drop[- ]?Down\s+Banners?)\s*:\s*/i, '').trim();
      const raw = inline ? inline.split(/,\s*(?![^()]*\))/) : bulletsAfter(tilesAt);
      after.push({ at: tilesAt, section: { kind: 'categoryTiles', title: 'Category Tiles',
        header: 'Top Categories', cta: 'Shop Now', items: raw.map(item).filter(value => value.name) } });
    }
    const recsAt = lines.findIndex(line => /\bBluecore\s+SKUs?\b|\bproduct\s+recs\b/i.test(line));
    // "Top Sale Picks" either names its CTA inline ("...CTA: X") or, same as
    // Hero, states it on a bare line with the CTA given separately below.
    const topPicksAt = lines.findIndex(line => /^Top\s+Sale\s+Picks\b/i.test(line));
    if (topPicksAt >= 0) {
      const inline = lines[topPicksAt].replace(/^Top\s+Sale\s+Picks\s*CTA\s*:\s*/i, '');
      const cta = inline !== lines[topPicksAt] ? clean(inline) : (nearbyCta(topPicksAt) || 'See More');
      after.push({ at: topPicksAt, section: { kind: 'productRecs', title: 'Product recommendations',
        header: '', cta } });
    } else if (recsAt >= 0) after.push({ at: recsAt, section: { kind: 'productRecs', title: 'Product recommendations',
      header: '', cta: nearbyCta(recsAt) || 'See More',
      count: Number(lines[recsAt].match(/\b(\d+)\s+Bluecore/i)?.[1] ?? 4) } });
    // Each "Secondary N:" is one item under the board's single "More Current
    // Deals" frame -- the board gives that frame one header and one
    // placeholder photo per item, not a separate header per secondary deal.
    // Inline ("Secondary 1: Name, Up To X% Off, CTA") and bulleted (name on
    // the next line, "o "-prefixed percent/CTA below it) both occur.
    const secondaryIdxs = lines.map((_, i) => i).filter(i => /^Secondary\s*\d*\s*:/i.test(lines[i]));
    if (secondaryIdxs.length) {
      const items = secondaryIdxs.map(i => {
        const inline = lines[i].replace(/^Secondary\s*\d*\s*:\s*/i, '').trim();
        const parts = inline ? inline.split(',').map(clean).filter(Boolean) : bulletsAfter(i);
        if (!parts.length) return null;
        const rest = parts.slice(1);
        const pct = rest.find(p => /\d+\s*%/.test(p))?.match(/\d+/)?.[0] ?? '';
        const cta = rest.find(p => !/\d+\s*%/.test(p)) ?? 'Shop Now';
        return { name: parts[0], percent: pct, cta };
      }).filter((it): it is { name: string; percent: string; cta: string } => it !== null);
      if (items.length) after.push({ at: secondaryIdxs[0], section: { kind: 'moreDeals', title: 'More Current Deals',
        header: 'More Current Deals', items } });
    }
    inferred.push(...after.sort((a, b) => a.at - b.at).map(x => x.section));
    if (lines.some(line => /\bT\s*&\s*C\b|\bterms\s*(?:and|&)\s*conditions\b/i.test(line)))
      inferred.push({ kind: 'terms', title: 'Terms & Conditions' });
    const sections = numbered.length ? numbered : inferred;
    return { id: h.id, date: h.date, label: h.label, tb, sections };
  });
}
