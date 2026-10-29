/** Bump 2 paid social, every ratio: the cream ground, the photo in the
 *  board's stepped window with its green outline, the copy in the window's
 *  cut-out (eyebrow, EXTRA / 20% OFF, the code line, Shop Now), the
 *  steep&cheap wordmark and (9x16) the brand row. Each ratio is its own frame
 *  on the Bump 2 board (569:7 / 569:8 / 569:9), compiled to
 *  src/data/figma/bump2-social-<ratio>.json (npm run figma:pull); the window
 *  outlines are drawn from it by scripts/figma-marks.ts. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { Picture } from '../../../edit/Picture';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { useEdits, textOf } from '../../../edit/store';
import { boardFit } from '../../../model/textContracts';
import { BrandMark } from '../BrandMark';
import { layerOf, boxOf, anchorOf, typeOf, cropOf, brandSlot, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import s1x1 from '../../../data/figma/bump2-social-1x1.json';
import s4x5 from '../../../data/figma/bump2-social-4x5.json';
import s9x16 from '../../../data/figma/bump2-social-9x16.json';

/** Which Figma layer each editable layer is, by the part of its id after the
 *  asset's, per ratio. The Bump position check (localhost:5182) holds the
 *  render to these. */
export const BUMP2_SOCIAL_FIGMA = {
  '1x1': { photo: '538:18091', urgency: '538:18094', 'cta/mark': '538:18097', cta: '538:18098',
    wordmark: '538:18100', 'wordmark/caption': '538:18124' },
  '4x5': { photo: '538:18138', urgency: '538:18141', 'cta/mark': '538:18144', cta: '538:18145',
    wordmark: '538:18147', 'wordmark/caption': '538:18171' },
  '9x16': { photo: '538:18191', urgency: '538:18194', 'cta/mark': '538:18197', cta: '538:18198',
    wordmark: '538:18200', 'wordmark/caption': '538:18224', 'brand/0': '538:18186', 'brand/1': '538:18188',
    'brand/2': '538:18187', more: '538:18189' },
} as const;
/** The two-line headline and the code line, per ratio. */
const PARTS = {
  '1x1': { layout: s1x1, headline: '538:18095', code: '538:18096' },
  '4x5': { layout: s4x5, headline: '538:18142', code: '538:18143' },
  '9x16': { layout: s9x16, headline: '538:18195', code: '538:18196' },
} as const;
type Ratio = keyof typeof PARTS;
const BOARD_BRANDS = ['The North Face', 'Patagonia', 'Mountain Hardwear'];
const PLACEHOLDER_BRANDS = ['the-north-face', 'patagonia', 'mountain-hardwear'];

/** Behaviour decided here:
 *  - The copy stays in the window's cut-out, where the board puts it
 *    (`centred`: smart placement frames the photo, never moves the copy).
 *    The photo is a slot: placement keeps faces inside the window's shape.
 *  - The board's own photo keeps its turn in the window; a swapped one starts upright.
 *  - Every run's contract is its board layer's (boardFit). The headline is
 *    two runs (EXTRA, then 20% OFF on the board's next line), each fitted;
 *    the code line is "CODE" plus the bold word, or the qualifier.
 *  - Shop Now grows with a longer label; brands fill the board's slots. */
