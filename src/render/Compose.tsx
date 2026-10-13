/** One renderer. It draws whatever outlook the template declares.
 *
 *  Geometry still comes from the boards -- a format's size, and where its
 *  photo tiles sit -- because that is measurement, and measurement is what
 *  the references are good for. Everything else is the template's declared
 *  outlook, so changing a design means changing data.
 */
import { BRAND } from '../model/compose';
import { ZONE_LIST, pursuitOf } from '../model/compose';
import { placeOn } from '../model/safe';
import { stack } from '../fonts';
import { Picture } from '../edit/Picture';
import { Media } from '../edit/Media';
import { LIBRARY } from '../model/media';
import { Editable } from '../edit/Editable';
import { Grain, CodeLine, PhotoWindow, WINDOW_AT, Wordmark, BrushLabel, INK } from './formats/parts';
import type { FormatSpec } from '../templates/registry';
import type { SheetAsset } from '../sheet/types';
import type { Outlook, TemplateSpec } from '../templates/spec';
import type { Direction } from '../templates/directions';

const byId = new Map(ZONE_LIST.map(z => [z.id, z]));
const zoneAt = (photo: string | undefined, n: number) => {
  const base = photo ? byId.get(photo) : undefined;
  const pool = base ? ZONE_LIST.filter(z => pursuitOf(z.id) === pursuitOf(base.id)) : ZONE_LIST;
  const use = pool.length > 1 ? pool : ZONE_LIST;
  const at = base ? use.findIndex(z => z.id === base.id) : 0;
  return use[(((at + n) % use.length) + use.length) % use.length];
};

const GROUND: Record<Outlook['ground'], string> = {
  'cream-grain': BRAND.cream, 'accent-grain': BRAND.orange,
  'white': BRAND.white, 'photo-bleed': BRAND.ink,
  // SC26_0060 sets its PDP badging on #101010 and its compact mobile bar on
  // #333333. Neither is the accent and neither is paper.
  'ink': BRAND.ink, 'charcoal': '#333333',
};

