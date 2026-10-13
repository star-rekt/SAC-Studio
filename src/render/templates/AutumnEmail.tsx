/** AUTUMN20's actual email hero: full-bleed runners, one punched ticket and a
 *  brand strip. Copy remains editable React text; the ticket is only texture. */
import type { Doc } from '../../model/compose';
import { copyFor } from '../../model/copy';
import { Editable } from '../../edit/Editable';
import { Picture } from '../../edit/Picture';
import { Media } from '../../edit/Media';
import { stack } from '../../fonts';
import { BrandMark } from './BrandMark';

export function AutumnEmailHero({ doc, i }: { doc: Doc; i: number }) {
  const send = doc.sends[i], id = `${send.id}/autumn-email`;
  const copy = copyFor(send, doc.brief);
  const t = copy.ticket;
  const lead = t.lead || 'EXTRA', offer = t.offer || '20% OFF';
  const urgency = /\bENDS|FINAL|LAST\b/i.test(copy.marquee) ? copy.marquee
    : doc.brief.duration || copy.marquee || 'LIMITED TIME';
  return <div className="sheet" style={{ width: 1200, height: 826, position: 'relative',
    overflow: 'hidden', background: '#282521' }}>
    <Picture id={`${id}/photo`} zone={send.photo} initialSrc="/reference/autumn-email-photo.jpg"
      style={{ position: 'absolute', inset: 0 }} />
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'linear-gradient(180deg,#0003 0%,#0000 45%,#0008 100%)' }} />
    <div style={{ position: 'absolute', left: -15, top: 14, width: 1240, overflow: 'hidden',
      whiteSpace: 'nowrap', color: 'white', fontFamily: stack('Quiet Sans'),
      fontSize: 65, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.2 }}>
      {Array.from({ length: 4 }, (_, n) => <span key={n}>
        <Editable as="span" id={`${id}/marquee/${n}`}>{urgency}</Editable>
        <span style={{ margin: '0 24px', fontWeight: 400 }}>|</span></span>)}
    </div>
    <div style={{ position: 'absolute', left: 373, top: 242, width: 770, height: 344,
      transform: 'rotate(-2.7deg)' }}>
      <Media id={`${id}/mark`} src="/reference/autumn-ticket.png" alt="Autumn ticket"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <Editable id={`${id}/offer`} as="h1" style={{ position: 'absolute', left: 40, top: 34,
        margin: 0, whiteSpace: 'pre-line', color: '#fff',
        fontFamily: stack('Quiet Sans'), fontWeight: 800,
        fontSize: 140, letterSpacing: -3, lineHeight: .83 }}>{`${lead}\n${offer}`}</Editable>
      <div style={{ position: 'absolute', left: 47, top: 271, display: 'flex', alignItems: 'baseline',
        gap: 13, whiteSpace: 'nowrap', color: '#fff', fontFamily: stack('Quiet Sans'),
        fontSize: 37, lineHeight: 1 }}>
        <Editable id={`${id}/code`}>{t.foot || 'CODE AUTUMN20'}</Editable>
        <span>|</span>
        <Editable id={`${id}/cta`} style={{ fontWeight: 800, letterSpacing: 1 }}>{`${copy.cta.toUpperCase()} >`}</Editable>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 84, right: 84, bottom: 25, height: 94,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {(['the-north-face', 'patagonia', 'mountain-hardwear'] as const).map((brand, n) =>
        <BrandMark key={brand} id={`${id}/brand/${n}`} name={doc.brief.brands?.[n]}
          fallback={`/logos/brand-${brand}.svg`}
          style={{ width: [165, 230, 170][n], height: 86, objectFit: 'contain' }} />)}
      <Editable id={`${id}/more`} style={{ color: '#fff', fontFamily: stack('Quiet Sans'),
        fontWeight: 800, fontSize: 39 }}>&amp; More</Editable>
    </div>
  </div>;
}
