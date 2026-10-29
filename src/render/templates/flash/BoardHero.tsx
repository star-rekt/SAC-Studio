/** Desktop hero compositions measured from the three linked Figma boards.
 * Typography and each photograph are separate edit targets; no hero is a
 * flattened screenshot. A second requested hero reuses the board's layout
 * while its brief copy (or a designer's edits) changes independently. */
import type { SheetAsset } from '../../../sheet/types';
import { Editable } from '../../../edit/Editable';
import { Media } from '../../../edit/Media';
import { useEdits, textOf } from '../../../edit/store';
import { ZONE_LIST, photoFor } from '../../../model/compose';
import { boardFit } from './textContracts';
import { layerOf, boxOf, anchorOf, typeOf, type FigmaLayout } from '../../figma/layout';
import { FigmaFrame } from '../../figma/FigmaFrame';
import flashHero from '../../../data/figma/flash-hero.json';

const LAYOUT = flashHero as unknown as FigmaLayout;

/** The bolt flanking Flash's title: the library's own "bolt" mark, not a
 *  text-glyph stand-in, at the size Figma draws the board's own bolt. */
function Bolt({ id, width, height }: { id: string; width: number; height: number }) {
  return <Media id={id} src="/graphics/bolt.svg" alt="" style={{ width, height, display: 'block', flex: 'none' }} />;
}

/** Which Figma layer (src/data/figma/flash-hero.json) each editable layer
 *  is, by the part of its id after the asset's. The position check
 *  (dev/bump-preview/positions.html) holds the render to these. */
export const FLASH_HERO_FIGMA = {
  'urgency/mark': '248:711488', urgency: '248:711491',
  'lead/bolt-left': '248:711480', lead: '248:711479', 'lead/bolt-right': '248:711484',
  prefix: '248:711471', offer: '248:711469', qualifier: '248:711472',
  'cta/mark': '248:711474', cta: '248:711475',
} as const;

const L = (part: keyof typeof FLASH_HERO_FIGMA) => layerOf(LAYOUT, FLASH_HERO_FIGMA[part]);
/** The design's own photo, and its pixel size for working out Figma's crop. */
const PHOTO = '/reference/flash-hero-photo.png', PHOTO_SIZE: [number, number] = [3179, 2000];

/** Every box, size, colour and crop comes from the board's own Figma frame
 *  (src/data/figma/flash-hero.json, compiled by `npm run figma:pull`); only
 *  behaviour is decided here:
 *   - Fitted runs shrink from Figma's size to fit their room (fitText).
 *   - The column shares one right edge (brush, title row, offer row,
 *     qualifier, CTA all end at x=1346), so rows grow to the left.
 *   - The urgency line stays centred in its brush; the CTA in its button.
 *   - The qualifier line shows a code or a category line, never "No code
 *     needed". With no qualifier line, the button moves up to keep the board's gap
 *     under the offer instead of leaving the qualifier's slot empty.
 *  The board has no dates line (its dates layer is hidden), so neither does this.
 *  FigmaFrame supplies the photo at Figma's crop and smart placement. */
