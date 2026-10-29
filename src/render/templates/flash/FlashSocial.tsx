/** SC26_0021 paid social: the board's full-bleed photo, right-hand copy
 * column (a centred one on 9x16), wordmark and brand rail -- three distinct
 * Figma frames, one per ratio, compiled to src/data/figma/flash-social-<ratio>.json
 * (npm run figma:pull). Every box, size, colour and crop comes from those. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable, Ground } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { BrandMark } from '../BrandMark';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from './textContracts';
import { layerOf, boxOf, anchorOf, typeOf, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import social1x1 from '../../../data/figma/flash-social-1x1.json';
import social4x5 from '../../../data/figma/flash-social-4x5.json';
import social9x16 from '../../../data/figma/flash-social-9x16.json';

/** Which Figma layer (src/data/figma/flash-social-<ratio>.json) each
 *  editable layer is, by the part of its id after `<asset>/flash-social`.
 *  The position check holds the render to these. */
export const FLASH_SOCIAL_FIGMA = {
  '1x1': { wordmark: '248:711543', 'urgency/mark': '248:711539', urgency: '248:711542',
    'lead/bolt-left': '248:711531', lead: '248:711530', 'lead/bolt-right': '248:711535',
    prefix: '248:711526', offer: '248:711524', 'strip/fill': '248:711581',
    'brand/0': '248:711586', 'brand/1': '248:711584', 'brand/2': '248:711585', 'brand/3': '248:711583',
    more: '248:711587' },
  '4x5': { wordmark: '248:711611', 'urgency/mark': '248:711607', urgency: '248:711610',
    'lead/bolt-left': '248:711599', lead: '248:711598', 'lead/bolt-right': '248:711603',
    prefix: '248:711594', offer: '248:711592', 'strip/fill': '248:711649',
    'brand/0': '248:711654', 'brand/1': '248:711652', 'brand/2': '248:711653', 'brand/3': '248:711651',
    more: '248:711655' },
  '9x16': { wordmark: '248:711679', 'urgency/mark': '248:711675', urgency: '248:711678',
    'lead/bolt-left': '248:711667', lead: '248:711666', 'lead/bolt-right': '248:711671',
    prefix: '248:711662', offer: '248:711660',
    'brand/0': '248:711720', 'brand/1': '248:711718', 'brand/2': '248:711719', 'brand/3': '248:711717',
    more: '248:711721' },
} as const;

/** Per ratio: the frame, its title and offer row groups, the brush's own
 *  vector (its colour), and whether the column is centred (9x16, with a
 *  brand row under the copy instead of a rail). */
const RATIOS = {
  '1x1': { layout: social1x1, titleRow: '248:711527', offerRow: '248:711521', ink: '248:711541', centred: false },
  '4x5': { layout: social4x5, titleRow: '248:711595', offerRow: '248:711589', ink: '248:711609', centred: false },
  '9x16': { layout: social9x16, titleRow: '248:711663', offerRow: '248:711657', ink: '248:711677', centred: true },
} as const;
const BRANDS = ['la-sportiva', 'outdoor-research', 'mountain-hardwear', 'osprey'] as const;

/** The bolt flanking the title: the library's own "bolt" mark. */
function Bolt({ id, width, height }: { id: string; width: number; height: number }) {
  return <Media id={id} src="/graphics/bolt.svg" alt="" style={{ width, height, display: 'block', flex: 'none' }} />;
}

/** Behaviour decided here, not in Figma:
 *  - The copy column ends on the board's right edge (1x1, 4x5) or is
 *    centred (9x16): rows grow left, or both ways.
 *  - Every run's contract is its board layer's (boardFit): the board's copy
 *    is the ideal count, longer copy contracts; the brush stays its size.
 *  - A code line (no layer on the board) sits under the offer, on the same
 *    edge; on 9x16 the brand row moves down under it. The board has no
 *    dates line, so neither does this.
 *  FigmaFrame supplies the photo at Figma's crop and smart placement. */