export function Compose({ spec, outlook: o, asset, template, dir }: {
  spec: FormatSpec; outlook: Outlook; asset: SheetAsset; template: TemplateSpec;
  dir?: Direction;
}) {
  const [W, H] = spec.size;
  const c = asset.copy;
  // A direction, where this family has one, overrides the template's accent
  // and its corner. Everything else about the outlook stands: a direction is a
  // design choice within the template, not a different template.
  const accent = dir?.accent ?? o.accent ?? template.accent;
  // "As published" must preserve the board's measured radii. Direction B/C
  // are deliberate alternates; direction A is not a generic 26px override.
  const radius = dir && dir.id !== 'a' ? dir.radius : undefined;
  const onPhoto = o.ground === 'photo-bleed';
  const ground = onPhoto ? zoneAt(asset.media.photo, 0) : undefined;
  const place = onPhoto ? placeOn(ground) : null;
  // The template declares a tone for the FORMAT; the photograph decides it
  // for THIS asset, the same way it decides which side the copy sits on.
  //
  //   Social declares 'cream' because the board it was read from had a dark
  //   band. Nineteen of the thirty-one photographs have their clear band in
  //   the sky and most of those are recorded as pale, cloudy or grey — so
  //   white display type on them is invisible, which is the single most
  //   repeated contrast finding in the audit. The surface note has said which
  //   ones all along.
  const declared = o.tone === 'cream' ? BRAND.white : INK;
  const tone = o.tone === 'auto'
    ? (onPhoto && place && !place.dark ? INK : onPhoto ? BRAND.white : INK)
    : declared;
  const tiles = spec.elements.filter(e => /^photo/.test(e.role)).slice(0, 4);

  // The stepped window, and the copy that runs in behind it.
  //
  //   Both rects are the board's own measurement of THIS format, because this
  //   is the one outlook where the two are a lockup: the copy finishes inside
  //   the window, and a block placed by the generic rule finishes short of it
  //   and the occlusion that makes the design disappears.
  const windowed = o.photo === 'window';
  const banded = o.photo === 'band';
  const winAt = spec.elements.find(e => e.role === 'photo-tile')?.rect
             ?? [WINDOW_AT[0], 0, WINDOW_AT[1], 0];
  // Own-board copy geometry is authoritative. A standard-size fallback has no
  // copy geometry by design, so it uses the template class placement below.
  const copyRect = spec.basis === 'board' ? spec.copy?.rect : undefined;

  // Where the copy block sits, and how wide it may be.
  //
  //   The template says where copy goes on this KIND of asset; the photograph
  //   says where it can go on THIS one. When the ground is a photograph the
  //   photograph wins, because a lockup at a fixed 5% from the left does not
  //   know there is a face there -- which is why a review of nearly every hero
  //   came back failing the rule about copy relating to its subject.
  //
  //   On a cream or flat ground there is nothing to avoid and the template's
  //   own choice stands.
  const at = copyRect ? o.copyAt : place?.at ?? o.copyAt;
  const vert = copyRect ? 'middle' : place?.vert ?? 'middle';
  const wide = at === 'centre';

  // The offer is sized to the width it has, not to the height of the frame.
  //
  //   It was H * offerScale, which is a sensible number on a square and an
  //   absurd one on a story: 1920 tall gave a 298px offer that ran from x84 to
  //   x1295 on a 1080-wide frame, with 'UP TO' pushed out to x-215 on the
  //   other side. Nothing wraps, because an offer that wraps is worse, so it
  //   simply left the frame.
  //
  //   Caps in this face run about 0.58 of the point size, and a prefix lockup
  //   also has to hold 'UP TO' and a gap beside the number.
  const offerStr = (c.markdown ?? c.offer ?? '').trim();
  const room = W * (copyRect ? copyRect[2] : wide ? 0.84 : 0.56);
  const displayStr = o.offer === 'single'
    ? [c.lead, offerStr].filter(Boolean).join(' ')
    : offerStr;
  const share = 0.58 * Math.max(displayStr.length, 1)
              + (o.offer === 'prefix-stacked' ? 0.33 * 5 * 0.62 + 0.1 : 0);
  //   Against the frame's WIDTH where there is a window, because the board
  //   sets that lockup the same size on all three aspects -- it measures a
  //   224px display stack on the square, the 4x5 and the story alike, and
  //   only the frame grows around it. Taken off the height, the story got a
  //   221px line that ran so far into the window it swallowed 'OFF'.
  const px = Math.max(11, Math.round(Math.min(
    spec.copy?.offerFontSize ?? (windowed ? W : H) * o.offerScale,
    room / share)));

  const box: React.CSSProperties = {
    position: 'absolute', zIndex: 4,
    top: copyRect ? `${copyRect[1] * 100}%`
       : vert === 'top' ? '7%' : vert === 'bottom' ? undefined
       : wide ? '50%' : '16%',
    bottom: vert === 'bottom' ? '9%' : undefined,
    transform: copyRect && spec.copy?.rotation
      ? `rotate(${spec.copy.rotation}deg)`
      : !copyRect && wide && vert === 'middle' ? 'translateY(-50%)' : undefined,
    transformOrigin: copyRect && spec.copy?.rotation ? 'center' : undefined,
    width: copyRect ? `${copyRect[2] * 100}%` : wide ? '84%' : '56%',
    left: copyRect ? `${copyRect[0] * 100}%`
        : at === 'left' ? '5%' : wide ? '8%' : undefined,
    right: at === 'right' ? '5%' : undefined,
    display: 'flex', flexDirection: 'column',
    alignItems: at === 'right' ? 'flex-end' : at === 'centre' ? 'center' : 'flex-start',
    textAlign: at === 'right' ? 'right' : at === 'centre' ? 'center' : 'left',
  };

  const offerText = offerStr;

  return (
    <div className="sheet" style={{ width: W, height: H, background: GROUND[o.ground] }}>
      {/* ---- ground ---- */}
      {onPhoto && (
        <Picture id={`${asset.id}/photo`} zone={zoneAt(asset.media.photo, 0)}
                 style={{ position: 'absolute', inset: 0 }} />
      )}
      {(o.ground === 'cream-grain' || o.ground === 'accent-grain') && (
        <Grain opacity={o.ground === 'accent-grain' ? 0.22 : 0.07} />
      )}

      {/* ---- photography ---- */}
      {o.photo === 'collage' && tiles.map((e, n) => (
        <Picture key={n} id={`${asset.id}/el/${n}`} zone={zoneAt(asset.media.photo, n)}
          style={{ position: 'absolute', left: `${e.rect[0] * 100}%`, top: `${e.rect[1] * 100}%`,
            width: `${e.rect[2] * 100}%`, height: `${e.rect[3] * 100}%`,
            borderRadius: radius ?? Math.max(8, W * 0.01), overflow: 'hidden', zIndex: 1 }} />
      ))}

      {windowed && (
        <PhotoWindow id={`${asset.id}/photo`} zone={zoneAt(asset.media.photo, 0)}
          x={winAt[0] * W} y={winAt[1] ? winAt[1] * H : (H - winAt[2] * W * 1.008) / 2}
          width={winAt[2] * W} accent={accent} />
      )}

      {banded && (() => {
        const field = spec.elements.find(e => e.role === 'accent-field');
        const photo = spec.elements.find(e => e.role === 'photo-tile');
        const fr = field?.rect ?? [0.06, 0.47, 0.88, 0.36];
        // Figma describes this as a boolean subtraction: the photograph is
        // visible through the orange band. It is the SAME underlying image,
        // not a second Picture with a fresh object-fit crop. Drawing a second
        // image produced the obvious repeated/random rectangle in the hero.
        const inset = photo?.rect;
        const bx = inset ? Math.max(2, (inset[0] - fr[0]) * W) : W * 0.015;
        return <div style={{ position: 'absolute', zIndex: 2,
            left: `${fr[0] * 100}%`, top: `${fr[1] * 100}%`,
            width: `${fr[2] * 100}%`, height: `${fr[3] * 100}%`,
            boxSizing: 'border-box', border: `${bx}px solid ${accent}`,
            borderRadius: field?.radius ?? 14, pointerEvents: 'none' }} />;
      })()}

      {/* ---- copy ---- */}
      <div style={box}>
        {o.urgency === 'brush' && c.eyebrow && (
          <BrushLabel id={`${asset.id}/eyebrow`} px={px * 0.30} fill={accent}>
            {c.eyebrow.toUpperCase()}
          </BrushLabel>
        )}
        {o.urgency === 'caps' && c.eyebrow && (
          <Editable id={`${asset.id}/eyebrow`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 800, fontSize: px * 0.32, lineHeight: 1.1, letterSpacing: 3,
            color: o.urgencyTone === 'copy' ? tone : accent,
            textTransform: 'uppercase' }}>{c.eyebrow}</Editable>
        )}

        {o.register === 'sentence' ? (
          /* A bar carries a LINE, not a lockup.
           *
           *  Every board in the corpus that measures a GT sets it as a
           *  sentence, and all eighteen badging measurements are sentences
           *  too. Drawn as a display offer they came out as an orange slab
           *  shouting EXTRA 20% OFF, which is not what a site bar does: it
           *  says what the sale is and where the code goes, in one line. */
          <Editable id={`${asset.id}/line`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 700, fontSize: px, lineHeight: 1.25, color: tone,
            letterSpacing: 0, textAlign: at === 'centre' ? 'center' : 'left' }}>
            {[[c.lead, offerText].filter(Boolean).join(' '),
              c.code ? `Use code ${c.code}` : c.qualifier]
              .filter(Boolean).join('  ·  ')}
          </Editable>
        ) : o.offer === 'prefix-stacked' ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: px * 0.1,
                        marginTop: px * 0.14 }}>
            <Editable id={`${asset.id}/upto`} style={{ fontFamily: stack('Quiet Sans'),
              fontWeight: 800, fontSize: px * 0.33, lineHeight: 0.92, color: tone,
              letterSpacing: -0.5, whiteSpace: 'nowrap', textAlign: 'left' }}>UP TO</Editable>
            <Editable id={`${asset.id}/offer`} style={{ fontFamily: stack('Quiet Sans'),
              fontWeight: 800, fontSize: px, lineHeight: 0.92, color: tone,
              letterSpacing: -3, whiteSpace: 'nowrap' }}>{offerText}</Editable>
          </div>
        ) : o.offer === 'lead-over' ? (
          <div style={{ marginTop: px * 0.1 }}>
            {c.lead && (
              <Editable id={`${asset.id}/lead`} style={{ fontFamily: stack('Quiet Sans'),
                fontWeight: 800, fontSize: px, lineHeight: 0.96, color: tone,
                letterSpacing: -2 }}>{c.lead}</Editable>
            )}
            <Editable id={`${asset.id}/offer`} style={{ fontFamily: stack('Quiet Sans'),
              fontWeight: 800, fontSize: px, lineHeight: 0.96, color: tone,
              letterSpacing: -2 }}>{offerText}</Editable>
          </div>
        ) : (
          <Editable id={`${asset.id}/offer`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 800, fontSize: px, lineHeight: 1.02, color: tone, letterSpacing: -2,
            margin: `${px * 0.1}px 0`, whiteSpace: o.copyAt === 'centre' ? 'normal' : 'nowrap' }}>
            {[c.lead, offerText].filter(Boolean).join(' ')}
          </Editable>
        )}

        {o.code && (
          <CodeLine id={`${asset.id}/codeline`}
                    code={c.code ? `CODE ${c.code}` : (c.qualifier ?? 'NO CODE NEEDED')}
                    px={px * 0.48} color={tone} />
        )}
        {!o.code && c.qualifier && o.offer === 'prefix-stacked' && (
          <Editable id={`${asset.id}/qualifier`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 400, fontSize: px * 0.28, lineHeight: 1.2, color: tone,
            marginTop: px * 0.12 }}>{c.qualifier}</Editable>
        )}

        {o.button !== 'none' && c.cta && (
          <Editable id={`${asset.id}/cta`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 700, fontSize: px * 0.30, lineHeight: 1, marginTop: px * 0.34,
            color: o.button === 'pill-outline' ? tone : BRAND.white,
            background: o.button === 'pill-charcoal' ? INK
                      : o.button === 'pill-orange' ? accent : 'transparent',
            border: o.button === 'pill-outline' ? `${Math.max(2, px * 0.03)}px solid ${tone}` : undefined,
            borderRadius: radius === 0 ? 0 : o.button === 'pill-orange' ? px * 0.1 : px * 0.38,
            padding: `${px * 0.19}px ${px * 0.5}px`, display: 'inline-block' }}>{c.cta}</Editable>
        )}
      </div>

      {/* ---- closing ---- */}
      {o.closing === 'wordmark' && (
        <div style={{ position: 'absolute', left: '5%', bottom: '5%', zIndex: 4 }}>
          <Wordmark id={`${asset.id}/wordmark`} w={W * 0.2} onDark={onPhoto} />
        </div>
      )}
      {o.closing === 'brand-strip' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.105,
          background: accent, zIndex: 4, display: 'flex', alignItems: 'center',
          justifyContent: 'space-around', padding: `0 ${W * 0.03}px` }}>
          {['brand-the-north-face', 'brand-mountain-hardwear'].map((f, n) => {
            const b = LIBRARY.find(i => i.id === f)!;
            return <Media key={n} id={`${asset.id}/brand/${n}`} src={b.file} alt={b.name}
                          title="Click to replace this brand"
                          style={{ height: H * 0.059 }} />;
          })}
          <Editable id={`${asset.id}/more`} style={{ fontFamily: stack('Quiet Sans'),
            fontWeight: 800, fontSize: H * 0.032, color: BRAND.white,
            letterSpacing: 1 }}>&amp; MORE</Editable>
        </div>
      )}
    </div>
  );
}
