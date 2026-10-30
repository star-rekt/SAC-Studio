import { DESIGNS as NAMED_SALE } from '../render/templates/named-sale/designs';

/** Board-authored alternatives. Counts always come from the brief or manual plan;
 *  these are choices for each instance, never instructions to create instances. */
export type DesignVariant = { id: string; name: string; height: number; node: string;
  /** Where a design's hero is part of its body: the hero's own height. */
  heroHeight?: number };

export const EMAIL_VARIANTS: Record<string, DesignVariant[]> = {
  sc26_0060: [
    { id: 'send-1', name: 'Send 1 · 3 days only', height: 826, node: '585:23' },
    { id: 'send-2', name: 'Send 2 · ends tomorrow', height: 1125, node: '583:4' },
    { id: 'send-3', name: 'Send 3 · last chance', height: 929, node: '585:25' },
  ],
  sc26_0021: [
    // 1029 is the hero alone; the board's own email-body/1 frame carries the
    // brand strip immediately beneath it (height 126), which FlashEmailHero
    // now renders as part of this same send.
    { id: 'launch', name: 'Flash · launch', height: 1029 + 126, node: '248:711098' },
    { id: 'tomorrow', name: 'Flash · ends tomorrow', height: 2087, node: '248:711329' },
    { id: 'today', name: 'Flash · ends today', height: 1295, node: '248:711246' },
  ],
  // Each design is self-contained (inbox lines, hero, body and footer in one
  // board frame); `height` is the frame's, `heroHeight` its hero section's.
  sc26_bump2: [
    { id: 'design-1', name: 'Design 1 · ends today, photo window', height: 7229, heroHeight: 1689, node: '583:3' },
    { id: 'design-2', name: 'Design 2 · 4 days only, top picks', height: 7185, heroHeight: 1395, node: '585:11' },
    { id: 'design-3', name: 'Design 3 · ends soon, top brands', height: 5899, heroHeight: 1369, node: '585:12' },
    { id: 'design-4', name: 'Design 4 · ends tomorrow, framed photo', height: 6733, heroHeight: 1526, node: '585:13' },
    { id: 'design-5', name: 'Design 5 · last chance, bestsellers', height: 6381, heroHeight: 1329, node: '585:14' },
  ],
  // The Memorial Day board's fifteen whole emails, as the template lab compiled them.
  named_sale: NAMED_SALE.filter(d => d.format === 'email-body')
    .map(d => ({ id: d.id, name: d.name, height: Math.round(d.size[1]), node: d.node,
      // Its header is its hero section: that section's height.
      heroHeight: (h => h && Math.round(h.height))(d.sections?.find(s => s.kind === 'hero')) })),
};

/** Small formats the templates draw differently: any campaign can take
 *  another template's design, drawn in its own colours with its own copy.
 *  `home`: the templates whose own design it is. */
const SHARED: Record<string, { id: string; name: string; home: string[] }[]> = {
  'cplp-tile': [{ id: 'photo', name: 'Photo tile', home: ['sc26_0021', 'sc26_bump2', 'named_sale'] },
    { id: 'halftone', name: 'Halftone tile', home: ['sc26_0060'] }],
  'text-link': [{ id: 'row', name: 'Link row', home: ['sc26_0021'] },
    { id: 'bar', name: 'Banner bar', home: ['sc26_0060', 'sc26_bump2', 'named_sale'] }],
  'hero-mobile': [{ id: 'dark', name: 'Photo', home: ['sc26_0021', 'sc26_bump2', 'named_sale'] },
    { id: 'cream', name: 'Cream', home: ['sc26_0060'] }],
};
/** A small format's design in this campaign: the one chosen, else its template's own. */
export const siteDesign = (templateId: string, format: string, chosen: string) => {
  const list = SHARED[format] ?? [];
  return (list.find(d => d.id === chosen) ?? list.find(d => d.home.includes(templateId)) ?? list[0])?.id;
};
/** Each template's shared formats, its own design first. */
const shared = (templateId: string) => Object.fromEntries(Object.entries(SHARED).map(([format, list]) =>
  [format, [...list].sort((a, b) => Number(b.home.includes(templateId)) - Number(a.home.includes(templateId)))
    .map(({ id, name }) => ({ id, name }))]));

/** Independent board examples inside a non-email asset type, and the small
 *  formats' shared designs. Selecting one changes the design of this
 *  instance, never the number of instances. */
export const SITE_VARIANTS: Record<string, Record<string, { id: string; name: string }[]>> = {
  sc26_0021: shared('sc26_0021'),
  sc26_0060: { ...shared('sc26_0060'), cb: [
    { id: 'launch', name: 'Launch banner' },
    { id: 'ends-today', name: 'Ends-today banner' },
  ] },
  sc26_bump2: shared('sc26_bump2'),
  named_sale: { ...shared('named_sale'), 'hero-desktop': NAMED_SALE.filter(d => d.format === 'hero-desktop').map(d => ({ id: d.id, name: d.name })) },
};

/** Designs saved under an earlier id, and the board design each now is: Bump
 *  2's four hand-drawn designs, before its five board frames were compiled. */
const RENAMED: Record<string, string> = { 'variant-1': 'design-1', 'variant-2': 'design-2',
  'variant-3': 'design-4', 'variant-4': 'design-5' };

export const emailVariant = (templateId: string, chosen: string, sendIndex: number) => {
  const list = EMAIL_VARIANTS[templateId] ?? [];
  const id = RENAMED[chosen] ?? chosen;
  return list.find(v => v.id === id) ?? list[sendIndex % list.length] ?? undefined;
};
