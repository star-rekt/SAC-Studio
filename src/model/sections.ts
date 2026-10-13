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
  | { kind: 'hero'; title: string; design: string; copy: string; cta: string }
  | { kind: 'categoryTiles'; title: string; header: string; items: Item[]; cta: string }
  | { kind: 'brandTiles'; title: string; header: string; items: Item[]; count: number;
      showPercent: boolean; cta: string }
  | { kind: 'productRecs'; title: string; header: string; cta: string; count?: number }
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
    const hero = lines.find(line => /^Hero\s*:/i.test(line));
    if (hero) inferred.push({ kind: 'hero', title: 'Hero', design: hero.replace(/^Hero\s*:\s*/i, ''),
      copy: '', cta: '' });
    const recs = lines.find(line => /\bBluecore\s+SKUs\b|\bproduct\s+recs\b/i.test(line));
    if (recs) inferred.push({ kind: 'productRecs', title: 'Product recommendations',
      header: 'Your Top Picks', cta: 'See More',
      count: Number(recs.match(/\b(\d+)\s+Bluecore/i)?.[1] ?? 4) });
    const tiles = lines.find(line => /^Category\s+Tiles\s*:/i.test(line));
    if (tiles) inferred.push({ kind: 'categoryTiles', title: 'Category Tiles',
      header: 'Top Categories', cta: 'Shop Now',
      items: tiles.replace(/^Category\s+Tiles\s*:\s*/i, '')
        .split(/,\s*(?![^()]*\))/).map(item).filter(value => value.name) });
    if (lines.some(line => /\bT\s*&\s*C\b|\bterms\s*(?:and|&)\s*conditions\b/i.test(line)))
      inferred.push({ kind: 'terms', title: 'Terms & Conditions' });
    const sections = numbered.length ? numbered : inferred;
    return { id: h.id, date: h.date, label: h.label, tb, sections };
  });
}
