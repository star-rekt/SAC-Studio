/** The pieces every SAC asset is actually made of, taken off the published
 *  boards rather than derived from their bounding boxes.
 *
 *  Measured rects tell you where a thing sits. They do not tell you that the
 *  cream has a grain over it, that the offer sets on ONE line, that the code
 *  line is half the offer with 'CODE' a weight lighter, or that the paid
 *  social carries a stepped window outlined in green. Those are the design,
 *  and they only come from looking at the board.
 */
import { BRAND, type Zone } from '../../model/compose';
import { Picture } from '../../edit/Picture';
import { Media, mediaSrc } from '../../edit/Media';
import { stack } from '../../fonts';
import { useEdits, sizeOf, paintOf } from '../../edit/store';
import { Editable } from '../../edit/Editable';
import STEP from '../../data/stepped-window.json';

export const INK = '#2E2E2E';     // the boards' button and display ink
export const GRAIN = '/Topo.png';

/** The grain the cream and the accent fields carry. Multiply at low opacity,
 *  tiled -- the recipe the design system records for it. */
export const grainStyle = (opacity = 0.045): React.CSSProperties => ({
  position: 'absolute', inset: 0, backgroundImage: `url(${GRAIN})`,
  backgroundRepeat: 'repeat', backgroundSize: '1100px',
  mixBlendMode: 'multiply', opacity, pointerEvents: 'none',
});

export const Grain = ({ opacity }: { opacity?: number }) => <div style={grainStyle(opacity)} />;

/** 'CODE CHILLY20' — CODE a weight lighter than the code itself, both on one
 *  line, about half the offer's size. */
export function CodeLine({ id, code, px, color = INK }: {
  id: string; code: string; px: number; color?: string;
}) {
  const [word, ...rest] = code.split(/\s+/);
  return (
    <div style={{ display: 'flex', gap: px * 0.22, alignItems: 'baseline', whiteSpace: 'nowrap' }}>
      <Editable id={`${id}/word`} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 400,
        fontSize: px, lineHeight: 1, color, letterSpacing: -0.5 }}>{word}</Editable>
      {rest.length > 0 && (
        <Editable id={`${id}/code`} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 800,
          fontSize: px, lineHeight: 1, color, letterSpacing: -0.5 }}>{rest.join(' ')}</Editable>
      )}
    </div>
  );
}

/** The charcoal pill. Orange is the email's button; the site assets use this. */
export const Pill = ({ id, children, px }: { id: string; children: string; px: number }) => (
  <Editable id={id} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 700, fontSize: px,
    lineHeight: 1, color: BRAND.white, background: INK, borderRadius: px * 0.38,
    padding: `${px * 0.55}px ${px * 1.15}px`, display: 'inline-block', whiteSpace: 'nowrap' }}>
    {children}
  </Editable>
);

/** The stepped window: the signature shape on the bump boards' paid social.
 *
 *  The photograph is seen THROUGH the staircase and outlined in the accent.
 *  This used to stretch the shape over the whole frame and fill it with 91%
 *  black, which is not what the board does and buried both the picture and
 *  the type it is meant to stand beside.
 *
 *  The published path fills the RIGHT of its box and bites a staircase out of
 *  the left, so it is drawn unmirrored, right of centre, with the copy to its
 *  left running in behind the steps. That overlap is the design: on the board
 *  the display line finishes inside the window rather than stopping short of
 *  it.
 *
 *  SC26_0060 measures the same tile on all three aspects -- 571x576 at x460 on
 *  a 1080 frame -- which is why the rect comes from the format's own
 *  measurement and only the height is taken from the shape, so the staircase
 *  keeps its angles whatever the rect rounded to.
 */