export function Bump2Social({ asset, ratio }: { asset: SheetAsset; ratio: Ratio }) {
  const { edits } = useEdits();
  const P = PARTS[ratio], layout = P.layout as unknown as FigmaLayout;
  const map = BUMP2_SOCIAL_FIGMA[ratio] as Record<string, string>;
  const L = (l: string) => layerOf(layout, map[l] ?? l);
  const id = asset.id;
  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);

  const window = L('photo'), stroke = window.stroke!;
  const img = window.images?.[0] && layout.assets?.[window.images[0].ref];
  const crop = img && window.crop ? cropOf(window.crop, [window.w, window.h], [img.w, img.h]) : undefined;
  const pad = stroke.align === 'CENTER' ? stroke.weight / 2 : stroke.align === 'OUTSIDE' ? stroke.weight : 0;

  const urgency = asset.copy.marquee || asset.copy.eyebrow || '4 DAYS ONLY';
  const urgencyFit = boardFit(textOf(edits, `${id}/urgency`, urgency), 'hero.urgency', L('urgency'));
  // The headline is one board run of two lines; each line is its own field.
  const head = L(P.headline), lineH = head.text!.lineHeight;
  const lead = asset.copy.lead || 'EXTRA', offer = asset.copy.offer || '20% OFF';
  const leadFit = boardFit(textOf(edits, `${id}/lead`, lead), 'hero.title', head);
  const offerFit = boardFit(textOf(edits, `${id}/offer`, offer), 'hero.offer', head);
  const codeLabel = asset.copy.code ? textOf(edits, `${id}/code/label`, 'CODE ') : undefined;
  const codeWord = asset.copy.code ? textOf(edits, `${id}/code/value`, asset.copy.code)
    : textOf(edits, `${id}/code`, asset.copy.qualifier || 'CODE CHILLY20');
  const codeFit = boardFit(`${codeLabel ?? ''}${codeWord}`, 'hero.code', L(P.code));
  const cta = asset.copy.cta || 'Shop Now';
  const ctaFit = boardFit(textOf(edits, `${id}/cta`, cta), 'hero.cta', L('cta'));
  const button = L('cta/mark'), label = L('cta');

  const brands = asset.media.brands?.length ? asset.media.brands : PLACEHOLDER_BRANDS;
  const slots = map['brand/0'] ? [L('brand/0'), L('brand/1'), L('brand/2'), L('more')] : [];

  return <FigmaFrame id={id} size={asset.size} layout={layout} zone={zone} centred
    fixed={<>
      <Picture id={`${id}/photo`} zone={zone} initialSrc={img?.src} slot
        focus={crop?.focus} initialScale={crop?.initialScale} initialRotate={crop?.rotate}
        style={{ ...boxOf(window), overflow: 'hidden', clipPath: `path("${window.path}")` }} />
      {/* The window's green outline: the board's own stroke, a recolourable library mark. */}
      <Media id={`${id}/window/mark`} src={`/graphics/bump2-window-${ratio}.svg`} alt="Window outline"
        title="Click to recolour the window outline"
        style={{ position: 'absolute', left: window.x - pad, top: window.y - pad, width: window.w + 2 * pad,
          height: window.h + 2 * pad, pointerEvents: 'none' }} />
      <Media id={`${id}/wordmark`} src="/logos/sac-logo-dark.svg" alt="Steep & Cheap"
        style={{ ...boxOf(L('wordmark')), objectFit: 'contain' }} />
      <Media id={`${id}/wordmark/caption`} src="/logos/sac-logo-dark-caption.svg" alt="Powered by Backcountry"
        style={{ ...boxOf(L('wordmark/caption')), objectFit: 'contain' }} />
      {slots.length > 0 && <>
        {brands.slice(0, 3).map((brand, n) => {
          const slot = brandSlot(slots, n, brand, BOARD_BRANDS);
          return <BrandMark key={`${brand}-${n}`} id={`${id}/brand/${n}`} name={brand}
            fallback={`/logos/brand-${PLACEHOLDER_BRANDS[n % PLACEHOLDER_BRANDS.length]}.svg`}
            style={{ position: 'absolute', left: slot.x, top: slot.y, width: slot.w, height: slot.h, objectFit: 'contain',
              filter: 'brightness(0.2)' }} />;
        })}
        <div style={anchorOf(L('more'))}>
          <Editable id={`${id}/more`} fit={boardFit(textOf(edits, `${id}/more`, '& More'), 'hero.more', L('more')).contract}
            style={typeOf(L('more'))}>& More</Editable>
        </div>
      </>}
    </>}>
    <div style={anchorOf(L('urgency'))}>
      <Editable id={`${id}/urgency`} fit={urgencyFit.contract} style={typeOf(L('urgency'), urgencyFit.fontSize)}>{urgency}</Editable>
    </div>
    <div style={anchorOf(head)}>
      <Editable id={`${id}/lead`} fit={leadFit.contract} style={typeOf(head, leadFit.fontSize)}>{lead}</Editable>
    </div>
    <div style={{ ...anchorOf(head), top: head.y + lineH }}>
      <Editable id={`${id}/offer`} fit={offerFit.contract} style={typeOf(head, offerFit.fontSize)}>{offer}</Editable>
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
        <Media id={`${id}/cta/mark`} src="/graphics/pill.svg" fill={button.fill} alt="Button"
          title="Click to recolour, resize or swap the button shape from the library"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
        <Editable id={`${id}/cta`} fit={ctaFit.contract} style={{ ...typeOf(label, ctaFit.fontSize), position: 'relative' }}>{cta}</Editable>
      </div>
    </div>
  </FigmaFrame>;
}
