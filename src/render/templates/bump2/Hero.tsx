/** Bump 2 hero desktop, both phases: a cream paper ground, the eyebrow
 *  ("4 DAYS ONLY" / "ENDS TODAY"), "EXTRA 20% OFF", the code line, a dark
 *  Shop Now button, and a four-photo collage below. From the Bump 2 board's
 *  own frames (page 538:15528): launch 569:10, ends today 582:2, compiled to
 *  src/data/figma/bump2-hero(-ends).json (npm run figma:pull). Every box,
 *  size, colour and crop comes from there. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from '../../../model/textContracts';
import { layerOf, boxOf, anchorOf, typeOf, cropOf, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import { Fill } from '../../figma/Fill';
import launch from '../../../data/figma/bump2-hero.json';
import ends from '../../../data/figma/bump2-hero-ends.json';

/** Which Figma layer each editable layer is, by the part of its id after the
 *  asset's, per phase. The Bump position check (localhost:5182) holds the
 *  render to these. */
export const BUMP2_HERO_FIGMA = {
  launch: { urgency: '538:18831', offer: '538:18827', 'cta/mark': '538:18829', cta: '538:18830',
    'image-1': '538:18822', 'image-2': '538:18823', 'image-3': '538:18824', 'image-4': '538:18825' },
  ends: { urgency: '538:18844', offer: '538:18840', 'cta/mark': '538:18842', cta: '538:18843',
    'image-1': '538:18835', 'image-2': '538:18836', 'image-3': '538:18837', 'image-4': '538:18838' },
} as const;
/** The paper ground and the code line, per phase. */
const PARTS = {
  launch: { layout: launch, ground: '538:18820', code: '538:18828', eyebrow: '4 DAYS ONLY' },
  ends: { layout: ends, ground: '538:18833', code: '538:18841', eyebrow: 'ENDS TODAY' },
} as const;

/** Behaviour decided here:
 *  - Every run's contract is its board layer's (boardFit): the board's copy is
 *    the ideal count, longer copy contracts.
 *  - The code line is "CODE" plus the bold code word when the brief has a
 *    code, else its qualifier as one run.
 *  - The button grows with a longer label from the board's size.
 *  - The copy is laid out as the board has it; the collage's photos each
 *    swap and reframe on their own, each placed within its own tile (slot). */
export function Bump2Hero({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();
  const phase = /ends/i.test(asset.scope.phase ?? '') ? 'ends' : 'launch';
  const P = PARTS[phase], layout = P.layout as unknown as FigmaLayout, map = BUMP2_HERO_FIGMA[phase];
  const L = (l: string) => layerOf(layout, l);
  const id = asset.id;
  const fit = (part: keyof typeof map, text: string, key: string) =>
    boardFit(textOf(edits, `${id}/${part}`, text), key, L(map[part]));

  const urgency = asset.copy.marquee || asset.copy.eyebrow || P.eyebrow;
  const offer = asset.copy.offer || 'EXTRA 20% OFF';
  const cta = asset.copy.cta || 'Shop Now';
  const urgencyFit = fit('urgency', urgency, 'hero.urgency');
  const offerFit = fit('offer', offer, 'hero.offer');
  const ctaFit = fit('cta', cta, 'hero.cta');
  // Split so the code word can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only, so the two need their own ids.
  const codeLabel = asset.copy.code ? textOf(edits, `${id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code ? textOf(edits, `${id}/code/value`, asset.copy.code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || 'CODE CHILLY20');
  const codeFit = boardFit(`${codeLabel ?? ''}${codeWord}`, 'hero.code', L(P.code));
  const button = L(map['cta/mark']), label = L(map.cta);

  return <FigmaFrame id={id} size={asset.size} layout={layout} zone={photoFor('hike', 0)} centred
    ground={<Fill layer={L(P.ground)} layout={layout} style={boxOf(L(P.ground))} />}
    fixed={([1, 2, 3, 4] as const).map(n => {
      const l = L(map[`image-${n}`]), img = l.images?.[0] && layout.assets?.[l.images[0].ref];
      const crop = img && l.crop ? cropOf(l.crop, [l.w, l.h], [img.w, img.h]) : undefined;
      return <Picture key={n} id={`${id}/image-${n}`} zone={photoFor('hike', n)} initialSrc={img?.src} slot
        focus={crop?.focus} initialScale={crop?.initialScale} initialRotate={crop?.rotate}
        style={{ ...boxOf(l), borderRadius: l.radius, overflow: 'hidden', background: l.fill }} />;
    })}>
    <div style={anchorOf(L(map.urgency))}>
      <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={typeOf(L(map.urgency), urgencyFit.fontSize)}>{urgency}</Editable>
    </div>
    <div style={anchorOf(L(map.offer))}>
      <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(L(map.offer), offerFit.fontSize)}>{offer}</Editable>
    </div>
    <div style={anchorOf(L(P.code))}>
      <div style={{ ...typeOf(L(P.code), codeFit.fontSize), pointerEvents: 'none' }}>
        {codeLabel !== undefined ? <>
          <Editable as="span" id={`${id}/code/label`} fit={codeFit.contract}>{codeLabel}</Editable>
          <Editable as="span" id={`${id}/code/value`} fit={codeFit.contract} style={{ fontWeight: 800 }}>{codeWord}</Editable>
        </> : <Editable as="span" id={`${id}/code`} fit={codeFit.contract}>{codeWord}</Editable>}
      </div>
    </div>
    <div style={{ ...boxOf(button), display: 'flex', pointerEvents: 'none' }}>
      <div style={{ position: 'relative', flex: 'none', minWidth: button.w, height: button.h, boxSizing: 'border-box',
        padding: `0 ${(button.w - label.w) / 2}px`, display: 'grid', placeItems: 'center' }}>
        <Media id={`${id}/cta/mark`} src="/graphics/pill-soft.svg" fill={button.fill} alt="Button"
          title="Click to recolour, resize or swap the button shape from the library"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <Editable id={`${id}/cta`} fit={ctaFit.contract} style={{ ...typeOf(label, ctaFit.fontSize), position: 'relative' }}>{cta}</Editable>
      </div>
    </div>
  </FigmaFrame>;
}
