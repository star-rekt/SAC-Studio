/** SC26_0060 paid social: one photographed, stepped card in three ratios.
 * The photo, all copy, CTA, wordmark and the story brands remain independent
 * editable layers. The path is only the cream paper cutout and green keyline. */
import type { SheetAsset } from '../../sheet/types';
import { Picture } from '../../edit/Picture';
import { Editable } from '../../edit/Editable';
import { Media } from '../../edit/Media';
import { ZONE_LIST, photoFor } from '../../model/compose';
import { stack } from '../../fonts';
import type { Direction } from '../../templates/directions';
import { BrandMark } from './BrandMark';

const green = '#79ac41', ink = '#333333', paper = '#f5ecdf';
const paths: Record<string, string> = {
  'paid-social-1x1': 'M 64 30 H 1016 Q 1050 30 1050 64 V 1016 Q 1050 1050 1016 1050 H 64 Q 30 1050 30 1016 V 895 Q 30 862 63 862 H 499 Q 532 862 532 829 V 724 Q 532 691 565 691 H 731 Q 765 691 765 657 V 603 Q 765 570 732 570 H 717 Q 685 570 685 538 V 459 Q 685 427 653 427 H 560 Q 528 427 528 395 V 336 Q 528 304 496 304 H 467 Q 434 304 434 271 Q 434 240 401 240 H 64 Q 30 240 30 206 V 64 Q 30 30 64 30 Z',
  'paid-social-4x5': 'M 79 30 H 1001 Q 1035 30 1035 64 V 1281 Q 1035 1315 1001 1315 H 79 Q 45 1315 45 1281 V 1095 Q 45 1061 79 1061 H 516 Q 550 1061 550 1027 V 921 Q 550 887 584 887 H 727 Q 761 887 761 853 V 805 Q 761 771 727 771 H 725 Q 697 771 697 740 V 658 Q 697 625 664 625 H 579 Q 546 625 546 592 V 531 Q 546 498 513 498 H 458 Q 425 498 425 465 V 464 Q 425 431 392 431 H 365 Q 332 431 332 398 V 315 Q 332 282 299 282 H 79 Q 45 282 45 248 V 64 Q 45 30 79 30 Z',
  'paid-social-9x16': 'M 64 220 H 1016 Q 1050 220 1050 254 V 1416 Q 1050 1450 1016 1450 H 64 Q 30 1450 30 1416 V 1278 Q 30 1245 63 1245 H 501 Q 535 1245 535 1211 V 1105 Q 535 1071 569 1071 H 724 Q 758 1071 758 1037 V 989 Q 758 955 724 955 H 720 Q 688 955 688 922 V 841 Q 688 808 655 808 H 562 Q 529 808 529 775 V 714 Q 529 681 496 681 H 469 Q 436 681 436 648 V 625 Q 436 592 403 592 H 354 Q 321 592 321 559 V 506 Q 321 473 288 473 H 64 Q 30 473 30 439 V 254 Q 30 220 64 220 Z',
};

const copyStyle = (left: number, top: number, size: number, extra?: React.CSSProperties): React.CSSProperties => ({
  position: 'absolute', left, top, zIndex: 4, fontFamily: stack('Quiet Sans'),
  fontWeight: 800, lineHeight: 1, color: ink, fontSize: size, ...extra,
});

