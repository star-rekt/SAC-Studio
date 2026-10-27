/** A brand slot uses the brief's named logo when the library has one; a brand
 * the library doesn't stock yet keeps a real placeholder logo (the caller's
 * `fallback`) rather than falling back to plain text -- a template slot the
 * designer swaps from the brand library, same as every stocked one, not a
 * dead end that reads as missing content. */
import { Media } from '../../edit/Media';
import { find } from '../../model/media';

export function BrandMark({ id, name, fallback, style }: {
  id: string; name?: string; fallback: string; style: React.CSSProperties;
}) {
  const item = name ? find(name) : undefined;
  const src = item?.kind === 'brand' ? item.file : fallback;
  return <Media id={id} src={src} alt={name || 'Brand'} style={style} />;
}
