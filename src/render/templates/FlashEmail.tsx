/** Spring Flash email hero family, transcribed from its own three Figma email
 *  frames. Type, offer, categories and CTA stay independent React elements. */
import type { Doc } from '../../model/compose';
import { copyFor } from '../../model/copy';
import { Editable } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { emailVariant } from '../../templates/variants';
import { stack } from '../../fonts';
import { find as findMedia } from '../../model/media';

const orange = '#F14222', ink = '#333';
const type = (size: number, weight = 800): React.CSSProperties => ({
  fontFamily: stack('Quiet Sans'), fontSize: size, fontWeight: weight,
  lineHeight: 1, letterSpacing: -size * .015,
});

function Brush({ id, text, top, pale = false }: {
  id: string; text: string; top: number; pale?: boolean;
}) {
  return <div style={{ position: 'absolute', left: '50%', top, transform: 'translateX(-50%)',
    width: 430, height: 70, display: 'grid', placeItems: 'center' }}>
    <Media id={`${id}/mark`} src="/graphics/brush-strip.svg" alt=""
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    <Editable id={`${id}/urgency`} style={{ position: 'relative', color: pale ? '#fff' : '#fff',
      ...type(55, 400), whiteSpace: 'nowrap' }}>{text}</Editable>
  </div>;
}
function SaleType({ id, top, title, percent, upto, pale = false }: {
  id: string; top: number; title: string; percent: string; upto: boolean; pale?: boolean;
}) {
  const titleSize = Math.min(98, Math.round(950 / (Math.max(title.length, 1) * .70 + 2)));
  return <div style={{ position: 'absolute', left: 110, right: 110, top,
    textAlign: 'center', color: pale ? '#F5EBDF' : ink, textShadow: pale ? '0 4px 5px #0008' : 'none' }}>
    <Editable id={`${id}/title`} style={{ ...type(titleSize), whiteSpace: 'nowrap' }}>{`ϟ ${title} ϟ`}</Editable>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
      <Editable id={`${id}/upto`} style={{ ...type(upto ? 55 : 35, 400), width: upto ? 90 : 130,
        textAlign: 'right', lineHeight: .9, whiteSpace: 'pre-line' }}>{upto ? 'UP\nTO' : 'EXTRA'}</Editable>
      <Editable id={`${id}/offer`} style={{ ...type(160), whiteSpace: 'nowrap' }}>{`${percent}% OFF`}</Editable>
    </div>
  </div>;
}
function Cta({ id, top, text = 'Shop Now' }: { id: string; top: number; text?: string }) {
  return <Editable id={`${id}/cta`} style={{ position: 'absolute', left: 365, top,
    width: 470, height: 120, borderRadius: 30, display: 'grid', placeItems: 'center',
    background: orange, color: '#fff', ...type(64, 700), textAlign: 'center' }}>{text}</Editable>;
}
function BrandBand({ id, brands, top }: { id: string; brands: string[]; top: number }) {
  return <div style={{ position: 'absolute', left: 0, top, width: 1200, height: 125,
    background: orange, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
    {brands.map((brand, n) => {
      const item = findMedia(brand);
      return item?.kind === 'brand'
        ? <Media key={`${brand}-${n}`} id={`${id}/brand/${n}`}
            src={item.file} alt={brand}
            style={{ width: 190, height: 80, objectFit: 'contain' }} />
        : <Editable key={`${brand}-${n}`} id={`${id}/brand-text/${n}`}
            style={{ color: '#fff', ...type(40, 700), textAlign: 'center' }}>{brand.toUpperCase()}</Editable>;
    })}
  </div>;
}

export function FlashEmailHero({ doc, i, variant }: { doc: Doc; i: number; variant: string }) {
  const s = doc.sends[i], v = emailVariant('sc26_0021', variant, i)!;
  const copy = copyFor(s, doc.brief);
  const authored = s.assetCopy?.offer && !/^\d+\s*%\s*OFF$/i.test(s.assetCopy.offer)
    ? s.assetCopy.offer : '';
  const percent = authored?.match(/(\d+)\s*%/)?.[1] || doc.brief.percent || '70';
  const title = authored || doc.brief.name?.toUpperCase()
    || (doc.brief.type === 'flash-sale' ? 'FLASH SALE' : 'SALE');
  const upto = /\bUP\s+TO\b/i.test(authored || doc.brief.offer)
    || (!authored && doc.brief.type === 'flash-sale');
  const urgency = /\bENDS|FINAL|LAST\b/i.test(copy.marquee) ? copy.marquee
    : doc.brief.duration || copy.marquee;
  const categories = s.sections.find(section => section.kind === 'categoryTiles');
  const categoryNames = categories?.kind === 'categoryTiles'
    ? categories.items.map(item => item.name) : [];
  const brands = doc.brief.brands?.length ? doc.brief.brands.slice(0, 4)
    : ['Merrell', 'Outdoor Research', 'Scarpa', 'Mountain Hardwear'];
  const heroDirection = s.sections.find(section => section.kind === 'hero');
  const id = `${s.id}/flash-email`;
  const tomorrow = v.id === 'tomorrow', today = v.id === 'today';
  const ctaAt = today && heroDirection?.kind === 'hero'
    && /\b800\s*px\s*or\s*higher/i.test(heroDirection.design) ? 820
    : today ? 487 : 824;
  const initialSrc = tomorrow ? '/reference/flash-tomorrow-photo-b.png'
    : today ? '/reference/flash-today-photo.png' : '/reference/flash-email-photo.jpg';
  return <div className="sheet" data-design-variant={v.id}
    style={{ width: 1200, height: v.height, position: 'relative', overflow: 'hidden',
      background: tomorrow ? '#F5EBDF' : '#d9d9d9' }}>
    {tomorrow ? <>
      <Picture id={`${id}/photo`} zone={s.photo} initialSrc={initialSrc}
        style={{ position: 'absolute', left: 100, top: 0, width: 1000, height: 1860,
          borderRadius: 25 }} />
      <div style={{ position: 'absolute', left: 100, top: 0, width: 1000, height: 1860,
        pointerEvents: 'none', background: '#37546b42', borderRadius: 25 }} />
      <Brush id={id} text={urgency || 'LIMITED TIME'} top={170} pale />
      <SaleType id={id} top={280} title={title} percent={percent} upto={upto} pale />
      {doc.brief.code && <Editable id={`${id}/code`} style={{ position: 'absolute',
        left: 350, top: 570, width: 500, textAlign: 'center', color: ink,
        background: '#F5EBDF', borderRadius: 15, padding: '11px 0',
        fontFamily: stack('Quiet Sans'), fontSize: 45, fontWeight: 800 }}>{`CODE ${doc.brief.code}`}</Editable>}
      <div style={{ position: 'absolute', left: 180, top: 670, width: 840 }}>
        {categoryNames.slice(0, 6).map((name, n) => {
          const dual = /dual\s+CTA/i.test(name);
          const label = name.replace(/\s*\(.*\)$/, '').trim();
          return (
          <div key={name} style={{ width: '100%', height: 140, background: orange,
            borderRadius: 20, marginBottom: 22, display: 'flex', alignItems: 'center',
            boxSizing: 'border-box', padding: '0 35px', color: '#fff' }}>
            <Editable id={`${id}/category/${n}`} style={{ ...type(dual ? 45 : 50, 700), flex: 1 }}>{label}</Editable>
            {dual ? <div style={{ display: 'flex', gap: 18, ...type(28, 700) }}>
              <Editable id={`${id}/category/${n}/men`}>Men →</Editable>
              <Editable id={`${id}/category/${n}/women`}>Women →</Editable>
            </div> : <span style={{ fontSize: 72, fontWeight: 300 }}>→</span>}
          </div>);
        })}
      </div>
      <Cta id={id} top={1780} text={copy.cta || 'Shop All Sale'} />
      <BrandBand id={id} brands={brands} top={1962} />
    </> : <>
      <Picture id={`${id}/photo`} zone={s.photo} initialSrc={initialSrc}
        focus={{ x: 0, y: 50 }}
        style={{ position: 'absolute', inset: 0 }} />
      <Brush id={id} text={urgency || 'LIMITED TIME'} top={65} />
      <SaleType id={id} top={today ? 176 : 154} title={title} percent={percent} upto={upto} />
      {doc.brief.code && <Editable id={`${id}/code`} style={{ position: 'absolute',
        left: 350, top: today ? ctaAt > 600 ? 650 : 715 : 650, width: 500,
        textAlign: 'center', color: ink, background: '#F5EBDF',
        borderRadius: 15, padding: '11px 0', fontFamily: stack('Quiet Sans'),
        fontSize: 45, fontWeight: 800 }}>{`CODE ${doc.brief.code}`}</Editable>}
      <Cta id={id} top={ctaAt} text={copy.cta} />
      {today && <BrandBand id={id} brands={brands} top={1170} />}
    </>}
  </div>;
}
