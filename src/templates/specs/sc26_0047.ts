/** Flash sale — photograph and brush
 *
 *  One template, one file. The set keeps growing and a single file holding
 *  all of them is a merge conflict waiting to happen and a thing nobody can
 *  read. Everything here is a choice over the vocabulary in ../schema.ts;
 *  if a value is not in that vocabulary the registry refuses to start and
 *  says which field.
 */
import type { TemplateSpec } from '../schema';
import { BAR } from '../schema';

const spec: TemplateSpec = {
    id: 'sc26_0047', name: 'Flash sale — photograph and brush', type: 'flash-sale',
    groundedIn: 'SC26_0021 Flash Sale Apr 4',
    figma: { fileKey: '7r3YL4Zko0WfQs5vnSO9OT', nodeId: '248:710921' },
    why: 'Carries 13 formats including text-banner-mobile, which SC26_0060 does '
       + 'not, so the pair covers all 16. Its outlook is photograph-first — the '
       + 'picture is the whole frame and the type is set into it.',
    accent: '#79AC41', // Corrected from #D79503 to #79AC41 (true color)
    classes: {
      hero: { ground: 'photo-bleed', photo: 'bleed', copyAt: 'right', urgency: 'brush',
              offer: 'prefix-stacked', offerScale: 0.165, register: 'display', code: false, button: 'pill-orange',
              closing: 'none', tone: 'ink' },
      social: { ground: 'photo-bleed', photo: 'bleed', copyAt: 'right', urgency: 'brush',
                offer: 'prefix-stacked', offerScale: 0.155, register: 'display', code: false, button: 'none',
                closing: 'brand-strip', tone: 'cream' },
      tile: { ground: 'accent-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
              offer: 'single', offerScale: 0.26, register: 'display', code: false, button: 'none',
              closing: 'none', tone: 'cream' },
      bar: BAR,
      badge: { ...BAR, ground: 'white', tone: 'ink', offerScale: 0.10 },
      strip: { ...BAR, ground: 'photo-bleed', tone: 'cream', closing: 'brand-strip' },
    },
  };

export default spec;
