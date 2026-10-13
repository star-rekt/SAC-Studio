/** The AUTUMN20 board's social composition, extended to requested ratios. */
import type { SheetAsset } from '../../sheet/types';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { Editable } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { stack } from '../../fonts';
import { BrandMark } from './BrandMark';

export function AutumnSocial({ asset }: { asset: SheetAsset }) {
  const [w, h] = asset.size, scale = w / 1080;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const x = w * .055, ticketW = w * .89, ticketH = ticketW * 674 / 1520;
  const top = Math.min(h * .49, h - ticketH - 130 * scale);
  const text: React.CSSProperties = { color: '#fff', fontFamily: stack('Quiet Sans'),
    lineHeight: .9, fontWeight: 800 };
  const id = `${asset.id}/autumn-social`;
  return <div className="sheet" style={{ width: w, height: h, position: 'relative',
    overflow: 'hidden', background: '#1f211b' }}>
    <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/autumn-social-photo.jpg"
      style={{ position: 'absolute', inset: 0 }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'linear-gradient(180deg,#0000 45%,#0008 100%)' }} />
    <div style={{ position: 'absolute', left: x, top, width: ticketW, height: ticketH,
      transform: 'rotate(-4deg)' }}>
      <Media id={`${id}/mark`} src="/reference/autumn-ticket.png" alt="Autumn ticket"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Media id={`${id}/wordmark`} src="/logos/sac-logo.svg" alt="Steep & Cheap"
        style={{ position: 'absolute', left: 48*scale, top: 75*scale,
          width: 240*scale, height: 80*scale, objectFit: 'contain',
          transform: 'rotate(-90deg) translateX(-80%)', transformOrigin: 'left top' }} />
      <Editable id={`${id}/offer`} style={{ position: 'absolute', left: 230*scale,
        top: 42*scale, whiteSpace: 'pre-line',
        fontSize: (asset.scope.topic ? Math.max(48, Math.floor(690 / (asset.scope.topic.length * .58))) : 130)*scale,
        letterSpacing: -3*scale, ...text }}>
        {asset.scope.topic || `${asset.copy.lead || 'EXTRA'}\n${asset.copy.offer || '20% OFF'}`}
      </Editable>
      <div style={{ position: 'absolute', left: 245*scale, bottom: 30*scale, display: 'flex',
        gap: 14*scale, alignItems: 'baseline', whiteSpace: 'nowrap', fontSize: 38*scale,
        color: '#fff', fontFamily: stack('Quiet Sans') }}>
        <Editable id={`${id}/code`}>{asset.copy.code ? `CODE ${asset.copy.code}` : 'NO CODE NEEDED'}</Editable>
        <span>|</span>
        <Editable id={`${id}/cta`} style={{ fontWeight: 800 }}>{`${(asset.copy.cta || 'Shop Now').toUpperCase()} >`}</Editable>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 30*scale, right: 30*scale, bottom: 30*scale,
      height: 95*scale, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {(['the-north-face', 'patagonia', 'mountain-hardwear'] as const).map((brand,n) =>
        <BrandMark key={brand} id={`${id}/brand/${n}`} name={asset.media.brands?.[n]}
          fallback={`/logos/brand-${brand}.svg`}
          style={{ width: [170,225,165][n]*scale, height: 80*scale,
            objectFit: 'contain' }} />)}
      <Editable id={`${id}/more`} style={{ ...text, fontSize: 42*scale }}>&amp; More</Editable>
    </div>
  </div>;
}