export function BumpSocial({ asset, direction }: { asset: SheetAsset; direction?: Direction }) {
  const [w, h] = asset.size;
  const accent = direction?.id === 'a' || !direction ? green : direction.accent;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const story = asset.format === 'paid-social-9x16';
  const tall = asset.format === 'paid-social-4x5';
  const top = story ? 628 : tall ? 443 : 251;
  const left = story ? 40 : tall ? 48 : 42;
  const id = `${asset.id}/bump-social`;
  const offer = asset.scope.topic || asset.copy.offer || '20% OFF';
  const lead = asset.scope.topic ? '' : asset.copy.lead || 'EXTRA';
  const urgency = /\b(?:DAY|ENDS|HOUR|FINAL|LAST)\b/i.test(asset.copy.marquee ?? '')
    ? asset.copy.marquee! : asset.copy.eyebrow || 'LIMITED TIME';
  const code = asset.copy.code ? `CODE ${asset.copy.code}`
    : asset.copy.qualifier || 'NO CODE NEEDED';
  const codeSize = Math.min(86, Math.floor(700 / (Math.max(1,code.length) * .53)));
  const urgencySize = Math.min(48, Math.round(390 / Math.max(1, urgency.length * .63)));
  const photo = story ? { left: 30, top: 220, width: 1020, height: 1230 }
    : tall ? { left: 45, top: 30, width: 990, height: 1285 }
    : { left: 30, top: 30, width: 1020, height: 1020 };
  const path = direction?.shape === 'panel'
    ? `M 30 30 H ${w-30} V ${h-30} H 30 Z`
    : direction?.shape === 'notch'
    ? `M 30 30 H ${w-30} V ${h-30} H ${Math.round(w*.55)} V ${Math.round(h*.72)} H 30 Z`
    : paths[asset.format] ?? paths['paid-social-1x1'];
  return <div className="sheet" data-design-variant="figma" style={{ width: w, height: h,
    background: paper,
    backgroundImage: 'linear-gradient(#f5ecdfaa,#f5ecdfaa),url(/reference/bump-paper.png)',
    backgroundSize: 'cover,612px 408px', overflow: 'hidden' }}>
    <Picture id={`${id}/photo`} zone={zone} initialSrc="/reference/bump-social-photo.jpg"
      initialScale={story || tall ? 1.1 : 1.2}
      zoomOrigin={{ x: 0, y: 90 }}
      focus={{ x: story ? 45 : tall ? 48 : 40, y: story || tall ? 35 : 30 }}
      style={{ position: 'absolute', ...photo }} />
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
      aria-hidden="true">
      <path d={`M 0 0 H ${w} V ${h} H 0 Z ${path}`} fill={paper} fillRule="evenodd" />
      <path d={path} fill="none" stroke={accent} strokeWidth="7" />
    </svg>
    {!(!tall && !story) && <Media id={`${id}/wordmark`} src="/logos/sac-logo.png"
      alt="Steep & Cheap" style={{ position: 'absolute', left: story ? 46 : 52,
        top: story ? 498 : 307, width: 245, height: 105, objectFit: 'contain', zIndex: 4 }} />}
    <Editable id={`${id}/urgency`} style={copyStyle(left + 8, top, urgencySize,
      { color: accent, letterSpacing: 5, whiteSpace: 'nowrap' })}>{urgency}</Editable>
    {lead && <Editable id={`${id}/lead`} style={copyStyle(left, top + 70, 150,
      { letterSpacing: -2 })}>{lead}</Editable>}
    <Editable id={`${id}/offer`} style={copyStyle(left, asset.scope.topic ? top + 95 : top + 190,
      asset.scope.topic ? Math.max(55, Math.floor(760 / (offer.length * .58))) : 150,
      { letterSpacing: -2, maxWidth: 800, whiteSpace: asset.scope.topic ? 'normal' : 'nowrap' })}>{offer}</Editable>
    <Editable id={`${id}/code`} style={copyStyle(left, top + 316, codeSize,
      { fontWeight: 400, whiteSpace: 'nowrap', letterSpacing: -1 })}>{code}</Editable>
    <Editable id={`${id}/cta`} style={{ ...copyStyle(left + 8, top + 465, 58,
      { color: '#fff', fontWeight: 700, textAlign: 'center' }),
      background: ink, width: 435, height: 111, borderRadius: 28,
      display: 'grid', placeItems: 'center' }}>{asset.copy.cta || 'Shop Now'}</Editable>
    {!tall && !story && <Media id={`${id}/wordmark`} src="/logos/sac-logo.png"
      alt="Steep & Cheap" style={{ position: 'absolute', left: 66, top: 920,
        width: 190, height: 88, objectFit: 'contain', zIndex: 4 }} />}
    {story && <div style={{ position: 'absolute', left: 82, top: 1490, width: 920,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 4 }}>
      {['bump-tnf.svg','bump-patagonia.svg','bump-mhw.svg'].map((file, n) =>
        <BrandMark key={file} id={`${id}/brand/${n}`} name={asset.media.brands?.[n]}
          fallback={`/reference/${file}`}
          style={{ width: [160,235,160][n], height: 86, objectFit: 'contain' }} />)}
      <Editable id={`${id}/more`} style={copyStyle(0, 0, 42,
        { position: 'relative', fontWeight: 700 })}>&amp; More</Editable>
    </div>}
  </div>;
}
