/** Bump hero desktop: the board's full-bleed photo
 *  and a right-hand lockup (urgency brush, EXTRA, 20% OFF, code, CTA).
 *  Every box, size, colour and crop comes from SC26_0058 Wk33 Bump's own
 *  hero-desktop frame (569:15), compiled to src/data/figma/bump-hero.json
 *  (npm run figma:pull); only behaviour is decided here.
 *
 *  Template ID: sc26_0060 (Bump) */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from '../../../model/textContracts';
import { layerOf, boxOf, anchorOf, typeOf, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import bumpHero from '../../../data/figma/bump-hero.json';

const LAYOUT = bumpHero as unknown as FigmaLayout;

/** Which Figma layer (src/data/figma/bump-hero.json, SC26_0058 Wk33 Bump's
 *  hero desktop 569:15) each editable layer is, by the part of its id after
 *  the asset's. The Bump position check (localhost:5182) holds the render to these. */
export const BUMP_HERO_FIGMA = {
  'urgency/mark': '538:21717', urgency: '538:21719', extra: '538:21716', offer: '538:21714',
  'cta/mark': '538:21708', cta: '538:21709',
} as const;
/** Layers read for geometry that aren't one editable layer each: the code
 *  line (a label and a word on one board run), the photo frame, the lockup
 *  group (its glow). */
const PARTS = { ...BUMP_HERO_FIGMA, code: '538:21715', photo: '538:21705', lockup: '538:21710' } as const;

const L = (part: keyof typeof PARTS) => layerOf(LAYOUT, PARTS[part]);

/** Behaviour decided here:
 *  - Every run's contract is its board layer's (boardFit): the board's copy
 *    is the ideal count, longer copy contracts. The brush and button stay
 *    the board's size.
 *  - EXTRA, 20% OFF, the code line and the CTA each end on their own right
 *    edge on the board, so they grow left; the urgency keeps its left inset
 *    in the brush.
 *  - The code line is "CODE" plus the bold code word when the brief has a
 *    code; otherwise its qualifier, as one run.
 *  - The lockup's soft glow is drawn as on the board. The board's dark
 *    gradient over the photo is not: it fought other photos.
 *  FigmaFrame supplies the photo at Figma's crop and smart placement. */
export function BumpHero({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();
  const id = asset.id;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  const photo = L('photo'), img = photo.images?.[0] && LAYOUT.assets?.[photo.images[0].ref];

  const fit = (part: keyof typeof PARTS, text: string, key: string) =>
    boardFit(textOf(edits, `${id}/${part}`, text), key, L(part));
  const urgency = asset.copy.marquee || '3 DAYS ONLY';
  const extra = asset.copy.lead || 'EXTRA', offer = asset.copy.offer || '20% OFF';
  const cta = asset.copy.cta || 'Shop Now';
  const urgencyFit = fit('urgency', urgency, 'hero.urgency');
  const extraFit = fit('extra', extra, 'hero.title');
  const offerFit = fit('offer', offer, 'hero.offer');
  const ctaFit = fit('cta', cta, 'hero.cta');
  // Split so the code word can be bold without the label "CODE" also being
  // bold -- Editable is plain-string-only, so the two need their own ids.
  // Only when a real code exists: the qualifier fallback is free text.
  const codeLabel = asset.copy.code ? textOf(edits, `${id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code ? textOf(edits, `${id}/code/value`, asset.copy.code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || 'CODE AUTUMN20');
  const codeFit = boardFit(`${codeLabel ?? ''}${codeWord}`, 'hero.code', L('code'));

  // A run that ends on its own board right edge: its box runs from the
  // frame's left edge to there, content against the right.
  const right = (part: keyof typeof PARTS): React.CSSProperties =>
    ({ ...anchorOf(L(part), 'RIGHT'), left: 0, width: L(part).x + L(part).w });
  const glow = L('lockup').shadow;
  const button = L('cta/mark'), label = L('cta');

  return <FigmaFrame id={id} size={asset.size} layout={LAYOUT} zone={zone} background="#FFFFFF"
    photo={img ? { id: `${id}/photo`, src: img.src, size: [img.w, img.h], layer: photo } : undefined}>
    <Media id={`${id}/urgency/mark`} src="/graphics/brush-strip.svg" alt="Badge" style={boxOf(L('urgency/mark'))} />
    <div style={anchorOf(L('urgency'))}>
      <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={typeOf(L('urgency'), urgencyFit.fontSize)}>{urgency}</Editable>
    </div>

    {/* The board's soft glow behind EXTRA / 20% OFF / the code line. */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: glow
      ? `drop-shadow(${glow.x}px ${glow.y}px ${glow.blur / 2}px ${glow.color})` : undefined }}>
      <div style={right('extra')}>
        <Editable id={`${id}/extra`} fit={extraFit.contract} style={typeOf(L('extra'), extraFit.fontSize)}>{extra}</Editable>
      </div>
      <div style={right('offer')}>
        <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(L('offer'), offerFit.fontSize)}>{offer}</Editable>
      </div>
      {/* The two runs sit in one block so the line trims to cap height as
          one line; as flex items each kept the board's 267px line box. */}
      <div style={right('code')}>
        <div data-code-line style={{ ...typeOf(L('code'), codeFit.fontSize), whiteSpace: 'nowrap' }}>
          {codeLabel !== undefined ? <>
            <Editable as="span" id={`${id}/code/label`} fit={codeFit.contract}>{codeLabel}</Editable>
            <Editable as="span" id={`${id}/code/value`} fit={codeFit.contract} style={{ fontWeight: 800 }}>{codeWord}</Editable>
          </> : <Editable as="span" id={`${id}/code`} fit={codeFit.contract}>{codeWord}</Editable>}
        </div>
      </div>
    </div>

    <Media id={`${id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
      title="Click to recolour, resize or swap the button shape from the library" style={boxOf(button)} />
    <div style={anchorOf(label)}>
      <Editable id={`${id}/cta`} fit={ctaFit.contract} style={typeOf(label, ctaFit.fontSize)}>{cta}</Editable>
    </div>
  </FigmaFrame>;
}