export function PhotoWindow({ id, zone, x, y, width, accent }: {
  id: string; zone: Zone; x: number; y: number; width: number; accent: string;
}) {
  const height = width * (STEP.height / STEP.width);
  return (
    <div data-clip="stepped-window" data-clip-stroke={accent}
         data-clip-width={STEP.strokeWeight}
         style={{ position: 'absolute', left: x, top: y, width, height, zIndex: 5 }}>
      {/* The staircase takes the window's upper left out, so a crop sitting in
          the middle loses whoever is standing in the middle of the shot --
          the first render of this kept a pair of boots and nothing above
          them. Sliding the viewport left carries the subject right, into the
          solid mass the shape actually keeps. */}
      <Picture id={id} zone={zone} focus={{ x: 28, y: 44 }}
        style={{ position: 'absolute', inset: 0,
        WebkitMaskImage: STEP_MASK, maskImage: STEP_MASK,
        WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      <svg width={width} height={height} viewBox={`0 0 ${STEP.width} ${STEP.height}`}
           preserveAspectRatio="none"
           style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <path d={STEP.path} fill="none" stroke={accent}
              strokeWidth={STEP.strokeWeight} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** Where the window sits when the board measured no tile for this format. */
export const WINDOW_AT: [number, number] = [0.426, 0.529];

const STEP_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${STEP.width} ${STEP.height}">`
  + `<path d="${STEP.path}" fill="#000"/></svg>`)}")`;

/** The wordmark, as published: the real design-system lockup (Figma node
 *  759:29603) on a light panel, the reversed white cut on a dark one. */
export const Wordmark = ({ id, w, onDark }: { id: string; w: number; onDark?: boolean }) => (
  <Media id={id} src={onDark ? '/logos/sac-logo.svg' : '/logos/sac-logo-light.svg'}
         alt="Steep &amp; Cheap" title="Click to replace the wordmark"
         style={{ width: w, display: 'block' }} />
);

/** The brush strip the flash-sale boards set their urgency line on: white
 *  caps knocked out of a rough orange mark. The shape is the published SVG,
 *  recoloured through a mask so the same asset serves any accent. */
export function BrushLabel({ id, children, px, fill = '#F14222' }: {
  id: string; children: string; px: number; fill?: string;
}) {
  // The mark is sized apart from the words on it.
  //
  //   It used to be padding derived from the type size and nothing else, so
  //   the only way to make the graphic bigger was to make the words bigger --
  //   which is the wrong lever, and the one thing a designer most wants to do
  //   here is give the mark more room around copy that is already the right
  //   size. It has its own id now, so the panel's size control reaches it.
  const api = useEdits();
  const grow = sizeOf(api.edits, `${id}/mark`);
  const paint = paintOf(api.edits, `${id}/mark`);
  const padX = px * 0.72 * grow, padY = px * 0.42 * grow;
  // The mark itself is a library slot. It was one file written into the CSS,
  // so 'graphic components are limited' was literally true: there was exactly
  // one, with twenty-one more sitting unused in the design system.
  const shape = mediaSrc(api.edits, `${id}/mark`, '/graphics/brush-strip.svg');
  return (
    <div data-id={`${id}/mark`}
         onClick={e => {
           // The type owns a click that landed on the type. This handler runs
           // AFTER the run's own, so without the check it overwrote the
           // selection with the mark every time — which is why the words on a
           // graphic could be retyped but never recoloured or resized: they
           // could not be selected at all.
           if ((e.target as HTMLElement).closest('.ed')) return;
           e.stopPropagation(); api.select(`${id}/mark`);
         }}
         className={'mark' + (api.mode === 'edit' ? ' on' : '')
                   + (api.selected === `${id}/mark` ? ' picked' : '')}
         style={{ position: 'relative', display: 'inline-block',
                  padding: `${padY}px ${padX}px` }}>
      <div style={{ position: 'absolute', inset: 0, background: paint.bg ?? fill,
        WebkitMaskImage: `url(${shape})`, maskImage: `url(${shape})`,
        WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      <Editable id={id} style={{ position: 'relative', fontFamily: stack('Quiet Sans'),
        fontWeight: 800, fontSize: px, lineHeight: 1, color: '#FFFFFF',
        letterSpacing: 1.5, whiteSpace: 'nowrap' }}>{children}</Editable>
    </div>
  );
}

/** 'UP TO' set small beside a large number, which is how the flash-sale boards
 *  lead with a percentage.
 *
 *  On one line. It was broken over two with a hard newline, which read as a
 *  wrap rather than as a lockup -- and a hard newline cannot be undone by
 *  resizing, so there was no way out of it from the panel. */
export function UpTo({ id, px, color = INK }: { id: string; px: number; color?: string }) {
  return (
    <Editable id={id} style={{ fontFamily: stack('Quiet Sans'), fontWeight: 800,
      fontSize: px * 0.33, lineHeight: 0.92, letterSpacing: -0.5, color,
      display: 'inline-block', textAlign: 'left', whiteSpace: 'nowrap' }}>UP TO</Editable>
  );
}
