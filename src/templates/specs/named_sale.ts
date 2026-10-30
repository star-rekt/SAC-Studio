/** Named Sale — a sale with a name (Memorial Day, Labor Day): its own hero,
 *  socials and fifteen email designs

 *  Compiled from the SC26_0027 Memorial Day Sale board by the template lab
 *  (template-lab/, outside the repo): every frame's layers drawn from the
 *  board itself (FigmaLayers), with the parts a designer edits as slots -- the
 *  sale's name, the offer and its lead, urgency, code, CTAs, photos, product
 *  photos and brand logos -- tied to the brief. The board's own words for the
 *  sale ("MEMORIAL DAY SALE") take the brief's sale name. The frames live in
 *  src/render/templates/named-sale/ (designs.ts lists them).
 *
 *  Formats the board has no frame for (tiles, bars, banners, badging) borrow
 *  Bump 2's vocabulary until they're compiled too.
 */
import type { TemplateSpec } from '../schema';
import bump2 from './sc26_bump2';

const spec: TemplateSpec = {
  id: 'named_sale', name: 'Named Sale', type: 'named-sale',
  // Sessions made in the proxy trial (dropped) open as this template.
  aliases: ['proxy_test'],
  groundedIn: 'SC26_0027 Memorial Day Sale',
  figma: { fileKey: 'ioB3sP8LwBiTUPQN7jlF81', nodeId: '538:37475' },
  why: 'A sale named for its occasion: the Memorial Day board compiled whole '
     + '(hero, three socials, fifteen email designs), its sale name, offer '
     + 'and urgency taken from the brief, so the next named sale is a brief, '
     + 'not a redraw.',
  accent: '#F14222',
  classes: bump2.classes,
  formats: bump2.formats,
};

export default spec;
