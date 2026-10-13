/** A brief can suggest imagery, but it must never turn a board's carefully
 * chosen photograph into an unrelated library image. Match only words tied to
 * this *instance* of an asset, not words somewhere in the campaign brief. */
import { LIBRARY, type Item } from './media';
import type { UserMedia } from './userMedia';
import type { SheetAsset } from '../sheet/types';

const COMMON = new Set('buy save extra off sale deals bundle shop now launch today final '
  + 'offer item items gear apparel image photo desktop mobile card banner email social '
  + 'campaign collage set product the and for with your from this that'.split(' '));
const words = (value: string) => new Set((value.toLowerCase().match(/[a-z]{3,}/g) ?? [])
  .filter(word => !COMMON.has(word)));

export function matchImage(asset: SheetAsset, uploads: UserMedia[]): string | undefined {
  const subject = asset.scope.topic || asset.scope.category || asset.scope.concept;
  if (!subject) return undefined;
  const wanted = words(subject);
  if (!wanted.size) return undefined;
  const candidates: (Item | UserMedia)[] = [...uploads, ...LIBRARY]
    .filter(item => item.kind === 'photo' || item.kind === 'product');
  const ranked = candidates.map(item => {
    const tags = 'tags' in item ? item.tags : [];
    const named = words([item.name, ...(item.aka ?? []), ...tags].join(' '));
    const hits = [...wanted].filter(word => named.has(word));
    // A user-provided tag is an explicit semantic label. A built-in image
    // needs two matching words; its filename alone is weak evidence.
    const tagged = tags.some(tag => [...words(tag)].some(word => wanted.has(word)));
    const score = tagged ? 10 + hits.length : hits.length >= 2 ? hits.length : 0;
    return { item, score };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score);
  // Equally close images should be chosen by the designer, not at random.
  return ranked.length && ranked[0].score > (ranked[1]?.score ?? 0)
    ? ranked[0].item.file : undefined;
}
