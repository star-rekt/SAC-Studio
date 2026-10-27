/** Bump 2 — cream and collage, alternate hero/email/social treatment

 *  A second template for the same SC26_0060 corpus, not a second campaign:
 *  it is grounded in the same measured board (same geometry, same cream
 *  paper and charcoal pill vocabulary) but carries its own board-authored
 *  hero, email and paid-social renderers, drawn from a separate Figma pass
 *  over the same board. Every format this template does not override (tile,
 *  bar, badge, strip) falls back to the exact same vocabulary sc26_0060 uses,
 *  because no alternate design exists for those yet.
 */
import type { TemplateSpec } from '../schema';

const spec: TemplateSpec = {
  id: 'sc26_bump2', name: 'Bump 2 — cream and collage, alt', type: 'bump', exposed: false,
  groundedIn: 'SC26_0060 Wk35-36 Bump',
  figma: { fileKey: 'ioB3sP8LwBiTUPQN7jlF81', nodeId: '538:15528' },
  why: 'A second board-authored pass over SC26_0060: its own hero, four '
     + 'email-body designs and a split paid-social set (1x1/4x5/9x16), '
     + 'offered as its own template rather than folded into sc26_0060 so '
     + 'the two can be picked between, not merged.',
  accent: '#F14222',

  classes: {
    hero: { ground: 'cream-grain', photo: 'collage', copyAt: 'left', urgency: 'caps',
            offer: 'single', offerScale: 0.105, register: 'display', code: true,
            button: 'pill-charcoal', closing: 'none', tone: 'ink' },

    social: { ground: 'cream-grain', photo: 'window', copyAt: 'left', urgency: 'caps',
              offer: 'lead-over', offerScale: 0.115, register: 'display', code: true,
              button: 'pill-charcoal', closing: 'wordmark', tone: 'ink',
              accent: '#79AC41' },

    tile: { ground: 'accent-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
            offer: 'single', offerScale: 0.26, register: 'display', code: false,
            button: 'none', closing: 'none', tone: 'cream' },

    bar: { ground: 'cream-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
           offer: 'single', offerScale: 0.14, register: 'sentence', code: false,
           button: 'none', closing: 'none', tone: 'ink' },

    badge: { ground: 'white', photo: 'none', copyAt: 'left', urgency: 'none',
             offer: 'single', offerScale: 0.10, register: 'sentence', code: false,
             button: 'none', closing: 'none', tone: 'ink' },

    strip: { ground: 'cream-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
             offer: 'single', offerScale: 0.08, register: 'sentence', code: false,
             button: 'none', closing: 'brand-strip', tone: 'ink' },

    email: { ground: 'cream-grain', photo: 'window', copyAt: 'left', urgency: 'caps',
             offer: 'single', offerScale: 0.174, register: 'display', code: true,
             button: 'pill-charcoal', closing: 'none', tone: 'ink',
             accent: '#79AC41' },
  },

  formats: {
    cb: { ground: 'accent-grain', tone: 'cream', offerScale: 0.22 },
    'text-banner': { ground: 'white', copyAt: 'left', register: 'display',
                     offerScale: 0.22 },
    'text-banner-mobile': { ground: 'white', copyAt: 'left', register: 'display',
                            offerScale: 0.30 },
    'compact-mobile': { ground: 'charcoal', tone: 'cream', register: 'display',
                        offerScale: 0.44 },
    'pdp-badging-mock': { ground: 'ink', tone: 'cream' },
    'plp-badging-mock': { ground: 'photo-bleed', tone: 'cream' },
  },
};

export default spec;
