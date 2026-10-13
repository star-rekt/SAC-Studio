/** Bump — cream and collage

 *  One template, one file. Everything here is a choice over the vocabulary in
 *  ../schema.ts; a value outside it stops the registry with the field named.
 *
 *  Every number below traces to SC26_0060's own 146 measured assets. Where a
 *  format departs from its class, the departure is in `formats` and the
 *  measurement is quoted beside it — because three of these classes used to
 *  be a shared BAR default, and 8 of the 16 formats rendered as an orange
 *  slab carrying a display offer as a result.
 */
import type { TemplateSpec } from '../schema';

const spec: TemplateSpec = {
  id: 'sc26_0060', name: 'Bump — cream and collage', type: 'bump',
  aliases: ['CHILLY20'],
  groundedIn: 'SC26_0060 Wk35-36 Bump',
  figma: { fileKey: 'ioB3sP8LwBiTUPQN7jlF81', nodeId: '538:15528' },
  why: 'The widest board in the corpus: 15 of the 16 measured formats, and '
     + 'the only one carrying hero-mobile. Its outlook is paper-first — cream '
     + 'with a grain, type set on the paper rather than on the photograph.',
  accent: '#F14222',

  classes: {
    // ground texture #F5EBDF, accent #F14222 on urgency, copy left in ink.
    hero: { ground: 'cream-grain', photo: 'collage', copyAt: 'left', urgency: 'caps',
            offer: 'single', offerScale: 0.105, register: 'display', code: true,
            button: 'pill-charcoal', closing: 'none', tone: 'ink' },

    // Read off the board rather than assumed: cream paper, green accent, and
    // the photograph seen through the stepped window rather than bleeding
    // behind everything. accent #79AC41 carries urgency, code and outline on
    // all three aspects.
    social: { ground: 'cream-grain', photo: 'window', copyAt: 'left', urgency: 'caps',
              offer: 'lead-over', offerScale: 0.115, register: 'display', code: true,
              button: 'pill-charcoal', closing: 'wordmark', tone: 'ink',
              accent: '#79AC41' },

    // cplp-tile measures display on all 76 assets in the corpus.
    tile: { ground: 'accent-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
            offer: 'single', offerScale: 0.26, register: 'display', code: false,
            button: 'none', closing: 'none', tone: 'cream' },

    // The bar class is the GT, which is the modal site bar: 1414x164, ground
    // texture #F5EBDF, copy centred, tone ink, register SENTENCE. Every board
    // in the corpus that measures a GT sets it as a sentence — it carries
    // 'Extra 20% Off Select Fall Gear, use code CHILLY20', not an offer.
    bar: { ground: 'cream-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
           offer: 'single', offerScale: 0.14, register: 'sentence', code: false,
           button: 'none', closing: 'none', tone: 'ink' },

    // All 18 badging measurements across the corpus are sentences. This was a
    // BAR spread, so it rendered a display offer on a blank white frame.
    badge: { ground: 'white', photo: 'none', copyAt: 'left', urgency: 'none',
             offer: 'single', offerScale: 0.10, register: 'sentence', code: false,
             button: 'none', closing: 'none', tone: 'ink' },

    // logo-strip measures 359x150 holding EIGHT photo-tiles and no copy block
    // at all. The offer is an eyebrow here; the logos are the asset. It was a
    // BAR spread rendering the offer large with the logos as a 12px footnote.
    strip: { ground: 'cream-grain', photo: 'none', copyAt: 'centre', urgency: 'none',
             offer: 'single', offerScale: 0.08, register: 'sentence', code: false,
             button: 'none', closing: 'brand-strip', tone: 'ink' },

    // Email repeats the paid-social signature: one stepped photograph on the
    // right half, green accent, and ink type in the cream negative space.
    email: { ground: 'cream-grain', photo: 'window', copyAt: 'left', urgency: 'caps',
             offer: 'single', offerScale: 0.174, register: 'display', code: true,
             button: 'pill-charcoal', closing: 'none', tone: 'ink',
             accent: '#79AC41' },
  },

  // Where one format departs from its class, with the measurement that says so.
  formats: {
    // 1414x239, ground accent-field #F14222, copy centred in cream, sentence.
    cb: { ground: 'accent-grain', tone: 'cream', offerScale: 0.22 },
    // 1400x109, ground texture #FFFFFF, copy LEFT in ink, display at 24px.
    'text-banner': { ground: 'white', copyAt: 'left', register: 'display',
                     offerScale: 0.22 },
    // text-banner-mobile measures display on all 19 assets in the corpus.
    'text-banner-mobile': { ground: 'white', copyAt: 'left', register: 'display',
                            offerScale: 0.30 },
    // 376x113, ground texture #333333, copy centred in cream, display at 50px.
    'compact-mobile': { ground: 'charcoal', tone: 'cream', register: 'display',
                        offerScale: 0.44 },
    // 1390x189 on ground texture #101010, no elements: a dark bar.
    'pdp-badging-mock': { ground: 'ink', tone: 'cream' },
    // 679x1403 photo-bleed — the phone mockup. Its measured copy rect runs
    // -0.267 to 3.968 because the board captured a cropped artboard, so
    // registry.ts's sane() drops it and the composer places the copy itself.
    'plp-badging-mock': { ground: 'photo-bleed', tone: 'cream' },
  },
};

export default spec;