export function FlashSocial({ asset }: { asset: SheetAsset }) {
  const [w, h] = asset.size;
  const { edits } = useEdits();
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  // The format name is the source of truth; aspect ratio is only a fallback
  // for a custom size the brief asked for outside these three.
  const story = asset.format === 'paid-social-9x16' || (!/^paid-social-/.test(asset.format) && h / w > 1.6);
  const tall = asset.format === 'paid-social-4x5'
    || (!/^paid-social-/.test(asset.format) && !story && h / w > 1.15);
  const ratio = story ? '9x16' : tall ? '4x5' : '1x1';
  const spec = RATIOS[ratio], layout = spec.layout as unknown as FigmaLayout;
  const map = FLASH_SOCIAL_FIGMA[ratio] as Record<string, string>;
  const L = (part: string) => layerOf(layout, map[part] ?? part);
  const [fw] = layout.size;
  const id = `${asset.id}/flash-social`;

  // The column's edge: right-aligned rows end where the board's offer row ends.
  const offerRow = L(spec.offerRow), edge = offerRow.x + offerRow.w;
  const row = (group: string): React.CSSProperties => spec.centred
    ? { ...anchorOf(L(group), 'CENTER'), alignItems: 'flex-start' }
    : { ...anchorOf(L(group), 'RIGHT'), left: 0, width: edge, alignItems: 'flex-start' };

  const brush = L('urgency/mark'), u = L('urgency');
  const urgency = asset.copy.marquee || asset.copy.eyebrow || '3 DAYS ONLY';
  const urgencyFit = boardFit(textOf(edits, `${id}/urgency`, urgency), 'hero.urgency', u);

  const title = asset.copy.title || 'SALE';
  const titleFit = boardFit(textOf(edits, `${id}/lead`, title), 'hero.title', L('lead'));
  const titleSize = titleFit.fontSize ?? L('lead').text!.size;
  const k = titleSize / L('lead').text!.size;
  const boltGap = (L('lead').x - L('lead/bolt-left').x - L('lead/bolt-left').w) * k;

  const offerText = asset.scope.topic || asset.copy.offer || '75% OFF';
  const offerFit = boardFit(textOf(edits, `${id}/offer`, offerText), 'hero.offer', L('offer'));
  const prefixGap = L('offer').x - L('prefix').x - L('prefix').w;
  const offerBottom = L('offer').y + L('offer').h * (offerFit.fontSize ?? L('offer').text!.size) / L('offer').text!.size;

  const code = asset.copy.code;
  const codeSize = titleSize * .9, codeTop = offerBottom + 30;
  const codeShift = code ? codeSize * 0.78 + 30 : 0;

  const rail = !spec.centred ? L('strip/fill') : null;
  const texture = rail?.images?.[0] && layout.assets?.[rail.images[0].ref];
  const brandShift = spec.centred ? codeShift : 0;
  const logos = <>
    {BRANDS.map((brand, n) => <BrandMark key={brand} id={`${id}/brand/${n}`} name={asset.media.brands?.[n]}
      fallback={`/logos/brand-${brand}.svg`}
      style={{ ...boxOf(L(`brand/${n}`)), top: L(`brand/${n}`).y + brandShift - (rail?.y ?? 0),
        left: L(`brand/${n}`).x, objectFit: 'contain' }} />)}
    <Editable id={`${id}/more`} style={{ ...typeOf(L('more')), position: 'absolute', left: L('more').x,
      top: L('more').y + brandShift - (rail?.y ?? 0) }}>&amp; MORE</Editable>
  </>;
  const photo = layout.frame.images?.[0] && layout.assets?.[layout.frame.images[0].ref];

  return <FigmaFrame id={id} size={[w, h]} layout={layout} zone={zone} background="#5b6642"
    photo={photo ? { id: `${id}/photo`, src: photo.src, size: [photo.w, photo.h] } : undefined}
    fixed={<>
      <Media id={`${id}/wordmark`} src="/logos/SC/v1/Board/SC26_0021 Flash Sale Apr 4/Group 2904.svg"
        alt="Steep & Cheap, powered by Backcountry" style={{ ...boxOf(L('wordmark')), objectFit: 'contain' }} />
      {rail
        ? <Ground id={`${id}/strip/fill`} style={{ ...boxOf(rail), background: rail.fill, overflow: 'hidden' }}>
            {texture && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `url(${texture.src})`,
              backgroundSize: 'cover', mixBlendMode: 'screen', opacity: rail.images![0].opacity }} />}
            {logos}
          </Ground>
        : logos}
    </>}>
    <Media id={`${id}/urgency/mark`} src="/graphics/brush-stroke.svg" alt="Green brush" fill={L(spec.ink).fill}
      title="Click to recolour, resize or swap the brush mark from the library" style={boxOf(brush)} />
    <div style={{ ...boxOf(brush), display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      {/* The board sets the text a hair off the brush's centre; kept. */}
      <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={{ ...typeOf(u, urgencyFit.fontSize), position: 'relative',
        left: u.x + u.w / 2 - brush.x - brush.w / 2 }}>{urgency}</Editable>
    </div>

    <div style={{ ...row(spec.titleRow), alignItems: 'center', height: L('lead').h }}>
      {asset.scope.topic
        ? (() => { const fit = boardFit(textOf(edits, `${id}/lead`, asset.copy.eyebrow || ''), 'hero.title', L('lead'));
          return <Editable id={`${id}/lead`} fit={fit.contract} style={typeOf(L('lead'), fit.fontSize)}>{asset.copy.eyebrow || ''}</Editable>; })()
        : <>
          <Bolt id={`${id}/lead/bolt-left`} width={L('lead/bolt-left').w * k} height={L('lead/bolt-left').h * k} />
          <Editable id={`${id}/lead`} fit={titleFit.contract}
            style={{ ...typeOf(L('lead'), titleSize), margin: `0 ${boltGap}px` }}>{title}</Editable>
          <Bolt id={`${id}/lead/bolt-right`} width={L('lead/bolt-right').w * k} height={L('lead/bolt-right').h * k} />
        </>}
    </div>

    <div style={row(spec.offerRow)}>
      {!asset.scope.topic && <Editable id={`${id}/prefix`} style={{ ...typeOf(L('prefix')), whiteSpace: 'pre',
        marginRight: prefixGap }}>{/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
      <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(L('offer'), offerFit.fontSize)}>{offerText}</Editable>
    </div>

    {/* The label "CODE" stays regular weight; only the code word itself is
        bold -- Editable is plain-string-only, so each needs its own id. */}
    {code && <div style={{ position: 'absolute', top: codeTop, whiteSpace: 'nowrap', color: L('offer').fill,
      fontFamily: typeOf(L('offer')).fontFamily, fontSize: codeSize, lineHeight: 1,
      textBoxTrim: 'trim-both', textBoxEdge: 'cap alphabetic',
      ...spec.centred ? { left: 0, width: fw, textAlign: 'center' } : { left: 0, width: edge, textAlign: 'right' } } as React.CSSProperties}>
      <Editable as="span" id={`${id}/code/label`} style={{ fontWeight: 400 }}>{'CODE '}</Editable>
      <Editable as="span" id={`${id}/code/value`} style={{ fontWeight: 800 }}>{code}</Editable>
    </div>}
  </FigmaFrame>;
}
