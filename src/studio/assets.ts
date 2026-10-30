/** Asset types by name, and whether an asset is confirmed: shared by the
 *  overview, Build and Fine-tune. */
import type { Sheet, SheetAsset } from '../sheet/types';

/** What a designer calls each deliverable. */
const NAMES: Record<string, string> = {
  'hero-desktop': 'Homepage hero', 'hero-mobile': 'Mobile hero', 'email-body': 'Email', 'email-hero': 'Email header',
  'paid-social-1x1': 'Social · square', 'paid-social-4x5': 'Social · portrait', 'paid-social-9x16': 'Social · story',
  gt: 'Global banner', cb: 'Campaign banner', 'text-banner': 'Text banner', 'text-banner-mobile': 'Text banner · mobile',
  'compact-mobile': 'Compact banner', 'cplp-tile': 'Category tiles', 'pdp-badging-mock': 'Product page badge',
  'plp-badging-mock': 'Listing badge', 'rules-page': 'Rules page', 'text-link': 'Affiliate link', 'brand-tile': 'Brand tile',
  'logo-strip': 'Logo strip',
};
export const ORDER = ['hero-desktop', 'email-body', 'email-hero', 'paid-social-1x1', 'paid-social-4x5', 'paid-social-9x16'];
export const nameOf = (f: string) => NAMES[f] ?? f.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());

/** The ids an asset's edits are kept under: its own, and for an email or its
 *  header, the pair's (a send's header is the top of its email, one set of edits). */
export const editIds = (a: SheetAsset) => /^email-(body|hero)\//.test(a.id)
  ? [`email-body${a.id.slice(a.id.indexOf('/'))}`, `email-hero${a.id.slice(a.id.indexOf('/'))}`] : [a.id];

/** What an asset was confirmed as: its design, sections, copy and its own
 *  edits (an email's and its header's together) -- graphics and text layers
 *  added to it too, where it has any. */
export const signature = (s: Sheet, a: SheetAsset) => {
  const ids = editIds(a);
  const own = (m?: Record<string, unknown>) => Object.entries(m ?? {})
    .filter(([k]) => ids.some(id => k.startsWith(`${id}/`) || k.startsWith(`${id}~`))).sort();
  const added = [s.edits.graphics?.[a.id], s.edits.customText?.[a.id]].filter(x => x?.length);
  const text = JSON.stringify([a.variant, a.parts ?? null, a.copy, own(s.edits.text), own(s.edits.pic), own(s.edits.move),
    own(s.edits.size), own(s.edits.paint), ...added]);
  let h = 5381; for (let i = 0; i < text.length; i++) h = (h * 33 + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
export type Status = 'todo' | 'done' | 'changed';
export const statusOf = (s: Sheet, a: SheetAsset): Status =>
  !s.confirmed?.[a.id] ? 'todo' : s.confirmed[a.id] === signature(s, a) ? 'done' : 'changed';
/** The sheet with these assets confirmed as they are now. */
export const confirming = (s: Sheet, assets: SheetAsset[]): Sheet => ({ ...s, updatedAt: new Date().toISOString(),
  confirmed: { ...s.confirmed, ...Object.fromEntries(assets.map(a => [a.id, signature(s, a)])) } });
