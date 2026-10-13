/** A brand slot uses the brief's named logo when the library has one; an
 * unstocked brand stays editable type instead of becoming an unrelated logo. */
import { Editable } from '../../edit/Editable';
import { Media } from '../../edit/Media';
import { find } from '../../model/media';

export function BrandMark({ id, name, fallback, style }: {
  id: string; name?: string; fallback: string; style: React.CSSProperties;
}) {
  const item = name ? find(name) : undefined;
  if (name && item?.kind !== 'brand') return <Editable id={`${id}/name`} style={{ ...style,
    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 30,
    fontWeight: 800, textAlign: 'center', lineHeight: 1 }}>{name}</Editable>;
  return <Media id={id} src={item?.file || fallback} alt={name || 'Brand'} style={style} />;
}