export function Flash({ asset }: { asset: SheetAsset }) {
  const { edits } = useEdits();
  // Every run's contract is its board layer's: the board's copy is the ideal count.
  const fitted = (part: keyof typeof FLASH_HERO_FIGMA, text: string, role: Parameters<typeof boardFit>[1]) =>
    boardFit(textOf(edits, `${asset.id}/${part}`, text), role, L(part));

  const urgency = asset.copy.marquee || asset.copy.eyebrow
    || (/end/i.test(asset.scope.phase ?? '') ? 'ENDS TODAY' : '3 DAYS ONLY');
  // The brush is a fixed graphic with nothing to clip longer text: shrink to it.
  const urgencyFit = fitted('urgency', urgency, 'hero.urgency');

  const title = asset.copy.title || 'SALE';
  const titleFit = asset.scope.topic ? undefined
    : fitted('lead', title, 'hero.title');
  const titleSize = titleFit?.fontSize ?? L('lead').text!.size;
  // The bolts' gaps and size travel with the title's fitted size.
  const k = titleSize / L('lead').text!.size;
  const boltGap = (L('lead').x - L('lead/bolt-left').x - L('lead/bolt-left').w) * k;

  const offerText = asset.scope.topic || asset.copy.offer || '70% OFF';
  const offerFit = fitted('offer', offerText, 'hero.offer');
  const prefixGap = L('offer').x - L('prefix').x - L('prefix').w;

  // Only a code or a category line earns this slot; the brief's "No code
  // needed" fallback does not -- without either, the CTA moves up instead.
  const qualifier = asset.copy.qualifier?.trim() ?? '';
  const qualifierFit = qualifier && (asset.copy.code || !/\bno code\b/i.test(qualifier))
    ? fitted('qualifier', qualifier, 'hero.qualifier') : undefined;
  const hasQualifier = !!qualifierFit?.text;
  const cta = textOf(edits, `${asset.id}/cta`, asset.copy.cta || 'Shop Now');
  const ctaFit = fitted('cta', cta, 'hero.cta');
  // The button's gap to the line above it, from the board; without a
  // qualifier, the line above it is the offer (its fitted height).
  const ctaGap = L('cta/mark').y - L('qualifier').y - L('qualifier').h;
  const offerBottom = L('offer').y + L('offer').h * (offerFit.fontSize ?? L('offer').text!.size) / L('offer').text!.size;
  const lift = hasQualifier ? 0 : L('cta/mark').y - offerBottom - ctaGap;

  // A row that ends on the column's right edge: its box runs from the
  // frame's left edge to there, and its content sits against the right.
  const right = (part: keyof typeof FLASH_HERO_FIGMA): React.CSSProperties => ({ ...anchorOf(L(part), 'RIGHT'),
    left: 0, width: L('qualifier').x + L('qualifier').w });

  const zone = ZONE_LIST.find(z => z.id === asset.media.photo) ?? photoFor('hike', 0);
  return <FigmaFrame id={asset.id} size={asset.size} layout={LAYOUT} zone={zone} background="#565831"
    photo={{ id: `${asset.id}/background/photo`, src: PHOTO, size: PHOTO_SIZE }}>
      <Media id={`${asset.id}/urgency/mark`} src="/graphics/brush-stroke.svg" alt="Orange brush"
        title="Click to recolour, resize or swap the brush mark from the library" style={boxOf(L('urgency/mark'))} />
      <div style={anchorOf(L('urgency'), 'CENTER')}>
        <Editable id={`${asset.id}/urgency`} fit={urgencyFit.contract}
          style={typeOf(L('urgency'), urgencyFit.fontSize)}>{urgency}</Editable>
      </div>

      <div style={{ ...right('lead'), alignItems: 'center', height: L('lead').h }}>
        {asset.scope.topic
          ? (() => { const fit = fitted('lead', asset.copy.eyebrow || '', 'hero.title');
            return <Editable id={`${asset.id}/lead`} fit={fit.contract} style={typeOf(L('lead'), fit.fontSize)}>{asset.copy.eyebrow || ''}</Editable>; })()
          : <>
            <Bolt id={`${asset.id}/lead/bolt-left`} width={L('lead/bolt-left').w * k} height={L('lead/bolt-left').h * k} />
            <Editable id={`${asset.id}/lead`} fit={titleFit?.contract}
              style={{ ...typeOf(L('lead'), titleSize), margin: `0 ${boltGap}px` }}>{title}</Editable>
            <Bolt id={`${asset.id}/lead/bolt-right`} width={L('lead/bolt-right').w * k} height={L('lead/bolt-right').h * k} />
          </>}
      </div>

      <div style={right('offer')}>
        {!asset.scope.topic && <Editable id={`${asset.id}/prefix`}
          style={{ ...typeOf(L('prefix')), whiteSpace: 'pre', marginRight: prefixGap }}>
          {/\bUP\s+TO\b/i.test(asset.copy.body || '') ? 'UP\nTO' : asset.copy.lead || 'EXTRA'}</Editable>}
        <Editable id={`${asset.id}/offer`} fit={offerFit.contract}
          style={typeOf(L('offer'), offerFit.fontSize)}>{offerText}</Editable>
      </div>

      {hasQualifier && <div style={anchorOf(L('qualifier'))}>
        <Editable id={`${asset.id}/qualifier`} fit={qualifierFit!.contract}
          style={typeOf(L('qualifier'), qualifierFit!.fontSize)}>{qualifierFit!.text}</Editable>
      </div>}

      <Media id={`${asset.id}/cta/mark`} src="/graphics/pill.svg" alt="Button"
        title="Click to recolour, resize or swap the button shape from the library" style={{ ...boxOf(L('cta/mark')), top: L('cta/mark').y - lift }} />
      <div style={{ ...anchorOf(L('cta')), top: L('cta').y - lift }}>
        <Editable id={`${asset.id}/cta`} fit={ctaFit.contract} style={typeOf(L('cta'), ctaFit.fontSize)}>{cta}</Editable>
      </div>
  </FigmaFrame>;
}
